const db = require('./db');
const hederaService = require('./hedera');

class BadgeService {
  /**
   * Vérifier et attribuer automatiquement les badges débloqués
   */
  async checkAndAwardBadges(userId) {
    try {
      // Récupérer les badges débloquables pour cet user
      const unlockable = await db.all(`
        SELECT * FROM unlockable_badges 
        WHERE user_id = ? 
        AND can_unlock = 1 
        AND already_unlocked IS NULL
      `, [userId]);

      const awardedBadges = [];

      for (const badge of unlockable) {
        try {
          const awarded = await this.awardBadge(userId, badge.badge_type);
          if (awarded) {
            awardedBadges.push(awarded);
          }
        } catch (error) {
          console.error(`❌ Erreur attribution badge ${badge.badge_type}:`, error.message);
        }
      }

      return awardedBadges;
    } catch (error) {
      console.error('❌ Erreur checkAndAwardBadges:', error.message);
      return [];
    }
  }

  /**
   * Attribuer un badge spécifique à un user
   */
  async awardBadge(userId, badgeType) {
    try {
      // Vérifier si le badge existe déjà
      const existing = await db.get(`
        SELECT id FROM badges WHERE user_id = ? AND badge_type = ?
      `, [userId, badgeType]);

      if (existing) {
        console.log(`⚠️  User ${userId} a déjà le badge ${badgeType}`);
        return null;
      }

      // Récupérer la définition du badge
      const definition = await db.get(`
        SELECT * FROM badge_definitions WHERE badge_type = ?
      `, [badgeType]);

      if (!definition) {
        throw new Error(`Badge type ${badgeType} n'existe pas`);
      }

      // Récupérer le compte Hedera de l'utilisateur
      // NOTE: Pour l'instant, on mint vers notre propre compte
      // Plus tard, chaque user aura son propre Hedera account
      const recipientAccountId = process.env.HEDERA_ACCOUNT_ID;

      // Créer le NFT sur Hedera
      const nft = await hederaService.mintBadge(recipientAccountId, badgeType);

      // Sauvegarder en DB avec référence au NFT
      const result = await db.run(`
        INSERT INTO badges (
          user_id, badge_type, name, description, 
          image_url, rarity, attributes,
          nft_token_id, nft_serial_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        badgeType,
        definition.name,
        definition.description,
        definition.image_url,
        definition.rarity,
        JSON.stringify([
          { trait_type: 'Category', value: definition.category },
          { trait_type: 'Rarity', value: definition.rarity },
          { trait_type: 'Achievement', value: definition.requirement_type }
        ]),
        nft.tokenId,
        nft.serialNumber
      ]);

      console.log(`✅ Badge ${badgeType} attribué à user ${userId}`);
      console.log(`🏅 NFT: ${nft.tokenId}#${nft.serialNumber}`);

      return {
        id: result.lastID,
        badgeType,
        name: definition.name,
        description: definition.description,
        rarity: definition.rarity,
        category: definition.category,
        nft: {
          tokenId: nft.tokenId,
          serialNumber: nft.serialNumber,
          explorerUrl: `https://hashscan.io/testnet/token/${nft.tokenId}/${nft.serialNumber}`
        }
      };
    } catch (error) {
      console.error('❌ Erreur awardBadge:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer tous les badges d'un user
   */
  async getUserBadges(userId) {
    try {
      const badges = await db.all(`
        SELECT 
          b.*,
          json_extract(b.attributes, '$') as parsed_attributes
        FROM badges b
        WHERE b.user_id = ?
        ORDER BY 
          CASE b.rarity 
            WHEN 'legendary' THEN 1
            WHEN 'epic' THEN 2
            WHEN 'rare' THEN 3
            WHEN 'common' THEN 4
          END,
          b.created_at DESC
      `, [userId]);

      return badges.map(badge => ({
        ...badge,
        attributes: JSON.parse(badge.attributes || '[]'),
        nft: {
          tokenId: badge.nft_token_id,
          serialNumber: badge.nft_serial_number,
          explorerUrl: `https://hashscan.io/testnet/token/${badge.nft_token_id}/${badge.nft_serial_number}`
        }
      }));
    } catch (error) {
      console.error('❌ Erreur getUserBadges:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer les badges débloquables pour un user
   */
  async getUnlockableBadges(userId) {
    try {
      const badges = await db.all(`
        SELECT 
          badge_type,
          name,
          description,
          image_url,
          rarity,
          category,
          requirement_type,
          requirement_value,
          current_progress,
          can_unlock,
          already_unlocked
        FROM unlockable_badges
        WHERE user_id = ?
        ORDER BY sort_order
      `, [userId]);

      return badges.map(badge => ({
        ...badge,
        progress: {
          current: badge.current_progress || 0,
          required: badge.requirement_value,
          percentage: Math.min(100, Math.round(((badge.current_progress || 0) / badge.requirement_value) * 100))
        },
        unlocked: badge.already_unlocked !== null,
        canUnlock: badge.can_unlock === 1
      }));
    } catch (error) {
      console.error('❌ Erreur getUnlockableBadges:', error.message);
      throw error;
    }
  }

  /**
   * Mettre à jour les stats d'un user (appelé après chaque action)
   */
  async updateUserStats(userId, statType, value = 1) {
    try {
      // Créer l'entrée si elle n'existe pas
      await db.run(`
        INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)
      `, [userId]);

      // Mettre à jour le stat
      let updateQuery;
      switch (statType) {
        case 'workout':
          updateQuery = `
            UPDATE user_stats 
            SET workout_count = workout_count + ?, 
                last_workout_date = DATE('now'),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `;
          break;

        case 'comment':
          updateQuery = `
            UPDATE user_stats 
            SET comment_count = comment_count + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `;
          break;

        case 'positive_comment':
          updateQuery = `
            UPDATE user_stats 
            SET comment_count = comment_count + 1,
                positive_comment_count = positive_comment_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `;
          break;

        case 'streak':
          updateQuery = `
            UPDATE user_stats 
            SET current_streak = ?,
                longest_streak = MAX(longest_streak, ?),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `;
          await db.run(updateQuery, [value, value, userId]);
          
          // Vérifier et attribuer les badges automatiquement
          const newBadges = await this.checkAndAwardBadges(userId);
          return { success: true, newBadges };

        default:
          throw new Error(`Unknown stat type: ${statType}`);
      }

      await db.run(updateQuery, [value, userId]);

      // Vérifier et attribuer les badges automatiquement
      const newBadges = await this.checkAndAwardBadges(userId);

      return {
        success: true,
        newBadges
      };
    } catch (error) {
      console.error('❌ Erreur updateUserStats:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir les stats d'un user
   */
  async getUserStats(userId) {
    try {
      const stats = await db.get(`
        SELECT * FROM user_stats WHERE user_id = ?
      `, [userId]);

      return stats || {
        user_id: userId,
        workout_count: 0,
        comment_count: 0,
        positive_comment_count: 0,
        current_streak: 0,
        longest_streak: 0
      };
    } catch (error) {
      console.error('❌ Erreur getUserStats:', error.message);
      return null;
    }
  }

  /**
   * Obtenir le leaderboard des badges
   */
  async getBadgeLeaderboard(limit = 10) {
    try {
      const leaderboard = await db.all(`
        SELECT * FROM badge_leaderboard LIMIT ?
      `, [limit]);

      return leaderboard;
    } catch (error) {
      console.error('❌ Erreur getBadgeLeaderboard:', error.message);
      return [];
    }
  }

  /**
   * Compter les badges par rarity pour un user
   */
  async getUserBadgeCount(userId) {
    try {
      const counts = await db.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN rarity = 'common' THEN 1 END) as common,
          COUNT(CASE WHEN rarity = 'rare' THEN 1 END) as rare,
          COUNT(CASE WHEN rarity = 'epic' THEN 1 END) as epic,
          COUNT(CASE WHEN rarity = 'legendary' THEN 1 END) as legendary
        FROM badges
        WHERE user_id = ?
      `, [userId]);

      return counts || { total: 0, common: 0, rare: 0, epic: 0, legendary: 0 };
    } catch (error) {
      console.error('❌ Erreur getUserBadgeCount:', error.message);
      return { total: 0, common: 0, rare: 0, epic: 0, legendary: 0 };
    }
  }
}

module.exports = new BadgeService();