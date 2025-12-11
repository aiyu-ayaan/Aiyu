# Security Remediation Guide: Crypto Miner Removal

## Issue Summary

Your Digital Ocean server hosting the Next.js application has been compromised with a crypto mining malware. The malicious process `/tmp/ijnegrrinje.json` is consuming 99% CPU and is being spawned by the Next.js server process.

## Immediate Actions Required

### 1. Stop the Compromised Application

```bash
# Stop all Docker containers
docker-compose down

# OR if running directly
pkill -f next-server

# Remove malicious files
rm -f /tmp/ijnegrrinje.json
rm -f /tmp/ijnegrrinje*

# Check for other suspicious files in /tmp
ls -la /tmp | grep -E '\.(json|js|sh)$'
```

### 2. Investigate the Attack Vector

Common attack vectors for Next.js applications:

1. **Vulnerable npm packages** - Check for known vulnerabilities
2. **API endpoint exploitation** - Especially file upload or command execution
3. **Server-Side Request Forgery (SSRF)** - Unvalidated user input in API calls
4. **Code Injection** - Through form inputs, query parameters, or file uploads
5. **Compromised dependencies** - Malicious packages in node_modules

### 3. Check for Backdoors

```bash
# Search for suspicious cron jobs
crontab -l
cat /etc/crontab
ls -la /etc/cron.*

# Check for suspicious network connections
netstat -tulpn | grep ESTABLISHED
ss -tupn

# Check systemd services
systemctl list-units --type=service --state=running

# Search for suspicious files
find / -name "ijnegrrinje*" 2>/dev/null
find /tmp /var/tmp -type f -mtime -7 2>/dev/null
```

## Root Cause Analysis

Based on the symptoms, the most likely attack vectors are:

### A. Vulnerable Dependencies

Run security audit:

```bash
npm audit
npm audit fix --force  # Be careful, may break functionality
```

### B. Unsecured API Endpoints

Review these API endpoints for security vulnerabilities:

1. `/api/upload` - File upload without validation
2. `/api/seed` - Database seeding endpoint (should be protected)
3. Any endpoint accepting user input without sanitization

### C. Docker Container Vulnerabilities

Check for:
- Running containers as root
- Exposed ports and services
- Outdated base images
- Missing security updates

## Security Hardening Measures

### 1. Update Dependencies

```bash
# Update all dependencies to latest secure versions
npm update
npm audit fix

# Check for outdated packages
npm outdated

# Use npm-check-updates for major version updates
npx npm-check-updates -u
npm install
```

### 2. Implement Security Headers

Create or update `next.config.mjs`:

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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 3. Secure API Endpoints

For ALL API routes, implement:

#### Rate Limiting

```javascript
// lib/rateLimit.js
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

#### Input Validation

```javascript
// middleware/validation.js
import { z } from 'zod';

export function validateInput(schema) {
  return async (req) => {
    try {
      const validated = schema.parse(req.body);
      return validated;
    } catch (error) {
      throw new Error('Invalid input: ' + error.message);
    }
  };
}

// Example usage in API route
import { z } from 'zod';

const schema = z.object({
  title: z.string().max(200).trim(),
  content: z.string().max(10000).trim(),
  // Never accept code or script tags
});
```

### 4. Secure File Uploads

```javascript
// api/upload/route.js
import { NextResponse } from 'next/server';
import path from 'path';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Validate file content (check magic numbers)
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidImageBuffer(buffer)) {
      return NextResponse.json({ error: 'Invalid file content' }, { status: 400 });
    }

    // Generate safe filename
    const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    
    // Save file logic here...
    
    return NextResponse.json({ success: true, fileName: safeFileName });
  } catch (error) {
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

### 5. Secure Docker Configuration

Update `Dockerfile`:

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

Update `docker-compose.yml`:

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
    restart: unless-stopped
    read_only: true  # Make container filesystem read-only
    tmpfs:
      - /tmp:noexec,nosuid,size=100m  # Limit /tmp size and prevent execution
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

### 6. Environment Variable Security

Create `.env.example` with placeholders:

```bash
# Database
MONGODB_URI=mongodb://username:password@mongodb:27017/dbname?authSource=admin
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
JWT_SECRET=CHANGE_ME_RANDOM_STRING_64_CHARS

# Security
NODE_ENV=production
```

### 7. Protect Admin Endpoints

Ensure ALL admin endpoints require authentication:

```javascript
// middleware/auth.js
import { verify } from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export function withAuth(handler) {
  return async (request) => {
    try {
      const token = request.cookies.get('token')?.value;
      
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const decoded = verify(token, process.env.JWT_SECRET);
      request.user = decoded;
      
      return handler(request);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
}
```

### 8. Remove Dangerous Endpoints

**CRITICAL**: Remove or secure these endpoints:

1. `/api/seed` - Should NEVER be accessible in production
2. Any endpoints that execute shell commands
3. Any endpoints that allow arbitrary file access

```javascript
// api/seed/route.js - SECURE VERSION
import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  // Require authentication even in development
  // ... seeding logic
}
```

## Post-Remediation Steps

### 1. Clean Reinstallation

```bash
# Remove everything
docker-compose down -v
rm -rf node_modules package-lock.json .next

# Fresh install
npm install
docker-compose build --no-cache
docker-compose up -d
```

### 2. Monitor for Suspicious Activity

```bash
# Check container logs
docker-compose logs -f --tail=100

# Monitor system resources
watch -n 1 'ps aux | grep -E "(next|node)" | grep -v grep'

# Check for new processes in /tmp
watch -n 5 'ls -la /tmp'
```

### 3. Set Up Monitoring

Install monitoring tools:

```bash
# Install fail2ban for intrusion prevention
sudo apt-get install fail2ban

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Monitor logs
sudo tail -f /var/log/syslog
```

### 4. Regular Security Audits

Add to package.json scripts:

```json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:check": "npm audit && npm outdated"
  }
}
```

Run weekly:

```bash
npm run security:check
```

## Prevention Checklist

- [ ] All dependencies updated to latest secure versions
- [ ] npm audit shows no vulnerabilities
- [ ] Security headers implemented
- [ ] Rate limiting on all API endpoints
- [ ] Input validation on all user inputs
- [ ] File uploads properly validated
- [ ] Admin endpoints require authentication
- [ ] Seed/debug endpoints disabled in production
- [ ] Docker containers run as non-root user
- [ ] Container filesystem is read-only where possible
- [ ] /tmp directory has noexec flag
- [ ] Strong passwords in .env file
- [ ] JWT secret is random and strong
- [ ] Firewall configured
- [ ] Monitoring tools installed
- [ ] Regular security audits scheduled

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/deploying#security)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)

## Support

If the crypto miner persists after following these steps:

1. Check if the malware has root access
2. Consider rebuilding the entire server from scratch
3. Review all SSH keys and access credentials
4. Check for rootkits: `sudo rkhunter --check`
5. Scan with ClamAV: `sudo clamscan -r /`

---

**IMPORTANT**: After remediation, change ALL passwords, rotate ALL secrets, and review ALL access logs.
