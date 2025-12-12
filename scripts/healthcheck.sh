#!/bin/sh
# Simple health check script for Docker container
# Returns 0 if healthy, 1 if unhealthy

# Try curl first (installed in Dockerfile)
if command -v curl >/dev/null 2>&1; then
    curl -f -s http://localhost:3000/api/health >/dev/null 2>&1
    exit $?
fi

# Fallback to wget if available
if command -v wget >/dev/null 2>&1; then
    wget -q -O /dev/null http://localhost:3000/api/health 2>/dev/null
    exit $?
fi

# Last resort: Use Node.js with http module (no fetch dependency)
# This works with all Node.js versions
node -e "
const http = require('http');
http.get('http://localhost:3000/api/health', (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
}).on('error', () => {
  process.exit(1);
});" 2>/dev/null
exit $?
