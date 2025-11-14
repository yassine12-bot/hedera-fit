const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { PrivateKey, AccountCreateTransaction, Hbar } = require('@hashgraph/sdk');
const db = require('../../lib/db');
const hederaService = require('../../lib/hedera');
const authMiddleware = require('../../auth/middleware');
const activityLogger = require('../../lib/activity-logger');
// Clé de chiffrement (À METTRE DANS .ENV EN PRODUCTION!)
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'hedera-fit-secret-key-change-me-32b';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypter une private key
 */
function encryptPrivateKey(privateKey) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Décrypter une private key
 */
function decryptPrivateKey(encryptedData) {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * GET /api/users/wallet - Récupérer les infos du wallet
 */
router.get('/wallet', authMiddleware, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT hederaAccountId, walletCreatedAt FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user.hederaAccountId) {
      return res.json({
        success: true,
        hasWallet: false,
        message: 'Aucun wallet Hedera associé'
      });
    }

    res.json({
      success: true,
      hasWallet: true,
      wallet: {
        accountId: user.hederaAccountId,
        createdAt: user.walletCreatedAt,
        explorerUrl: `https://hashscan.io/testnet/account/${user.hederaAccountId}`
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du wallet',
      error: error.message
    });
  }
});

/**
 * POST /api/users/wallet/create - Créer un nouveau wallet Hedera
 */
router.post('/wallet/create', authMiddleware, async (req, res) => {
  try {
    // Vérifier si l'utilisateur a déjà un wallet
    const user = await db.get(
      'SELECT hederaAccountId FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà un wallet Hedera'
      });
    }

    console.log('🔑 Création d\'un nouveau wallet Hedera...');

    // Générer une nouvelle paire de clés
    const newPrivateKey = PrivateKey.generateED25519();
    const newPublicKey = newPrivateKey.publicKey;

    console.log('✅ Clés générées');

    // Initialiser Hedera si pas encore fait
    if (!hederaService.client) {
      await hederaService.initialize();
    }

    // Créer le compte sur Hedera (coûte du HBAR!)
    console.log('🔄 Création du compte sur Hedera Testnet...');
    
    const transaction = new AccountCreateTransaction()
      .setKey(newPublicKey)
      .setInitialBalance(new Hbar(1)) // 1 HBAR initial
      .setMaxAutomaticTokenAssociations(10); // Pour recevoir des tokens automatiquement

    const response = await transaction.execute(hederaService.client);
    const receipt = await response.getReceipt(hederaService.client);
    const newAccountId = receipt.accountId;

    console.log('✅ Compte créé:', newAccountId.toString());

    // Encrypter la private key
    const encryptedKey = encryptPrivateKey(newPrivateKey.toString());

    // Sauvegarder en DB
    await db.run(`
      UPDATE users 
      SET hederaAccountId = ?,
          hederaPrivateKeyEncrypted = ?,
          walletCreatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newAccountId.toString(), encryptedKey, req.user.id]);

    console.log('✅ Wallet sauvegardé en DB');

    await activityLogger.logWalletCreated(
  req.user.id,
  newAccount.accountId.toString()
);

    res.status(201).json({
      success: true,
      message: 'Wallet Hedera créé avec succès! 🎉',
      wallet: {
        accountId: newAccountId.toString(),
        publicKey: newPublicKey.toString(),
        privateKey: newPrivateKey.toString(), // ⚠️ UNIQUEMENT retourné à la création!
        explorerUrl: `https://hashscan.io/testnet/account/${newAccountId.toString()}`,
        warning: '⚠️ SAUVEGARDE ta private key! Elle ne sera plus jamais affichée!'
      }
    });

  } catch (error) {
    console.error('❌ Erreur création wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du wallet',
      error: error.message
    });
  }
});

/**
 * POST /api/users/wallet/import - Importer un wallet existant
 */
router.post('/wallet/import', authMiddleware, async (req, res) => {
  try {
    const { accountId, privateKey } = req.body;

    if (!accountId || !privateKey) {
      return res.status(400).json({
        success: false,
        message: 'accountId et privateKey requis'
      });
    }

    // Vérifier si l'utilisateur a déjà un wallet
    const user = await db.get(
      'SELECT hederaAccountId FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà un wallet. Supprimez-le d\'abord.'
      });
    }

    // Valider le format de la private key
    try {
      PrivateKey.fromString(privateKey);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Format de private key invalide'
      });
    }

    // Encrypter la private key
    const encryptedKey = encryptPrivateKey(privateKey);

    // Sauvegarder en DB
    await db.run(`
      UPDATE users 
      SET hederaAccountId = ?,
          hederaPrivateKeyEncrypted = ?,
          walletCreatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [accountId, encryptedKey, req.user.id]);

    res.json({
      success: true,
      message: 'Wallet importé avec succès! ✅',
      wallet: {
        accountId,
        explorerUrl: `https://hashscan.io/testnet/account/${accountId}`
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'importation',
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/wallet - Supprimer le wallet (déconnexion)
 */
router.delete('/wallet', authMiddleware, async (req, res) => {
  try {
    const { confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation requise (confirmDelete: true)'
      });
    }

    await db.run(`
      UPDATE users 
      SET hederaAccountId = NULL,
          hederaPrivateKeyEncrypted = NULL,
          walletCreatedAt = NULL
      WHERE id = ?
    `, [req.user.id]);

    res.json({
      success: true,
      message: 'Wallet déconnecté avec succès'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
});

/**
 * GET /api/users/wallet/balance - Récupérer le solde FIT tokens
 */
router.get('/wallet/balance', authMiddleware, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT hederaAccountId, fitBalance FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user.hederaAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Aucun wallet Hedera associé'
      });
    }

    // TODO: Query Hedera pour le vrai balance on-chain
    // Pour l'instant, on retourne le balance local de la DB

    res.json({
      success: true,
      balance: {
        local: user.fitBalance || 0, // Balance en DB
        // onchain: await getOnChainBalance(user.hederaAccountId) // TODO
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du solde',
      error: error.message
    });
  }
});

module.exports = router;