require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./lib/db');
const hederaService = require('./lib/hedera'); // ✅ NOUVEAU

// Import des routes
const authRoutes = require('./auth/routes');
const postsRoutes = require('./api/community/posts');
const commentsRoutes = require('./api/community/comments');
const likesRoutes = require('./api/community/likes');
const topicsRoutes = require('./api/community/topics');
const badgesRoutes = require('./api/community/badges'); // ✅ NOUVEAU

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARES ====================

// CORS - Permettre les requêtes depuis le frontend
app.use(cors());

// Parser JSON
app.use(express.json());

// Parser URL-encoded
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logger les requêtes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ==================== ROUTES ====================

// Route de test
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Hedera Fit API is running! 🚀'
  });
});

// Routes d'authentification
app.use('/auth', authRoutes);

// Routes de la communauté
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/badges', badgesRoutes); // ✅ NOUVEAU

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.path
  });
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ==================== INITIALISATION HEDERA ====================

async function initializeHedera() {
  try {
    console.log('🔗 Initialisation Hedera...');
    const connected = await hederaService.initialize();
    
    if (connected) {
      // Configurer les token IDs depuis .env
      if (process.env.FIT_TOKEN_ID) {
        hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
      }
      if (process.env.NFT_BADGE_TOKEN_ID) {
        hederaService.setNftTokenId(process.env.NFT_BADGE_TOKEN_ID);
      }
      
      console.log('✅ Hedera prêt!');
      return true;
    } else {
      console.warn('⚠️  Hedera non initialisé - Les badges NFT ne seront pas disponibles');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur initialisation Hedera:', error.message);
    console.warn('⚠️  Le serveur démarre sans Hedera');
    return false;
  }
}

// ==================== DÉMARRAGE DU SERVEUR ====================

const startServer = async () => {
  try {
    // Initialiser la base de données
    console.log('🗄️ Initialisation de la base de données...');
    await db.initDatabase();

    // Initialiser Hedera (optionnel - continue même si ça échoue)
    await initializeHedera();

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('🚀 Serveur démarré avec succès!');
      console.log('='.repeat(50));
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🤖 IA: ${process.env.HUGGINGFACE_API_KEY ? 'Activée ✅' : 'Désactivée ❌'}`);
      console.log(`⛓️  Hedera: ${process.env.HEDERA_ACCOUNT_ID ? 'Activé ✅' : 'Désactivé ❌'}`);
      console.log('='.repeat(50));
      console.log('');
      console.log('📚 Routes disponibles:');
      console.log('  GET  /health');
      console.log('  POST /auth/register');
      console.log('  POST /auth/login');
      console.log('  GET  /api/posts');
      console.log('  POST /api/posts');
      console.log('  POST /api/comments');
      console.log('  POST /api/likes');
      console.log('  GET  /api/badges/my');
      console.log('  GET  /api/badges/unlockable');
      console.log('');
      console.log('👉 Teste avec: curl http://localhost:' + PORT + '/health');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gérer les erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Démarrer le serveur
startServer();

module.exports = app;