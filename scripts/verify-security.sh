#!/bin/bash

###############################################################################
# Security Verification Script
# 
# Verifies that all security hardening measures are properly configured
# Run this after deployment to ensure container is secure
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARNINGS++))
}

header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

###############################################################################
# Check 1: Container Running
###############################################################################

header "Container Status"

if docker ps | grep -q "aiyu-app"; then
    pass "Container 'aiyu-app' is running"
else
    fail "Container 'aiyu-app' is not running"
    echo "Start containers with: docker-compose up -d"
    exit 1
fi

###############################################################################
# Check 2: Read-only Filesystem
###############################################################################

header "Filesystem Security"

if docker inspect aiyu-app | grep -q '"ReadonlyRootfs": true'; then
    pass "Root filesystem is read-only"
else
    fail "Root filesystem is NOT read-only"
    echo "Add 'read_only: true' to docker-compose.yml"
fi

###############################################################################
# Check 3: tmpfs with noexec
###############################################################################

header "Temporary Filesystem Security"

# Test if we can execute from /tmp (should fail)
if docker exec aiyu-app sh -c "echo '#!/bin/sh' > /tmp/test-exec.sh && chmod +x /tmp/test-exec.sh && /tmp/test-exec.sh" 2>&1 | grep -q "Permission denied"; then
    pass "/tmp mounted with noexec (execution blocked)"
else
    fail "/tmp is NOT mounted with noexec (execution allowed!)"
    echo "Add tmpfs mount with noexec to docker-compose.yml"
fi

# Cleanup test file
docker exec aiyu-app rm -f /tmp/test-exec.sh 2>/dev/null || true

###############################################################################
# Check 4: Capability Restrictions
###############################################################################

header "Capability Restrictions"

CAPS=$(docker inspect aiyu-app --format '{{.HostConfig.CapDrop}}')
if echo "$CAPS" | grep -q "ALL"; then
    pass "All capabilities dropped"
else
    fail "Not all capabilities dropped"
    echo "Add 'cap_drop: ALL' to docker-compose.yml"
fi

CAPS_ADD=$(docker inspect aiyu-app --format '{{.HostConfig.CapAdd}}')
if echo "$CAPS_ADD" | grep -q "NET_BIND_SERVICE" && ! echo "$CAPS_ADD" | grep -qE "\[NET_BIND_SERVICE [A-Z_]+\]"; then
    pass "Only NET_BIND_SERVICE capability added"
else
    warn "Unexpected capabilities added: $CAPS_ADD"
fi

###############################################################################
# Check 5: Security Options
###############################################################################

header "Security Options"

SECOPTS=$(docker inspect aiyu-app --format '{{.HostConfig.SecurityOpt}}')
if echo "$SECOPTS" | grep -q "no-new-privileges:true"; then
    pass "no-new-privileges enabled"
else
    fail "no-new-privileges NOT enabled"
    echo "Add 'security_opt: [no-new-privileges:true]' to docker-compose.yml"
fi

###############################################################################
# Check 6: Resource Limits
###############################################################################

header "Resource Limits"

CPU_LIMIT=$(docker inspect aiyu-app --format '{{.HostConfig.NanoCpus}}')
if [ "$CPU_LIMIT" != "0" ]; then
    CPU_CORES=$(echo "scale=2; $CPU_LIMIT / 1000000000" | bc)
    pass "CPU limit set to ${CPU_CORES} cores"
else
    fail "No CPU limit set"
    echo "Add CPU limits under 'deploy.resources.limits' in docker-compose.yml"
fi

MEM_LIMIT=$(docker inspect aiyu-app --format '{{.HostConfig.Memory}}')
if [ "$MEM_LIMIT" != "0" ]; then
    MEM_MB=$((MEM_LIMIT / 1024 / 1024))
    pass "Memory limit set to ${MEM_MB}MB"
else
    fail "No memory limit set"
    echo "Add memory limits under 'deploy.resources.limits' in docker-compose.yml"
fi

###############################################################################
# Check 7: Current Resource Usage
###############################################################################

header "Current Resource Usage"

STATS=$(docker stats aiyu-app --no-stream --format "CPU: {{.CPUPerc}} | Memory: {{.MemUsage}}")
echo "$STATS"

