# Implementation Guide: Applying Security Fixes to Next.js Application

This guide provides step-by-step instructions for implementing the security fixes in your actual Next.js codebase.

## Prerequisites

- Access to the master branch with the Next.js application
- SSH access to your Digital Ocean server
- Backup of your current application and database
- At least 30 minutes of downtime scheduled

## Step 1: Emergency Response (Do First!)

### 1.1 On Your Server

```bash
# SSH into your Digital Ocean droplet
ssh user@your-server-ip

# Navigate to application directory
cd /path/to/Aiyu

# Stop the application
docker-compose down

# Kill any remaining processes
sudo pkill -f next-server
sudo pkill -f ijnegrrinje

# Remove malicious files
sudo rm -f /tmp/ijnegrrinje*
sudo find /tmp -name "*ijnegrrinje*" -delete

# Run the cleanup script
chmod +x cleanup-malware.sh
sudo ./cleanup-malware.sh
```

### 1.2 Verify Cleanup

```bash
# Check for processes
ps aux | grep -E "(ijnegrrinje|miner|xmrig)" | grep -v grep

# Should return nothing

# Check /tmp
ls -la /tmp

# Should not show ijnegrrinje files

# Check CPU usage
top -bn1 | grep "Cpu(s)"

# Should show normal usage
```

## Step 2: Secure the Codebase

### 2.1 Pull Latest Security Docs

```bash
# Merge security documentation from this PR
git checkout master
git pull origin copilot/remove-crypto-miner-process

# This brings in:
# - SECURITY_REMEDIATION.md
# - SECURITY_CHECKLIST.md
# - cleanup-malware.sh
# - monitor-security.sh
# - etc.
```

### 2.2 Clean Installation

```bash
# Remove potentially compromised files
rm -rf node_modules
rm -rf .next
rm -f package-lock.json

# Clean npm cache
npm cache clean --force

# Clean Docker
docker system prune -af --volumes

# Fresh install
npm install

# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix --force
```

## Step 3: Update Configuration Files

### 3.1 Update next.config.mjs

Edit `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 3.2 Update Dockerfile

Edit `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Build stage
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

COPY . .
RUN npm run build

# Runtime stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use dumb-init to handle signals properly
CMD ["dumb-init", "node", "server.js"]
```

### 3.3 Update docker-compose.yml

Edit `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    networks:
      - app-network
    depends_on:
      - mongodb
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - app-network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true

networks:
  app-network:
    driver: bridge

volumes:
  mongodb_data:
```

### 3.4 Update .dockerignore

Replace or update `.dockerignore` with content from `.dockerignore.secure`.

### 3.5 Update Environment Variables

```bash
# Backup old .env
cp .env .env.backup

# Copy security template
cp .env.security.example .env

# Edit .env with new strong passwords
nano .env

# Generate new secrets
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 32  # For passwords

# Update the values in .env
```

## Step 4: Secure API Endpoints

### 4.1 Add Rate Limiting

Create `src/lib/rateLimit.js`:

```javascript
import { LRUCache } from 'lru-cache';

const rateLimit = (options) => {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: (limit, token) =>
      new Promise((resolve, reject) => {
        const tokenCount = tokenCache.get(token) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, [1]);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;
        
        return isRateLimited ? reject() : resolve();
      }),
  };
};

export default rateLimit;
```

Install dependency:

```bash
npm install lru-cache
```

### 4.2 Secure File Upload Endpoint

Edit `src/app/api/upload/route.js`:

```javascript
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import rateLimit from '@/lib/rateLimit';

const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    await limiter.check(10, ip); // 10 uploads per hour per IP

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Validate file content (check magic numbers)
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidImageBuffer(buffer)) {
      return NextResponse.json(
        { error: 'Invalid file content. File may be corrupted.' },
        { status: 400 }
      );
    }

    // Generate safe filename
    const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    
    // Save file logic here...
    // Make sure to save outside of /tmp with proper permissions
    
    return NextResponse.json({ success: true, fileName: safeFileName });
  } catch (error) {
    if (error.message === 'Rate limit exceeded') {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429 }
      );
    }
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

function isValidImageBuffer(buffer) {
  // Check PNG magic number
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }
  // Check JPEG magic number
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }
  // Check GIF magic number
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return true;
  }
  // Check WebP magic number
  if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return true;
  }
  return false;
}
```

### 4.3 Secure or Remove Seed Endpoint

Edit `src/app/api/seed/route.js`:

```javascript
import { NextResponse } from 'next/server';

