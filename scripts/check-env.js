#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * Run this script to check if all required environment variables are set.
 * Usage: node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envExamplePath = path.join(__dirname, '..', '.env.local.example');

  log('\n🔍 Checking Environment Configuration...', 'cyan');
  log('━'.repeat(50), 'cyan');

  // Check if .env.local exists
  if (!fs.existsSync(envPath)) {
    log('\n❌ .env.local file not found!', 'red');
    log('\n📝 To fix this:', 'yellow');
    log('  1. Copy .env.local.example to .env.local:', 'yellow');
    log('     cp .env.local.example .env.local', 'blue');
    log('  2. Edit .env.local and fill in your values', 'yellow');
    process.exit(1);
  }

  log('✅ .env.local file found', 'green');

  // Read .env.local
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  const envVars = {};

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    }
  });

  // Required variables
  const required = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_EDGE_URL',
  ];

  const optional = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SENDGRID_API_KEY',
  ];

  // Check required variables
  log('\n📋 Required Variables:', 'cyan');
  let allRequiredSet = true;

  required.forEach((key) => {
    const value = envVars[key];
    if (!value || value.includes('your-') || value.includes('http://localhost:3000') && key !== 'NEXT_PUBLIC_APP_URL') {
      log(`  ❌ ${key} - NOT SET or using placeholder`, 'red');
      allRequiredSet = false;
    } else {
      log(`  ✅ ${key}`, 'green');
    }
  });

  // Check optional variables
  log('\n📋 Optional Variables:', 'cyan');
  optional.forEach((key) => {
    const value = envVars[key];
    if (!value || value.includes('your-')) {
      log(`  ⚠️  ${key} - Not set (optional)`, 'yellow');
    } else {
      log(`  ✅ ${key}`, 'green');
    }
  });

  // Summary
  log('\n' + '━'.repeat(50), 'cyan');
  if (allRequiredSet) {
    log('✅ Environment is properly configured!', 'green');
    log('\n🚀 You can now run:', 'green');
    log('   pnpm dev     - Start development server', 'blue');
    log('   pnpm build   - Build for production', 'blue');
    process.exit(0);
  } else {
    log('❌ Some required variables are missing or using placeholders', 'red');
    log('\n📝 Please update .env.local with your actual values', 'yellow');
    process.exit(1);
  }
}

checkEnvFile();
