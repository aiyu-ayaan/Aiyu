# 🔒 Deployment Security Checklist

**Purpose:** Ensure all security measures are in place before deploying to production after crypto miner incident.

---

## ⚠️ CRITICAL: Complete Before Deployment

### 1. Emergency Response (If Currently Compromised)

- [ ] **Stop all containers immediately**
  ```bash
  docker-compose down
  ```

- [ ] **Run emergency cleanup script**
  ```bash
  bash scripts/emergency-cleanup.sh
  ```

- [ ] **Review forensic data** collected by cleanup script
  - Check `/tmp/aiyu-incident-*/` for logs and evidence
  - Document what was found
  - Identify how the breach occurred

### 2. Credential Rotation (MANDATORY)

- [ ] **Generate new JWT_SECRET** (64+ characters)
  ```bash
  node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
  ```

- [ ] **Generate new BLOG_API_KEY** (32+ characters)
  ```bash
  node -e "console.log('BLOG_API_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **Generate new MONGO_ROOT_PASSWORD** (32+ characters)
  ```bash
  node -e "console.log('MONGO_ROOT_PASSWORD=' + require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **Create strong ADMIN_PASSWORD** (16+ characters, mix of upper/lower/numbers/symbols)

- [ ] **Update .env file** with all new credentials

- [ ] **Verify .env is NOT committed to git**
  ```bash
  git status .env  # Should not appear
  ```

- [ ] **Set restrictive permissions on .env**
  ```bash
  chmod 600 .env  # Linux/Mac only
  ```

### 3. Docker Configuration Verification

- [ ] **Verify docker-compose.yml has all security settings:**
  
  ```bash
  grep -A 20 "app:" docker-compose.yml | grep -E "read_only|tmpfs|cap_drop|security_opt|resources"
  ```
  
  Must include:
  - `read_only: true`
  - `tmpfs:` with `noexec,nosuid,nodev`
  - `cap_drop: [ALL]`
  - `cap_add: [NET_BIND_SERVICE]`
  - `security_opt: [no-new-privileges:true]`
  - `deploy.resources.limits`

- [ ] **Verify Dockerfile has proper user configuration**
  ```bash
  grep -E "USER|adduser|addgroup" Dockerfile
  ```
  Must run as non-root user (nextjs)

### 4. Clean Build

- [ ] **Remove all existing images and containers**
  ```bash
  docker-compose down -v
  docker rmi $(docker images -q aiyu* 2>/dev/null) 2>/dev/null || true
  ```

- [ ] **Build with --no-cache** to ensure clean build
  ```bash
  docker-compose build --no-cache
  ```

- [ ] **Verify build completed successfully** (no errors)

### 5. Deployment

- [ ] **Start services**
  ```bash
  docker-compose up -d
  ```

- [ ] **Wait for services to be healthy** (30-60 seconds)
  ```bash
  docker-compose ps
  ```
  Both `aiyu-app` and `aiyu-mongodb` should show "Up" status

- [ ] **Check container logs for errors**
  ```bash
  docker-compose logs app | tail -50
  ```

### 6. Security Verification (CRITICAL)

- [ ] **Run security verification script**
  ```bash
  bash scripts/verify-security.sh
  ```
  
  Must pass ALL checks:
  - ✅ Read-only filesystem
  - ✅ /tmp noexec
  - ✅ Capabilities dropped
  - ✅ No-new-privileges
  - ✅ Resource limits
  - ✅ No suspicious processes

- [ ] **Test /tmp execution is blocked**
  ```bash
  docker exec aiyu-app sh -c "echo '#!/bin/sh' > /tmp/test.sh && chmod +x /tmp/test.sh && /tmp/test.sh"
  ```
  Should see: `Permission denied` ✅

- [ ] **Verify resource limits**
  ```bash
  docker stats aiyu-app --no-stream
  ```
  CPU should be capped at ~100% (1 core max)

- [ ] **Check for suspicious processes**
  ```bash
  docker exec aiyu-app ps aux
  ```
  Should only see: node, ps, and child processes

- [ ] **Run application security check**
  ```bash
  npm run security-check
  ```

### 7. Application Testing

- [ ] **Health check passes**
  ```bash
  curl http://localhost:3000/api/health
  ```
  Should return: `{"status":"healthy",...}`

- [ ] **Can access homepage**
  ```bash
  curl -I http://localhost:3000/
  ```
  Should return: `200 OK`

- [ ] **Admin login works** with new credentials
  - Navigate to `/admin/login`
  - Login with new ADMIN_USERNAME and ADMIN_PASSWORD
  - Verify access to admin panel

- [ ] **File upload requires authentication**
  ```bash
  curl -X POST http://localhost:3000/api/upload -F "file=@test.png"
  ```
  Should return: `401 Unauthorized` ✅

- [ ] **Database connection works**
  - Check logs for MongoDB connection success
  - Try creating/viewing a blog post in admin panel

### 8. Monitoring Setup

- [ ] **Configure log monitoring** (if available)
  - Set up log aggregation (e.g., Logtail, Datadog)
  - Configure alerts for security events

