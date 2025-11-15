#!/bin/bash
# Portfolio startup script

set -e

echo "🚀 Starting Aiyu Portfolio Setup"
echo "================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found, creating from .env.example"
    cp .env.example .env.local
    echo "✅ Created .env.local - Please update with your credentials"
    echo "   Edit .env.local and run this script again"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📦 Starting services with Docker Compose..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if PocketBase is up
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8090/api/health > /dev/null 2>&1; then
        echo "✅ PocketBase is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Waiting for PocketBase... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ PocketBase failed to start. Check logs with: docker-compose logs pocketbase"
    exit 1
fi

echo ""
echo "🎉 Services are running!"
echo ""
echo "📋 Next Steps:"
echo "   1. Create PocketBase admin account at: http://localhost:8090/_/"
echo "      Use credentials from .env.local"
echo "   2. Run data migration: npm run migrate"
echo "   3. Access portfolio at: http://localhost:3000"
echo ""
echo "📊 Useful Commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart: docker-compose restart"
echo ""
