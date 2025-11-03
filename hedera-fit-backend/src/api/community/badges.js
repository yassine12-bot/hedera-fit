const express = require('express');
const router = express.Router();
const badgeService = require('../../lib/badges-service');
const authMiddleware = require('../../auth/middleware');

/**
 * GET /api/badges/my - Récupérer mes badges
 */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const badges = await badgeService.getUserBadges(req.user.id);
    const badgeCount = await badgeService.getUserBadgeCount(req.user.id);
    
    res.json({
      success: true,
      count: badges.length,
      breakdown: badgeCount,
      data: badges
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des badges',
      error: error.message
    });
  }
});

/**
 * GET /api/badges/unlockable - Voir les badges disponibles et ma progression
 */
router.get('/unlockable', authMiddleware, async (req, res) => {
  try {
    const badges = await badgeService.getUnlockableBadges(req.user.id);
    const stats = await badgeService.getUserStats(req.user.id);
    
    res.json({
      success: true,
      stats,
      data: badges
    });
  } catch (error) {
    console.error('Error fetching unlockable badges:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des badges disponibles',
      error: error.message
    });
  }
});

/**
 * GET /api/badges/user/:userId - Voir les badges d'un autre user (profil public)
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const badges = await badgeService.getUserBadges(parseInt(req.params.userId));
    const badgeCount = await badgeService.getUserBadgeCount(parseInt(req.params.userId));
    const stats = await badgeService.getUserStats(parseInt(req.params.userId));
    
    res.json({
      success: true,
      count: badges.length,
      breakdown: badgeCount,
      stats,
      data: badges
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des badges',
      error: error.message
    });
  }
});

/**
 * GET /api/badges/leaderboard - Classement des badges
 */
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await badgeService.getBadgeLeaderboard(limit);
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du classement',
      error: error.message
    });
  }
});

/**
 * GET /api/badges/stats - Mes statistiques
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await badgeService.getUserStats(req.user.id);
    const badgeCount = await badgeService.getUserBadgeCount(req.user.id);
    
    res.json({
      success: true,
      data: {
        ...stats,
        badges: badgeCount
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

/**
 * POST /api/badges/check - Vérifier et débloquer les badges disponibles
 */
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const newBadges = await badgeService.checkAndAwardBadges(req.user.id);
    
    res.json({
      success: true,
      message: newBadges.length > 0 
        ? `🎉 ${newBadges.length} nouveau(x) badge(s) débloqué(s)!` 
        : 'Aucun nouveau badge à débloquer',
      data: newBadges
    });
  } catch (error) {
    console.error('Error checking badges:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des badges',
      error: error.message
    });
  }
});

/**
 * POST /api/badges/award - [ADMIN ONLY] Attribuer manuellement un badge
 */
router.post('/award', authMiddleware, async (req, res) => {
  try {
    // TODO: Ajouter un check isAdmin
    const { userId, badgeType } = req.body;

    if (!userId || !badgeType) {
      return res.status(400).json({
        success: false,
        message: 'userId et badgeType sont requis'
      });
    }

    const badge = await badgeService.awardBadge(userId, badgeType);
    
    if (!badge) {
      return res.status(400).json({
        success: false,
        message: 'Badge déjà attribué ou invalide'
      });
    }

    res.json({
      success: true,
      message: `Badge ${badgeType} attribué!`,
      data: badge
    });
  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'attribution du badge',
      error: error.message
    });
  }
});

module.exports = router;