- [ ] **Set up uptime monitoring** (if available)
  - Configure health check endpoint monitoring
  - Set alert thresholds

- [ ] **Create monitoring script for CPU usage**
  ```bash
  # Add to cron: */5 * * * *
  docker stats aiyu-app --no-stream --format "{{.CPUPerc}}" | \
    awk '{if ($1+0 > 80) print "ALERT: High CPU usage: " $1}'
  ```

### 9. Network Security

- [ ] **Verify MongoDB port is NOT exposed externally**
  ```bash
  docker ps --format '{{.Ports}}' | grep 27017
  ```
  Should NOT show `0.0.0.0:27017->27017` ✅

- [ ] **Configure firewall rules** (if applicable)
  - Allow only ports 80, 443, 3000 (or as needed)
  - Block all other inbound traffic

- [ ] **Use reverse proxy with SSL/TLS** (production only)
  - Nginx, Traefik, or Caddy
  - Let's Encrypt certificates
  - HTTPS only, redirect HTTP to HTTPS

### 10. Backup Strategy

- [ ] **Configure automated database backups**
  ```bash
  # Example backup script
  docker exec aiyu-mongodb mongodump --uri="$MONGODB_URI" --out=/backup
  ```

- [ ] **Test backup restoration**
  - Perform test restore in staging environment
  - Verify data integrity

- [ ] **Set backup schedule** (daily recommended)

- [ ] **Store backups in separate location**
  - Different server or cloud storage
  - Encrypted if contains sensitive data

### 11. Documentation

- [ ] **Document deployment date and time**

- [ ] **Record credential rotation date**

- [ ] **Note any issues encountered** during deployment

- [ ] **Update team** on new security measures

### 12. Post-Deployment Monitoring (First 24 Hours)

- [ ] **Monitor CPU usage every hour**
  ```bash
  docker stats aiyu-app --no-stream
  ```
  Should stay below 50% normally, max 100%

- [ ] **Check logs for security events**
  ```bash
  docker-compose logs -f app | grep -E "SECURITY|ERROR|WARN"
  ```

- [ ] **Verify no suspicious processes**
  ```bash
  docker exec aiyu-app ps aux
  ```

- [ ] **Check for unusual network connections**
  ```bash
  docker exec aiyu-app netstat -tn | grep ESTABLISHED
  ```
  Should only see connections to MongoDB

- [ ] **Monitor disk usage**
  ```bash
  docker exec aiyu-app df -h
  ```

---

## 📊 Ongoing Security Maintenance

### Daily
- [ ] Check container health status
- [ ] Review application logs
- [ ] Monitor CPU/memory usage

### Weekly
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review security logs
- [ ] Verify backups are working
- [ ] Run `bash scripts/verify-security.sh`

### Monthly
- [ ] Rotate credentials (JWT_SECRET, ADMIN_PASSWORD, etc.)
- [ ] Update dependencies (`npm update`)
- [ ] Review and update firewall rules
- [ ] Test backup restoration
- [ ] Review access logs for anomalies

### Quarterly
- [ ] Security audit and penetration testing
- [ ] Review and update security policies
- [ ] Team security training
- [ ] Disaster recovery drill

---

## 🆘 Incident Response Plan

If you detect suspicious activity:

### Immediate (0-5 minutes)
1. Run `bash scripts/emergency-cleanup.sh`
2. Stop containers: `docker-compose down`
3. Preserve logs and evidence

### Investigation (5-30 minutes)
1. Review forensic data from cleanup script
2. Identify breach method
3. Document timeline of events

### Containment (30-60 minutes)
1. Rotate ALL credentials
2. Review host system for compromise
3. Check all uploaded files
4. Review database for malicious data

### Recovery (1-4 hours)
1. Clean rebuild with `--no-cache`
2. Deploy with verified security hardening
3. Run full security verification
4. Restore from clean backup if needed

### Post-Incident (1-7 days)
1. Update security documentation
2. Conduct root cause analysis
3. Implement additional controls
4. Notify stakeholders
5. Monitor closely for 7 days

---

## 📞 Emergency Contacts

- **DevOps Team:** [Add contact info]
- **Security Team:** [Add contact info]
- **On-Call Engineer:** [Add contact info]

---

## 📚 Reference Documentation

- `SECURITY_REMEDIATION.md` - Comprehensive security guide
- `SECURITY_INCIDENT.md` - Original incident report
- `SECURITY_FIXES.md` - Quick reference for fixes
- `scripts/emergency-cleanup.sh` - Emergency response script
- `scripts/verify-security.sh` - Security verification script

---

## ✅ Sign-Off

**Deployed by:** ___________________  
**Date/Time:** ___________________  
**Environment:** [ ] Development  [ ] Staging  [ ] Production  
**Verification passed:** [ ] Yes  [ ] No  
**Issues noted:** ___________________

---

**Status After Completion:** 🟢 **SECURED AND DEPLOYED**

All security measures verified and in place. Continue monitoring as per schedule above.

**Last Updated:** December 12, 2025
