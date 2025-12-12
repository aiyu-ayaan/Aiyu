# 🚀 Pre-Deployment Security Checklist

## ⚠️ COMPLETE ALL STEPS BEFORE DOCKER DEPLOYMENT

---

## 📋 **Step-by-Step Deployment Preparation**

### ✅ **STEP 1: Update Environment Variables** (CRITICAL!)

I've generated secure secrets for you. Update your `.env` file with these values:

```env
# COPY THESE TO YOUR .env FILE:

JWT_SECRET=ae1cff999f501ae34febe1a08b1dbffe268b3269d2d470ddd649ea5c4e5162438e731d63c83799d8

BLOG_API_KEY=20ba5034b215288d69d576cd3da4c06ff2343c5b7e1b95869f41a367b4d77a614

MONGO_ROOT_PASSWORD=a7cd36d2bb438b20a42f6bca5544b06c07a42b914b01aa59c

# CREATE A STRONG ADMIN PASSWORD (minimum 12 characters):
ADMIN_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# UPDATE MongoDB URI with the new password:
MONGODB_URI=mongodb://admin:a7cd36d2bb438b20a42f6bca5544b06c07a42b914b01aa59c@mongodb:27017/aiyu?authSource=admin
```

**⚠️ IMPORTANT:**
- Keep these secrets PRIVATE - never commit to git
- Use different secrets for dev/staging/production
- Store production secrets securely (e.g., vault, env manager)

---

### ✅ **STEP 2: Review Uploaded Files**

Run this command to check for suspicious files:

```powershell
Get-ChildItem "d:\VS Code\Next JS\portfolio\public\uploads" | 
  Where-Object {$_.Name -ne '.gitkeep'} | 
  Select-Object Name, Length, LastWriteTime | 
  Format-Table -AutoSize
```

**What to look for:**
- ❌ Files smaller than 1KB (likely fake/malicious)
- ❌ Files with suspicious names
- ❌ Non-image files (.js, .php, .exe, etc.)
- ❌ Recently uploaded files you don't recognize

**Action:** Delete any suspicious files:
```powershell
Remove-Item "d:\VS Code\Next JS\portfolio\public\uploads\SUSPICIOUS_FILE_NAME"
```

---

### ✅ **STEP 3: Check Database for Malicious Content**

Connect to your database and review recent entries:

```bash
# If MongoDB is running, connect:
mongosh "mongodb://localhost:27017/aiyu"

# Then run these queries:
db.blogs.find().sort({createdAt: -1}).limit(10)
db.projects.find().sort({updatedAt: -1}).limit(10)
```

**What to look for:**
- Suspicious blog posts with:
  - `<script>` tags (XSS attempts)
  - Unusual markdown/HTML
  - External URLs you don't recognize
- Modified project data
- Unauthorized admin accounts

**Action:** Delete malicious entries or restore from backup

---

### ✅ **STEP 4: Test Security Features Locally**

Before deploying, test that security works:

#### Test 1: Upload Requires Auth
```bash
# Should return 401 Unauthorized
curl -X POST http://localhost:3000/api/upload -F "file=@test.png"
```

#### Test 2: Magic Number Validation
1. Create fake image: `echo "fake data" > fake.png`
2. Login to admin at `http://localhost:3000/admin`
3. Try uploading fake.png
4. **Expected:** "File signature does not match" error

#### Test 3: Rate Limiting
1. Try wrong password 6 times at login
2. **Expected:** Blocked after 5 attempts

#### Test 4: Real Image Upload Works
1. Use a real PNG/JPG image
2. Login as admin
3. Upload should succeed
4. File should appear in `/uploads`

---

### ✅ **STEP 5: Run Security Scans**

```bash
# Check environment variables and file integrity
npm run security-check

# Check for vulnerable dependencies
npm audit

# Fix auto-fixable vulnerabilities
npm audit fix
```

**Expected Results:**
- ✅ JWT_SECRET is strong
- ✅ Admin password is set
- ✅ No suspicious files
- ✅ All security files present

---

### ✅ **STEP 6: Clean Build Test**

Test that the application builds correctly:

```bash
# Clean build
npm run build

# Should complete without errors
# Check for any warnings about API routes or security issues
```

---

### ✅ **STEP 7: Prepare Docker Environment**

Create a separate `.env.docker` file for production:

```env
# .env.docker - DO NOT COMMIT THIS FILE

MONGODB_URI=mongodb://admin:a7cd36d2bb438b20a42f6bca5544b06c07a42b914b01aa59c@mongodb:27017/aiyu?authSource=admin
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=a7cd36d2bb438b20a42f6bca5544b06c07a42b914b01aa59c

ADMIN_USERNAME=admin
ADMIN_PASSWORD=[YOUR_STRONG_PASSWORD]

JWT_SECRET=ae1cff999f501ae34febe1a08b1dbffe268b3269d2d470ddd649ea5c4e5162438e731d63c83799d8

BLOG_API_KEY=20ba5034b215288d69d576cd3da4c06ff2343c5b7e1b95869f41a367b4d77a614

NEXT_PUBLIC_N8N_WEBHOOK_URL=[YOUR_WEBHOOK_URL]

APP_PORT=3000
```

