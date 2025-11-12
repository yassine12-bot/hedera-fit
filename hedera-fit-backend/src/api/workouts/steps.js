const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');

/**
 * POST /api/workouts/steps
 * Enregistrer manuellement des pas (sans smart shoe)
 */
router.post('/steps', authMiddleware, async (req, res) => {
  try {
    const { steps, distance, calories } = req.body;

    if (!steps || steps <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de pas invalide'
      });
    }

    // Enregistrer l'activité
    const result = await db.run(`
      INSERT INTO workouts (
        userId,
        steps,
        distance,
        calories,
        workoutDate,
        createdAt
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [req.user.id, steps, distance || 0, calories || 0]);

    // Mettre à jour le total
    await db.run(
      'UPDATE users SET totalSteps = totalSteps + ? WHERE id = ?',
      [steps, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Activité enregistrée!',
      data: {
        workoutId: result.lastID,
        steps,
        distance,
        calories
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/history
 * Historique des workouts
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 30, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const workouts = await db.all(`
      SELECT * FROM workouts
      WHERE userId = ?
      ORDER BY workoutDate DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

    // Stats totales
    const stats = await db.get(`
      SELECT 
        SUM(steps) as totalSteps,
        SUM(distance) as totalDistance,
        SUM(calories) as totalCalories,
        COUNT(*) as totalWorkouts
      FROM workouts
      WHERE userId = ?
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        workouts,
        stats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/today
 * Statistiques du jour
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const todayStats = await db.get(`
      SELECT 
        SUM(steps) as steps,
        SUM(distance) as distance,
        SUM(calories) as calories
      FROM workouts
      WHERE userId = ?
      AND DATE(workoutDate) = ?
    `, [req.user.id, today]);

    res.json({
      success: true,
      data: todayStats || { steps: 0, distance: 0, calories: 0 }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur',
      error: error.message
    });
  }
});

module.exports = router;