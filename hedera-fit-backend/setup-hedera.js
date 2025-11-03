require('dotenv').config();
const hederaService = require('./src/lib/hedera');

async function setupHedera() {
  console.log('🚀 Initialisation de Hedera...\n');

  try {
    // Étape 1: Se connecter à Hedera
    const connected = await hederaService.initialize();
    if (!connected) {
      throw new Error('Connexion échouée');
    }

    console.log('\n📍 Prêt pour créer les tokens!\n');
    console.log('⚠️  NOTE: Cette opération coûte ~1 HBAR');
    console.log('⚠️  Les tokens ne doivent être créés qu\'UNE SEULE FOIS\n');

    // Étape 2: Créer le token FIT
    console.log('--- CRÉATION TOKEN FIT ---');
    const fitTokenId = await hederaService.createFitToken();
    console.log(`\n✅ Token FIT créé: ${fitTokenId}`);
    console.log('📝 SAUVEGARDE CE TOKEN ID dans ton .env:\n');
    console.log(`FIT_TOKEN_ID=${fitTokenId}\n`);

    // Étape 3: Créer le token NFT Badges
    console.log('--- CRÉATION NFT BADGES ---');
    const nftTokenId = await hederaService.createBadgeNFT();
    console.log(`\n✅ NFT Badge collection créée: ${nftTokenId}`);
    console.log('📝 SAUVEGARDE CE TOKEN ID dans ton .env:\n');
    console.log(`NFT_BADGE_TOKEN_ID=${nftTokenId}\n`);

    console.log('🎉 Setup Hedera terminé avec succès!\n');
    console.log('🔧 Prochaine étape: Ajoute ces IDs dans ton .env');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

setupHedera();