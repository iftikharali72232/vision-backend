const { PrismaClient } = require('@prisma/client');
const { buildTenantDatabaseUrl } = require('../utils/mysqlUrl');

const masterUrl = process.env.DATABASE_URL;
if (!masterUrl) {
  throw new Error('DATABASE_URL is required');
}

const masterPrisma = new PrismaClient({
  datasources: { db: { url: masterUrl } },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

const tenantClients = new Map();

function getTenantPrismaByDbName(dbName) {
  // If dbName is the same as master DB, return master prisma
  const { parseMysqlUrl } = require('../utils/mysqlUrl');
  const masterDbName = parseMysqlUrl(masterUrl).database;
  
  if (!dbName || dbName === masterDbName) {
    return masterPrisma;
  }
  
  const tenantUrl = buildTenantDatabaseUrl(masterUrl, dbName);

  if (tenantClients.has(tenantUrl)) return tenantClients.get(tenantUrl);

  const client = new PrismaClient({
    datasources: { db: { url: tenantUrl } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });

  tenantClients.set(tenantUrl, client);
  return client;
}

// The proxy now just returns masterPrisma since we use req.tenantPrisma for tenant-specific queries
// This maintains backward compatibility for services that don't need tenant isolation
const prisma = masterPrisma;

module.exports = {
  masterPrisma,
  prisma,
  getTenantPrismaByDbName
};
