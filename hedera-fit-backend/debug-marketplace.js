require('dotenv').config();

const API_URL = 'http://localhost:3000';

async function quickTest() {
  console.log('🔍 Test Debug Marketplace API\n');
  
  try {
    // 1. Register
    const email = `debug_${Date.now()}@test.com`;
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Debug User',
        email,
        password: 'password123'
      })
    });
    const registerData = await registerRes.json();
    console.log('1. Register:', registerRes.status, registerData.success ? '✅' : '❌');
    
    // 2. Login
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('2. Login:', loginRes.status, token ? '✅' : '❌');
    
    // 3. Get Products - LE TEST IMPORTANT
    console.log('\n3. Test GET /api/marketplace/products');
    const productsRes = await fetch(`${API_URL}/api/marketplace/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('   Status:', productsRes.status);
    console.log('   Headers:', Object.fromEntries(productsRes.headers));
    
    const productsData = await productsRes.json();
    console.log('   Response Body:', JSON.stringify(productsData, null, 2));
    
    if (productsData.success && productsData.data) {
      console.log('\n✅ API FONCTIONNE!');
      console.log(`   ${productsData.data.length} produits retournés`);
      console.log('   Premier produit:', productsData.data[0].name);
    } else {
      console.log('\n❌ PROBLÈME API!');
      console.log('   Response complète:', productsData);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
  }
}

quickTest();