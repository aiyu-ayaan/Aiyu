# Security Incident Response - Crypto Miner Removal

## Overview

This repository contains security remediation materials for removing a crypto mining malware that compromised the Next.js application running on Digital Ocean.

## Files in This Security Package

1. **SECURITY_REMEDIATION.md** - Comprehensive guide for removing the malware and hardening the application
2. **SECURITY_CHECKLIST.md** - Step-by-step checklist for security implementation
3. **cleanup-malware.sh** - Automated script to detect and remove malicious files
4. **.env.security.example** - Template for secure environment variable configuration

## Quick Start

### Step 1: Immediate Response (Do This First!)

```bash
# Stop the compromised application
docker-compose down

# Kill any running Next.js processes
pkill -f next-server

# Remove the malicious files
rm -f /tmp/ijnegrrinje*
rm -f /tmp/ijnegrrinje.json

# Run the cleanup script
chmod +x cleanup-malware.sh
sudo ./cleanup-malware.sh
```

### Step 2: Assess the Damage

```bash
# Check for remaining malicious processes
ps aux | grep -E "(ijnegrrinje|miner|xmrig|cpuminer)"

# Check for suspicious cron jobs
crontab -l
cat /etc/crontab

# Check for suspicious systemd services
systemctl list-units --type=service --state=running

# Check network connections
netstat -tulpn | grep -E ":(3333|8080|8333|14444)"
```

### Step 3: Secure the Application

```bash
# Navigate to your application directory
cd /path/to/Aiyu

# Remove compromised dependencies
rm -rf node_modules package-lock.json .next

# Clean npm cache
npm cache clean --force

# Reinstall dependencies
npm install

# Run security audit
npm audit
npm audit fix

# Update all dependencies
npm update
```

### Step 4: Apply Security Patches

Follow the detailed instructions in **SECURITY_REMEDIATION.md** to:

1. Implement security headers
2. Add rate limiting
3. Secure API endpoints
4. Harden Docker configuration
5. Update environment variables
6. Enable monitoring

### Step 5: Rebuild and Deploy

```bash
# Clean Docker environment
docker system prune -af --volumes

# Rebuild without cache
docker-compose build --no-cache

# Start with new configuration
docker-compose up -d

# Monitor logs
docker-compose logs -f
```

## Understanding the Attack

### What Happened?

A crypto mining malware infiltrated your Next.js application and created a malicious process `/tmp/ijnegrrinje.json` that was consuming 99% CPU to mine cryptocurrency.

### Common Attack Vectors

The malware likely entered through one of these vulnerabilities:

1. **Vulnerable npm packages** - Outdated or compromised dependencies
2. **Insecure API endpoints** - Lack of input validation or authentication
3. **File upload vulnerability** - Unrestricted file uploads allowing script execution
4. **Command injection** - User input being executed as shell commands
5. **Weak authentication** - Default or weak credentials
6. **Exposed admin endpoints** - Unsecured admin or debug endpoints

### Indicators of Compromise (IoCs)

- Process name: `ijnegrrinje.json` or similar variations
- Location: `/tmp/` directory
- High CPU usage: 99%+
- Parent process: `next-server`
- Possible network connections to mining pools (ports 3333, 8080, 8333, 14444)

## Security Best Practices Going Forward

### 1. Regular Updates

```bash
# Weekly security check
npm audit
npm outdated

# Monthly dependency updates
npm update
npm audit fix
```

### 2. Monitoring

```bash
# Monitor CPU usage
watch -n 1 'ps aux | sort -nrk 3,3 | head -10'

# Monitor file changes in /tmp
watch -n 5 'ls -la /tmp'

# Monitor network connections
watch -n 5 'netstat -tulpn | grep ESTABLISHED'

# Monitor Docker logs
docker-compose logs -f --tail=100
```

### 3. Firewall Configuration

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (change 22 if using custom port)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Check status
sudo ufw status verbose
```

### 4. Fail2Ban Setup

```bash
# Install fail2ban
sudo apt-get update
sudo apt-get install fail2ban

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
```

### 5. Regular Backups

```bash
# Backup database
docker-compose exec mongodb mongodump --out=/backup

# Backup application files
tar -czf backup-$(date +%Y%m%d).tar.gz /path/to/Aiyu

