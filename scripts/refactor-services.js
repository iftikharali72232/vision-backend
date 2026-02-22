/**
 * Refactoring script to update services to accept prisma parameter
 * This script helps identify which service methods need updating
 */

const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '../src/services');
const controllersDir = path.join(__dirname, '../src/controllers');

// Services that need tenant database (exclude auth.service.js as it uses systemPrisma)
const tenantServices = [
  'product.service.js',
  'category.service.js',
  'customer.service.js',
  'order.service.js',
  'table.service.js',
  'inventory.service.js',
  'dashboard.service.js',
  'report.service.js',
  'setting.service.js',
  'menu.service.js',
  'notification.service.js',
  'branch.service.js',
  'accounting.service.js',
  'print.service.js',
  'translation.service.js',
  'user.service.js'
];

console.log('Services requiring prisma parameter:');
tenantServices.forEach(service => {
  console.log(`  - ${service}`);
});

console.log('\nTo fix:');
console.log('1. Remove: const prisma = require(\'../config/database\');');
console.log('2. Add prisma parameter as first arg to all methods');
console.log('3. Update controllers to pass req.tenantPrisma');
