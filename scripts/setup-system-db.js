#!/usr/bin/env node

/**
 * System Database Setup Script
 * 
 * This script initializes the system database for the multi-tenant POS system.
 * Run this script before starting the application for the first time.
 * 
 * Usage:
 *   node scripts/setup-system-db.js
 * 
 * Prerequisites:
 *   1. SYSTEM_DATABASE_URL must be set in .env
 *   2. DATABASE_URL must be set in .env (for tenant databases)
 *   3. MySQL server must be running
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function main() {
  log('\n========================================', 'blue');
  log('  POS System Database Setup', 'blue');
  log('========================================\n', 'blue');

  const projectRoot = path.join(__dirname, '..');
  const prismaDir = path.join(projectRoot, 'prisma');

  // Step 1: Check environment variables
  logStep('1/5', 'Checking environment variables...');
  
  require('dotenv').config({ path: path.join(projectRoot, '.env') });

  if (!process.env.SYSTEM_DATABASE_URL) {
    logError('SYSTEM_DATABASE_URL is not set in .env file');
    log('\nPlease add the following to your .env file:', 'yellow');
    log('SYSTEM_DATABASE_URL="mysql://user:password@localhost:3306/system_db"', 'yellow');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    logError('DATABASE_URL is not set in .env file');
    log('\nPlease add the following to your .env file:', 'yellow');
    log('DATABASE_URL="mysql://user:password@localhost:3306/tenant_db"', 'yellow');
    process.exit(1);
  }

  logSuccess('Environment variables are set');

  // Step 2: Check if schema files exist
  logStep('2/5', 'Checking Prisma schema files...');

  const systemSchemaPath = path.join(prismaDir, 'schema.system.prisma');
  const tenantSchemaPath = path.join(prismaDir, 'schema.tenant.prisma');

  if (!fs.existsSync(systemSchemaPath)) {
    logError(`System schema file not found: ${systemSchemaPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(tenantSchemaPath)) {
    logError(`Tenant schema file not found: ${tenantSchemaPath}`);
    process.exit(1);
  }

  logSuccess('Schema files found');

  // Step 3: Generate Prisma clients
  logStep('3/5', 'Generating Prisma clients...');

  try {
    log('  Generating system database client...', 'reset');
    execSync(`npx prisma generate --schema=${systemSchemaPath}`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    logSuccess('System database client generated');

    log('  Generating tenant database client...', 'reset');
    execSync(`npx prisma generate --schema=${tenantSchemaPath}`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    logSuccess('Tenant database client generated');
  } catch (error) {
    logError('Failed to generate Prisma clients');
    console.error(error.message);
    process.exit(1);
  }

  // Step 4: Push schema to system database
  logStep('4/5', 'Creating system database tables...');

  try {
    execSync(`npx prisma db push --schema=${systemSchemaPath}`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    logSuccess('System database tables created');
  } catch (error) {
    logError('Failed to create system database tables');
    console.error(error.message);
    process.exit(1);
  }

  // Step 5: Seed system database
  logStep('5/5', 'Seeding system database...');

  try {
    const seedPath = path.join(prismaDir, 'seed.system.js');
    if (fs.existsSync(seedPath)) {
      execSync(`node ${seedPath}`, {
        cwd: projectRoot,
        stdio: 'inherit'
      });
      logSuccess('System database seeded');
    } else {
      logWarning('Seed file not found, skipping seeding');
    }
  } catch (error) {
    logError('Failed to seed system database');
    console.error(error.message);
    process.exit(1);
  }

  // Done!
  log('\n========================================', 'green');
  log('  Setup Complete!', 'green');
  log('========================================', 'green');
  
  log('\nNext steps:', 'cyan');
  log('1. Start the server: npm run dev', 'reset');
  log('2. Register a new user at POST /api/v1/auth/register', 'reset');
  log('3. Verify OTP at POST /api/v1/auth/verify-otp', 'reset');
  log('4. Login at POST /api/v1/auth/login', 'reset');
  
  log('\nNote:', 'yellow');
  log('- Each new registration creates a new company and tenant database', 'reset');
  log('- The first user becomes the master user for that company', 'reset');
  log('- Master users can create branches, users, and custom roles', 'reset');
}

main().catch(error => {
  logError('Setup failed');
  console.error(error);
  process.exit(1);
});
