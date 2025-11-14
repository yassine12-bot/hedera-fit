require('dotenv').config();
const {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey
} = require("@hashgraph/sdk");

/**
 * Service pour logger les activités sur Hedera Topic
 */
class ActivityLogger {
  constructor() {
    this.client = null;
    this.topicId = null;
    this.initialized = false;
  }

  /**
   * Initialiser le client Hedera
   */
  async initialize() {
    if (this.initialized) return;

    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
    this.topicId = process.env.ACTIVITY_TOPIC_ID;

    if (!operatorId || !operatorKey || !this.topicId) {
      console.warn('⚠️  Activity Logger: Variables manquantes dans .env');
      return;
    }

    this.client = Client.forTestnet();
    this.client.setOperator(operatorId, operatorKey);
    this.initialized = true;

    console.log(`✅ Activity Logger initialisé (Topic: ${this.topicId})`);
  }

  /**
   * Logger une activité sur la blockchain
   * @param {string} userId - Account ID Hedera ou ID user DB
   * @param {string} action - Type d'action (sync, purchase, badge, etc.)
   * @param {object} data - Données additionnelles
   */
  async log(userId, action, data = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      console.warn('⚠️  Activity Logger non initialisé, skip logging');
      return null;
    }

    try {
      // Créer le message
      const message = JSON.stringify({
        userId,
        action,
        data,
        timestamp: new Date().toISOString(),
        version: '1.0'
      });

      // Soumettre au Topic
      const transaction = await new TopicMessageSubmitTransaction()
        .setTopicId(this.topicId)
        .setMessage(message)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);
      const sequenceNumber = receipt.topicSequenceNumber;

      console.log(`📝 Activity logged: ${action} by ${userId} (seq: ${sequenceNumber})`);

      return {
        success: true,
        sequenceNumber: sequenceNumber.toString(),
        transactionId: transaction.transactionId.toString(),
        explorerUrl: `https://hashscan.io/testnet/transaction/${transaction.transactionId.toString()}`
      };

    } catch (error) {
      console.error('❌ Erreur logging activity:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logger un sync de pas
   */
  async logSync(userId, steps, reward, hederaTxId = null) {
    return this.log(userId, 'sync', {
      steps,
      reward,
      hederaTxId
    });
  }

  /**
   * Logger un achat
   */
  async logPurchase(userId, productId, productName, cost, hederaTxId = null) {
    return this.log(userId, 'purchase', {
      productId,
      productName,
      cost,
      hederaTxId
    });
  }

  /**
   * Logger l'obtention d'un badge
   */
  async logBadge(userId, badgeId, badgeName, nftSerialNumber = null) {
    return this.log(userId, 'badge', {
      badgeId,
      badgeName,
      nftSerialNumber
    });
  }

  /**
   * Logger la création d'un wallet
   */
  async logWalletCreated(userId, hederaAccountId) {
    return this.log(userId, 'wallet_created', {
      hederaAccountId
    });
  }

  /**
   * Logger un post community
   */
  async logPost(userId, postId, content) {
    return this.log(userId, 'post', {
      postId,
      contentPreview: content.substring(0, 100)
    });
  }

  /**
   * Fermer le client
   */
  close() {
    if (this.client) {
      this.client.close();
      this.initialized = false;
    }
  }
}

// Export une instance unique (singleton)
const activityLogger = new ActivityLogger();

module.exports = activityLogger;
