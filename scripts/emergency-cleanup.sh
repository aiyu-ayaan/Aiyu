#!/bin/bash

###############################################################################
# Emergency Cleanup Script for Compromised Container
# 
# Use this script if you detect crypto miner or other malware in your container
# This script will:
# 1. Stop all containers
# 2. Check for suspicious processes
# 3. Collect forensic data
# 4. Clean up compromised resources
# 5. Prepare for secure redeployment
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="/tmp/aiyu-incident-${TIMESTAMP}"
mkdir -p "${LOG_DIR}"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "${LOG_DIR}/cleanup.log"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_DIR}/cleanup.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_DIR}/cleanup.log"
}

header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

###############################################################################
# Step 1: Check if containers are running
###############################################################################

header "STEP 1: Container Status Check"

if docker ps | grep -q "aiyu-app"; then
    warn "Container 'aiyu-app' is currently running"
    CONTAINER_RUNNING=true
else
    log "Container 'aiyu-app' is not running"
    CONTAINER_RUNNING=false
fi

###############################################################################
# Step 2: Collect Forensic Data (if container is running)
###############################################################################

if [ "$CONTAINER_RUNNING" = true ]; then
    header "STEP 2: Collecting Forensic Data"
    
    log "Collecting container logs..."
    docker logs aiyu-app > "${LOG_DIR}/container-logs.txt" 2>&1 || true
    
    log "Collecting running processes..."
    docker exec aiyu-app ps aux > "${LOG_DIR}/processes.txt" 2>&1 || true
    
    log "Checking /tmp directory..."
    docker exec aiyu-app ls -laR /tmp > "${LOG_DIR}/tmp-directory.txt" 2>&1 || true
    
    log "Checking network connections..."
    docker exec aiyu-app netstat -tlnp > "${LOG_DIR}/network-connections.txt" 2>&1 || true
    
    log "Checking for suspicious files..."
    docker exec aiyu-app find /tmp -type f -name "*.json" -o -name "*.sh" > "${LOG_DIR}/suspicious-files.txt" 2>&1 || true
    
    log "Collecting CPU/Memory stats..."
    docker stats aiyu-app --no-stream > "${LOG_DIR}/resource-usage.txt" 2>&1 || true
    
    log "Exporting container filesystem for forensics..."
    docker export aiyu-app > "${LOG_DIR}/container-export.tar" 2>&1 || true
    
    log "✅ Forensic data collected in: ${LOG_DIR}"
else
    header "STEP 2: Skipping Forensics (Container Not Running)"
fi

###############################################################################
# Step 3: Detect Suspicious Activity
###############################################################################

header "STEP 3: Analyzing for Threats"

THREATS_FOUND=false

