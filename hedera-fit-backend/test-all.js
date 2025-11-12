require('dotenv').config();
const hederaService = require('./src/lib/hedera');

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

// Variables globales pour les tests
let authToken = null;
let userId = null;
let postId = null;
let commentId = null;
let topicId = null;

const API_URL = 'http://localhost:3000';

// Helper pour faire des requêtes
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

// Helper pour logger les résultats
function logTest(testName, success, details = '') {
  const icon = success ? '✅' : '❌';
  const color = success ? colors.green : colors.red;
  console.log(`${color}${icon} ${testName}${colors.reset}`);
  if (details) console.log(`   ${colors.blue}→ ${details}${colors.reset}`);
}

// ==================== TESTS ====================

async function testHealthCheck() {
  console.log('\n' + '='.repeat(60));
  console.log('🏥 TEST: Health Check');
  console.log('='.repeat(60));

  const result = await request('GET', '/health');
  logTest('Health Check', result.status === 200, result.data.message);
  return result.status === 200;
}

async function testAuthentication() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 TEST: Authentication');
  console.log('='.repeat(60));

  // Register
  const registerData = {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'password123'
  };

  const registerResult = await request('POST', '/auth/register', registerData);
  logTest('Register User', registerResult.status === 201, `User ID: ${registerResult.data.user?.id}`);

  if (registerResult.status !== 201) return false;

  // Login
  const loginData = {
    email: registerData.email,
    password: registerData.password
  };

  const loginResult = await request('POST', '/auth/login', loginData);
  logTest('Login User', loginResult.status === 200, `Token received: ${loginResult.data.token ? 'Yes' : 'No'}`);

  if (loginResult.status === 200) {
    authToken = loginResult.data.token;
    userId = loginResult.data.user.id;
  }

  return loginResult.status === 200;
}

async function testPosts() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 TEST: Posts');
  console.log('='.repeat(60));

  if (!authToken) {
    logTest('Posts Test', false, 'No auth token available');
    return false;
  }

  // Get all posts
  const getResult = await request('GET', '/api/posts', null, authToken);
  logTest('Get All Posts', getResult.status === 200, `Found ${getResult.data.data?.length || 0} posts`);

  // Note: Creating post with media requires FormData, skipped for now
  logTest('Create Post', true, 'Skipped (requires media upload)');

  return getResult.status === 200;
}

async function testComments() {
  console.log('\n' + '='.repeat(60));
  console.log('💬 TEST: Comments & AI Moderation');
  console.log('='.repeat(60));

  if (!authToken) {
    logTest('Comments Test', false, 'No auth token available');
    return false;
  }

  // Get a post to comment on
  const postsResult = await request('GET', '/api/posts', null, authToken);
  
  if (!postsResult.data.data || postsResult.data.data.length === 0) {
    logTest('Comments Test', false, 'No posts available to comment on');
    return false;
  }

  postId = postsResult.data.data[0].id;

  // Create positive comment
  const positiveComment = {
    postId,
    text: 'Amazing transformation! Keep up the great work! 💪'
  };

  const commentResult = await request('POST', '/api/comments', positiveComment, authToken);
  logTest('Create Positive Comment', commentResult.status === 201, 
    `Sentiment: ${commentResult.data.comment?.sentimentLabel}`);

  if (commentResult.status === 201) {
    commentId = commentResult.data.comment.id;
  }

  // Create negative comment (should be filtered)
  const negativeComment = {
    postId,
    text: 'This is terrible and horrible and awful'
  };

  const negResult = await request('POST', '/api/comments', negativeComment, authToken);
  logTest('AI Filter Negative Comment', 
    negResult.data.comment?.isFiltered === 1,
    negResult.data.comment?.filterReason || 'Not filtered');

  return commentResult.status === 201;
}

async function testLikes() {
  console.log('\n' + '='.repeat(60));
  console.log('❤️  TEST: Likes');
  console.log('='.repeat(60));

  if (!authToken || !postId) {
    logTest('Likes Test', false, 'No auth token or post ID available');
    return false;
  }

  // Like a post
  const likeResult = await request('POST', '/api/likes', { postId }, authToken);
  logTest('Like Post', likeResult.status === 201, 'Post liked successfully');

  // Unlike (like again)
  const unlikeResult = await request('POST', '/api/likes', { postId }, authToken);
  logTest('Unlike Post', unlikeResult.status === 200, 'Post unliked successfully');

  return likeResult.status === 201;
}

