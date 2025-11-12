const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');

/**
 * GET /api/topics - Liste tous les topics
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const topics = await db.all(`
      SELECT
        t.*,
        u.name as creatorName,
        (SELECT COUNT(*) FROM topic_members WHERE topicId = t.id) as memberCount,
        (SELECT COUNT(*) FROM topic_members WHERE topicId = t.id AND userId = ?) as isMember
      FROM topics t
      JOIN users u ON t.creatorId = u.id
      ORDER BY t.createdAt DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: topics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des topics',
      error: error.message
    });
  }
});

/**
 * POST /api/topics - Créer un nouveau topic
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du topic est requis'
      });
    }

    // Créer le topic
    const result = await db.run(`
      INSERT INTO topics (name, description, creatorId, isPrivate)
      VALUES (?, ?, ?, ?)
    `, [name, description || '', req.user.id, isPrivate ? 1 : 0]);

    // Ajouter le créateur comme membre admin
    await db.run(`
      INSERT INTO topic_members (topicId, userId, role)
      VALUES (?, ?, 'admin')
    `, [result.lastID, req.user.id]);

    const topic = await db.get(`
      SELECT t.*, u.name as creatorName
      FROM topics t
      JOIN users u ON t.creatorId = u.id
      WHERE t.id = ?
    `, [result.lastID]);

    // ✅ CORRIGÉ: Retourner "topic" au lieu de "data"
    res.status(201).json({
      success: true,
      message: 'Topic créé avec succès',
      topic: topic  // ← CORRIGÉ: était "data"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du topic',
      error: error.message
    });
  }
});

/**
 * POST /api/topics/:id/join - Rejoindre un topic
 */
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const topicId = req.params.id;

    // Vérifier que le topic existe
    const topic = await db.get('SELECT * FROM topics WHERE id = ?', [topicId]);
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic non trouvé'
      });
    }

    // Vérifier si déjà membre
    const existing = await db.get(
      'SELECT * FROM topic_members WHERE topicId = ? AND userId = ?',
      [topicId, req.user.id]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà membre de ce topic'
      });
    }

    // Rejoindre le topic
    await db.run(`
      INSERT INTO topic_members (topicId, userId, role)
      VALUES (?, ?, 'member')
    `, [topicId, req.user.id]);

    // Incrémenter le compteur
    await db.run('UPDATE topics SET memberCount = memberCount + 1 WHERE id = ?', [topicId]);

    res.json({
      success: true,
      message: 'Vous avez rejoint le topic'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'adhésion',
      error: error.message
    });
  }
});

/**
 * GET /api/topics/:id/messages - Récupérer les messages d'un topic
 */
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const topicId = req.params.id;
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    // Vérifier que l'utilisateur est membre
    const isMember = await db.get(`
      SELECT * FROM topic_members WHERE topicId = ? AND userId = ?
    `, [topicId, req.user.id]);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être membre pour voir les messages'
      });
    }

    const messages = await db.all(`
      SELECT
        m.*,
        u.name as userName
      FROM topic_messages m
      JOIN users u ON m.userId = u.id
      WHERE m.topicId = ?
      ORDER BY m.createdAt DESC
      LIMIT ? OFFSET ?
    `, [topicId, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des messages',
      error: error.message
    });
  }
});

/**
 * POST /api/topics/:id/messages - Envoyer un message
 */
router.post('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const topicId = req.params.id;
    const { message, messageType } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le message ne peut pas être vide'
      });
    }

    // Vérifier que l'utilisateur est membre
    const isMember = await db.get(`
      SELECT * FROM topic_members WHERE topicId = ? AND userId = ?
    `, [topicId, req.user.id]);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être membre pour envoyer des messages'
      });
    }

    const result = await db.run(`
      INSERT INTO topic_messages (topicId, userId, message, messageType)
      VALUES (?, ?, ?, ?)
    `, [topicId, req.user.id, message, messageType || 'text']);

    const newMessage = await db.get(`
      SELECT m.*, u.name as userName
      FROM topic_messages m
      JOIN users u ON m.userId = u.id
      WHERE m.id = ?
    `, [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Message envoyé',
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message',
      error: error.message
    });
  }
});

/**
 * GET /api/topics/:id/events - Récupérer les événements d'un topic
 */
router.get('/:id/events', authMiddleware, async (req, res) => {
  try {
    const topicId = req.params.id;

    const events = await db.all(`
      SELECT
        e.*,
        u.name as creatorName,
        (SELECT COUNT(*) FROM event_participants WHERE eventId = e.id) as participantsCount,
        (SELECT status FROM event_participants WHERE eventId = e.id AND userId = ?) as userStatus
      FROM topic_events e
      JOIN users u ON e.creatorId = u.id
      WHERE e.topicId = ?
      ORDER BY e.eventDate ASC
    `, [req.user.id, topicId]);

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des événements',
      error: error.message
    });
  }
});

/**
 * POST /api/topics/:id/events - Créer un événement dans le topic
 */
router.post('/:id/events', authMiddleware, async (req, res) => {
  try {
    const topicId = req.params.id;
    const { title, description, eventDate, location } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({
        success: false,
        message: 'Titre et date requis'
      });
    }

    // Vérifier que l'utilisateur est admin du topic
    const member = await db.get(
      'SELECT role FROM topic_members WHERE topicId = ? AND userId = ?',
      [topicId, req.user.id]
    );

    if (!member || member.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les admins peuvent créer des événements'
      });
    }

    const result = await db.run(`
      INSERT INTO topic_events (topicId, creatorId, title, description, eventDate, location)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [topicId, req.user.id, title, description || '', eventDate, location || '']);

    const event = await db.get(`
      SELECT e.*, u.name as creatorName
      FROM topic_events e
      JOIN users u ON e.creatorId = u.id
      WHERE e.id = ?
    `, [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Événement créé',
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'événement',
      error: error.message
    });
  }
});

/**
 * POST /api/topics/events/:eventId/join - Participer à un événement
 */
router.post('/events/:eventId/join', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { status } = req.body;

    if (!status || !['going', 'interested', 'not_going'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status invalide. Utilisez: going, interested, ou not_going'
      });
    }

    // Vérifier que l'événement existe
    const event = await db.get('SELECT * FROM topic_events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    // Ajouter ou mettre à jour la participation
    await db.run(`
      INSERT INTO event_participants (eventId, userId, status)
      VALUES (?, ?, ?)
      ON CONFLICT(eventId, userId)
      DO UPDATE SET status = ?, joinedAt = CURRENT_TIMESTAMP
    `, [eventId, req.user.id, status, status]);

    res.json({
      success: true,
      message: `Statut mis à jour: ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la participation',
      error: error.message
    });
  }
});

module.exports = router;