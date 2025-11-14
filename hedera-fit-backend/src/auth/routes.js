const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../lib/db');
const hederaService = require('../lib/hedera');
const activityLogger = require('../lib/activity-logger');

/**
 * POST /auth/register - Créer un nouveau compte + Wallet Hedera
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom, email et mot de passe requis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ NOUVEAU: Créer un wallet Hedera pour l'utilisateur
    let hederaAccountId = null;
    let walletCreated = false;
    
    try {
      if (!hederaService.client) {
        await hederaService.initialize();
      }
      
      console.log('🔑 Création du wallet Hedera pour le nouvel utilisateur...');
      const newAccount = await hederaService.createAccount();
      hederaAccountId = newAccount.accountId.toString();
      walletCreated = true;
      console.log(`✅ Wallet créé: ${hederaAccountId}`);
      
      // ✅ Associer automatiquement le FIT Token
      try {
        console.log('🔗 Association du FIT Token au nouveau wallet...');
        
        if (!hederaService.fitTokenId) {
          hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
        }
        
        await hederaService.associateToken(
          hederaAccountId,
          newAccount.privateKey
        );
        
        console.log('✅ FIT Token associé au wallet!');
      } catch (assocError) {
        console.error('⚠️  Erreur association token:', assocError.message);
        console.log('   → Les tokens devront être associés manuellement plus tard');
      }
      
    } catch (walletError) {
      console.error('⚠️  Erreur création wallet:', walletError.message);
      console.log('   → Compte sera créé sans wallet, il pourra en créer un plus tard');
      // Continue quand même, on peut créer le wallet plus tard
    }

    // Créer l'utilisateur
    const result = await db.run(
      'INSERT INTO users (name, email, password, hederaAccountId) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, hederaAccountId]
    );

    const userId = result.lastID;

    // ✅ NOUVEAU: Logger la création du wallet sur la blockchain
    if (walletCreated && hederaAccountId) {
      try {
        await activityLogger.logWalletCreated(
          hederaAccountId,
          hederaAccountId
        );
        console.log('📝 Wallet creation logged on blockchain');
      } catch (logError) {
        console.error('⚠️  Failed to log wallet creation:', logError.message);
      }
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        id: userId,
        email: email,
        name: name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: walletCreated 
        ? 'Compte et wallet Hedera créés avec succès! 🎉' 
        : 'Compte créé! (Wallet Hedera à créer plus tard)',
      token: token,
      user: {
        id: userId,
        name: name,
        email: email,
        fitBalance: 0,
        hederaAccountId: hederaAccountId,
        walletCreated: walletCreated
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte',
      error: error.message
    });
  }
});

/**
 * POST /auth/login - Se connecter
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        fitBalance: user.fitBalance,
        totalSteps: user.totalSteps,
        hederaAccountId: user.hederaAccountId,
        hasWallet: !!user.hederaAccountId
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

/**
 * GET /auth/me - Récupérer le profil utilisateur
 */
router.get('/me', async (req, res) => {
  try {
    // Vérifier le token
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    // Décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Récupérer les données utilisateur
    const user = await db.get(
      'SELECT id, name, email, fitBalance, totalSteps, hederaAccountId, createdAt FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Compter les badges
    const badgeCount = await db.get(
      'SELECT COUNT(*) as count FROM user_badges WHERE userId = ?',
      [user.id]
    );

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        fitBalance: user.fitBalance || 0,
        totalSteps: user.totalSteps || 0,
        hederaAccountId: user.hederaAccountId,
        hasWallet: !!user.hederaAccountId,
        badgeCount: badgeCount?.count || 0,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
});

/**
 * POST /auth/create-wallet - Créer un wallet pour un utilisateur existant
 */
router.post('/create-wallet', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier si l'user a déjà un wallet
    const user = await db.get(
      'SELECT hederaAccountId FROM users WHERE id = ?',
      [decoded.id]
    );

    if (user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà un wallet Hedera',
        hederaAccountId: user.hederaAccountId
      });
    }

    // Créer le wallet
    if (!hederaService.client) {
      await hederaService.initialize();
    }

    console.log(`🔑 Création du wallet Hedera pour user ${decoded.id}...`);
    const newAccount = await hederaService.createAccount();
    const hederaAccountId = newAccount.accountId.toString();

    // ✅ Associer automatiquement le FIT Token
    try {
      console.log('🔗 Association du FIT Token au nouveau wallet...');
      
      if (!hederaService.fitTokenId) {
        hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
      }
      
      await hederaService.associateToken(
        hederaAccountId,
        newAccount.privateKey
      );
      
      console.log('✅ FIT Token associé au wallet!');
    } catch (assocError) {
      console.error('⚠️  Erreur association token:', assocError.message);
    }

    // Mettre à jour en DB
    await db.run(
      'UPDATE users SET hederaAccountId = ? WHERE id = ?',
      [hederaAccountId, decoded.id]
    );

    // Logger sur la blockchain
    try {
      await activityLogger.logWalletCreated(
        hederaAccountId,
        hederaAccountId
      );
    } catch (logError) {
      console.error('⚠️  Failed to log wallet creation:', logError.message);
    }

    console.log(`✅ Wallet créé: ${hederaAccountId}`);

    res.json({
      success: true,
      message: 'Wallet Hedera créé avec succès! 🎉',
      hederaAccountId: hederaAccountId
    });

  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du wallet',
      error: error.message
    });
  }
});

module.exports = router;