CPU_USAGE=$(docker stats aiyu-app --no-stream --format "{{.CPUPerc}}" | sed 's/%//')
if (( $(echo "$CPU_USAGE < 50" | bc -l 2>/dev/null || echo 1) )); then
    pass "CPU usage is normal: ${CPU_USAGE}%"
elif (( $(echo "$CPU_USAGE < 80" | bc -l 2>/dev/null || echo 0) )); then
    warn "CPU usage is elevated: ${CPU_USAGE}%"
else
    fail "CPU usage is very high: ${CPU_USAGE}% - Possible crypto mining!"
fi

###############################################################################
# Check 8: Health Check
###############################################################################

header "Health Check"

HEALTH=$(docker inspect aiyu-app --format '{{.State.Health.Status}}' 2>/dev/null || echo "none")
if [ "$HEALTH" = "healthy" ]; then
    pass "Container health check is passing"
elif [ "$HEALTH" = "none" ]; then
    warn "No health check configured"
else
    fail "Container health check failing: $HEALTH"
fi

# Test health endpoint directly
if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    pass "Health endpoint responding"
else
    warn "Health endpoint not responding (may still be starting)"
fi

###############################################################################
# Check 9: Running Processes
###############################################################################

header "Running Processes"

PROCESSES=$(docker exec aiyu-app ps aux | grep -v "ps aux" | wc -l)
echo "Number of running processes: $PROCESSES"

# Check for suspicious processes
if docker exec aiyu-app ps aux | grep -qE "xmrig|minerd|cpuminer|cryptonight"; then
    fail "SUSPICIOUS PROCESS DETECTED - Possible crypto miner!"
    docker exec aiyu-app ps aux | grep -E "xmrig|minerd|cpuminer|cryptonight"
else
    pass "No suspicious processes detected"
fi

###############################################################################
# Check 10: File Permissions
###############################################################################

header "File Permissions"

# Check uploads directory exists and has correct permissions
if docker exec aiyu-app test -d /app/public/uploads; then
    PERMS=$(docker exec aiyu-app stat -c "%a" /app/public/uploads 2>/dev/null || echo "unknown")
    if [ "$PERMS" = "755" ] || [ "$PERMS" = "775" ]; then
        pass "Upload directory has secure permissions: $PERMS"
    else
        warn "Upload directory permissions: $PERMS (expected 755)"
    fi
else
    warn "Upload directory doesn't exist yet (created on first upload)"
fi

###############################################################################
# Check 11: Environment Variables
###############################################################################

header "Environment Variable Security"

# Check if dummy credentials are still being used
if docker exec aiyu-app sh -c 'echo $JWT_SECRET' | grep -q "your-secret-key\|dummy"; then
    fail "JWT_SECRET is using default/dummy value - CHANGE IT IMMEDIATELY!"
else
    pass "JWT_SECRET appears to be customized"
fi

if docker exec aiyu-app sh -c 'echo $ADMIN_PASSWORD' | grep -q "CHANGE\|admin\|password\|dummy"; then
    fail "ADMIN_PASSWORD is using default/weak value - CHANGE IT IMMEDIATELY!"
else
    pass "ADMIN_PASSWORD appears to be customized"
fi

###############################################################################
# Check 12: Network Security
###############################################################################

header "Network Security"

# Check for unexpected network connections
CONNECTIONS=$(docker exec aiyu-app netstat -tn 2>/dev/null | grep ESTABLISHED | wc -l)
echo "Active network connections: $CONNECTIONS"

# Check if MongoDB port is exposed externally
if docker ps --format '{{.Ports}}' | grep "27017->27017"; then
    warn "MongoDB port 27017 is exposed externally - Consider removing this exposure"
else
    pass "MongoDB port is not exposed externally"
fi

###############################################################################
# Summary
###############################################################################

header "Security Verification Summary"

echo ""
echo "Results:"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ All security checks passed!${NC}"
        EXIT_CODE=0
    else
        echo -e "${YELLOW}⚠️  Security checks passed with warnings${NC}"
        echo "Review warnings above and address if needed"
        EXIT_CODE=0
    fi
else
    echo -e "${RED}❌ Security verification failed!${NC}"
    echo "Fix the failed checks above before deploying to production"
    EXIT_CODE=1
fi

echo ""
echo "For detailed security guidance, see:"
echo "  - SECURITY_REMEDIATION.md"
echo "  - SECURITY_INCIDENT.md"
echo ""

exit $EXIT_CODE
