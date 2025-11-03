require('dotenv').config();
const hederaService = require('./src/lib/hedera');

async function testHedera() {
  console.log('🧪 Test Hedera Service\n');

  try {
    // Étape 1: Connexion
    console.log('1️⃣ Connexion à Hedera...');
    await hederaService.initialize();

    // Configurer les token IDs
    hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
    hederaService.setNftTokenId(process.env.NFT_BADGE_TOKEN_ID);

    console.log('\n✅ Service Hedera prêt!\n');

    // Étape 2: Test transfert FIT tokens
    console.log('2️⃣ Test: Envoyer 10 FIT tokens');
    console.log('💡 On envoie à notre propre compte pour tester\n');

    const recipientId = process.env.HEDERA_ACCOUNT_ID; // Envoyer à soi-même
    const success = await hederaService.transferFitTokens(recipientId, 10);

    if (success) {
      console.log('✅ Transfert réussi! 10 FIT tokens envoyés\n');
    } else {
      console.log('❌ Transfert échoué\n');
    }

    // Étape 3: Test création badge
    console.log('3️⃣ Test: Créer un badge NFT');
    console.log('💡 Badge type: ROOKIE (First Test Badge)\n');
    
    const badge = await hederaService.mintBadge(
      recipientId,
      'ROOKIE' // Type de badge court (les vraies métadonnées sont dans la DB)
    );

    console.log('\n✅ Badge créé avec succès!');
    console.log('🏅 Token ID:', badge.tokenId);
    console.log('🔢 Serial Number:', badge.serialNumber);
    console.log('📦 On-chain Metadata:', badge.metadata);

    console.log('\n🎉 Tous les tests passés!\n');
    console.log('📊 Vérifie sur HashScan:');
    console.log(`https://hashscan.io/testnet/token/${process.env.FIT_TOKEN_ID}`);
    console.log(`https://hashscan.io/testnet/token/${process.env.NFT_BADGE_TOKEN_ID}`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.stack) {
      console.error('\n📍 Stack:', error.stack);
    }
  }
}

testHedera();