if [ "$CONTAINER_RUNNING" = true ]; then
    # Check for crypto miner process names
    log "Checking for known crypto miner processes..."
    if docker exec aiyu-app ps aux | grep -qE "xmrig|minerd|cpuminer|cryptonight|\.json"; then
        error "⚠️  THREAT DETECTED: Suspicious process found!"
        docker exec aiyu-app ps aux | grep -E "xmrig|minerd|cpuminer|cryptonight|\.json" | tee -a "${LOG_DIR}/threats-detected.txt"
        THREATS_FOUND=true
    else
        log "No known crypto miner processes detected"
    fi
    
    # Check CPU usage
    log "Checking CPU usage..."
    CPU_USAGE=$(docker stats aiyu-app --no-stream --format "{{.CPUPerc}}" | sed 's/%//' || echo "0")
    # Use awk for portable floating point comparison
    if awk "BEGIN {exit !($CPU_USAGE > 80)}" 2>/dev/null; then
        warn "⚠️  HIGH CPU USAGE: ${CPU_USAGE}% - Possible crypto mining!"
        THREATS_FOUND=true
    else
        log "CPU usage normal: ${CPU_USAGE}%"
    fi
    
    # Check for suspicious files in /tmp
    log "Checking for suspicious files in /tmp..."
    if docker exec aiyu-app sh -c "ls /tmp/*.json 2>/dev/null" > /dev/null 2>&1; then
        error "⚠️  THREAT DETECTED: Suspicious .json files in /tmp!"
        docker exec aiyu-app ls -la /tmp/*.json 2>/dev/null | tee -a "${LOG_DIR}/threats-detected.txt"
        THREATS_FOUND=true
    else
        log "No suspicious files in /tmp"
    fi
fi

if [ "$THREATS_FOUND" = true ]; then
    error "═══════════════════════════════════════════════════"
    error "  ⚠️  SECURITY THREATS DETECTED!"
    error "  Review forensic data in: ${LOG_DIR}"
    error "═══════════════════════════════════════════════════"
else
    log "✅ No obvious threats detected"
fi

###############################################################################
# Step 4: Stop and Remove Containers
###############################################################################

header "STEP 4: Stopping Containers"

read -p "Do you want to stop and remove all containers? (yes/no): " -r
echo
if [[ $REPLY =~ ^[Yy]es$ ]]; then
    log "Stopping all services..."
    docker-compose down || true
    
    log "Removing aiyu containers..."
    docker rm -f aiyu-app aiyu-mongodb 2>/dev/null || true
    
    log "✅ Containers stopped and removed"
else
    warn "Skipping container removal"
fi

###############################################################################
# Step 5: Clean Docker Resources
###############################################################################

header "STEP 5: Docker Resource Cleanup"

read -p "Do you want to remove volumes? WARNING: This deletes database data! (yes/no): " -r
echo
if [[ $REPLY =~ ^[Yy]es$ ]]; then
    log "Removing volumes..."
    docker-compose down -v || true
    log "✅ Volumes removed"
else
    warn "Keeping volumes (database data preserved)"
fi

read -p "Do you want to remove Docker images? (yes/no): " -r
echo
if [[ $REPLY =~ ^[Yy]es$ ]]; then
    log "Removing aiyu Docker images..."
    docker rmi $(docker images -q "aiyu*" 2>/dev/null) 2>/dev/null || log "No images to remove"
    log "✅ Images removed"
else
    warn "Keeping Docker images"
fi

read -p "Do you want to run full Docker cleanup? (yes/no): " -r
echo
if [[ $REPLY =~ ^[Yy]es$ ]]; then
    log "Running Docker system prune..."
    docker system prune -a --volumes -f
    log "✅ Docker cleanup complete"
else
    warn "Skipping Docker system cleanup"
fi

###############################################################################
# Step 6: Check Host System
###############################################################################

header "STEP 6: Checking Host System"

log "Checking for suspicious processes on host..."
if ps aux | grep -v grep | grep -qE "tmp.*\.json|xmrig|minerd"; then
    error "⚠️  WARNING: Suspicious processes on HOST system!"
    ps aux | grep -v grep | grep -E "tmp.*\.json|xmrig|minerd" | tee -a "${LOG_DIR}/host-threats.txt"
else
    log "✅ No suspicious processes on host"
fi

log "Checking network connections on host..."
netstat -tlnp 2>/dev/null | grep -E "ESTABLISHED|LISTEN" > "${LOG_DIR}/host-network.txt" || true
log "Network connections saved to: ${LOG_DIR}/host-network.txt"

log "Checking for suspicious files on host..."
find /tmp -type f -name "*.json" -o -name "*miner*" 2>/dev/null | tee -a "${LOG_DIR}/host-suspicious-files.txt" || true

###############################################################################
# Step 7: Security Recommendations
###############################################################################

header "STEP 7: Security Recommendations"

echo -e "${YELLOW}Before redeploying, you MUST:${NC}"
echo ""
echo "1. 🔑 ROTATE ALL CREDENTIALS in .env file:"
echo "   - JWT_SECRET"
echo "   - ADMIN_PASSWORD"
echo "   - MONGO_ROOT_PASSWORD"
echo "   - BLOG_API_KEY"
echo ""
echo "   Generate new secrets:"
echo "   node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
echo ""
echo "2. 📝 VERIFY docker-compose.yml has security hardening:"
echo "   - read_only: true"
echo "   - tmpfs with noexec"
echo "   - cap_drop: ALL"
echo "   - security_opt: no-new-privileges"
echo "   - Resource limits"
echo ""
echo "3. 🔨 REBUILD images with --no-cache:"
echo "   docker-compose build --no-cache"
echo ""
echo "4. ✅ VERIFY security after deployment:"
echo "   docker exec aiyu-app sh -c 'echo test > /tmp/test.sh && chmod +x /tmp/test.sh && /tmp/test.sh'"
echo "   (Should see 'Permission denied')"
echo ""
echo "5. 📊 MONITOR for 24 hours:"
echo "   docker stats aiyu-app"
echo "   docker-compose logs -f app"
echo ""

###############################################################################
# Step 8: Summary
###############################################################################

header "CLEANUP SUMMARY"

log "Forensic data location: ${LOG_DIR}"
log "Review the following files for details:"
log "  - ${LOG_DIR}/cleanup.log (this output)"
log "  - ${LOG_DIR}/container-logs.txt (container logs)"
log "  - ${LOG_DIR}/processes.txt (running processes)"
log "  - ${LOG_DIR}/threats-detected.txt (detected threats)"
log "  - ${LOG_DIR}/container-export.tar (full container export)"

if [ "$THREATS_FOUND" = true ]; then
    error "⚠️  THREATS WERE DETECTED - Review forensic data carefully"
    error "Consider reporting to security team or conducting full forensic analysis"
else
    log "✅ Cleanup complete - No obvious threats detected"
fi

echo ""
log "Next steps:"
log "1. Review forensic data in ${LOG_DIR}"
log "2. Rotate all credentials (see recommendations above)"
log "3. Review SECURITY_REMEDIATION.md for detailed guidance"
log "4. Rebuild and redeploy with security hardening"
log "5. Monitor for 24-48 hours after redeployment"
echo ""

header "EMERGENCY CLEANUP COMPLETE"

exit 0
