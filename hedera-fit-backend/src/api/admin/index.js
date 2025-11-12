const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');
const adminMiddleware = require('../../auth/admin-middleware');

// ==================== PRODUCTS MANAGEMENT ====================

/**
 * POST /api/admin/products
 * Ajouter un nouveau produit
 */
router.post('/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, category, priceTokens, stock, imageUrl } = req.body;
    
    if (!name || !category || !priceTokens) {
      return res.status(400).json({
        success: false,
        message: 'name, category, et priceTokens requis'
      });
    }
    
    const result = await db.run(`
      INSERT INTO products (name, description, category, priceTokens, stock, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, description, category, priceTokens, stock || 100, imageUrl]);
    
    console.log(`➕ Admin a ajouté produit: ${name}`);
    
    res.status(201).json({
      success: true,
      message: 'Produit ajouté avec succès',
      data: {
        id: result.lastID,
        name,
        priceTokens
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur ajout produit',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/products/:id
 * Modifier un produit
 */
router.put('/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, category, priceTokens, stock, imageUrl } = req.body;
    
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    await db.run(`
      UPDATE products 
      SET name = ?, description = ?, category = ?, priceTokens = ?, stock = ?, imageUrl = ?
      WHERE id = ?
    `, [
      name || product.name,
      description || product.description,
      category || product.category,
      priceTokens || product.priceTokens,
      stock !== undefined ? stock : product.stock,
      imageUrl || product.imageUrl,
      req.params.id
    ]);
    
    console.log(`✏️  Admin a modifié produit: ${name || product.name}`);
    
    res.json({
      success: true,
      message: 'Produit modifié avec succès'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur modification produit',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Supprimer un produit
 */
router.delete('/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await db.get('SELECT name FROM products WHERE id = ?', [req.params.id]);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }
    
    await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    
    console.log(`🗑️  Admin a supprimé produit: ${product.name}`);
    
    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur suppression produit',
      error: error.message
    });
  }
});

// ==================== CHALLENGES MANAGEMENT ====================

/**
 * GET /api/admin/challenges
 * Liste de tous les challenges (y compris inactifs)
 */
router.get('/challenges', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const challenges = await db.all(`
      SELECT * FROM challenges
      ORDER BY isActive DESC, createdAt DESC
    `);
    
    res.json({
      success: true,
      data: challenges
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur récupération challenges',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/challenges
 * Créer un nouveau challenge
 */
router.post('/challenges', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, type, target, reward, startDate, endDate } = req.body;
    
    if (!title || !type || !target || !reward) {
      return res.status(400).json({
        success: false,
        message: 'title, type, target, et reward requis'
      });
    }
    
    const result = await db.run(`
      INSERT INTO challenges (title, description, type, target, reward, startDate, endDate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, description, type, target, reward, startDate, endDate]);
    
    console.log(`🏆 Admin a créé challenge: ${title}`);
    
    res.status(201).json({
      success: true,
      message: 'Challenge créé avec succès',
      data: {
        id: result.lastID,
        title,
        reward
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur création challenge',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/challenges/:id
 * Modifier un challenge
 */
router.put('/challenges/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, type, target, reward, isActive, startDate, endDate } = req.body;
    
    const challenge = await db.get('SELECT * FROM challenges WHERE id = ?', [req.params.id]);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge non trouvé'
      });
    }
    
    await db.run(`
      UPDATE challenges 
      SET title = ?, description = ?, type = ?, target = ?, reward = ?, 
          isActive = ?, startDate = ?, endDate = ?
      WHERE id = ?
    `, [
      title || challenge.title,
      description !== undefined ? description : challenge.description,
      type || challenge.type,
      target !== undefined ? target : challenge.target,
      reward !== undefined ? reward : challenge.reward,
      isActive !== undefined ? isActive : challenge.isActive,
      startDate || challenge.startDate,
      endDate || challenge.endDate,
      req.params.id
    ]);
    
    console.log(`✏️  Admin a modifié challenge: ${title || challenge.title}`);
    
    res.json({
      success: true,
      message: 'Challenge modifié avec succès'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur modification challenge',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/challenges/:id
 * Supprimer un challenge
 */
router.delete('/challenges/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const challenge = await db.get('SELECT title FROM challenges WHERE id = ?', [req.params.id]);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge non trouvé'
      });
    }
    
    await db.run('DELETE FROM challenges WHERE id = ?', [req.params.id]);
    
    console.log(`🗑️  Admin a supprimé challenge: ${challenge.title}`);
    
    res.json({
      success: true,
      message: 'Challenge supprimé avec succès'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur suppression challenge',
      error: error.message
    });
  }
});

// ==================== STATS ====================

/**
 * GET /api/admin/stats
 * Statistiques générales
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Total users
    const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
    
    // Total tokens distribués
    const tokensDistributed = await db.get('SELECT SUM(amount) as total FROM rewards');
    
    // Total achats
    const purchases = await db.get('SELECT COUNT(*) as count, SUM(totalCost) as total FROM purchases');
    
    // Total pas
    const steps = await db.get('SELECT SUM(steps) as total FROM workouts');
    
    res.json({
      success: true,
      data: {
        totalUsers: usersCount.count,
        tokensDistributed: tokensDistributed.total || 0,
        totalPurchases: purchases.count || 0,
        tokensSpent: purchases.total || 0,
        totalSteps: steps.total || 0
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur récupération stats',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/users
 * Liste des utilisateurs
 */
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await db.all(`
      SELECT 
        id, name, email, fitBalance, totalSteps, 
        hederaAccountId, isAdmin, createdAt
      FROM users
      ORDER BY createdAt DESC
      LIMIT 100
    `);
    
    res.json({
      success: true,
      data: users
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur récupération users',
      error: error.message
    });
  }
});

module.exports = router;