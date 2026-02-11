function parseMysqlUrl(url) {
  // Expected: mysql://user:pass@host:port/db?params
  const u = new URL(url);
  return {
    protocol: u.protocol,
    username: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 3306,
    database: u.pathname?.replace(/^\//, '') || '',
    search: u.search || ''
  };
}

function buildMysqlUrl({ username, password, host, port, database, search }) {
  const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@` : '';
  const p = port ? `:${port}` : '';
  const db = database ? `/${database}` : '';
  return `mysql://${auth}${host}${p}${db}${search || ''}`;
}

function buildTenantDbName(userId) {
  return `tenant_${userId}`;
}

function buildTenantDatabaseUrl(masterUrl, tenantDbName) {
  const parts = parseMysqlUrl(masterUrl);
  return buildMysqlUrl({
    username: parts.username,
    password: parts.password,
    host: parts.host,
    port: parts.port,
    database: tenantDbName,
    search: parts.search
  });
}

module.exports = {
  parseMysqlUrl,
  buildMysqlUrl,
  buildTenantDbName,
  buildTenantDatabaseUrl
};
