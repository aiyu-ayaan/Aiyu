# Quick Response Guide: Crypto Miner Emergency

## 🚨 IMMEDIATE ACTIONS (Do Now!)

### 1. Stop the Malware (2 minutes)

```bash
# Stop all services
sudo docker-compose down
sudo pkill -f next-server
sudo pkill -f node

# Kill the specific malware process
sudo pkill -f ijnegrrinje
sudo rm -f /tmp/ijnegrrinje*

# Verify it's stopped
ps aux | grep -E "(ijnegrrinje|miner)"
```

### 2. Disconnect (if needed)

```bash
# If attack is ongoing, disconnect from network temporarily
sudo iptables -I INPUT -j DROP
sudo iptables -I OUTPUT -j DROP
# Keep SSH: sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
```

### 3. Run Cleanup Script (5 minutes)

```bash
cd /path/to/Aiyu
chmod +x cleanup-malware.sh
sudo ./cleanup-malware.sh
```

## 🔍 QUICK DIAGNOSTICS

### Check if Malware is Running

```bash
# High CPU processes
top -bn1 | grep "Cpu(s)" | awk '{print $2}'

# Suspicious processes
ps aux | grep -E "(ijnegrrinje|miner|xmrig)" | grep -v grep

# Files in /tmp
ls -la /tmp/*.json

# Network connections to mining pools
netstat -tulpn | grep -E ":(3333|8080|8333|14444)"
```

### One-Liner Health Check

```bash
ps aux | awk '$3 > 80 {print "HIGH CPU:", $11, $3"%"}' && \
find /tmp -name "*.json" -type f && \
netstat -tulpn | grep -E ":(3333|8333)"
```

## 🔒 SECURE THE APPLICATION (15 minutes)

### 1. Clean Install

```bash
# Remove contaminated files
rm -rf node_modules package-lock.json .next

# Clean caches
npm cache clean --force
docker system prune -af --volumes

# Fresh install
npm install

# Security audit
npm audit fix
```

### 2. Update Docker Configuration

```bash
# Add to docker-compose.yml under each service:
tmpfs:
  - /tmp:noexec,nosuid,size=100m
read_only: true
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
```

### 3. Update Environment Variables

```bash
# Generate new secrets
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 32  # For passwords

# Update .env file with new values
nano .env
```

## 🛡️ ESSENTIAL SECURITY PATCHES

### Add Security Headers (next.config.mjs)

```javascript
export default {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    }];
  },
};
```

### Secure API Endpoints

Add to EVERY API route:

```javascript
// At the top of each route file
if (process.env.NODE_ENV === 'production') {
  // Add authentication check
  // Add rate limiting
  // Add input validation
}
```

### Disable Dangerous Endpoints

```bash
# Remove or secure these files:
rm -f src/app/api/seed/route.js  # Or add auth
# Add auth to ALL admin routes
```

## 📊 MONITORING SETUP (5 minutes)

### 1. Set Up Monitoring Script

```bash
# Add to crontab
crontab -e

# Add this line:
*/30 * * * * /path/to/Aiyu/monitor-security.sh

# Or run manually every hour
watch -n 3600 ./monitor-security.sh
```

### 2. Enable System Monitoring

```bash
# Watch for suspicious activity
watch -n 5 'ps aux | sort -nrk 3,3 | head -5'

# Monitor /tmp
watch -n 10 'ls -la /tmp'

# Monitor network
watch -n 10 'netstat -tulpn | grep ESTABLISHED'
```

## 🔥 EMERGENCY COMMANDS

### Force Stop Everything

```bash
sudo systemctl stop docker
sudo killall node
sudo killall next-server
sudo rm -rf /tmp/*
```

### Check for Persistence

```bash
# Cron jobs
crontab -l
cat /etc/crontab
ls /etc/cron.*

# Systemd services
systemctl list-units --type=service --all | grep -E "(ijneg|miner)"

# Startup scripts
ls -la /etc/init.d/
ls -la /etc/systemd/system/
```

### Nuclear Option (If Attack Persists)

```bash
# Backup your data first!
tar -czf backup-$(date +%Y%m%d).tar.gz /path/to/Aiyu

# Rebuild server from scratch
# 1. Create new VPS
# 2. Deploy from clean git repository
# 3. Use new credentials
# 4. Apply all security patches
```

## ✅ VERIFICATION CHECKLIST

After cleanup, verify:

```bash
# No high CPU processes
top -bn1 | head -20

# No malicious files
find /tmp -type f
find /var/tmp -type f

# No suspicious network connections
netstat -tulpn

# Docker running properly
docker-compose ps

# Application responding
curl http://localhost:3000

# No npm vulnerabilities
npm audit

# Firewall enabled
sudo ufw status
```

## 📞 WHEN TO GET HELP

Contact security professionals if:

- Malware keeps coming back after cleanup
- You find rootkit activity
- Server has root-level compromise
- Data breach is suspected
- You're unsure about any step

## 📚 DETAILED GUIDES

- **Full cleanup instructions**: SECURITY_REMEDIATION.md
- **Complete checklist**: SECURITY_CHECKLIST.md
- **Understanding the attack**: SECURITY_README.md
- **Environment setup**: .env.security.example

## 💡 PREVENTION TIPS

### Daily
- Monitor CPU usage
- Check for suspicious processes
- Review logs

### Weekly
- Run security audit: `npm audit`
- Check for updates: `npm outdated`
- Review monitoring reports

### Monthly
- Update dependencies: `npm update`
- Rotate secrets
- Review firewall rules
- Test backups

## 🎯 SUCCESS CRITERIA

You've successfully remediated when:

✅ CPU usage is normal (<10% idle)  
✅ No suspicious processes running  
✅ No malicious files in /tmp  
✅ No connections to mining pools  
✅ npm audit shows no critical issues  
✅ Application running normally  
✅ Monitoring scripts detect no issues  
✅ All passwords changed  
✅ Firewall enabled  
✅ Security headers in place  

## 📝 INCIDENT LOG TEMPLATE

Document what happened:

```
Incident Date: [date/time]
Detected By: [who/what found it]
Initial Symptoms: [what you noticed]
Actions Taken: [what you did]
Files Removed: [list of malicious files]
Security Patches: [what you implemented]
Verification: [how you confirmed it's fixed]
Preventive Measures: [what you added]
Lessons Learned: [what to do differently]
```

---

**Emergency Contact**: Refer to SECURITY_README.md for resources

**Last Updated**: December 2025
