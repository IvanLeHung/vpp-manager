#!/usr/bin/env node

/**
 * Prisma Database Sync Helper
 * Runs all necessary Prisma commands to sync the database schema
 */

const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n========================================', 'blue');
  log(title, 'blue');
  log('========================================\n', 'blue');
}

function runCommand(description, command) {
  try {
    log(`${description}...`, 'yellow');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} - SUCCESS\n`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} - FAILED\n`, 'red');
    return false;
  }
}

async function main() {
  logSection('🚀 Prisma Database Sync Helper');

  const steps = [
    ['[1/4] Generating Prisma Client', 'npx prisma generate'],
    ['[2/4] Creating database migration', 'npx prisma migrate dev --name sync_department_relation'],
    ['[3/4] Pushing schema to database', 'npx prisma db push'],
    ['[4/4] Validating schema', 'npx prisma validate'],
  ];

  let allSuccessful = true;
  for (const [description, command] of steps) {
    if (!runCommand(description, command)) {
      allSuccessful = false;
      break;
    }
  }

  logSection('Summary');
  if (allSuccessful) {
    log('✅ All steps completed successfully!', 'green');
    log('\nNext steps:', 'yellow');
    log('1. Restart your server: npm run dev', 'blue');
    log('2. Test your API endpoints', 'blue');
    log('3. The Prisma error should now be resolved! 🎉\n', 'blue');
  } else {
    log('❌ Some steps failed. Please check the errors above.', 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
