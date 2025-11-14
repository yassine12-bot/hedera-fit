const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const hederaService = require('../../lib/hedera');
const authMiddleware = require('../../auth/middleware');
const activityLogger = require('../../lib/activity-logger'); // ← NOUVEAU!

/**
 * POST /api/shoes/sync
 * Synchroniser les données + Logger sur la blockchain
 */
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { deviceId, steps, distance, calories, timestamp } = req.body;
    
    if (!deviceId || !steps) {
      return res.status(400).json({
        success: false,
        message: 'deviceId et steps sont requis'
      });
    }

    // Vérifier/enregistrer l'appareil
    let device = await db.get(
      'SELECT * FROM devices WHERE deviceId = ? AND userId = ?',
      [deviceId, req.user.id]
    );

    if (!device) {
      await db.run(`
        INSERT INTO devices (userId, deviceId, deviceType, lastSync)
        VALUES (?, ?, 'smart_shoe', CURRENT_TIMESTAMP)
      `, [req.user.id, deviceId]);
    } else {
      await db.run(
        'UPDATE devices SET lastSync = CURRENT_TIMESTAMP WHERE id = ?',
        [device.id]
      );
    }

    // Enregistrer le workout
    const result = await db.run(`
      INSERT INTO workouts (
        userId, deviceId, steps, distance, calories, workoutDate, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      req.user.id,
      deviceId,
      steps,
      distance || 0,
      calories || 0,
      timestamp || new Date().toISOString()
    ]);

    // Mettre à jour le total de pas
    await db.run(
      'UPDATE users SET totalSteps = totalSteps + ? WHERE id = ?',
      [steps, req.user.id]
    );

    // Calculer les récompenses
    let reward = 0;
    let message = 'Données synchronisées!';

    if (steps >= 15000) {
      reward = 30;
      message = '🔥 15K+ pas! +30 FIT tokens!';
    } else if (steps >= 10000) {
      reward = 15;
      message = '🎯 10K+ pas! +15 FIT tokens!';
    } else if (steps >= 5000) {
      reward = 5;
      message = '👟 5K+ pas! +5 FIT tokens!';
    }

    let hederaTransferred = false;
    let hederaTxId = null;
    let hederaError = null;

    if (reward > 0) {
      // Récupérer le wallet de l'utilisateur
      const user = await db.get(
        'SELECT hederaAccountId FROM users WHERE id = ?',
        [req.user.id]
      );

      // Transférer les tokens sur Hedera
      if (user.hederaAccountId) {
        try {
          console.log(`💰 Envoi de ${reward} FIT tokens à ${user.hederaAccountId}...`);
          
          if (!hederaService.client) {
            await hederaService.initialize();
            hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
          }

          const transferred = await hederaService.transferFitTokens(
            user.hederaAccountId, 
            reward
          );

          if (transferred) {
            hederaTransferred = true;
            hederaTxId = transferred.transactionId?.toString();
            console.log(`✅ ${reward} FIT tokens envoyés sur Hedera!`);
            message += ' 🎉 Tokens envoyés sur ton wallet Hedera!';
          }

        } catch (error) {
          console.error('❌ Erreur transfert Hedera:', error.message);
          hederaError = error.message;
        }
      }

      // Enregistrer la récompense en DB
      await db.run(`
        INSERT INTO rewards (userId, type, amount, referenceId, createdAt)
        VALUES (?, 'daily_steps', ?, ?, CURRENT_TIMESTAMP)
      `, [req.user.id, reward, result.lastID]);

      // Mettre à jour le solde local
      await db.run(
        'UPDATE users SET fitBalance = fitBalance + ? WHERE id = ?',
        [reward, req.user.id]
      );
    }

    // ✅ NOUVEAU: Logger l'activité sur la blockchain (HCS Topic)
    const logResult = await activityLogger.logSync(
      user.hederaAccountId || `user-${req.user.id}`,
      steps,
      reward,
      hederaTxId
    );

    // Récupérer le nouveau balance et totalSteps
    const updatedUser = await db.get(
      'SELECT fitBalance, totalSteps FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message,
      data: {
        workoutId: result.lastID,
        steps,
        distance,
        calories,
        reward,
        newBalance: updatedUser.fitBalance,
        totalSteps: updatedUser.totalSteps,
        blockchain: {
          transferred: hederaTransferred,
          transactionId: hederaTxId,
          error: hederaError,
          activityLogged: logResult?.success || false, // ← Confirmation du log
          activityTxId: logResult?.transactionId // ← Transaction ID du Topic
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur sync shoes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la synchronisation',
      error: error.message
    });
  }
});

module.exports = router;
