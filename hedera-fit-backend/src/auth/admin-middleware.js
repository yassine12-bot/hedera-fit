const jwt = require('jsonwebtoken');
const db = require('../lib/db');

/**
 * Middleware Admin - Vérifie que l'utilisateur est admin
 * À utiliser APRÈS authMiddleware
 */
async function adminMiddleware(req, res, next) {
  try {
    // Vérifier que l'utilisateur est connecté (authMiddleware déjà passé)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication requise'
      });
    }
    
    // Vérifier si l'utilisateur est admin
    const user = await db.get(
      'SELECT isAdmin FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Droits admin requis.'
      });
    }
    
    // User est admin, continuer
    next();
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur vérification admin',
      error: error.message
    });
  }
}

module.exports = adminMiddleware;