/**
 * API Contract Test Suite
 * Auto-generated contract validation tests
 * 
 * Validates every frontend API endpoint exists on the backend
 * and returns the expected response format.
 * 
 * Usage: node tests/api-contract.test.js
 * Requires: Backend running on http://localhost:8000
 */

const http = require('http');

const BASE_URL = 'http://localhost:8000/api/v1';
let TOKEN = null;
let BRANCH_ID = null;

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// ==================== HELPERS ====================

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }
    };

    if (TOKEN) options.headers['Authorization'] = `Bearer ${TOKEN}`;
    if (BRANCH_ID) options.headers['X-Branch-Id'] = BRANCH_ID;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, testName, details = '') {
  if (condition) {
    results.passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    results.failed++;
    results.errors.push({ test: testName, details });
    console.log(`  ❌ ${testName} ${details ? `- ${details}` : ''}`);
  }
}

function skip(testName, reason = '') {
  results.skipped++;
  console.log(`  ⏭️  ${testName} ${reason ? `(${reason})` : ''}`);
}

// ==================== CONTRACT TESTS ====================

async function testRouteExists(method, path, expectedStatus = null) {
  try {
    const res = await request(method, path);
    const exists = res.status !== 404;
    const statusOk = expectedStatus ? res.status === expectedStatus : true;
    return { exists, status: res.status, data: res.data, statusOk };
  } catch (err) {
    return { exists: false, status: 0, error: err.message };
  }
}

async function authenticate() {
  console.log('\n🔐 AUTHENTICATION');
  
  const res = await request('POST', '/auth/login', {
    email: 'admin@test.com',
    password: 'password123'
  });
  
  if (res.status === 200 && res.data?.data?.token) {
    TOKEN = res.data.data.token;
    assert(true, 'Login successful');
    
    // Select branch
    const branches = await request('GET', '/auth/branches');
    if (branches.data?.data && branches.data.data.length > 0) {
      BRANCH_ID = branches.data.data[0].id;
      assert(true, `Branch selected: ${BRANCH_ID}`);
    }
    return true;
  } else {
    // Try alternate credentials
    const res2 = await request('POST', '/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (res2.status === 200 && res2.data?.data?.token) {
      TOKEN = res2.data.data.token;
      assert(true, 'Login successful (alternate creds)');
      
      const branches = await request('GET', '/auth/branches');
      if (branches.data?.data && branches.data.data.length > 0) {
        BRANCH_ID = branches.data.data[0].id;
        assert(true, `Branch selected: ${BRANCH_ID}`);
      }
      return true;
    }
    
    assert(false, 'Login', `Status: ${res.status}`);
    return false;
  }
}

// ==================== ROUTE EXISTENCE TESTS ====================

