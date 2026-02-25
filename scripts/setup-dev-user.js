const m = require('mysql2/promise');
const b = require('bcryptjs');
(async () => {
  const c = await m.createConnection({ host: 'localhost', user: 'root', password: '1223', database: 'system_db' });
  // Add is_developer column if it doesn't exist
  const [cols] = await c.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='system_db' AND TABLE_NAME='system_users' AND COLUMN_NAME='is_developer'");
  if (cols.length === 0) {
    await c.execute('ALTER TABLE system_users ADD COLUMN is_developer TINYINT(1) NOT NULL DEFAULT 0');
    console.log('Added is_developer column');
  } else {
    console.log('is_developer column already exists');
  }
  const h = await b.hash('Dev@Vision2026#', 12);
  await c.execute(
    'INSERT INTO system_users (email,password,name,status,is_master,is_developer,company_id,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,0,1,NULL,NOW(),NOW(),NOW()) ON DUPLICATE KEY UPDATE is_developer=1,status=?,password=?,updated_at=NOW()',
    ['dev@vision.pos', h, 'Vision Developer', 'active', 'active', h]
  );
  const [r] = await c.execute('SELECT id,email,name,is_master,is_developer,status FROM system_users');
  console.table(r);
  await c.end();
  console.log('\nDeveloper user ready: dev@vision.pos / Dev@Vision2026#');
})().catch(console.error);
