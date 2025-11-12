const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const hederaService = require('../../lib/hedera');

/**
 * POST /api/rewards/encouragement
 * Récompenser un commentaire positif (+2 FIT)
 */
router.post('/encouragement', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.body;
    
    if (!commentId) {
      return res.status(400).json({
        success: false,
        message: 'commentId requis'
      });
    }

    // Vérifier que le commentaire existe et est positif
    const comment = await db.get(
      'SELECT * FROM comments WHERE id = ? AND sentimentLabel = "positive"',
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Commentaire non trouvé ou pas positif'
      });
    }

    // Vérifier si déjà récompensé
    const alreadyRewarded = await db.get(
      'SELECT * FROM rewards WHERE userId = ? AND type = "encouragement" AND referenceId = ?',
      [comment.userId, commentId]
    );

    if (alreadyRewarded) {
      return res.status(400).json({
        success: false,
        message: 'Déjà récompensé'
      });
    }

    // Donner la récompense (2 FIT)
    const amount = 2;

    // TODO: Transférer via Hedera quand l'utilisateur a un wallet
    // await hederaService.transferFitTokens(userWallet, amount);

    // Enregistrer la récompense en DB
    await db.run(`
      INSERT INTO rewards (userId, type, amount, referenceId, createdAt)
      VALUES (?, 'encouragement', ?, ?, CURRENT_TIMESTAMP)
    `, [comment.userId, amount, commentId]);

    // Mettre à jour le solde local
    await db.run(
      'UPDATE users SET fitBalance = fitBalance + ? WHERE id = ?',
      [amount, comment.userId]
    );

    res.json({
      success: true,
      message: `+${amount} FIT tokens pour encouragement! 🎉`,
      reward: {
        type: 'encouragement',
        amount,
        commentId
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récompense',
      error: error.message
    });
  }
});

module.exports = router;