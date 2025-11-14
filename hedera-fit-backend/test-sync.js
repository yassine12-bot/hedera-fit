require('dotenv').config();
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000';

async function testSync() {
  console.log('🧪 TEST DE SYNC\n');

  try {
    // 1. Login d'abord (ou créer un compte)
    console.log('🔐 Login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test95@test.com',
        password: '123456'
        
      })
    });

    let loginData = await loginResponse.json();
    
    // Si le compte n'existe pas, créer
    if (!loginData.success) {
      console.log('📝 Création de compte...');
      const registerResponse = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test95@test.com',
          password: '123456'
        })
      });
      
      loginData = await registerResponse.json();
    }

    if (!loginData.success) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.log('✅ Connecté!\n');

    // 2. Sync des pas
    console.log('👟 Sync de 10000 pas...');
    const syncResponse = await fetch(`${API_URL}/api/shoes/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        deviceId: `TEST_${Date.now()}`,
        steps: 10000,
        distance: 8,
        calories: 400
      })
    });

    const syncData = await syncResponse.json();
    
    if (syncData.success) {
      console.log('✅ Sync réussi!');
      console.log(`💰 Reward: ${syncData.data.reward} FIT`);
      console.log(`📊 Nouveau balance: ${syncData.data.newBalance} FIT`);
      console.log(`👟 Total steps: ${syncData.data.totalSteps}`);
      
      if (syncData.data.blockchain?.activityLogged) {
        console.log('📝 Activity logged on blockchain! ✅');
      }
    } else {
      console.error('❌ Sync failed:', syncData);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testSync();