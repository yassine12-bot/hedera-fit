require('dotenv').config();
const {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  TransferTransaction,
  TokenAssociateTransaction,
  Hbar,
  HbarUnit,
  AccountCreateTransaction
} = require('@hashgraph/sdk');

class HederaService {
  constructor() {
    this.client = null;
    this.operatorId = null;
    this.operatorKey = null;
    this.fitTokenId = null;
    this.nftTokenId = null;
  }

  async initialize() {
    try {
      console.log('🔗 Connexion à Hedera...');
      const accountId = process.env.HEDERA_ACCOUNT_ID;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;

      if (!accountId || !privateKey) {
        throw new Error('Credentials Hedera manquants dans .env');
      }

      this.operatorId = AccountId.fromString(accountId);
      this.operatorKey = PrivateKey.fromString(privateKey);
      this.client = Client.forTestnet();
      this.client.setOperator(this.operatorId, this.operatorKey);

      console.log('✅ Connecté à Hedera Testnet');
      console.log('📍 Account ID:', this.operatorId.toString());
      return true;
    } catch (error) {
      console.error('❌ Erreur connexion Hedera:', error.message);
      return false;
    }
  }

  /**
   * Créer un nouveau compte Hedera
   */
  async createAccount(initialBalance = 10) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      console.log(`💰 Création d'un nouveau compte avec ${initialBalance} HBAR...`);

      // Générer une nouvelle paire de clés
      const newAccountPrivateKey = PrivateKey.generateECDSA();
      const newAccountPublicKey = newAccountPrivateKey.publicKey;

      // Créer le compte
      const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.from(initialBalance, HbarUnit.Hbar))
        .execute(this.client);

      // Obtenir le reçu
      const receipt = await newAccount.getReceipt(this.client);
      const newAccountId = receipt.accountId;

      console.log(`✅ Nouveau compte créé: ${newAccountId.toString()}`);
      console.log(`🔑 Private Key: ${newAccountPrivateKey.toStringDer()}`);
      console.log(`🔑 Public Key: ${newAccountPublicKey.toStringDer()}`);

      return {
        accountId: newAccountId,
        privateKey: newAccountPrivateKey.toStringDer(),
        publicKey: newAccountPublicKey.toStringDer()
      };

    } catch (error) {
      console.error('❌ Erreur création compte:', error);
      throw error;
    }
  }

  setFitTokenId(tokenId) {
    this.fitTokenId = TokenId.fromString(tokenId);
    console.log('🪙 FIT Token configuré:', this.fitTokenId.toString());
  }

  setNftTokenId(tokenId) {
    this.nftTokenId = TokenId.fromString(tokenId);
    console.log('🎨 NFT Token configuré:', this.nftTokenId.toString());
  }

  async transferFitTokens(recipientId, amount) {
    try {
      if (!this.client) {
        throw new Error('Client Hedera non initialisé');
      }

      if (!this.fitTokenId) {
        throw new Error('FIT Token ID non configuré');
      }

      const recipient = AccountId.fromString(recipientId);

      // Vérifier si le destinataire a associé le token
      // (Pour simplifier, on suppose que oui, sinon il faudra d'abord faire une association)

      const transaction = await new TransferTransaction()
        .addTokenTransfer(this.fitTokenId, this.operatorId, -amount)
        .addTokenTransfer(this.fitTokenId, recipient, amount)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);

      if (receipt.status.toString() === 'SUCCESS') {
        console.log(`✅ ${amount} FIT tokens transférés à ${recipientId}`);
        return {
          success: true,
          transactionId: transaction.transactionId
        };
      }

      return { success: false };

    } catch (error) {
      console.error('❌ Erreur transfert tokens:', error.message);
      throw error;
    }
  }

  async associateToken(accountId, accountPrivateKey) {
    try {
      if (!this.client) {
        throw new Error('Client Hedera non initialisé');
      }

      if (!this.fitTokenId) {
        throw new Error('FIT Token ID non configuré');
      }

      const account = AccountId.fromString(accountId);
      const privateKey = PrivateKey.fromString(accountPrivateKey);

      const transaction = await new TokenAssociateTransaction()
        .setAccountId(account)
        .setTokenIds([this.fitTokenId])
        .freezeWith(this.client)
        .sign(privateKey);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ Token associé au compte ${accountId}`);
      return receipt;

    } catch (error) {
      console.error('❌ Erreur association token:', error.message);
      throw error;
    }
  }

  close() {
    if (this.client) {
      this.client.close();
    }
  }
}

// Export une instance unique (singleton)
const hederaService = new HederaService();
module.exports = hederaService;