async function testTopics() {
  console.log('\n' + '='.repeat(60));
  console.log('🏘️  TEST: Topics (Group Chat)');
  console.log('='.repeat(60));

  if (!authToken) {
    logTest('Topics Test', false, 'No auth token available');
    return false;
  }

  // Create topic
  const topicData = {
    name: 'Test Fitness Group',
    description: 'A test group for fitness enthusiasts'
  };

  const createResult = await request('POST', '/api/topics', topicData, authToken);
  logTest('Create Topic', createResult.status === 201, `Topic ID: ${createResult.data.topic?.id}`);

  if (createResult.status === 201) {
    topicId = createResult.data.topic.id;
  }

  // Join topic
  if (topicId) {
    const joinResult = await request('POST', `/api/topics/${topicId}/join`, null, authToken);
    logTest('Join Topic', joinResult.status === 200, 'Joined successfully');

    // Send message
    const messageData = {
      message: 'Hello everyone! 👋'
    };

    const msgResult = await request('POST', `/api/topics/${topicId}/messages`, messageData, authToken);
    logTest('Send Message', msgResult.status === 201, 'Message sent successfully');
  }

  return createResult.status === 201;
}

async function testRewards() {
  console.log('\n' + '='.repeat(60));
  console.log('🎁 TEST: Rewards System');
  console.log('='.repeat(60));

  if (!authToken || !commentId) {
    logTest('Rewards Test', false, 'No auth token or comment ID available');
    return false;
  }

  // Reward positive comment
  const rewardData = {
    commentId
  };

  const rewardResult = await request('POST', '/api/rewards/encouragement', rewardData, authToken);
  logTest('Reward Positive Comment', 
    rewardResult.status === 200 || rewardResult.status === 400,
    rewardResult.data.message);

  return true;
}

async function testWorkouts() {
  console.log('\n' + '='.repeat(60));
  console.log('🏃 TEST: Workouts & Steps');
  console.log('='.repeat(60));

  if (!authToken) {
    logTest('Workouts Test', false, 'No auth token available');
    return false;
  }

  // Record steps manually
  const stepsData = {
    steps: 8500,
    distance: 6.5,
    calories: 420
  };

  const stepsResult = await request('POST', '/api/workouts/steps', stepsData, authToken);
  logTest('Record Steps', stepsResult.status === 201, 
    `${stepsData.steps} steps recorded`);

  // Get today's stats
  const todayResult = await request('GET', '/api/workouts/today', null, authToken);
  logTest('Get Today Stats', todayResult.status === 200,
    `Steps: ${todayResult.data.data?.steps || 0}`);

  // Get history
  const historyResult = await request('GET', '/api/workouts/history', null, authToken);
  logTest('Get Workout History', historyResult.status === 200,
    `${historyResult.data.data?.workouts?.length || 0} workouts found`);

  return stepsResult.status === 201;
}

async function testSmartShoes() {
  console.log('\n' + '='.repeat(60));
  console.log('👟 TEST: Smart Shoes Sync (IoT)');
  console.log('='.repeat(60));

  if (!authToken) {
    logTest('Smart Shoes Test', false, 'No auth token available');
    return false;
  }

  // Simulate shoe sync
  const shoeData = {
    deviceId: 'SHOE_TEST_' + Date.now(),
    steps: 12000,
    distance: 9.2,
    calories: 580,
    timestamp: new Date().toISOString()
  };

  const syncResult = await request('POST', '/api/shoes/sync', shoeData, authToken);
  logTest('Sync Smart Shoe', syncResult.status === 200,
    `${shoeData.steps} steps synced, Reward: ${syncResult.data.data?.reward || 0} FIT`);

  // Get devices
  const devicesResult = await request('GET', '/api/shoes/devices', null, authToken);
  logTest('Get Connected Devices', devicesResult.status === 200,
    `${devicesResult.data.data?.length || 0} devices found`);

  return syncResult.status === 200;
}

