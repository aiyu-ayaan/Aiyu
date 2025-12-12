#!/bin/sh
# Simple health check script for Docker container
# Returns 0 if healthy, 1 if unhealthy

# Try curl first (more common in Alpine), then wget, then node as fallback
if command -v curl >/dev/null 2>&1; then
    curl -f -s http://localhost:3000/api/health >/dev/null 2>&1
    exit $?
elif command -v wget >/dev/null 2>&1; then
    wget -q -O /dev/null http://localhost:3000/api/health 2>/dev/null
    exit $?
else
    # Fallback to Node.js if neither curl nor wget available
    node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" 2>/dev/null
    exit $?
fi
