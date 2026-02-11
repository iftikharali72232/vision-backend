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

async function runTests() {
  console.log('\n===== POS BACKEND API TESTING =====\n');
  
  const results = [];
  let token, branchId;

  // 1. Login
  console.log('1. Testing POST /auth/login...');
  try {
    const loginRes = await fetchJson('POST', '/auth/login', { email: 'admin@pos.test', password: '123456' });
    results.push({ api: 'POST /auth/login', status: loginRes.status, pass: loginRes.status === 200 });
    console.log('   Status:', loginRes.status, loginRes.status === 200 ? '✓' : '✗');
    if (loginRes.status !== 200) {
      console.log('   Error:', loginRes.data.message);
      console.log('\n❌ Cannot continue without login\n');
      return;
    }
    token = loginRes.data.data.token;
    branchId = loginRes.data.data.shops[0]?.branches[0]?.id || 1;
    console.log('   Token received, Branch ID:', branchId);
  } catch(e) {
    console.log('   Error:', e.message);
    return;
  }

  const extraHeaders = { 'X-Branch-Id': branchId };

  // Test endpoints
  const endpoints = [
    { method: 'GET', path: '/auth/me', name: 'Get Current User', needsBranch: false },
    { method: 'GET', path: '/dashboard', name: 'Dashboard', needsBranch: true },
    { method: 'GET', path: '/dashboard/sales', name: 'Sales Stats', needsBranch: true },
    { method: 'GET', path: '/dashboard/top-products', name: 'Top Products', needsBranch: true },
    { method: 'GET', path: '/dashboard/low-stock', name: 'Low Stock', needsBranch: true },
    { method: 'GET', path: '/products', name: 'Products List', needsBranch: true },
    { method: 'GET', path: '/products/pos', name: 'Products for POS', needsBranch: true },
    { method: 'GET', path: '/categories', name: 'Categories', needsBranch: true },
    { method: 'GET', path: '/orders', name: 'Orders List', needsBranch: true },
    { method: 'GET', path: '/customers', name: 'Customers List', needsBranch: true },
    { method: 'GET', path: '/tables', name: 'Tables List', needsBranch: true },
    { method: 'GET', path: '/inventory/stock', name: 'Inventory Stock', needsBranch: true },
    { method: 'GET', path: '/accounting/accounts', name: 'Accounts List', needsBranch: true },
    { method: 'GET', path: '/users', name: 'Users List', needsBranch: false },
    { method: 'GET', path: '/settings', name: 'Settings', needsBranch: true },
    { method: 'GET', path: '/notifications', name: 'Notifications', needsBranch: false },
    { method: 'GET', path: '/menus', name: 'Menus', needsBranch: true },
    { method: 'GET', path: '/held-orders', name: 'Held Orders', needsBranch: true },
    { method: 'GET', path: '/reports/sales', name: 'Sales Report', needsBranch: true },
    { method: 'GET', path: '/reports/sales/summary', name: 'Sales Summary', needsBranch: true },
    { method: 'GET', path: '/reports/sales/daily', name: 'Daily Sales', needsBranch: true },
    { method: 'GET', path: '/reports/tax', name: 'Tax Report', needsBranch: true },
    { method: 'GET', path: '/reports/profit-loss', name: 'Profit Loss', needsBranch: true },
    { method: 'GET', path: '/reports/inventory', name: 'Inventory Report', needsBranch: true },
    { method: 'GET', path: '/branches', name: 'Branches', needsBranch: false },
  ];

  for (let i = 0; i < endpoints.length; i++) {
    const ep = endpoints[i];
    console.log(`\n${i + 2}. Testing ${ep.method} ${ep.path} (${ep.name})...`);
    try {
      const headers = ep.needsBranch ? extraHeaders : {};
      const res = await fetchJson(ep.method, ep.path, null, token, headers);
      const pass = res.status >= 200 && res.status < 300;
      results.push({ api: `${ep.method} ${ep.path}`, status: res.status, pass });
      console.log('   Status:', res.status, pass ? '✓' : '✗');
      if (!pass) {
        console.log('   Error:', res.data?.message || res.data?.error || JSON.stringify(res.data).substring(0, 100));
      }
    } catch(e) {
      results.push({ api: `${ep.method} ${ep.path}`, status: 0, pass: false });
      console.log('   Error:', e.message);
    }
  }

  // Summary
  console.log('\n\n===== TEST SUMMARY =====\n');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.log('Failed APIs:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  - ${r.api} (${r.status})`);
    });
  }
  
  console.log('\n');
}

runTests().catch(console.error);
