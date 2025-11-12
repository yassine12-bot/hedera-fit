require('dotenv').config();

const API_URL = 'http://localhost:3000';

// Style
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

function log(emoji, text, color = colors.reset) {
  console.log(`${color}${emoji} ${text}${colors.reset}`);
}

function header(text) {
  console.log('\n' + '═'.repeat(70));
  console.log(`${colors.bright}${colors.blue}${text}${colors.reset}`);
  console.log('═'.repeat(70) + '\n');
}

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function DEMO() {
  console.clear();
  header('🏋️ HEDERA FIT GYM PRO - DÉMO COMPLÈTE');
  
  log('🎯', 'Cette démo montre:', colors.yellow);
  console.log('   1. Création de compte & wallet Hedera automatique');
  console.log('   2. Smart shoes tracking avec récompenses RÉELLES');
  console.log('   3. Tokens envoyés sur blockchain Hedera');
  console.log('   4. Vérification on-chain (HashScan)\n');
  
  await wait(2000);

  try {
    // ============================================================
    // PARTIE 1: INSCRIPTION & WALLET
    // ============================================================
    header('📝 PARTIE 1: INSCRIPTION');
    
    const email = `demo_${Date.now()}@fitness.com`;
    log('👤', 'Création d\'un nouveau user...', colors.blue);
    
    const registerResult = await request('POST', '/auth/register', {
      name: 'Demo User',
      email,
      password: 'password123'
    });

    if (registerResult.status !== 201) {
      console.error('❌ Échec inscription');
      return;
    }

    log('✅', `User créé! ID: ${registerResult.data.user.id}`, colors.green);
    await wait(1000);

    // Login
    log('🔐', 'Connexion...', colors.blue);
    const loginResult = await request('POST', '/auth/login', {
      email,
      password: 'password123'
    });

    const authToken = loginResult.data.token;
    log('✅', 'Connecté!', colors.green);
    await wait(1000);

    // ============================================================
    // PARTIE 2: CRÉATION WALLET HEDERA
    // ============================================================
    header('💳 PARTIE 2: WALLET HEDERA');
    
    log('⏳', 'Création d\'un wallet Hedera sur la blockchain...', colors.blue);
    log('💡', '(Ça prend 5-10 secondes, patience!)', colors.yellow);
    
    const walletResult = await request('POST', '/api/users/wallet/create', {}, authToken);

    if (walletResult.status !== 201) {
      console.error('❌ Échec création wallet');
      return;
    }

    const wallet = walletResult.data.wallet;
    log('✅', 'Wallet créé sur Hedera Testnet!', colors.green);
    console.log(`   📍 Account ID: ${colors.bright}${wallet.accountId}${colors.reset}`);
    console.log(`   🌐 Explorer: ${wallet.explorerUrl}`);
    await wait(2000);

    // ============================================================
    // PARTIE 3: SIMULATION SMART SHOES
    // ============================================================
    header('👟 PARTIE 3: SMART SHOES - TRACKING');
    
    log('🏃', 'Simulation: User marche 12,000 pas...', colors.magenta);
    await wait(1500);

    const syncResult = await request('POST', '/api/shoes/sync', {
      deviceId: `SHOE_DEMO_${Date.now()}`, // ✅ Unique à chaque fois
      steps: 12000,
      distance: 9.2,
      calories: 580
    }, authToken);

    if (syncResult.status !== 200) {
      console.error('❌ Échec sync');
      return;
    }

    const sync = syncResult.data;
    log('✅', 'Données synchronisées!', colors.green);
    console.log(`   📊 Steps: ${sync.data.steps}`);
    console.log(`   🔥 Distance: ${sync.data.distance} km`);
    console.log(`   💪 Calories: ${sync.data.calories}`);
    await wait(1000);

    // ============================================================
    // PARTIE 4: RÉCOMPENSE AUTOMATIQUE
    // ============================================================
    header('🎁 PARTIE 4: RÉCOMPENSE AUTOMATIQUE');
    
    log('💰', `Récompense calculée: ${sync.data.reward} FIT tokens`, colors.yellow);
    await wait(1000);

    if (sync.data.blockchain.transferred) {
      log('🎉', 'TOKENS ENVOYÉS SUR HEDERA BLOCKCHAIN!', colors.green);
      console.log(`   ✓ ${sync.data.reward} FIT tokens transférés`);
      console.log(`   ✓ Destination: ${wallet.accountId}`);
      console.log(`   ✓ Transaction confirmée sur la blockchain`);
    } else if (sync.data.blockchain.error) {
      log('⚠️', 'Tokens sauvegardés en DB (Hedera temporairement indisponible)', colors.yellow);
    } else {
      log('📝', 'Tokens ajoutés au solde local', colors.blue);
    }
    
    await wait(2000);

    // ============================================================
    // PARTIE 5: VÉRIFICATION ON-CHAIN
    // ============================================================
    header('🔍 PARTIE 5: VÉRIFICATION');
    
    log('🌐', 'Vérification sur HashScan (explorateur blockchain)...', colors.blue);
    console.log(`\n   ${colors.bright}👉 Ouvre ce lien:${colors.reset}`);
    console.log(`   ${wallet.explorerUrl}`);
    console.log('\n   Tu verras:');
    console.log('   ✓ Ton wallet Hedera');
    console.log('   ✓ Tes FIT tokens');
    console.log('   ✓ L\'historique des transactions');
    console.log('   ✓ TOUT est vérifié on-chain! 🔒');

    await wait(2000);

    // ============================================================
    // RÉSUMÉ FINAL
    // ============================================================
    header('📊 RÉSUMÉ DE LA DÉMO');
    
    console.log(`${colors.green}✅ User créé${colors.reset}`);
    console.log(`${colors.green}✅ Wallet Hedera créé automatiquement${colors.reset}`);
    console.log(`${colors.green}✅ Smart shoes connectées${colors.reset}`);
    console.log(`${colors.green}✅ ${sync.data.steps} pas trackés${colors.reset}`);
    console.log(`${colors.green}✅ ${sync.data.reward} FIT tokens gagnés${colors.reset}`);
    if (sync.data.blockchain.transferred) {
      console.log(`${colors.green}✅ Tokens envoyés sur blockchain Hedera${colors.reset}`);
    }
    console.log(`${colors.green}✅ Vérifiable sur HashScan${colors.reset}\n`);

    header('🎬 FIN DE LA DÉMO');
    
    console.log(`${colors.bright}${colors.magenta}Ce que tu viens de voir:${colors.reset}\n`);
    console.log('   🔹 Système de fitness gamifié');
    console.log('   🔹 Blockchain Hedera (tokens & NFTs réels)');
    console.log('   🔹 Smart shoes IoT');
    console.log('   🔹 Récompenses automatiques');
    console.log('   🔹 Wallets crypto');
    console.log('   🔹 Transparence totale (blockchain publique)\n');

    log('💪', 'HEDERA FIT = FITNESS + BLOCKCHAIN + IoT', colors.bright);
    console.log('');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

// Lancer la démo
console.log('');
DEMO();