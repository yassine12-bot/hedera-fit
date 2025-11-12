const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const aiService = require('../../lib/ai');
// const badgeService = require('../../lib/badges-service'); // ⚠️ DÉSACTIVÉ temporairement
const authMiddleware = require('../../auth/middleware');

/**
 * POST /api/comments - Créer un commentaire (avec modération IA)
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { postId, text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Le commentaire ne peut pas être vide'
            });
        }

        // Vérifier que le post existe
        const post = await db.get('SELECT id FROM posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post non trouvé'
            });
        }

        // 🤖 ANALYSE IA DU COMMENTAIRE
        console.log('🤖 Analyse du commentaire avec IA...');
        const moderation = await aiService.moderateComment(text);

        // Insérer le commentaire
        const result = await db.run(`
            INSERT INTO comments (postId, userId, text, sentiment, sentimentLabel, isFiltered, filterReason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            postId,
            req.user.id,
            text,
            moderation.sentiment,
            moderation.sentimentLabel,
            moderation.isFiltered ? 1 : 0,
            moderation.filterReason
        ]);

        // Si le commentaire est filtré, informer l'utilisateur
        if (moderation.isFiltered) {
            return res.status(400).json({
                success: false,
                message: `Commentaire bloqué: ${moderation.filterReason}`,
                data: {
                    sentiment: moderation.sentiment,
                    reason: moderation.filterReason
                }
            });
        }

        const isPositive = moderation.sentiment > 0.5;

        // ⚠️ Badge service désactivé temporairement
        // const statsUpdate = await badgeService.updateUserStats(
        //     req.user.id,
        //     isPositive ? 'positive_comment' : 'comment'
        // );

        // 🎁 RÉCOMPENSE pour commentaire positif
        let fitReward = 0;
        if (isPositive) {
            fitReward = 2;

            // ✅ CORRIGÉ: Utiliser 'amount' et 'createdAt' au lieu de 'tokens' et 'date'
            await db.run(`
                INSERT INTO rewards (userId, type, amount, createdAt)
                VALUES (?, 'positive_comment', ?, datetime('now'))
            `, [req.user.id, fitReward]);

            await db.run(`
                UPDATE users SET fitBalance = fitBalance + ? WHERE id = ?
            `, [fitReward, req.user.id]);

            console.log(`✅ +${fitReward} FIT tokens pour commentaire positif`);
        }

        // Incrémenter le compteur de commentaires du post
        await db.run('UPDATE posts SET commentsCount = commentsCount + 1 WHERE id = ?', [postId]);

        const comment = await db.get(`
            SELECT
                c.*,
                u.name as userName
            FROM comments c
            JOIN users u ON c.userId = u.id
            WHERE c.id = ?
        `, [result.lastID]);

        // ✅ CORRIGÉ: Retourner "comment" au lieu de "data"
        const response = {
            success: true,
            message: isPositive ? `Commentaire positif ! +${fitReward} FIT tokens 🎉` : 'Commentaire ajouté',
            comment: comment,
            aiAnalysis: {
                sentiment: moderation.sentiment,
                label: moderation.sentimentLabel,
                rewarded: isPositive,
                fitReward: isPositive ? fitReward : 0
            }
        };

        // ⚠️ Badges désactivés temporairement
        // if (statsUpdate.newBadges && statsUpdate.newBadges.length > 0) {
        //     response.newBadges = statsUpdate.newBadges;
        //     response.badgeNotification = `🏅 Félicitations ! Tu as débloqué ${statsUpdate.newBadges.length} nouveau(x) badge(s) !`;
        //     response.badgesUnlocked = statsUpdate.newBadges.map(badge => ({
        //         name: badge.name,
        //         rarity: badge.rarity,
        //         description: badge.description,
        //         nftUrl: badge.nft.explorerUrl
        //     }));
        // }

        res.status(201).json(response);
    } catch (error) {
        console.error('Erreur création commentaire:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du commentaire',
            error: error.message
        });
    }
});

/**
 * GET /api/comments/post/:postId - Récupérer les commentaires d'un post
 */
router.get('/post/:postId', authMiddleware, async (req, res) => {
    try {
        const comments = await db.all(`
            SELECT
                c.*,
                u.name as userName,
                (SELECT COUNT(*) FROM likes WHERE commentId = c.id) as likesCount,
                (SELECT COUNT(*) FROM likes WHERE commentId = c.id AND userId = ?) as userLiked,
                (SELECT COUNT(*) FROM badges WHERE user_id = u.id) as userBadgeCount
            FROM comments c
            JOIN users u ON c.userId = u.id
            WHERE c.postId = ? AND c.isFiltered = 0
            ORDER BY c.sentiment DESC, c.createdAt DESC
        `, [req.user.id, req.params.postId]);

        res.json({
            success: true,
            data: comments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des commentaires',
            error: error.message
        });
    }
});

/**
 * GET /api/comments/best - Récupérer les meilleurs commentaires du jour
 */
router.get('/best', authMiddleware, async (req, res) => {
    try {
        const bestComments = await db.all(`
            SELECT
                c.*,
                u.name as userName,
                p.caption as postCaption,
                (SELECT COUNT(*) FROM likes WHERE commentId = c.id) as likesCount,
                (SELECT COUNT(*) FROM badges WHERE user_id = u.id) as userBadgeCount
            FROM comments c
            JOIN users u ON c.userId = u.id
            JOIN posts p ON c.postId = p.id
            WHERE c.isFiltered = 0
                AND DATE(c.createdAt) = DATE('now')
                AND c.sentiment > 0.5
            ORDER BY c.sentiment DESC, likesCount DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: bestComments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des meilleurs commentaires',
            error: error.message
        });
    }
});

/**
 * DELETE /api/comments/:id - Supprimer un commentaire
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const comment = await db.get('SELECT * FROM comments WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Commentaire non trouvé ou non autorisé'
            });
        }

        await db.run('DELETE FROM comments WHERE id = ?', [req.params.id]);
        await db.run('UPDATE posts SET commentsCount = commentsCount - 1 WHERE id = ?', [comment.postId]);

        res.json({
            success: true,
            message: 'Commentaire supprimé'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression',
            error: error.message
        });
    }
});

module.exports = router;