#!/usr/bin/env node

/**
 * Generate secure credentials for the admin panel
 * Run: node scripts/generate-credentials.js
 */

const crypto = require('crypto');

console.log('\n🔐 Aiyu Portfolio - Credential Generator\n');
console.log('=' .repeat(50));

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('\n📝 Add these to your .env file:\n');
console.log(`JWT_SECRET=${jwtSecret}`);

// Generate a sample password
const samplePassword = crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
console.log(`ADMIN_PASSWORD=${samplePassword}`);
console.log('\n💡 Tips:');
console.log('  • The JWT_SECRET is a random 64-character hex string');
console.log('  • The ADMIN_PASSWORD is a sample - feel free to change it');
console.log('  • Keep your .env file secure and never commit it to Git');
console.log('  • For hashed passwords, use bcrypt (see ADMIN_GUIDE.md)');
console.log('\n' + '='.repeat(50) + '\n');
