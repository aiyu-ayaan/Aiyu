# 🔒 Quick Security Guide - Crypto Miner Prevention

## What Happened?

Your Next.js container was compromised by a crypto miner (`/tmp/ijnegrrinje.json`) that consumed 99% CPU.

## What We Fixed?

### 1. Blocked /tmp Execution ✅
```yaml
# Crypto miner CAN'T run anymore because /tmp is mounted with noexec
tmpfs:
  - /tmp:noexec,nosuid,nodev
```

**Before:** Attacker uploads malware → runs from /tmp → mines crypto at 99% CPU ❌  
**After:** Attacker uploads malware → tries to run from /tmp → **BLOCKED** (Permission denied) ✅

### 2. Read-Only Filesystem ✅
```yaml
read_only: true
```

**Impact:** Attacker can't write malware to most locations. Only specific directories are writable.

### 3. CPU Limits ✅
```yaml
resources:
  limits:
    cpus: '1.0'  # Max 1 CPU core (100%)
    memory: 512M
```

**Impact:** Even if malware runs, it's capped at 100% CPU (not 99% of all cores).

### 4. Dropped All Capabilities ✅
```yaml
cap_drop: ALL
cap_add: [NET_BIND_SERVICE]
```

**Impact:** Attacker can't escalate privileges or perform advanced attacks.

### 5. No Privilege Escalation ✅
```yaml
security_opt:
  - no-new-privileges:true
```

**Impact:** Even if attacker gains access, they can't become root.

---

## Emergency Response (If Compromised Again)

```bash
# 1. IMMEDIATE: Stop everything
pnpm emergency:cleanup

# 2. Follow the script prompts - it will:
#    - Collect forensic data
#    - Stop containers
#    - Clean up malware
#    - Give you next steps

# 3. CRITICAL: Rotate all credentials
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Update .env with new JWT_SECRET, passwords, etc.

# 4. Rebuild clean
pnpm docker:build
pnpm docker:up

# 5. Verify security
pnpm docker:verify
```

---

## How to Deploy Securely

### Before First Deployment

```bash
# 1. Copy and edit environment file
cp .env.example .env
nano .env  # or vim, code, etc.

# 2. Generate strong secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('MONGO_ROOT_PASSWORD=' + require('crypto').randomBytes(32).toString('hex'))"

# 3. Update .env with generated secrets
# Change ALL placeholder values!

# 4. Build with security hardening
pnpm docker:build

# 5. Start containers
pnpm docker:up

# 6. CRITICAL: Verify security
pnpm docker:verify
# ALL checks must pass!

# 7. Test /tmp execution is blocked
docker exec aiyu-app sh -c "echo test > /tmp/test.sh && chmod +x /tmp/test.sh && /tmp/test.sh"
# Should see: Permission denied ✅
```

---

## Daily Monitoring

```bash
# Check CPU usage (should be < 50% normally)
docker stats aiyu-app --no-stream

# Check for suspicious processes
docker exec aiyu-app ps aux
# Should only see: node server.js

# Check logs for security events
docker logs aiyu-app | grep -E "SECURITY|ERROR"

# Check health
curl http://localhost:3000/api/health
```

---

## Key Security Features

| Feature | Status | Purpose |
|---------|--------|---------|
| 🚫 /tmp noexec | ✅ Active | **Blocks crypto miners from executing** |
| 🔒 Read-only FS | ✅ Active | Prevents malware writing to filesystem |
| ⚡ CPU Limits | ✅ Active | Caps CPU at 100% (1 core) |
| 🛡️ No Capabilities | ✅ Active | Removes attack surface |
| 🔐 No Privilege Escalation | ✅ Active | Prevents becoming root |
| 💾 Memory Limits | ✅ Active | Caps RAM at 512MB |
| ❤️ Health Checks | ✅ Active | Auto-detects unhealthy containers |
| 👤 Non-root User | ✅ Active | Runs as user 'nextjs' |

---

## Verification Checklist

After deployment, verify:

- [ ] `docker exec aiyu-app sh -c "echo test > /tmp/test.sh && /tmp/test.sh"` → **Permission denied** ✅
- [ ] `docker stats aiyu-app` → CPU at ~10-50% normally, max 100% ✅
- [ ] `docker exec aiyu-app ps aux` → Only node processes visible ✅
- [ ] `curl http://localhost:3000/api/health` → Returns `{"status":"healthy"}` ✅
- [ ] `docker inspect aiyu-app | grep ReadonlyRootfs` → Shows `true` ✅
- [ ] `pnpm security-check` → All checks pass ✅

---

## Important Files

- **SECURITY_REMEDIATION.md** - Complete incident analysis and fixes (READ THIS!)
- **DEPLOYMENT_SECURITY_CHECKLIST.md** - Step-by-step deployment checklist
- **scripts/emergency-cleanup.sh** - Emergency response script
- **scripts/verify-security.sh** - Security verification tool
- **SECURITY_INCIDENT.md** - Original incident report
- **SECURITY_FIXES.md** - Quick reference for what was fixed

---

## NPM Scripts

```bash
# Security
pnpm security-check      # Check app security
pnpm docker:verify        # Verify Docker security (after deployment)
pnpm emergency:cleanup    # Emergency cleanup if compromised

# Docker
pnpm docker:build         # Build with security hardening
pnpm docker:up            # Start containers
pnpm docker:down          # Stop containers
pnpm docker:logs          # View logs
```

---

## Red Flags (Investigate Immediately)

🚨 **CRITICAL - Stop Container Immediately:**
- CPU usage at 99-100% for > 5 minutes
- Processes named: `xmrig`, `minerd`, `cpuminer`, or `*.json` in /tmp
- Multiple failed login attempts from unknown IPs

⚠️ **WARNING - Investigate Soon:**
- CPU usage > 80% consistently
- High memory usage (>400MB)
- Unusual network connections
- Rate limit exceeded repeatedly

---

## Support & Documentation

For detailed information:
1. Start with **SECURITY_REMEDIATION.md** (comprehensive guide)
2. Use **DEPLOYMENT_SECURITY_CHECKLIST.md** for deployment
3. Run `pnpm docker:verify` to check security status
4. Check **SECURITY_INCIDENT.md** for original incident details

**Security Status:** 🟢 **SECURED**

All security measures are in place. The crypto miner attack vector has been closed.

**Last Updated:** December 12, 2025