Update `docker-compose.yml` to use it:
```yaml
# Add to docker-compose.yml
env_file:
  - .env.docker
```

---

### ✅ **STEP 8: Docker Deployment (Safe Steps)**

#### Build and Test Docker Image Locally First:

```bash
# 1. Build the image
docker-compose build

# 2. Start in detached mode
docker-compose up -d

# 3. Watch logs for errors
docker-compose logs -f app

# 4. Wait for "Ready" message
# Should see: "Local: http://localhost:3000"

# 5. Test the application
# Visit: http://localhost:3000
# Try uploading as admin
# Check logs for security warnings

# 6. If everything works, proceed
# If issues found, stop immediately:
docker-compose down
```

#### Security Checks in Docker:

```bash
# Check container permissions
docker-compose exec app whoami
# Expected: "nextjs" (not root!)

# Check file permissions
docker-compose exec app ls -la /app/public/uploads
# Expected: nextjs:nodejs ownership

# Check running processes
docker-compose exec app ps aux
# Should NOT see suspicious processes

# Check network exposure
docker ps --format "table {{.Names}}\t{{.Ports}}"
# Verify only port 3000 is exposed
```

---

### ✅ **STEP 9: Post-Deployment Monitoring**

After deployment, monitor for 24-48 hours:

```bash
# Watch logs continuously
docker-compose logs -f app | grep -E "SECURITY|ERROR|WARN"

# Check for suspicious patterns:
# ❌ Multiple rate limit exceeded messages
# ❌ Failed file validation attempts
# ❌ Unauthorized access attempts
# ❌ Unusual IP addresses
```

---

## 🔒 **Final Security Checklist**

Mark each item as complete before deployment:

### **Environment Security**
- [ ] Generated new JWT_SECRET (64+ chars)
- [ ] Set strong ADMIN_PASSWORD (12+ chars)
- [ ] Generated new BLOG_API_KEY
- [ ] Generated new MONGO_ROOT_PASSWORD
- [ ] Updated MONGODB_URI with new password
- [ ] Created separate `.env.docker` for production
- [ ] Verified `.env` is in `.gitignore`

### **Data Cleanup**
- [ ] Reviewed all files in `public/uploads/`
- [ ] Deleted suspicious uploaded files
- [ ] Checked database for malicious blog posts
- [ ] Checked database for unauthorized users
- [ ] Backed up clean database

### **Code Security**
- [ ] All security fixes are in place
- [ ] `npm audit fix` completed
- [ ] No critical vulnerabilities in `npm audit`
- [ ] Application builds without errors
- [ ] All tests pass

### **Testing Completed**
- [ ] Upload requires authentication ✅
- [ ] Magic number validation works ✅
- [ ] Rate limiting prevents brute force ✅
- [ ] Real images upload successfully ✅
- [ ] Security check script passes ✅

### **Docker Preparation**
- [ ] Docker image builds successfully
- [ ] Container runs as non-root user (nextjs)
- [ ] Only port 3000 exposed
- [ ] Application starts without errors
- [ ] Database connection works
- [ ] File uploads work in container

### **Documentation**
- [ ] Read `SECURITY_INCIDENT.md` thoroughly
- [ ] Understand all security features
- [ ] Know how to check logs for issues
- [ ] Have rollback plan ready

---

## 🚦 **Deployment Decision Matrix**

### ✅ **SAFE TO DEPLOY** if:
- All checklist items above are ✅
- No suspicious files or data found
- All tests pass
- Docker builds and runs locally
- Monitoring plan in place

### ❌ **DO NOT DEPLOY** if:
- ANY environment variable is default/weak
- Suspicious files or data found
- Tests failing
- npm audit shows critical vulnerabilities
- Not comfortable with security setup

---

## 🆘 **Emergency Rollback Plan**

If something goes wrong after deployment:

```bash
# 1. IMMEDIATELY stop the containers
docker-compose down

# 2. Check logs
docker-compose logs app > incident-logs.txt

# 3. Review logs for:
# - Unauthorized access attempts
# - Unusual upload activity
# - Database errors
# - Security warnings

# 4. If compromised:
# - Change ALL secrets again
# - Restore database from clean backup
# - Review code changes
# - Scan for backdoors

# 5. Only restart after fixing issues
```

---

## 📞 **Support**

If you're unsure about ANY step:
1. **STOP** - Don't proceed with deployment
2. Review the security documentation
3. Test more thoroughly in dev environment
4. Ask for help if needed

---

## ✅ **Current Status**

**Code Security:** 🟢 READY  
**Environment Security:** 🔴 **UPDATE REQUIRED**  
**Data Cleanup:** 🟡 **PENDING REVIEW**  
**Testing:** 🟡 **PENDING**

**Deploy to Docker:** ❌ **NOT YET**

---

**Complete this checklist first, THEN it will be safe to deploy! 🛡️**