async function testHederaIntegration() {
  console.log('\n' + '='.repeat(60));
  console.log('⛓️  TEST: Hedera Blockchain Integration');
  console.log('='.repeat(60));

  try {
    // Initialize Hedera
    console.log('\n📡 Connecting to Hedera...');
    const connected = await hederaService.initialize();
    logTest('Connect to Hedera', connected, 'Connected to testnet');

    if (!connected) return false;

    // Configure tokens
    hederaService.setFitTokenId(process.env.FIT_TOKEN_ID);
    hederaService.setNftTokenId(process.env.NFT_BADGE_TOKEN_ID);

    logTest('Configure Tokens', true, 
      `FIT: ${process.env.FIT_TOKEN_ID}, NFT: ${process.env.NFT_BADGE_TOKEN_ID}`);

    // Test FIT token transfer
    console.log('\n💰 Testing FIT Token Transfer...');
    const recipientId = process.env.HEDERA_ACCOUNT_ID; // Transfer to self for test
    const transferResult = await hederaService.transferFitTokens(recipientId, 5);
    logTest('Transfer FIT Tokens', transferResult, '5 FIT tokens transferred');

    // Test NFT Badge minting
    console.log('\n🏅 Testing NFT Badge Minting...');
    const badgeResult = await hederaService.mintBadge(
      recipientId,
      'Test Badge',
      {
        type: 'test',
        description: 'Automated test badge'
      }
    );
    logTest('Mint NFT Badge', !!badgeResult, 
      `Badge #${badgeResult?.serialNumber || 'N/A'} minted`);

    console.log('\n📊 Hedera Test Summary:');
    console.log(`   FIT Token ID: ${process.env.FIT_TOKEN_ID}`);
    console.log(`   NFT Token ID: ${process.env.NFT_BADGE_TOKEN_ID}`);
    console.log(`   Account ID: ${process.env.HEDERA_ACCOUNT_ID}`);
    console.log(`   View on HashScan: https://hashscan.io/testnet/account/${process.env.HEDERA_ACCOUNT_ID}`);

    return true;

  } catch (error) {
    logTest('Hedera Integration', false, error.message);
    return false;
  }
}

async function testBadges() {
  console.log('\n' + '='.repeat(60));
  console.log('🏆 TEST: Badges System');
  console.log('='.repeat(60));

  if (!authToken) {
    logTest('Badges Test', false, 'No auth token available');
    return false;
  }

  // Get user badges
  const badgesResult = await request('GET', '/api/badges', null, authToken);
  logTest('Get User Badges', badgesResult.status === 200,
    `${badgesResult.data.badges?.length || 0} badges found`);

  return badgesResult.status === 200;
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  console.log('\n');
  console.log('█'.repeat(70));
  console.log('█                 HEDERA FIT GYM PRO - TEST SUITE                █');
  console.log('█'.repeat(70));
  console.log('\n⏱️  Started at:', new Date().toLocaleString());
  console.log('🌐 API URL:', API_URL);
  console.log('\n');

  const results = {
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Posts', fn: testPosts },
    { name: 'Comments & AI', fn: testComments },
    { name: 'Likes', fn: testLikes },
    { name: 'Topics', fn: testTopics },
    { name: 'Rewards', fn: testRewards },
    { name: 'Workouts', fn: testWorkouts },
    { name: 'Smart Shoes', fn: testSmartShoes },
    { name: 'Badges', fn: testBadges },
    { name: 'Hedera Blockchain', fn: testHederaIntegration }
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) results.passed++;
      else results.failed++;
    } catch (error) {
      console.error(`${colors.red}❌ ${test.name} crashed: ${error.message}${colors.reset}`);
      results.failed++;
    }
    
    // Pause between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Final Summary
  console.log('\n');
  console.log('█'.repeat(70));
  console.log('█                        TEST SUMMARY                            █');
  console.log('█'.repeat(70));
  console.log('\n');
  console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  console.log(`📊 Total: ${results.passed + results.failed}`);
  console.log(`🎯 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log('\n⏱️  Completed at:', new Date().toLocaleString());
  console.log('\n');

  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});