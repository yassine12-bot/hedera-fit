const {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  Hbar
} = require('@hashgraph/sdk');

class HederaService {
  constructor() {
    this.client = null;
    this.operatorId = null;
    this.operatorKey = null;
    this.fitTokenId = null;
    this.nftTokenId = null;
  }

  /**
   * Initialiser la connexion à Hedera
   */
  async initialize() {
    try {
      console.log('🔗 Connexion à Hedera...');

      // Récupérer les credentials depuis .env
      const accountId = process.env.HEDERA_ACCOUNT_ID;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;

      if (!accountId || !privateKey) {
        throw new Error('Credentials Hedera manquants dans .env');
      }


      this.operatorId = AccountId.fromString(accountId);
      this.operatorKey = PrivateKey.fromString(privateKey);

      // Créer le client (testnet)
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
   * Créer le token FIT (à faire une seule fois)
   */
  async createFitToken() {
    try {
      console.log('🪙 Création du token FIT...');

      const transaction = await new TokenCreateTransaction()
        .setTokenName('FIT Token')
        .setTokenSymbol('FIT')
        .setDecimals(2) // 2 décimales (ex: 10.50 FIT)
        .setInitialSupply(1000000) // 1 million de tokens (10,000.00 FIT)
        .setTreasuryAccountId(this.operatorId)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .setAdminKey(this.operatorKey)
        .setSupplyKey(this.operatorKey)
        .freezeWith(this.client);

      const signedTx = await transaction.sign(this.operatorKey);
      const response = await signedTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      this.fitTokenId = receipt.tokenId;

      console.log('✅ Token FIT créé!');
      console.log('🪙 Token ID:', this.fitTokenId.toString());

      return this.fitTokenId.toString();
    } catch (error) {
      console.error('❌ Erreur création token:', error.message);
      throw error;
    }
  }

  /**
   * Créer le token NFT pour les badges (à faire une seule fois)
   */
  async createBadgeNFT() {
    try {
      console.log('🏅 Création du NFT Badge collection...');

      const transaction = await new TokenCreateTransaction()
        .setTokenName('FIT Badges')
        .setTokenSymbol('FITBADGE')
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTreasuryAccountId(this.operatorId)
        .setSupplyKey(this.operatorKey)
        .setAdminKey(this.operatorKey)
        .freezeWith(this.client);

      const signedTx = await transaction.sign(this.operatorKey);
      const response = await signedTx.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      this.nftTokenId = receipt.tokenId;

      console.log('✅ NFT Badge collection créée!');
      console.log('🏅 NFT Token ID:', this.nftTokenId.toString());

      return this.nftTokenId.toString();
    } catch (error) {
      console.error('❌ Erreur création NFT:', error.message);
      throw error;
    }
  }

  /**
   * Transférer des FIT tokens à un utilisateur
   */
  async transferFitTokens(recipientAccountId, amount) {
    try {
      console.log(`💸 Transfert de ${amount} FIT tokens à ${recipientAccountId}...`);

      if (!this.fitTokenId) {
        throw new Error('Token FIT pas encore créé');
      }

      // Convertir le montant (ex: 10 FIT = 1000 avec 2 décimales)
      const amountWithDecimals = amount * 100;

      const transaction = await new TransferTransaction()
        .addTokenTransfer(this.fitTokenId, this.operatorId, -amountWithDecimals)
        .addTokenTransfer(this.fitTokenId, recipientAccountId, amountWithDecimals)
        .freezeWith(this.client);

      const signedTx = await transaction.sign(this.operatorKey);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      console.log('✅ Transfert réussi!');
      return true;
    } catch (error) {
      console.error('❌ Erreur transfert:', error.message);
      return false;
    }
  }

  /**
   * Créer un badge NFT pour un utilisateur
   */
  async mintBadge(recipientAccountId, badgeName, badgeMetadata) {
    try {
      console.log(`🏅 Création du badge "${badgeName}" pour ${recipientAccountId}...`);

      if (!this.nftTokenId) {
        throw new Error('NFT Token pas encore créé');
      }

      // Créer les métadonnées du badge (version courte)
      const metadata = Buffer.from(JSON.stringify({
        name: badgeName,
        type: badgeMetadata.type || 'achievement',
        date: new Date().toISOString().split('T')[0]
      }));

      // Mint le NFT
      const mintTx = await new TokenMintTransaction()
        .setTokenId(this.nftTokenId)
        .setMetadata([metadata])
        .freezeWith(this.client);

      const mintSignedTx = await mintTx.sign(this.operatorKey);
      const mintResponse = await mintSignedTx.execute(this.client);
      const mintReceipt = await mintResponse.getReceipt(this.client);

      const serialNumber = mintReceipt.serials[0];

      // Transférer le NFT à l'utilisateur
      const transferTx = await new TransferTransaction()
        .addNftTransfer(this.nftTokenId, serialNumber, this.operatorId, recipientAccountId)
        .freezeWith(this.client);

      const transferSignedTx = await transferTx.sign(this.operatorKey);
      const transferResponse = await transferSignedTx.execute(this.client);
      await transferResponse.getReceipt(this.client);

      console.log('✅ Badge créé et transféré!');
      console.log('🏅 Serial Number:', serialNumber.toString());

      return {
        tokenId: this.nftTokenId.toString(),
        serialNumber: serialNumber.toString()
      };
    } catch (error) {
      console.error('❌ Erreur création badge:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir le token ID FIT (si déjà créé)
   */
  setFitTokenId(tokenId) {
    this.fitTokenId = tokenId;
    console.log('🪙 FIT Token ID configuré:', tokenId);
  }

  /**
   * Obtenir le token ID NFT (si déjà créé)
   */
  setNftTokenId(tokenId) {
    this.nftTokenId = tokenId;
    console.log('🏅 NFT Token ID configuré:', tokenId);
  }
}

// Export une instance unique
module.exports = new HederaService();