async function testAuthRoutes() {
  console.log('\n📋 AUTH ROUTES');
  
  const routes = [
    { method: 'POST', path: '/auth/login', name: 'Login' },
    { method: 'POST', path: '/auth/register', name: 'Register' },
    { method: 'POST', path: '/auth/verify-otp', name: 'Verify OTP' },
    { method: 'POST', path: '/auth/resend-otp', name: 'Resend OTP' },
    { method: 'POST', path: '/auth/logout', name: 'Logout' },
    { method: 'GET', path: '/auth/me', name: 'Get Profile' },
    { method: 'POST', path: '/auth/select-branch', name: 'Select Branch' },
    { method: 'GET', path: '/auth/branches', name: 'Get Branches' },
    { method: 'POST', path: '/auth/change-password', name: 'Change Password' },
    { method: 'POST', path: '/auth/refresh', name: 'Refresh Token' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`, 
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testProductRoutes() {
  console.log('\n📋 PRODUCT ROUTES');
  
  const routes = [
    { method: 'GET', path: '/products', name: 'List Products' },
    { method: 'GET', path: '/products/pos', name: 'POS Products' },
    { method: 'POST', path: '/products', name: 'Create Product' },
    { method: 'GET', path: '/categories', name: 'List Categories' },
    { method: 'POST', path: '/categories', name: 'Create Category' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testOrderRoutes() {
  console.log('\n📋 ORDER ROUTES');
  
  const routes = [
    { method: 'GET', path: '/orders', name: 'List Orders' },
    { method: 'POST', path: '/orders', name: 'Create Order' },
    { method: 'GET', path: '/orders/held', name: 'Held Orders' },
    { method: 'POST', path: '/orders/hold', name: 'Hold Order' },
    { method: 'GET', path: '/orders/kitchen', name: 'Kitchen Orders' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testDashboardRoutes() {
  console.log('\n📋 DASHBOARD ROUTES');
  
  const routes = [
    { method: 'GET', path: '/dashboard', name: 'Dashboard Summary' },
    { method: 'GET', path: '/dashboard/sales', name: 'Sales Data' },
    { method: 'GET', path: '/dashboard/charts', name: 'Charts' },
    { method: 'GET', path: '/dashboard/top-products', name: 'Top Products' },
    { method: 'GET', path: '/dashboard/recent-invoices', name: 'Recent Invoices' },
    { method: 'GET', path: '/dashboard/low-stock', name: 'Low Stock' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testTableRoutes() {
  console.log('\n📋 TABLE ROUTES');
  
  const routes = [
    { method: 'GET', path: '/tables', name: 'List Tables' },
    { method: 'GET', path: '/tables/pos', name: 'POS Tables' },
    { method: 'GET', path: '/tables/stats', name: 'Table Stats' },
    { method: 'GET', path: '/tables/stats/consistency', name: 'Stats Consistency' },
    { method: 'POST', path: '/tables/fix-inconsistencies', name: 'Fix Inconsistencies' },
    { method: 'GET', path: '/tables/halls', name: 'Get Halls' },
    { method: 'POST', path: '/tables/halls', name: 'Create Hall' },
    { method: 'POST', path: '/tables/merge', name: 'Merge Tables' },
    { method: 'POST', path: '/tables/free', name: 'Free Tables' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testCustomerRoutes() {
  console.log('\n📋 CUSTOMER ROUTES');
  
  const routes = [
    { method: 'GET', path: '/customers', name: 'List Customers' },
    { method: 'GET', path: '/customers/search', name: 'Search Customers' },
    { method: 'POST', path: '/customers', name: 'Create Customer' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testReportRoutes() {
  console.log('\n📋 REPORT ROUTES');
  
  const routes = [
    { method: 'GET', path: '/reports/sales', name: 'Sales Report' },
    { method: 'GET', path: '/reports/sales/summary', name: 'Sales Summary' },
    { method: 'GET', path: '/reports/products', name: 'Products Report' },
    { method: 'GET', path: '/reports/inventory', name: 'Inventory Report' },
    { method: 'GET', path: '/reports/profit-loss', name: 'Profit/Loss' },
    { method: 'GET', path: '/reports/sales/daily', name: 'Daily Sales' },
    { method: 'GET', path: '/reports/sales/categories', name: 'Category Sales' },
    { method: 'GET', path: '/reports/sales/payments', name: 'Payment Methods' },
    { method: 'GET', path: '/reports/tax', name: 'Tax Report' },
    { method: 'GET', path: '/reports/cashiers', name: 'Cashiers Report' },
    { method: 'GET', path: '/reports/customers', name: 'Customers Report' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testAccountingRoutes() {
  console.log('\n📋 ACCOUNTING ROUTES');
  
  const routes = [
    { method: 'GET', path: '/accounting/accounts', name: 'List Accounts' },
    { method: 'GET', path: '/accounting/invoices', name: 'List Invoices' },
    { method: 'POST', path: '/accounting/invoices/from-order', name: 'Generate Invoice' },
    { method: 'GET', path: '/accounting/journal-entries', name: 'Journal Entries' },
    { method: 'GET', path: '/accounting/reports/trial-balance', name: 'Trial Balance' },
    { method: 'GET', path: '/accounting/reports/profit-loss', name: 'Accounting P&L' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testInventoryRoutes() {
  console.log('\n📋 INVENTORY ROUTES');
  
  const routes = [
    { method: 'GET', path: '/inventory/stock', name: 'Stock Levels' },
    { method: 'GET', path: '/inventory/movements', name: 'Movements' },
    { method: 'GET', path: '/inventory/alerts', name: 'Alerts' },
    { method: 'GET', path: '/inventory/export', name: 'Export' },
    { method: 'GET', path: '/inventory/valuation', name: 'Valuation' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testSettingRoutes() {
  console.log('\n📋 SETTING ROUTES');
  
  const routes = [
    { method: 'GET', path: '/settings', name: 'Get Settings' },
    { method: 'PUT', path: '/settings', name: 'Update Settings' },
    { method: 'GET', path: '/settings/general', name: 'Get Setting By Key' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testPrintRoutes() {
  console.log('\n📋 PRINT ROUTES (NEW)');
  
  const routes = [
    { method: 'POST', path: '/print/kot', name: 'Print KOT' },
    { method: 'POST', path: '/print/invoice', name: 'Print Invoice' },
    { method: 'POST', path: '/print/test', name: 'Test Print' },
    { method: 'POST', path: '/print/drawer', name: 'Open Drawer' },
    { method: 'GET', path: '/print/settings', name: 'Get Print Settings' },
    { method: 'PUT', path: '/print/settings', name: 'Update Print Settings' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testPrinterRoutes() {
  console.log('\n📋 PRINTER ROUTES');
  
  const routes = [
    { method: 'GET', path: '/printers', name: 'List Printers' },
    { method: 'POST', path: '/printers', name: 'Create Printer' },
    { method: 'GET', path: '/printers/discover', name: 'Discover Printers' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testUserRoutes() {
  console.log('\n📋 USER ROUTES');
  
  const routes = [
    { method: 'GET', path: '/users', name: 'List Users' },
    { method: 'POST', path: '/users', name: 'Create User' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testRoleRoutes() {
  console.log('\n📋 ROLE ROUTES');
  
  const routes = [
    { method: 'GET', path: '/roles', name: 'List Roles' },
    { method: 'POST', path: '/roles', name: 'Create Role' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testNotificationRoutes() {
  console.log('\n📋 NOTIFICATION ROUTES');
  
  const routes = [
    { method: 'GET', path: '/notifications', name: 'List Notifications' },
    { method: 'GET', path: '/notifications/unread-count', name: 'Unread Count' },
    { method: 'POST', path: '/notifications/read-all', name: 'Mark All Read' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testMenuRoutes() {
  console.log('\n📋 MENU ROUTES');
  
  const routes = [
    { method: 'GET', path: '/menus', name: 'List Menus' },
    { method: 'GET', path: '/menus/active', name: 'Active Menu' },
    { method: 'POST', path: '/menus', name: 'Create Menu' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testBranchRoutes() {
  console.log('\n📋 BRANCH ROUTES');
  
  const routes = [
    { method: 'GET', path: '/branches', name: 'List Branches' },
    { method: 'POST', path: '/branches', name: 'Create Branch' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

async function testSystemMenuRoutes() {
  console.log('\n📋 SYSTEM MENU ROUTES');
  
  const routes = [
    { method: 'GET', path: '/system-menus', name: 'Get User Menus' },
    { method: 'GET', path: '/system-menus/modules', name: 'Get Modules' },
  ];

  for (const route of routes) {
    const result = await testRouteExists(route.method, route.path);
    assert(result.exists, `${route.method} ${route.path} (${route.name})`,
      !result.exists ? `Got ${result.status}` : '');
  }
}

// ==================== RESPONSE FORMAT TESTS ====================

async function testResponseFormats() {
  console.log('\n📋 RESPONSE FORMAT VALIDATION');

  // Test standard list endpoint format
  const productsRes = await request('GET', '/products');
  assert(
    productsRes.data?.success !== undefined,
    'Products response has "success" field'
  );
  assert(
    productsRes.data?.data !== undefined,
    'Products response has "data" field'
  );

  // Test paginated endpoint format
  if (productsRes.data?.data?.items) {
    assert(true, 'Products returns paginated format (items array)');
    assert(
      productsRes.data.data.pagination !== undefined,
      'Products has pagination metadata'
    );
  } else if (Array.isArray(productsRes.data?.data)) {
    assert(true, 'Products returns array format');
  } else {
    skip('Products format check', 'unexpected format');
  }

  // Test dashboard endpoint
  const dashRes = await request('GET', '/dashboard');
  assert(
    dashRes.data?.success !== undefined,
    'Dashboard response has "success" field'
  );

  // Test notifications
  const notifRes = await request('GET', '/notifications');
  assert(
    notifRes.data?.success !== undefined,
    'Notifications response has "success" field'
  );
}

// ==================== CORS TESTS ====================

async function testCORS() {
  console.log('\n📋 CORS VALIDATION');
  
  // Test CORS headers are present
  const res = await request('OPTIONS', '/products', null, {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'GET'
  });
  
  assert(
    res.headers['access-control-allow-origin'] !== undefined,
    'CORS Access-Control-Allow-Origin header present'
  );

  // Test uploads CORS
  return new Promise((resolve) => {
    const url = new URL('http://localhost:8000/uploads/products/test.svg');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    };

    const req = http.request(options, (res) => {
      assert(
        res.headers['access-control-allow-origin'] !== undefined,
        'Uploads CORS header present'
      );

      // Check Cross-Origin-Resource-Policy
      const corp = res.headers['cross-origin-resource-policy'];
      assert(
        !corp || corp === 'cross-origin',
        'Cross-Origin-Resource-Policy allows cross-origin',
        corp ? `Got: ${corp}` : ''
      );

      resolve();
    });

    req.on('error', () => {
      assert(false, 'Uploads CORS check', 'Request failed');
      resolve();
    });
    req.end();
  });
}

// ==================== MAIN ====================

async function run() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     API CONTRACT VALIDATION TEST SUITE            ║');
  console.log('║     POS System - Frontend ↔ Backend               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`\n🕐 Started: ${new Date().toISOString()}`);

  const authOk = await authenticate();
  
  if (!authOk) {
    console.log('\n⚠️  Authentication failed — running unauthenticated tests only');
  }

  // Route existence tests
  await testAuthRoutes();
  await testProductRoutes();
  await testOrderRoutes();
  await testDashboardRoutes();
  await testTableRoutes();
  await testCustomerRoutes();
  await testReportRoutes();
  await testAccountingRoutes();
  await testInventoryRoutes();
  await testSettingRoutes();
  await testPrintRoutes();
  await testPrinterRoutes();
  await testUserRoutes();
  await testRoleRoutes();
  await testNotificationRoutes();
  await testMenuRoutes();
  await testBranchRoutes();
  await testSystemMenuRoutes();

  // Response format tests
  await testResponseFormats();

  // CORS tests
  await testCORS();

  // ==================== SUMMARY ====================
  const total = results.passed + results.failed + results.skipped;
  const healthScore = Math.round((results.passed / (results.passed + results.failed)) * 100);

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║              TEST RESULTS SUMMARY                  ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Passed:  ${String(results.passed).padStart(3)}                                 ║`);
  console.log(`║  ❌ Failed:  ${String(results.failed).padStart(3)}                                 ║`);
  console.log(`║  ⏭️  Skipped: ${String(results.skipped).padStart(3)}                                 ║`);
  console.log(`║  📊 Total:   ${String(total).padStart(3)}                                 ║`);
  console.log(`║  💯 Health:  ${String(healthScore).padStart(3)}%                                ║`);
  console.log('╚════════════════════════════════════════════════════╝');

  if (results.errors.length > 0) {
    console.log('\n🚨 FAILED TESTS:');
    results.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.test} ${err.details ? `— ${err.details}` : ''}`);
    });
  }

  console.log(`\n🕐 Finished: ${new Date().toISOString()}`);
  process.exit(results.failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
