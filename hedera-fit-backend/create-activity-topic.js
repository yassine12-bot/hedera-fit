require('dotenv').config();
const {
  Client,
  TopicCreateTransaction,
  PrivateKey
} = require("@hashgraph/sdk");

/**
 * Créer un Topic HCS pour enregistrer toutes les activités
 */
async function createActivityTopic() {
  console.log('🔗 Création du Topic HCS pour les activités...\n');

  // Setup client
  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

  if (!operatorId || !operatorKey) {
    throw new Error('❌ HEDERA_OPERATOR_ID et HEDERA_OPERATOR_KEY requis dans .env');
  }

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  try {
    // Créer le Topic
    const transaction = await new TopicCreateTransaction()
      .setTopicMemo("Hedera Fit - Activity Log")
      .setAdminKey(operatorKey.publicKey)
      .execute(client);

    const receipt = await transaction.getReceipt(client);
    const topicId = receipt.topicId;

    console.log('✅ Topic créé avec succès!');
    console.log(`📝 Topic ID: ${topicId}`);
    console.log(`🔗 Explorer: https://hashscan.io/testnet/topic/${topicId}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Ajoute cette ligne dans ton .env:');
    console.log(`ACTIVITY_TOPIC_ID=${topicId}`);
    console.log('');

    client.close();
    return topicId.toString();

  } catch (error) {
    console.error('❌ Erreur création du Topic:', error);
    throw error;
  }
}

// Exécuter
if (require.main === module) {
  createActivityTopic()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { createActivityTopic };
