const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const hederaService = require('../../lib/hedera');
const authMiddleware = require('../../auth/middleware');

/**
 * POST /api/shoes/sync
 * Synchroniser les données du smart shoe + AUTO-DISTRIBUTION sur Hedera!
 */
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { deviceId, steps, distance, calories, timestamp } = req.body;
    
    // Validation
    if (!deviceId || !steps) {
      return res.status(400).json({
        success: false,
        message: 'deviceId et steps sont requis'
      });
    }

    // Vérifier si l'appareil appartient à l'utilisateur
    let device = await db.get(
      'SELECT * FROM devices WHERE deviceId = ? AND userId = ?',
      [deviceId, req.user.id]
    );

    // Si nouvel appareil, l'enregistrer
    if (!device) {
      await db.run(`
        INSERT INTO devices (userId, deviceId, deviceType, lastSync)
        VALUES (?, ?, 'smart_shoe', CURRENT_TIMESTAMP)
      `, [req.user.id, deviceId]);
      
      console.log(`📱 Nouvel appareil enregistré: ${deviceId}`);
    } else {
      // Mettre à jour la dernière sync
      await db.run(
        'UPDATE devices SET lastSync = CURRENT_TIMESTAMP WHERE id = ?',
        [device.id]
      );
    }

    // Enregistrer les données d'activité
    const result = await db.run(`
      INSERT INTO workouts (
        userId, 
        deviceId, 
        steps, 
        distance, 
        calories, 
        workoutDate,
        createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      req.user.id,
      deviceId,
      steps,
      distance || 0,
      calories || 0,
      timestamp || new Date().toISOString()
    ]);

    // Mettre à jour le total de pas de l'utilisateur
    await db.run(
      'UPDATE users SET totalSteps = totalSteps + ? WHERE id = ?',
      [steps, req.user.id]
    );

    // Calculer les récompenses basées sur les pas
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
    let hederaError = null;

    if (reward > 0) {
      // ✅ NOUVEAU: Récupérer le wallet de l'utilisateur
      const user = await db.get(
        'SELECT hederaAccountId FROM users WHERE id = ?',
        [req.user.id]
      );

      // ✅ AUTO-DISTRIBUTION sur Hedera!
      if (user.hederaAccountId) {
        try {
          console.log(`💰 Envoi de ${reward} FIT tokens à ${user.hederaAccountId}...`);
          
          // Initialiser Hedera si pas encore fait
          if (!hederaService.client) {
            await hederaService.initialize();
            hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
          }

          // Transférer les tokens sur Hedera!
          const transferred = await hederaService.transferFitTokens(
            user.hederaAccountId, 
            reward
          );

          if (transferred) {
            hederaTransferred = true;
            console.log(`✅ ${reward} FIT tokens envoyés sur Hedera!`);
            message += ' 🎉 Tokens envoyés sur ton wallet Hedera!';
          } else {
            console.log('⚠️ Échec transfert Hedera, sauvegarde en DB seulement');
          }

        } catch (error) {
          console.error('❌ Erreur transfert Hedera:', error.message);
          hederaError = error.message;
          // Continue quand même, on sauvegarde en DB
        }
      } else {
        console.log('📭 User n\'a pas de wallet Hedera, sauvegarde en DB seulement');
      }

      // Enregistrer la récompense en DB
      await db.run(`
        INSERT INTO rewards (userId, type, amount, referenceId, createdAt)
        VALUES (?, 'daily_steps', ?, ?, CURRENT_TIMESTAMP)
      `, [req.user.id, reward, result.lastID]);

      // Mettre à jour le solde local (backup)
      await db.run(
        'UPDATE users SET fitBalance = fitBalance + ? WHERE id = ?',
        [reward, req.user.id]
      );
    }

    res.json({
      success: true,
      message,
      data: {
        workoutId: result.lastID,
        steps,
        distance,
        calories,
        reward,
        blockchain: {
          transferred: hederaTransferred,
          error: hederaError
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

/**
 * GET /api/shoes/devices
 * Liste des appareils connectés
 */
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const devices = await db.all(
      'SELECT * FROM devices WHERE userId = ? ORDER BY lastSync DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message
    });
  }
});

module.exports = router;