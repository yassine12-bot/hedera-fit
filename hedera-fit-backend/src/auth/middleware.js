const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Récupérer le token du header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant',
        code: 'AUTH_REQUIRED'
      });
    }

    // Format attendu: "Bearer TOKEN"
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Format de token invalide',
        code: 'AUTH_INVALID'
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ajouter les infos user à la requête
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré',
        code: 'AUTH_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token invalide',
      code: 'AUTH_INVALID'
    });
  }
};

module.exports = authMiddleware;