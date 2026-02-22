const http = require('http');

async function fetchJson(method, path, body = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/v1' + path,
      method: method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    if (headers['X-Branch-Id']) options.headers['X-Branch-Id'] = headers['X-Branch-Id'];

    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function testInventoryAdjustment() {
  console.log('Testing Inventory Stock Adjustment...\n');

  let token, branchId;

  // 1. Login
  console.log('1. Logging in...');
  try {
    const loginRes = await fetchJson('POST', '/auth/login', {
      email: 'admin@pos.test',
      password: '123456'
    });
    console.log('   Status:', loginRes.status);
    if (loginRes.status !== 200) {
      console.log('   Error:', loginRes.data.message);
      return;
    }
    token = loginRes.data.data.token;
    branchId = loginRes.data.data.shops[0]?.branches[0]?.id || 1;
    console.log('   ✓ Login successful, Branch ID:', branchId);
  } catch(e) {
    console.log('   ✗ Login failed:', e.message);
    return;
  }

  // 2. Get a product to test with
  console.log('\n2. Getting products...');
  try {
    const productsRes = await fetchJson('GET', '/products', null, token, { 'X-Branch-Id': branchId });
    console.log('   Status:', productsRes.status);
    if (productsRes.status !== 200) {
      console.log('   Error:', productsRes.data.message);
      return;
    }
    const products = productsRes.data.data.items;
    if (!products || products.length === 0) {
      console.log('   ✗ No products found');
      return;
    }
    const testProduct = products[0];
    console.log('   ✓ Found product:', testProduct.name, '(ID:', testProduct.id + ')');
  } catch(e) {
    console.log('   ✗ Failed to get products:', e.message);
    return;
  }

  // 3. Test inventory stock adjustment
  console.log('\n3. Testing stock adjustment...');
  try {
    const adjustmentData = {
      adjustment_type: 'add',
      quantity: 5,
      reason: 'test adjustment',
      notes: 'Testing the fixed inventory adjustment endpoint'
    };

    const adjustRes = await fetchJson('POST', `/inventory/stock/${testProduct.id}/adjust`,
      adjustmentData, token, { 'X-Branch-Id': branchId });

    console.log('   Status:', adjustRes.status);
    if (adjustRes.status === 200) {
      console.log('   ✓ Stock adjustment successful!');
      console.log('   Response:', JSON.stringify(adjustRes.data, null, 2));
    } else {
      console.log('   ✗ Stock adjustment failed');
      console.log('   Error:', adjustRes.data.message || adjustRes.data);
    }
  } catch(e) {
    console.log('   ✗ Request failed:', e.message);
  }
}

testInventoryAdjustment();