#!/usr/bin/env node
/**
 * Quick route existence check
 * Tests that all API routes respond with non-404 status
 */
const http = require('http');

function req(m, p) {
  return new Promise((resolve) => {
    const opts = {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/v1' + p,
      method: m,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    };
    const request = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    request.on('error', (e) => resolve({ status: 0, body: e.message }));
    request.on('timeout', () => {
      request.destroy();
      resolve({ status: -1, body: 'timeout' });
    });
    if (m === 'POST' || m === 'PUT') {
      request.write(JSON.stringify({}));
    }
    request.end();
  });
}

(async () => {
  const tests = [
    ['GET', '/auth/branches', 'Auth branches'],
    ['POST', '/auth/login', 'Auth login'],
    ['GET', '/products', 'Products list'],
    ['GET', '/products/pos', 'Products POS'],
    ['GET', '/categories', 'Categories'],
    ['GET', '/orders', 'Orders'],
    ['GET', '/orders/held', 'Held orders'],
    ['GET', '/dashboard', 'Dashboard'],
    ['GET', '/dashboard/sales', 'Dashboard sales'],
    ['GET', '/dashboard/top-products', 'Top products'],
    ['GET', '/tables', 'Tables'],
    ['GET', '/tables/halls', 'Halls'],
    ['GET', '/customers', 'Customers'],
    ['GET', '/reports/sales', 'Sales report'],
    ['GET', '/reports/customers', 'Customer report'],
    ['GET', '/accounting/accounts', 'Accounting'],
    ['GET', '/inventory/stock', 'Inventory stock'],
    ['GET', '/settings', 'Settings'],
    ['GET', '/settings/general', 'Settings by key'],
    ['POST', '/print/kot', 'Print KOT'],
    ['POST', '/print/invoice', 'Print Invoice'],
    ['POST', '/print/test', 'Print Test'],
    ['POST', '/print/drawer', 'Print Drawer'],
    ['GET', '/print/settings', 'Print Settings'],
    ['GET', '/printers', 'Printers'],
    ['GET', '/users', 'Users'],
    ['GET', '/roles', 'Roles'],
    ['GET', '/notifications', 'Notifications'],
    ['GET', '/menus', 'Menus'],
    ['GET', '/branches', 'Branches'],
    ['GET', '/system-menus', 'System menus'],
    ['GET', '/translations', 'Translations'],
  ];

  let pass = 0;
  let fail = 0;
  const missing = [];

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   API CONTRACT ROUTE EXISTENCE TESTS             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  for (const [method, path, label] of tests) {
    const res = await req(method, path);
    const s = res.status;
    // 401/403 = route exists but needs auth → PASS
    // 400 = route exists but validation failed → PASS
    // 200 = route exists and returned data → PASS
    // 404 = route NOT FOUND → FAIL
    // 0 = connection refused → FAIL
    const exists = s !== 404 && s !== 0 && s !== -1;
    if (exists) {
      pass++;
      console.log(`  ✅ PASS  ${method.padEnd(5)} ${path.padEnd(30)} → ${s}  (${label})`);
    } else {
      fail++;
      missing.push(`${method} ${path}`);
      console.log(`  ❌ FAIL  ${method.padEnd(5)} ${path.padEnd(30)} → ${s}  (${label})`);
    }
  }

  console.log('');
  console.log('────────────────────────────────────────────────────');
  console.log(`  RESULTS: ${pass}/${tests.length} routes exist (${Math.round((pass / tests.length) * 100)}%)`);
  if (missing.length) {
    console.log(`  MISSING: ${missing.join(', ')}`);
  }
  const score = Math.round((pass / tests.length) * 100);
  console.log(`  HEALTH SCORE: ${score}/100`);
  console.log('────────────────────────────────────────────────────');
  console.log('');

  process.exit(fail > 0 ? 1 : 0);
})();
