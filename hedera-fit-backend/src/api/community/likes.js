const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const authMiddleware = require('../../auth/middleware');

/**
 * POST /api/likes - Liker un post ou commentaire
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { postId, commentId } = req.body;

        if (!postId && !commentId) {
            return res.status(400).json({
                success: false,
                message: 'Vous devez fournir postId ou commentId'
            });
        }

        // Vérifier si déjà liké
        const existing = await db.get(`
            SELECT id FROM likes 
            WHERE userId = ? AND (postId = ? OR commentId = ?)
        `, [req.user.id, postId || null, commentId || null]);

        if (existing) {
            // Unlike
            await db.run('DELETE FROM likes WHERE id = ?', [existing.id]);

            if (postId) {
                await db.run('UPDATE posts SET likesCount = likesCount - 1 WHERE id = ?', [postId]);
            }

            return res.json({
                success: true,
                message: 'Like retiré',
                action: 'unliked'
            });
        }

        // Like
        await db.run(`
            INSERT INTO likes (userId, postId, commentId)
            VALUES (?, ?, ?)
        `, [req.user.id, postId || null, commentId || null]);

        if (postId) {
            await db.run('UPDATE posts SET likesCount = likesCount + 1 WHERE id = ?', [postId]);
        }

        res.status(201).json({
            success: true,
            message: 'Like ajouté',
            action: 'liked'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors du like',
            error: error.message
        });
    }
});

module.exports = router;