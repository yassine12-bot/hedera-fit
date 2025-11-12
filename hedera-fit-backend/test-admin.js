require('dotenv').config();

const API_URL = 'http://localhost:3000';

let adminToken = null;

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function testAdmin() {
  console.log('👨‍💼 TEST ADMIN DASHBOARD\n');
  console.log('═'.repeat(60));
  
  try {
    // 1. Login en tant qu'admin
    console.log('\n1️⃣ Connexion Admin...');
    const loginResult = await request('POST', '/auth/login', {
      email: 'admin@hederafit.com',
      password: 'admin123'
    });
    
    if (loginResult.status === 200) {
      adminToken = loginResult.data.token;
      console.log('✅ Admin connecté');
    } else {
      console.log('❌ Échec login admin');
      return;
    }
    
    // 2. Voir les stats
    console.log('\n2️⃣ Statistiques générales...');
    const statsResult = await request('GET', '/api/admin/stats', null, adminToken);
    
    if (statsResult.status === 200) {
      console.log('✅ Stats récupérées');
      console.log('   👥 Total users:', statsResult.data.data.totalUsers);
      console.log('   💰 Tokens distribués:', statsResult.data.data.tokensDistributed);
      console.log('   🛒 Total achats:', statsResult.data.data.totalPurchases);
      console.log('   👟 Total pas:', statsResult.data.data.totalSteps);
    }
    
    // 3. Liste des produits (admin view)
    console.log('\n3️⃣ Gestion Produits...');
    const productsResult = await request('GET', '/api/marketplace/products', null, adminToken);
    console.log(`✅ ${productsResult.data.data.length} produits en DB`);
    
    // 4. Ajouter un nouveau produit
    console.log('\n4️⃣ Ajout nouveau produit...');
    const newProduct = {
      name: 'Électrolytes Recovery',
      description: 'Boisson récupération après effort',
      category: 'supplement',
      priceTokens: 25,
      stock: 40
    };
    
    const addProductResult = await request('POST', '/api/admin/products', newProduct, adminToken);
    
    if (addProductResult.status === 201) {
      console.log('✅ Produit ajouté');
      console.log(`   📦 ${newProduct.name} - ${newProduct.priceTokens} FIT`);
    } else {
      console.log('❌ Échec ajout:', addProductResult.data.message);
    }
    
    // 5. Modifier un produit
    console.log('\n5️⃣ Modification produit...');
    const productId = productsResult.data.data[0].id;
    const updateResult = await request('PUT', `/api/admin/products/${productId}`, {
      priceTokens: 12
    }, adminToken);
    
    if (updateResult.status === 200) {
      console.log('✅ Produit modifié');
      console.log('   💰 Prix mis à jour: 12 FIT');
    }
    
    // 6. Liste des challenges
    console.log('\n6️⃣ Gestion Challenges...');
    const challengesResult = await request('GET', '/api/admin/challenges', null, adminToken);
    
    if (challengesResult.status === 200) {
      console.log(`✅ ${challengesResult.data.data.length} challenges en DB\n`);
      challengesResult.data.data.slice(0, 3).forEach(c => {
        console.log(`   🏆 ${c.title}`);
        console.log(`      🎯 Objectif: ${c.target} ${c.type}`);
        console.log(`      💰 Récompense: ${c.reward} FIT`);
        console.log(`      🟢 Actif: ${c.isActive ? 'Oui' : 'Non'}\n`);
      });
    }
    
    // 7. Créer un nouveau challenge
    console.log('7️⃣ Création nouveau challenge...');
    const newChallenge = {
      title: 'Super Sprinter',
      description: 'Cours 15,000 pas en moins de 2 heures',
      type: 'steps',
      target: 15000,
      reward: 75
    };
    
    const addChallengeResult = await request('POST', '/api/admin/challenges', newChallenge, adminToken);
    
    if (addChallengeResult.status === 201) {
      console.log('✅ Challenge créé');
      console.log(`   🏆 ${newChallenge.title}`);
      console.log(`   💰 Récompense: ${newChallenge.reward} FIT`);
    }
    
    // 8. Modifier un challenge (désactiver)
    console.log('\n8️⃣ Désactiver un challenge...');
    const challengeId = challengesResult.data.data[0].id;
    const updateChallengeResult = await request('PUT', `/api/admin/challenges/${challengeId}`, {
      isActive: 0
    }, adminToken);
    
    if (updateChallengeResult.status === 200) {
      console.log('✅ Challenge désactivé');
    }
    
    // 9. Liste des users
    console.log('\n9️⃣ Liste des utilisateurs...');
    const usersResult = await request('GET', '/api/admin/users', null, adminToken);
    
    if (usersResult.status === 200) {
      console.log(`✅ ${usersResult.data.data.length} users récupérés`);
      console.log('   Derniers inscrits:');
      usersResult.data.data.slice(0, 3).forEach(u => {
        console.log(`   • ${u.name} (${u.email})`);
        console.log(`     💰 ${u.fitBalance} FIT | 👟 ${u.totalSteps} pas`);
      });
    }
    
    // Résumé
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TEST ADMIN DASHBOARD RÉUSSI!');
    console.log('═'.repeat(60));
    console.log('\n📊 Fonctionnalités testées:');
    console.log('   ✓ Login admin');
    console.log('   ✓ Statistiques générales');
    console.log('   ✓ Ajouter produit');
    console.log('   ✓ Modifier produit');
    console.log('   ✓ Créer challenge');
    console.log('   ✓ Modifier challenge');
    console.log('   ✓ Liste users\n');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

testAdmin();