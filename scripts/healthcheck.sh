#!/bin/sh
# Simple health check script for Docker container
# Returns 0 if healthy, 1 if unhealthy

# Try to fetch the health endpoint
node -e "
  fetch('http://localhost:3000/api/health')
    .then(r => r.ok ? process.exit(0) : process.exit(1))
    .catch(() => process.exit(1))
" 2>/dev/null

exit $?
