const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const { upload, mediaService } = require('../../lib/storage');
const authMiddleware = require('../../auth/middleware');

/**
 * GET /api/posts - Récupérer tous les posts (feed)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const posts = await db.all(`
            SELECT 
                p.*,
                u.name as userName,
                u.email as userEmail,
                (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
                (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentsCount,
                (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as userLiked
            FROM posts p
            JOIN users u ON p.userId = u.id
            ORDER BY p.createdAt DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, limit, offset]);

        res.json({
            success: true,
            data: posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: posts.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des posts',
            error: error.message
        });
    }
});

/**
 * POST /api/posts - Créer un nouveau post avec photo/vidéo
 */
router.post('/', authMiddleware, upload.single('media'), async (req, res) => {
    try {
        const { caption } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier média fourni'
            });
        }

        let mediaUrl = `/uploads/${file.mimetype.startsWith('video') ? 'videos' : 'images'}/${file.filename}`;
        let thumbnail = null;
        const mediaType = file.mimetype.startsWith('video') ? 'video' : 'image';

        // Optimiser l'image si c'est une image
        if (mediaType === 'image') {
            await mediaService.optimizeImage(file.path);
        }

        // Générer une miniature si c'est une vidéo
        if (mediaType === 'video') {
            thumbnail = await mediaService.generateVideoThumbnail(file.path);
        }

        // Insérer le post dans la base de données
        const result = await db.run(`
            INSERT INTO posts (userId, caption, mediaType, mediaUrl, thumbnail)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user.id, caption || '', mediaType, mediaUrl, thumbnail]);

        const post = await db.get(`
            SELECT 
                p.*,
                u.name as userName,
                u.email as userEmail
            FROM posts p
            JOIN users u ON p.userId = u.id
            WHERE p.id = ?
        `, [result.lastID]);

        res.status(201).json({
            success: true,
            message: 'Post créé avec succès',
            data: post
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du post',
            error: error.message
        });
    }
});

/**
 * GET /api/posts/:id - Récupérer un post spécifique avec ses commentaires
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const post = await db.get(`
            SELECT 
                p.*,
                u.name as userName,
                u.email as userEmail,
                (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
                (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as userLiked
            FROM posts p
            JOIN users u ON p.userId = u.id
            WHERE p.id = ?
        `, [req.user.id, req.params.id]);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post non trouvé'
            });
        }

        // Récupérer les commentaires
        const comments = await db.all(`
            SELECT 
                c.*,
                u.name as userName,
                (SELECT COUNT(*) FROM likes WHERE commentId = c.id) as likesCount
            FROM comments c
            JOIN users u ON c.userId = u.id
            WHERE c.postId = ? AND c.isFiltered = 0
            ORDER BY c.createdAt DESC
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                ...post,
                comments
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du post',
            error: error.message
        });
    }
});

/**
 * DELETE /api/posts/:id - Supprimer un post
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const post = await db.get('SELECT * FROM posts WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post non trouvé ou non autorisé'
            });
        }

        // Supprimer le fichier média
        await mediaService.deleteMedia(`.${post.mediaUrl}`);

        // Supprimer le post de la DB
        await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
        await db.run('DELETE FROM comments WHERE postId = ?', [req.params.id]);
        await db.run('DELETE FROM likes WHERE postId = ?', [req.params.id]);

        res.json({
            success: true,
            message: 'Post supprimé avec succès'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du post',
            error: error.message
        });
    }
});

module.exports = router;