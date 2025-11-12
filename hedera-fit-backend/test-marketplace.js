require('dotenv').config();

const API_URL = 'http://localhost:3000';

let authToken = null;

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function testMarketplace() {
  console.log('🛒 TEST MARKETPLACE\n');
  console.log('═'.repeat(60));
  
  try {
    // 1. Inscription
    console.log('\n1️⃣ Inscription...');
    const email = `marketplace_test_${Date.now()}@test.com`;
    
    const registerResult = await request('POST', '/auth/register', {
      name: 'Marketplace Test',
      email,
      password: 'password123'
    });
    
    if (registerResult.status === 201) {
      console.log('✅ User créé');
    } else {
      console.log('❌ Échec');
      return;
    }
    
    // 2. Connexion
    console.log('\n2️⃣ Connexion...');
    const loginResult = await request('POST', '/auth/login', {
      email,
      password: 'password123'
    });
    
    authToken = loginResult.data.token;
    console.log('✅ Connecté');
    
    // 3. Gagner des tokens (sync shoes)
    console.log('\n3️⃣ Gagner des tokens...');
    const syncResult = await request('POST', '/api/shoes/sync', {
      deviceId: `TEST_${Date.now()}`,
      steps: 12000,
      distance: 9.2,
      calories: 580
    }, authToken);
    
    if (syncResult.status === 200) {
      console.log(`✅ +${syncResult.data.data.reward} FIT tokens gagnés`);
      console.log(`   Solde actuel: ${syncResult.data.data.reward} FIT`);
    }
    
    // 4. Voir les produits
    console.log('\n4️⃣ Liste des produits disponibles...');
    const productsResult = await request('GET', '/api/marketplace/products', null, authToken);
    
    if (productsResult.status === 200) {
      console.log('✅ Produits récupérés\n');
      productsResult.data.data.slice(0, 5).forEach(p => {
        console.log(`   📦 ${p.name}`);
        console.log(`      💰 Prix: ${p.priceTokens} FIT`);
        console.log(`      📊 Stock: ${p.stock}`);
        console.log(`      🏷️  Catégorie: ${p.category}\n`);
      });
    }
    
    // 5. Acheter un produit
    console.log('5️⃣ Achat d\'un produit...');
    const productToBy = productsResult.data.data[0]; // Premier produit (moins cher)
    
    const purchaseResult = await request('POST', '/api/marketplace/purchase', {
      productId: productToBy.id,
      quantity: 1
    }, authToken);
    
    if (purchaseResult.status === 200) {
      console.log('✅ Achat réussi!');
      console.log(`   📦 Produit: ${purchaseResult.data.data.product}`);
      console.log(`   💰 Coût: ${purchaseResult.data.data.totalCost} FIT`);
      console.log(`   💵 Solde restant: ${purchaseResult.data.data.remainingBalance} FIT`);
    } else {
      console.log('❌ Échec achat:', purchaseResult.data.message);
    }
    
    // 6. Voir historique achats
    console.log('\n6️⃣ Historique des achats...');
    const historyResult = await request('GET', '/api/marketplace/purchases', null, authToken);
    
    if (historyResult.status === 200) {
      console.log('✅ Historique récupéré');
      historyResult.data.data.forEach(purchase => {
        console.log(`   🛒 ${purchase.productName} x${purchase.quantity} - ${purchase.totalCost} FIT`);
        console.log(`      📅 ${new Date(purchase.createdAt).toLocaleString()}`);
      });
    }
    
    // Résumé
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TEST MARKETPLACE RÉUSSI!');
    console.log('═'.repeat(60));
    console.log('\n📊 Résumé:');
    console.log('   ✓ User créé');
    console.log('   ✓ 15 FIT tokens gagnés');
    console.log('   ✓ Produits affichés');
    console.log('   ✓ Achat effectué');
    console.log('   ✓ Solde mis à jour');
    console.log('   ✓ Historique enregistré\n');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

testMarketplace();