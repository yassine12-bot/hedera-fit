require('dotenv').config();
const {
  Client,
  TopicMessageQuery,
  PrivateKey
} = require("@hashgraph/sdk");

/**
 * Lire et afficher les messages du Topic d'activités
 */
async function readActivityLog(filterUserId = null, limit = 50) {
  console.log('📖 Lecture du Topic d\'activités...\n');

  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
  const topicId = process.env.ACTIVITY_TOPIC_ID;

  if (!operatorId || !operatorKey || !topicId) {
    throw new Error('❌ Variables manquantes dans .env');
  }

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  let messageCount = 0;
  const activities = [];

  try {
    // Créer la requête pour lire le Topic
    new TopicMessageQuery()
      .setTopicId(topicId)
      .setLimit(limit)
      .subscribe(client, null, (message) => {
        try {
          // Décoder le message
          const messageString = Buffer.from(message.contents).toString();
          const activity = JSON.parse(messageString);

          // Filtrer par userId si spécifié
          if (filterUserId && activity.userId !== filterUserId) {
            return;
          }

          messageCount++;
          activities.push({
            sequence: message.sequenceNumber.toString(),
            timestamp: activity.timestamp,
            userId: activity.userId,
            action: activity.action,
            data: activity.data
          });

          // Afficher
          console.log(`\n📝 Message #${message.sequenceNumber}`);
          console.log(`   Timestamp: ${activity.timestamp}`);
          console.log(`   User: ${activity.userId}`);
          console.log(`   Action: ${activity.action}`);
          console.log(`   Data:`, JSON.stringify(activity.data, null, 2));

        } catch (error) {
          console.error('❌ Erreur parsing message:', error);
        }
      });

    // Attendre quelques secondes pour récupérer les messages
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log(`\n\n✅ Total messages lus: ${messageCount}`);

    if (filterUserId) {
      console.log(`   Filtrés pour user: ${filterUserId}`);
    }

    client.close();
    return activities;

  } catch (error) {
    console.error('❌ Erreur lecture du Topic:', error);
    client.close();
    throw error;
  }
}

/**
 * Obtenir les stats d'un utilisateur
 */
async function getUserStats(userId) {
  console.log(`\n📊 Stats pour l'utilisateur: ${userId}\n`);

  const activities = await readActivityLog(userId);

  const stats = {
    totalSyncs: 0,
    totalSteps: 0,
    totalRewards: 0,
    totalPurchases: 0,
    totalSpent: 0,
    badges: []
  };

  activities.forEach(activity => {
    switch (activity.action) {
      case 'sync':
        stats.totalSyncs++;
        stats.totalSteps += activity.data.steps || 0;
        stats.totalRewards += activity.data.reward || 0;
        break;
      case 'purchase':
        stats.totalPurchases++;
        stats.totalSpent += activity.data.cost || 0;
        break;
      case 'badge':
        stats.badges.push(activity.data.badgeName);
        break;
    }
  });

  console.log('\n📈 Résumé:');
  console.log(`   Syncs: ${stats.totalSyncs}`);
  console.log(`   Steps totaux: ${stats.totalSteps}`);
  console.log(`   Tokens gagnés: ${stats.totalRewards}`);
  console.log(`   Achats: ${stats.totalPurchases}`);
  console.log(`   Tokens dépensés: ${stats.totalSpent}`);
  console.log(`   Badges: ${stats.badges.length}`);

  return stats;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const userId = args[1];

  if (command === 'stats' && userId) {
    getUserStats(userId)
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else if (command === 'user' && userId) {
    readActivityLog(userId)
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else {
    readActivityLog()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = { readActivityLog, getUserStats };
