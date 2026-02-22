/**
 * Database Manager
 * Manages connections to system database and tenant databases
 * Uses schema-based separation within single MySQL server
 */

const { PrismaClient: SystemPrismaClient } = require('.prisma/system-client');
const { PrismaClient: TenantPrismaClient } = require('.prisma/tenant-client');

// Environment validation
const systemDbUrl = process.env.SYSTEM_DATABASE_URL;
const masterTenantUrl = process.env.DATABASE_URL;

if (!systemDbUrl) {
  console.warn('⚠️ SYSTEM_DATABASE_URL not set, using DATABASE_URL for system DB');
}

// ================== UTILITY FUNCTIONS ==================

/**
 * Parse MySQL connection URL
 * @param {string} url - MySQL connection URL
 * @returns {object} Parsed URL components
 */
function parseMysqlUrl(url) {
  const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid MySQL URL format');
  }
  
  return {
    username: match[1],
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: parseInt(match[4]),
    database: match[5].split('?')[0]
  };
}

/**
 * Build tenant database URL from base URL
 * @param {string} baseUrl - Base MySQL URL
 * @param {string} dbName - Tenant database name
 * @returns {string} Complete tenant database URL
 */
function buildTenantDatabaseUrl(baseUrl, dbName) {
  const parts = parseMysqlUrl(baseUrl);
  return `mysql://${parts.username}:${encodeURIComponent(parts.password)}@${parts.host}:${parts.port}/${dbName}`;
}

/**
 * Generate tenant database name from company ID
 * @param {number} companyId - Company ID
 * @returns {string} Tenant database name
 */
function buildTenantDbName(companyId) {
  return `tenant_${companyId}`;
}

// ================== SYSTEM DATABASE CLIENT ==================
// Single instance for system-level operations (auth, companies, menus, roles)

const systemPrisma = new SystemPrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] 
    : ['error']
});

// ================== TENANT DATABASE CLIENTS ==================
// Cached clients per tenant database

const tenantClients = new Map();

/**
 * Get or create Prisma client for a tenant database
 * @param {string} dbName - Tenant database name
 * @returns {PrismaClient} Prisma client for tenant
 */
function getTenantPrisma(dbName) {
  if (!dbName) {
    throw new Error('Tenant database name is required');
  }

  // Check cache
  if (tenantClients.has(dbName)) {
    return tenantClients.get(dbName);
  }

  // Build connection URL
  const baseUrl = masterTenantUrl || systemDbUrl;
  const tenantUrl = buildTenantDatabaseUrl(baseUrl, dbName);

  // Create new client with tenant-specific URL
  const client = new TenantPrismaClient({
    datasources: { 
      db: { url: tenantUrl } 
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error']
  });

  // Cache client
  tenantClients.set(dbName, client);
  
  return client;
}

/**
 * Get tenant Prisma client by company ID
 * @param {number} companyId - Company ID
 * @returns {PrismaClient} Prisma client for tenant
 */
function getTenantPrismaByCompanyId(companyId) {
  const dbName = buildTenantDbName(companyId);
  return getTenantPrisma(dbName);
}

/**
 * Close all tenant database connections
 * Used for graceful shutdown
 */
async function closeAllConnections() {
  const closePromises = [];
  
  // Close system connection
  closePromises.push(systemPrisma.$disconnect());
  
  // Close all tenant connections
  for (const [dbName, client] of tenantClients) {
    closePromises.push(client.$disconnect());
  }
  
  await Promise.all(closePromises);
  tenantClients.clear();
}

/**
 * Remove a specific tenant client from cache
 * @param {string} dbName - Tenant database name
 */
async function removeTenantClient(dbName) {
  if (tenantClients.has(dbName)) {
    const client = tenantClients.get(dbName);
    await client.$disconnect();
    tenantClients.delete(dbName);
  }
}

// ================== CONNECTION HANDLING ==================

// Connect to system database on startup
systemPrisma.$connect()
  .then(() => {
    console.log('✅ System database connected successfully');
  })
  .catch((error) => {
    console.error('❌ System database connection failed:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await closeAllConnections();
});

process.on('SIGINT', async () => {
  await closeAllConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeAllConnections();
  process.exit(0);
});

// ================== EXPORTS ==================

module.exports = {
  systemPrisma,
  getTenantPrisma,
  getTenantPrismaByCompanyId,
  closeAllConnections,
  removeTenantClient,
  parseMysqlUrl,
  buildTenantDatabaseUrl,
  buildTenantDbName
};