# Store backups off-site
# Use services like AWS S3, Backblaze B2, or rsync to remote server
```

## Prevention Checklist

Use **SECURITY_CHECKLIST.md** for a complete checklist, but here are the critical items:

- [ ] All dependencies updated and audited
- [ ] Security headers implemented
- [ ] Rate limiting on all API endpoints
- [ ] Input validation on all user inputs
- [ ] File uploads properly validated
- [ ] Authentication required for admin endpoints
- [ ] Debug/seed endpoints disabled in production
- [ ] Docker containers run as non-root
- [ ] Firewall enabled and configured
- [ ] Monitoring and alerting set up
- [ ] Strong passwords and secrets in place
- [ ] Regular security audits scheduled

## Recommended Security Tools

### For Scanning

```bash
# npm audit - Built-in vulnerability scanner
npm audit

# Snyk - Advanced security scanning (free for open source)
npm install -g snyk
snyk auth
snyk test

# OWASP Dependency-Check
docker run --rm -v $(pwd):/src owasp/dependency-check:latest --scan /src

# ClamAV - Antivirus scanning
sudo apt-get install clamav
sudo freshclam
sudo clamscan -r /
```

### For Monitoring

```bash
# htop - Interactive process viewer
sudo apt-get install htop
htop

# netstat - Network monitoring
netstat -tulpn

# Lynis - Security auditing
sudo apt-get install lynis
sudo lynis audit system

# rkhunter - Rootkit detection
sudo apt-get install rkhunter
sudo rkhunter --update
sudo rkhunter --check
```

## Recovery Steps if Attack Persists

If the crypto miner keeps coming back after cleanup:

1. **Full Server Rebuild**
   - Create fresh VPS instance
   - Apply all security patches
   - Deploy from clean source code
   - Use new credentials everywhere

2. **Check for Root Access**
   ```bash
   # Check for suspicious root processes
   ps aux | grep root
   
   # Check for suspicious sudo entries
   cat /etc/sudoers
   cat /etc/sudoers.d/*
   
   # Check for suspicious SSH keys
   cat ~/.ssh/authorized_keys
   cat /root/.ssh/authorized_keys
   ```

3. **Scan for Rootkits**
   ```bash
   # Install and run rkhunter
   sudo apt-get install rkhunter
   sudo rkhunter --update
   sudo rkhunter --check --report-warnings-only
   
   # Install and run chkrootkit
   sudo apt-get install chkrootkit
   sudo chkrootkit
   ```

4. **Review All Access**
   - Change all system passwords
   - Rotate all SSH keys
   - Review all user accounts
   - Check for unauthorized access in logs
   - Review firewall rules
   - Check for open ports

## Getting Help

If you need additional assistance:

1. **Review the documentation:**
   - SECURITY_REMEDIATION.md - Detailed remediation guide
   - SECURITY_CHECKLIST.md - Implementation checklist

2. **Check system logs:**
   ```bash
   # System logs
   sudo tail -f /var/log/syslog
   sudo tail -f /var/log/auth.log
   
   # Docker logs
   docker-compose logs --tail=1000
   ```

3. **Community resources:**
   - OWASP Community: https://owasp.org/
   - Next.js Security: https://nextjs.org/docs/app/building-your-application/deploying#security
   - Digital Ocean Community: https://www.digitalocean.com/community

4. **Professional help:**
   - Consider hiring a security consultant for thorough audit
   - Contact Digital Ocean support for infrastructure issues
   - File incident report with relevant authorities if data was compromised

## Post-Incident Review

After resolving the incident, conduct a post-mortem:

1. Document what happened
2. Identify the entry point
3. Review response time
4. Update security procedures
5. Train team on new procedures
6. Schedule regular security reviews

## Compliance and Legal

If your application handles sensitive data:

- [ ] Notify affected users (if applicable)
- [ ] Report to relevant authorities (if required by law)
- [ ] Document the incident
- [ ] Review compliance requirements (GDPR, etc.)
- [ ] Update privacy policy if needed
- [ ] Consider cyber insurance

## Contact

For questions or concerns about this security package:

- Review the detailed documentation files
- Check the issue tracker on GitHub
- Contact your security team or administrator

---

**Remember**: Security is a continuous process. Regular updates, monitoring, and audits are essential to maintaining a secure application.

**Last Updated**: December 2025
