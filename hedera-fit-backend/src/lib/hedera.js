// ⭐ NOUVELLE VERSION - PAS DE TRANSFER NFT ⭐
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

  async createFitToken() {
    try {
      console.log('🪙 Création du token FIT...');
      const transaction = await new TokenCreateTransaction()
        .setTokenName('FIT Token')
        .setTokenSymbol('FIT')
        .setDecimals(2)
        .setInitialSupply(1000000)
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

  async transferFitTokens(recipientAccountId, amount) {
    try {
      console.log(`💸 Transfert de ${amount} FIT tokens à ${recipientAccountId}...`);
      if (!this.fitTokenId) {
        throw new Error('Token FIT pas encore créé');
      }

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

  async mintBadge(recipientAccountId, badgeType) {
    try {
      console.log('⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐');
      console.log('🏅 NOUVELLE VERSION - MINT BADGE SANS TRANSFER');
      console.log(`🏅 Création du badge "${badgeType}"...`);
      console.log('⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐');

      if (!this.nftTokenId) {
        throw new Error('NFT Token pas encore créé');
      }

      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const metadata = Buffer.from(`${badgeType}:${dateStr}`);
      console.log(`📦 Metadata size: ${metadata.length} bytes`);

      const mintTx = await new TokenMintTransaction()
        .setTokenId(this.nftTokenId)
        .setMetadata([metadata])
        .freezeWith(this.client);

      const mintSignedTx = await mintTx.sign(this.operatorKey);
      const mintResponse = await mintSignedTx.execute(this.client);
      const mintReceipt = await mintResponse.getReceipt(this.client);
      const serialNumber = mintReceipt.serials[0];

      // ✅ PAS DE TRANSFER - Le badge reste dans le wallet principal
      console.log('✅ Badge créé et conservé dans le wallet principal!');
      console.log('🏅 Serial Number:', serialNumber.toString());
      console.log('⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐');

      return {
        tokenId: this.nftTokenId.toString(),
        serialNumber: serialNumber.toString(),
        metadata: metadata.toString()
      };
    } catch (error) {
      console.error('❌ Erreur création badge:', error.message);
      throw error;
    }
  }

  setFitTokenId(tokenId) {
    this.fitTokenId = tokenId;
    console.log('🪙 FIT Token ID configuré:', tokenId);
  }

  setNftTokenId(tokenId) {
    this.nftTokenId = tokenId;
    console.log('🏅 NFT Token ID configuré:', tokenId);
  }
}

module.exports = new HederaService();