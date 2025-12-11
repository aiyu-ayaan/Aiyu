#!/bin/bash

# Security Monitoring Script
# Run this script periodically to detect suspicious activity

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ALERT=0

echo "========================================"
echo "   Security Monitoring Report"
echo "   $(date)"
echo "========================================"
echo ""

# Function to report suspicious activity
report_alert() {
    echo -e "${RED}[ALERT] $1${NC}"
    ALERT=1
}

report_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

report_ok() {
    echo -e "${GREEN}[OK] $1${NC}"
}

# 1. Check for high CPU usage
echo "1. Checking CPU usage..."
HIGH_CPU=$(ps aux | awk '{if ($3 > 80) print $0}' | grep -v 'PID' | wc -l)
if [ "$HIGH_CPU" -gt 0 ]; then
    report_alert "Found $HIGH_CPU process(es) using >80% CPU"
    ps aux | awk '{if ($3 > 80) print $0}' | grep -v 'PID'
else
    report_ok "No processes with abnormally high CPU usage"
fi
echo ""

# 2. Check for suspicious processes
echo "2. Checking for suspicious processes..."
SUSPICIOUS=$(ps aux | grep -E "(ijnegrrinje|xmrig|minerd|cpuminer|cryptonight)" | grep -v grep || true)
if [ -n "$SUSPICIOUS" ]; then
    report_alert "Found suspicious processes:"
    echo "$SUSPICIOUS"
else
    report_ok "No suspicious processes detected"
fi
echo ""

# 3. Check /tmp directory for suspicious files
echo "3. Checking /tmp directory..."
TEMP_FILES=$(find /tmp -type f -name "*.json" -o -name "*miner*" -o -name "*xmr*" 2>/dev/null || true)
if [ -n "$TEMP_FILES" ]; then
    report_warning "Found suspicious files in /tmp:"
    echo "$TEMP_FILES"
else
    report_ok "No suspicious files in /tmp"
fi
echo ""

# 4. Check for suspicious network connections
echo "4. Checking network connections..."
MINING_PORTS=$(netstat -tulpn 2>/dev/null | grep -E ":(3333|8080|8333|14444|45560)" || true)
if [ -n "$MINING_PORTS" ]; then
    report_alert "Found connections on common mining ports:"
    echo "$MINING_PORTS"
else
    report_ok "No connections on known mining ports"
fi
echo ""

# 5. Check for new cron jobs
echo "5. Checking cron jobs..."
if [ -f /tmp/cron_baseline.txt ]; then
    CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")
    BASELINE_CRON=$(cat /tmp/cron_baseline.txt)
    if [ "$CURRENT_CRON" != "$BASELINE_CRON" ]; then
        report_warning "Cron jobs have changed since baseline"
        echo "Run 'crontab -l' to review"
    else
        report_ok "No changes to cron jobs"
    fi
else
    # Create baseline
    crontab -l 2>/dev/null > /tmp/cron_baseline.txt || echo "" > /tmp/cron_baseline.txt
    report_ok "Created cron baseline for future comparisons"
fi
echo ""

# 6. Check Docker containers (if Docker is running)
if command -v docker &> /dev/null; then
    echo "6. Checking Docker containers..."
    RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" 2>/dev/null || true)
    if [ -n "$RUNNING_CONTAINERS" ]; then
        report_ok "Docker containers running: $(echo $RUNNING_CONTAINERS | tr '\n' ', ')"
        
        # Check for high resource usage in containers
        HIGH_RESOURCE=$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}" 2>/dev/null | awk 'NR>1 {gsub(/%/, "", $2); if ($2 > 80) print $0}' || true)
        if [ -n "$HIGH_RESOURCE" ]; then
            report_warning "Containers with high resource usage:"
            echo "$HIGH_RESOURCE"
        fi
    else
        report_ok "No Docker containers running"
    fi
    echo ""
fi

# 7. Check for failed login attempts (if auth.log exists)
if [ -f /var/log/auth.log ]; then
    echo "7. Checking recent failed login attempts..."
    FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log 2>/dev/null | tail -10 || true)
    if [ -n "$FAILED_LOGINS" ]; then
        FAILED_COUNT=$(echo "$FAILED_LOGINS" | wc -l)
        if [ "$FAILED_COUNT" -gt 5 ]; then
            report_warning "Found $FAILED_COUNT recent failed login attempts"
        else
            report_ok "Found $FAILED_COUNT failed login attempts (normal activity)"
        fi
    else
        report_ok "No recent failed login attempts"
    fi
    echo ""
fi

# 8. Check disk usage
echo "8. Checking disk usage..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    report_alert "Disk usage is at ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -gt 80 ]; then
    report_warning "Disk usage is at ${DISK_USAGE}%"
else
    report_ok "Disk usage is at ${DISK_USAGE}%"
fi
echo ""

# 9. Check for recently modified files in critical directories
echo "9. Checking for recently modified system files..."
MODIFIED_FILES=$(find /etc /usr/local/bin -type f -mtime -1 2>/dev/null | head -10 || true)
if [ -n "$MODIFIED_FILES" ]; then
    report_warning "System files modified in last 24 hours:"
    echo "$MODIFIED_FILES"
else
    report_ok "No recent system file modifications"
fi
echo ""

# 10. Check npm audit (if in project directory)
if [ -f "package.json" ]; then
    echo "10. Running npm security audit..."
    NPM_AUDIT=$(npm audit --json 2>/dev/null || echo "{}")
    VULNERABILITIES=$(echo "$NPM_AUDIT" | grep -o '"vulnerabilities":{[^}]*}' || echo "{}")
    CRITICAL=$(echo "$NPM_AUDIT" | grep -o '"critical":[0-9]*' | cut -d':' -f2 || echo "0")
    HIGH=$(echo "$NPM_AUDIT" | grep -o '"high":[0-9]*' | cut -d':' -f2 || echo "0")
    
    if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
        report_alert "Found $CRITICAL critical and $HIGH high vulnerabilities"
        echo "Run 'npm audit' for details"
    else
        report_ok "No critical or high vulnerabilities found"
    fi
    echo ""
fi

# Summary
echo "========================================"
echo "   Monitoring Summary"
echo "========================================"
if [ "$ALERT" -eq 1 ]; then
    echo -e "${RED}STATUS: ALERTS DETECTED${NC}"
    echo "Review the alerts above and take appropriate action"
    echo "Refer to SECURITY_REMEDIATION.md for guidance"
else
    echo -e "${GREEN}STATUS: ALL CHECKS PASSED${NC}"
    echo "System appears to be operating normally"
fi
echo ""
echo "Next scheduled check: $(date -d '+1 hour' 2>/dev/null || date -v+1H 2>/dev/null || echo 'in 1 hour')"
echo ""

# Save report to log file
REPORT_DIR="/var/log/security-monitoring"
if [ -w "/var/log" ]; then
    mkdir -p "$REPORT_DIR" 2>/dev/null || true
    if [ -d "$REPORT_DIR" ]; then
        REPORT_FILE="$REPORT_DIR/report-$(date +%Y%m%d-%H%M%S).log"
        # Re-run without colors for log file
        bash "$0" > "$REPORT_FILE" 2>&1 &
    fi
fi

# Exit with error code if alerts were found
exit $ALERT
