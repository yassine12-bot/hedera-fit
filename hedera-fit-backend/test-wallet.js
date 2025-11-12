require('dotenv').config();

const API_URL = 'http://localhost:3000';

// Variables de test
let authToken = null;
let userId = null;
let walletAccountId = null;

async function request(method, endpoint, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

async function testWalletManagement() {
  console.log('🔐 Test: Wallet Management System\n');
  console.log('═'.repeat(60));

  try {
    // Étape 1: S'inscrire
    console.log('\n1️⃣ Inscription...');
    const registerData = {
      name: 'Wallet Test User',
      email: `wallet_test_${Date.now()}@example.com`,
      password: 'password123'
    };

    const registerResult = await request('POST', '/auth/register', registerData);
    
    if (registerResult.status === 201) {
      console.log('✅ Utilisateur créé');
      userId = registerResult.data.user.id;
    } else {
      console.log('❌ Échec inscription:', registerResult.data.message);
      return;
    }

    // Étape 2: Se connecter
    console.log('\n2️⃣ Connexion...');
    const loginResult = await request('POST', '/auth/login', {
      email: registerData.email,
      password: registerData.password
    });

    if (loginResult.status === 200) {
      console.log('✅ Connecté');
      authToken = loginResult.data.token;
    } else {
      console.log('❌ Échec connexion');
      return;
    }

    // Étape 3: Vérifier si wallet existe
    console.log('\n3️⃣ Vérification du wallet...');
    const checkResult = await request('GET', '/api/users/wallet', null, authToken);
    
    if (checkResult.status === 200) {
      if (checkResult.data.hasWallet) {
        console.log('✅ Wallet existe:', checkResult.data.wallet.accountId);
        walletAccountId = checkResult.data.wallet.accountId;
      } else {
        console.log('📭 Pas de wallet (normal pour nouvel utilisateur)');
      }
    }

    // Étape 4: Créer un wallet
    if (!walletAccountId) {
      console.log('\n4️⃣ Création d\'un nouveau wallet Hedera...');
      console.log('⏳ Cela peut prendre 5-10 secondes...');
      
      const createResult = await request('POST', '/api/users/wallet/create', {}, authToken);
      
      if (createResult.status === 201) {
        console.log('✅ Wallet créé avec succès!');
        console.log('📍 Account ID:', createResult.data.wallet.accountId);
        console.log('🔑 Public Key:', createResult.data.wallet.publicKey);
        console.log('🔒 Private Key:', createResult.data.wallet.privateKey.substring(0, 20) + '...');
        console.log('🌐 Explorer:', createResult.data.wallet.explorerUrl);
        console.log('\n⚠️  IMPORTANT:', createResult.data.wallet.warning);
        
        walletAccountId = createResult.data.wallet.accountId;
      } else {
        console.log('❌ Échec création:', createResult.data.message);
        return;
      }
    }

    // Étape 5: Vérifier le wallet créé
    console.log('\n5️⃣ Vérification du wallet créé...');
    const verifyResult = await request('GET', '/api/users/wallet', null, authToken);
    
    if (verifyResult.status === 200 && verifyResult.data.hasWallet) {
      console.log('✅ Wallet confirmé');
      console.log('   Account ID:', verifyResult.data.wallet.accountId);
      console.log('   Créé le:', verifyResult.data.wallet.createdAt);
    }

    // Étape 6: Vérifier le solde
    console.log('\n6️⃣ Vérification du solde...');
    const balanceResult = await request('GET', '/api/users/wallet/balance', null, authToken);
    
    if (balanceResult.status === 200) {
      console.log('✅ Solde récupéré');
      console.log('   FIT Tokens (local):', balanceResult.data.balance.local);
    }

    // Résumé
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TEST WALLET MANAGEMENT RÉUSSI!');
    console.log('═'.repeat(60));
    console.log('\n📊 Résumé:');
    console.log(`   ✓ User ID: ${userId}`);
    console.log(`   ✓ Wallet: ${walletAccountId}`);
    console.log(`   ✓ Explorer: https://hashscan.io/testnet/account/${walletAccountId}`);
    console.log('\n💡 Prochaine étape: Intégrer rewards automatiques!');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

testWalletManagement();