export async function GET(request) {
  // CRITICAL: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seed endpoint not available in production' },
      { status: 403 }
    );
  }

  // Add authentication even in development
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SEED_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Seeding logic here...
  // ...
}
```

### 4.4 Add Input Validation

Install zod:

```bash
npm install zod
```

Create `src/lib/validation.js`:

```javascript
import { z } from 'zod';

export const blogSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  content: z.string().min(1).max(50000).trim(),
  excerpt: z.string().max(500).trim().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().min(1).max(1000).trim(),
  url: z.string().url().optional(),
  github: z.string().url().optional(),
});

// Add more schemas as needed
```

Use in API routes:

```javascript
import { blogSchema } from '@/lib/validation';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = blogSchema.parse(body);
    
    // Use validatedData instead of body
    // ...
    
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

## Step 5: Rebuild and Deploy

### 5.1 Build

```bash
# Clean build
docker-compose build --no-cache

# Test locally first (optional)
docker-compose up
# Test at http://localhost:3000
# Ctrl+C to stop

# Deploy
docker-compose up -d
```

### 5.2 Verify Deployment

```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs -f --tail=100

# Check health
curl http://localhost:3000

# Check for errors
docker-compose logs app | grep -i error
```

## Step 6: Enable Monitoring

### 6.1 Set Up Monitoring Script

```bash
# Make executable
chmod +x monitor-security.sh

# Add to crontab
crontab -e

# Add this line:
*/30 * * * * /path/to/Aiyu/monitor-security.sh >> /var/log/security-monitor.log 2>&1
```

### 6.2 Enable Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status verbose
```

### 6.3 Install Fail2Ban

```bash
# Install
sudo apt-get update
sudo apt-get install fail2ban

# Enable
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
```

## Step 7: Ongoing Maintenance

### 7.1 Weekly Tasks

```bash
# Security audit
npm audit

# Check for updates
npm outdated

# Monitor logs
tail -f /var/log/security-monitor.log
docker-compose logs --tail=100
```

### 7.2 Monthly Tasks

```bash
# Update dependencies
npm update
npm audit fix

# Rotate secrets
# Generate new JWT_SECRET and update .env

# Review firewall rules
sudo ufw status numbered

# Check for system updates
sudo apt update
sudo apt upgrade
```

## Step 8: Verification

Use the **SECURITY_CHECKLIST.md** to verify all security measures are in place.

Key checks:

```bash
# No high CPU processes
top -bn1 | head -20

# No malicious files
find /tmp -type f

# No suspicious network connections
netstat -tulpn

# No npm vulnerabilities
npm audit

# Security headers present
curl -I http://localhost:3000 | grep -E "(X-Frame|X-Content|X-XSS)"

# Rate limiting working
# Try rapid requests to /api/upload and verify 429 response

# Docker running as non-root
docker-compose exec app whoami
# Should return "nextjs", not "root"
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# 1. Missing environment variables - check .env
# 2. MongoDB connection - verify MONGODB_URI
# 3. Build errors - try: docker-compose build --no-cache
```

### High Memory Usage

```bash
# Check container stats
docker stats

# If high, may need to limit in docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### Still Seeing Malware

```bash
# Nuclear option: rebuild server from scratch
# 1. Backup data
# 2. Create new VPS
# 3. Deploy from clean repository
# 4. Use NEW credentials everywhere
```

## Success Criteria

✅ Application running normally  
✅ CPU usage <10% idle  
✅ No suspicious processes  
✅ No malicious files in /tmp  
✅ npm audit shows no critical issues  
✅ Security headers present  
✅ Rate limiting functional  
✅ Input validation working  
✅ Firewall enabled  
✅ Monitoring active  
✅ All passwords changed  

## Next Steps

1. Monitor for 48 hours
2. Run penetration tests
3. Review access logs
4. Update security documentation
5. Train team on new procedures
6. Schedule regular security reviews

---

**For detailed information, refer to:**
- SECURITY_REMEDIATION.md - Complete security guide
- SECURITY_CHECKLIST.md - Detailed checklist
- QUICK_RESPONSE_GUIDE.md - Emergency procedures
