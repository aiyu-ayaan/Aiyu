# Security Checklist for Next.js Application

Use this checklist to ensure your application is properly secured after the crypto miner removal.

## Immediate Actions (Do First)

- [ ] Stop all running containers: `docker-compose down`
- [ ] Kill all Next.js processes: `pkill -f next-server`
- [ ] Remove malicious files: `rm -f /tmp/ijnegrrinje*`
- [ ] Run cleanup script: `./cleanup-malware.sh`
- [ ] Check for additional malicious processes: `ps aux | grep -E "(miner|xmrig)"`
- [ ] Review cron jobs: `crontab -l` and `/etc/crontab`
- [ ] Check systemd services: `systemctl list-units --type=service --state=running`

## Code Security

### Dependencies

- [ ] Run `npm audit` to check for vulnerabilities
- [ ] Update all dependencies: `npm update`
- [ ] Fix high/critical vulnerabilities: `npm audit fix`
- [ ] Remove unused dependencies
- [ ] Review package-lock.json for suspicious packages
- [ ] Use `npm ci` instead of `npm install` in production

### API Endpoints Security

- [ ] Implement rate limiting on all API endpoints
- [ ] Add input validation using zod or joi
- [ ] Sanitize all user inputs
- [ ] Implement CSRF protection
- [ ] Add authentication to admin endpoints
- [ ] Remove or secure `/api/seed` endpoint
- [ ] Validate file uploads (type, size, content)
- [ ] Never execute user-provided code
- [ ] Never use `eval()` or `Function()` with user input
- [ ] Never execute shell commands with user input
- [ ] Implement proper error handling (don't expose stack traces)

### Authentication & Authorization

- [ ] Use strong JWT secrets (64+ random characters)
- [ ] Implement token expiration
- [ ] Use httpOnly cookies for tokens
- [ ] Implement proper session management
- [ ] Add brute force protection on login
- [ ] Use bcrypt or argon2 for password hashing
- [ ] Implement password strength requirements
- [ ] Add 2FA for admin accounts (optional but recommended)

## Infrastructure Security

### Docker Security

- [ ] Run containers as non-root user
- [ ] Use read-only filesystem where possible
- [ ] Mount /tmp with `noexec,nosuid` flags
- [ ] Add security options: `no-new-privileges:true`
- [ ] Drop unnecessary capabilities
- [ ] Use multi-stage builds
- [ ] Don't include secrets in Docker images
- [ ] Use specific image versions (not `latest`)
- [ ] Scan images for vulnerabilities
- [ ] Enable Docker health checks
- [ ] Limit container resources (CPU, memory)

### Environment Variables

- [ ] Never commit .env file to git
- [ ] Use strong, random passwords (20+ characters)
- [ ] Rotate all secrets after compromise
- [ ] Use different secrets for dev/staging/production
- [ ] Store secrets securely (use secret management tools)
- [ ] Never log sensitive information

### Network Security

- [ ] Enable firewall (ufw or iptables)
- [ ] Only open required ports (80, 443, 22)
- [ ] Use SSH keys instead of passwords
- [ ] Disable root SSH login
- [ ] Change default SSH port (optional)
- [ ] Implement fail2ban for intrusion prevention
- [ ] Use HTTPS/TLS for all connections
- [ ] Keep SSL certificates up to date

### Server Security

- [ ] Keep system packages updated: `apt update && apt upgrade`
- [ ] Install security updates automatically
- [ ] Disable unnecessary services
- [ ] Set up log rotation
- [ ] Configure system monitoring
- [ ] Set up intrusion detection (AIDE or Tripwire)
- [ ] Regular security audits
- [ ] Backup important data regularly

## Application Configuration

### Next.js Security

- [ ] Add security headers in next.config.mjs
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Referrer-Policy
  - [ ] Content-Security-Policy
  - [ ] Permissions-Policy
- [ ] Enable CORS only for trusted origins
- [ ] Disable source maps in production
- [ ] Set NODE_ENV=production
- [ ] Use environment-specific configurations

### Database Security

- [ ] Use strong database passwords
- [ ] Don't expose database ports publicly
- [ ] Use connection encryption (SSL/TLS)
- [ ] Implement database backups
- [ ] Use principle of least privilege for DB users
- [ ] Sanitize all database queries
- [ ] Use parameterized queries / ORM
- [ ] Enable database audit logging

## Monitoring & Logging

- [ ] Set up application logging
- [ ] Monitor CPU and memory usage
- [ ] Set up alerts for unusual activity
- [ ] Monitor failed login attempts
- [ ] Track API request rates
- [ ] Log all admin actions
- [ ] Set up centralized logging (optional)
- [ ] Regular log review
- [ ] Monitor disk space
- [ ] Track network traffic patterns

## File Upload Security

- [ ] Validate file extensions (whitelist)
- [ ] Validate file MIME types
- [ ] Check file content (magic numbers)
- [ ] Limit file sizes
- [ ] Scan uploads for malware
- [ ] Store uploads outside web root
- [ ] Use random filenames
- [ ] Set proper file permissions
- [ ] Implement upload rate limiting
- [ ] Never execute uploaded files

## Testing & Validation

- [ ] Test all security changes
- [ ] Perform penetration testing
- [ ] Run security scanners (OWASP ZAP, Burp Suite)
- [ ] Test rate limiting
- [ ] Test authentication/authorization
- [ ] Test file upload restrictions
- [ ] Verify security headers
- [ ] Test error handling
- [ ] Validate input sanitization

## Documentation & Procedures

- [ ] Document all security measures
- [ ] Create incident response plan
- [ ] Document backup and restore procedures
- [ ] Train team on security best practices
- [ ] Regular security training
- [ ] Code review process
- [ ] Security testing in CI/CD pipeline

## Ongoing Maintenance

- [ ] Weekly security audits: `npm audit`
- [ ] Monthly dependency updates
- [ ] Quarterly penetration testing
- [ ] Regular backup testing
- [ ] Review access logs weekly
- [ ] Monitor security advisories
- [ ] Update security documentation
- [ ] Review and update firewall rules

## Emergency Procedures

### If Compromise is Detected

1. [ ] Immediately stop all services
2. [ ] Disconnect from network if necessary
3. [ ] Document everything
4. [ ] Identify entry point
5. [ ] Remove malicious code/files
6. [ ] Patch vulnerabilities
7. [ ] Rotate all credentials
8. [ ] Restore from clean backup if needed
9. [ ] Monitor for recurrence
10. [ ] Update security measures

### Recovery Steps

1. [ ] Fresh server installation (if severely compromised)
2. [ ] Apply all security patches
3. [ ] Deploy from verified source code
4. [ ] Use new credentials
5. [ ] Verify integrity of all files
6. [ ] Monitor closely for 30 days
7. [ ] Conduct post-incident review
8. [ ] Update security procedures

## Compliance

- [ ] GDPR compliance (if applicable)
- [ ] PCI DSS compliance (if handling payments)
- [ ] Regular security audits
- [ ] Data protection policies
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie policy

## Tools & Resources

### Security Tools

- **npm audit**: Built-in npm vulnerability scanner
- **Snyk**: Dependency vulnerability scanner
- **OWASP ZAP**: Web application security scanner
- **rkhunter**: Rootkit detection
- **ClamAV**: Antivirus scanner
- **fail2ban**: Intrusion prevention
- **Lynis**: Security auditing tool

### Security Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/deploying#security
- Docker Security: https://docs.docker.com/develop/security-best-practices/
- Node.js Security: https://nodejs.org/en/docs/guides/security/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework

## Sign-Off

Complete this section after implementing all security measures:

- **Security Review Date**: ___________
- **Reviewed By**: ___________
- **All Critical Items Completed**: [ ] Yes [ ] No
- **Next Review Date**: ___________
- **Additional Notes**: 

---

**Remember**: Security is an ongoing process, not a one-time task. Regular reviews and updates are essential.
