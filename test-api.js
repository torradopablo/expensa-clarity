// Test script for new Next.js API endpoints
// Run with: node test-api.js

const API_BASE = 'http://localhost:3000/api';

// Test data
const testData = {
  analysis: {
    period: 'Enero 2026',
    unit: 'A-101',
    notes: 'Test analysis'
  },
  imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==', // 1x1 transparent PNG
  mimeType: 'image/png'
};

async function testEndpoint(path, method = 'GET', body = null, token = null) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`\n🧪 Testing ${method} ${path}`);
    console.log('Request:', options);
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log('Response:', data);
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`❌ Error testing ${path}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...\n');

  // Test 1: Health check (if implemented)
  await testEndpoint('/health');

  // Test 2: Create analysis (requires auth)
  console.log('\n⚠️  Note: The following tests require authentication');
  console.log('Please get a token from Supabase auth and update the TOKEN variable\n');
  
  const TOKEN = process.env.TEST_TOKEN || 'YOUR_TOKEN_HERE';
  
  if (TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('⏭️  Skipping authenticated tests - no token provided');
    return;
  }

  // Test 3: Create analysis
  const createResult = await testEndpoint('/analyses', 'POST', testData.analysis, TOKEN);
  
  if (createResult.success && createResult.data.data?.id) {
    const analysisId = createResult.data.data.id;
    console.log(`\n📝 Created analysis with ID: ${analysisId}`);

    // Test 4: Process expense
    await testEndpoint(`/analyses/${analysisId}/process`, 'POST', {
      imageBase64: testData.imageBase64,
      mimeType: testData.mimeType
    }, TOKEN);

    // Test 5: Get analysis
    await testEndpoint(`/analyses/${analysisId}`, 'GET', null, TOKEN);

    // Test 6: List analyses
    await testEndpoint('/analyses?limit=10&offset=0', 'GET', null, TOKEN);

    // Test 7: Create payment
    await testEndpoint('/payments/create', 'POST', {
      analysisId,
      successUrl: 'http://localhost:3000/success',
      failureUrl: 'http://localhost:3000/failure'
    }, TOKEN);
  }

  // Test 8: Webhook (no auth required)
  await testEndpoint('/payments/webhook', 'POST', {
    type: 'payment',
    data: { id: 'test_payment_id' }
  });

  console.log('\n✅ Tests completed!');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start the server with:');
    console.log('   npm run dev:all');
    console.log('   or');
    console.log('   npm run dev:api');
    process.exit(1);
  }

  await runTests();
}

main().catch(console.error);
