#!/bin/sh
# Wait for PocketBase to be ready

set -e

host="$1"
shift
cmd="$@"

echo "Waiting for PocketBase at $host..."

until wget --spider -q "$host/api/health" 2>/dev/null; do
  >&2 echo "PocketBase is unavailable - sleeping"
  sleep 2
done

>&2 echo "PocketBase is up - executing command"
exec $cmd
