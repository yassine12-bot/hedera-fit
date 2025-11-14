require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./lib/db');
const app = express();
const PORT = process.env.PORT || 3000;
const activityLogger = require('./lib/activity-logger');
// ==================== MIDDLEWARES ==================== 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(express.static(path.join(__dirname, '../public')));
// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ==================== ROUTES ====================      
// Auth
const authRoutes = require('./auth/routes');
app.use('/auth', authRoutes);

// Community
const postsRoutes = require('./api/community/posts');    
const commentsRoutes = require('./api/community/comments');
const likesRoutes = require('./api/community/likes');    
const topicsRoutes = require('./api/community/topics');  
const badgesRoutes = require('./api/community/badges');  
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/badges', badgesRoutes);

// Users & Wallet
const walletRoutes = require('./api/users/wallet');      
app.use('/api/users', walletRoutes);

// AI - pas de routes, c'est un service

// Rewards
const encouragementRoutes = require('./api/rewards/encouragement');
app.use('/api/rewards', encouragementRoutes);

// Smart Shoes (IoT)
const shoesRoutes = require('./api/shoes/sync');
app.use('/api/shoes', shoesRoutes);

// Workouts
const workoutsRoutes = require('./api/workouts/steps');  
app.use('/api/workouts', workoutsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Hedera Fit API is running! 🚀'
  });
});
// Marketplace
const marketplaceRoutes = require('./api/marketplace/products');
app.use('/api/marketplace', marketplaceRoutes);
    
// Admin Dashboard
const adminRoutes = require('./api/admin');
app.use('/api/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'  
  });
});

// ==================== DÉMARRAGE ====================  
async function startServer() {
  try {
    // Initialiser la base de données
    await db.initialize();
    
    // ✅ NOUVEAU: Initialiser Hedera
    console.log('🔗 Initialisation Hedera...');
    const hederaService = require('./lib/hedera');
    await hederaService.initialize();
    
    // Configurer les tokens
    if (process.env.FIT_TOKEN_ID) {
      hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
      console.log(`🪙 FIT Token configuré: ${process.env.FIT_TOKEN_ID}`);
    }
    if (process.env.NFT_TOKEN_ID) {
      hederaService.setNftTokenId(process.env.NFT_TOKEN_ID);
      console.log(`🏅 NFT Token configuré: ${process.env.NFT_TOKEN_ID}`);
     
    }
     // ✅ Initialiser toujours le logger
      console.log('📝 Initialisation Activity Logger...');
    await activityLogger.initialize();
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(50));
      console.log('🚀 Serveur démarré avec succès!');
      console.log('='.repeat(50));
      console.log(`📍 URL: http://localhost:${PORT}`);  
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🤖 IA: ${process.env.HUGGINGFACE_API_KEY ? 'Activée ✅' : 'Désactivée ❌'}`);
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
      console.log('  POST /api/topics');
      console.log('  POST /api/shoes/sync');
      console.log('  POST /api/workouts/steps');
      console.log('  POST /api/rewards/encouragement');  
      console.log('');
      console.log('👉 Teste avec: curl http://localhost:' + PORT + '/health');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erreur démarrage:', error);       
    process.exit(1);
  }
}

startServer();

module.exports = app;