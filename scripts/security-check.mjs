#!/usr/bin/env node

/**
 * Security Health Check Script
 * Run this to verify security configurations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n🔒 Security Health Check\n');

let issuesFound = 0;
let warnings = 0;

// Check 1: JWT Secret strength
console.log('1. Checking JWT_SECRET...');
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    console.log(`${RED}   ❌ JWT_SECRET not set in environment${RESET}`);
    issuesFound++;
} else if (jwtSecret === 'your-secret-key' || jwtSecret.length < 32) {
    console.log(`${RED}   ❌ JWT_SECRET is weak (less than 32 characters)${RESET}`);
    issuesFound++;
} else {
    console.log(`${GREEN}   ✅ JWT_SECRET is properly configured${RESET}`);
}

// Check 2: Admin credentials
console.log('2. Checking admin credentials...');
const adminUser = process.env.ADMIN_USERNAME;
const adminPass = process.env.ADMIN_PASSWORD;
if (!adminUser || !adminPass) {
    console.log(`${RED}   ❌ Admin credentials not set${RESET}`);
    issuesFound++;
} else if (adminPass.length < 12) {
    console.log(`${YELLOW}   ⚠️  Admin password should be at least 12 characters${RESET}`);
    warnings++;
} else {
    console.log(`${GREEN}   ✅ Admin credentials configured${RESET}`);
}

// Check 3: Upload directory permissions
console.log('3. Checking upload directory...');
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
try {
    const stats = fs.statSync(uploadsDir);
    // On Windows, permission checking is different, so we just verify it exists
    if (stats.isDirectory()) {
        console.log(`${GREEN}   ✅ Upload directory exists${RESET}`);
    }
} catch (error) {
    console.log(`${YELLOW}   ⚠️  Upload directory doesn't exist (will be created on first upload)${RESET}`);
    warnings++;
}

// Check 4: Check for suspicious files in uploads
console.log('4. Scanning upload directory for suspicious files...');
try {
    const files = fs.readdirSync(uploadsDir);
    const suspiciousFiles = files.filter(f => {
        if (f === '.gitkeep') return false;

        const filePath = path.join(uploadsDir, f);
        const stats = fs.statSync(filePath);

        // Files smaller than 100 bytes are suspicious
        if (stats.size < 100 && !f.endsWith('.gitkeep')) {
            return true;
        }

        // Non-image files are suspicious
        if (!f.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            return true;
        }

        return false;
    });

    if (suspiciousFiles.length > 0) {
        console.log(`${RED}   ❌ Found ${suspiciousFiles.length} suspicious file(s):${RESET}`);
        suspiciousFiles.forEach(f => console.log(`      - ${f}`));
        issuesFound++;
    } else {
        console.log(`${GREEN}   ✅ No suspicious files found${RESET}`);
    }
} catch (error) {
    console.log(`${YELLOW}   ⚠️  Could not scan upload directory${RESET}`);
}

// Check 5: Security files exist
console.log('5. Checking security implementation...');
const securityFiles = [
    'src/utils/fileValidation.js',
    'src/middleware/auth.js',
    'SECURITY_INCIDENT.md'
];

securityFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        console.log(`${GREEN}   ✅ ${file}${RESET}`);
    } else {
        console.log(`${RED}   ❌ Missing: ${file}${RESET}`);
        issuesFound++;
    }
});

// Check 6: package.json for known vulnerabilities
console.log('6. Checking for dependency vulnerabilities...');
console.log(`${YELLOW}   ℹ️  Run 'npm audit' to check for vulnerabilities${RESET}`);

// Summary
console.log('\n' + '='.repeat(50));
console.log('Security Health Check Summary');
console.log('='.repeat(50));

if (issuesFound === 0 && warnings === 0) {
    console.log(`${GREEN}✅ All security checks passed!${RESET}`);
} else {
    if (issuesFound > 0) {
        console.log(`${RED}❌ Found ${issuesFound} critical issue(s)${RESET}`);
    }
    if (warnings > 0) {
        console.log(`${YELLOW}⚠️  Found ${warnings} warning(s)${RESET}`);
    }
}

console.log('\nRecommendations:');
console.log('- Run: npm audit fix');
console.log('- Review SECURITY_INCIDENT.md for detailed security guidance');
console.log('- Ensure all environment variables are properly set');
console.log('- Regularly update dependencies\n');

process.exit(issuesFound > 0 ? 1 : 0);
