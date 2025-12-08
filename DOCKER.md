# Docker Setup Guide

This document provides detailed instructions for running the Aiyu portfolio application using Docker.

## Overview

The Docker setup includes:
- **Dockerfile**: Multi-stage build for optimized Next.js application
- **docker-compose.yml**: Orchestrates the app and MongoDB services
- **.dockerignore**: Optimizes build context by excluding unnecessary files

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose v2.0 or higher
- 2GB+ available disk space

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository (if not already done)
git clone https://github.com/aiyu-ayaan/Aiyu.git
cd Aiyu

# Copy the environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your configuration:

```bash
# MongoDB Configuration (for Docker Compose)
MONGODB_URI=mongodb://admin:YOUR_STRONG_PASSWORD@mongodb:27017/aiyu?authSource=admin

# MongoDB Root Credentials
# WARNING: Use a strong, unique password - this creates the MongoDB root user
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YOUR_STRONG_PASSWORD

# N8N Webhook URL
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-id

# Admin Panel Credentials
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_admin_password

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_generated_jwt_secret_key

# Application Port (optional)
APP_PORT=3000
```

### 3. Start the Application

```bash
# Start all services in detached mode
# The --build flag is recommended for first run or after code changes
docker compose up -d --build

# View logs (optional)
docker compose logs -f
```

**Note**: The build process requires environment variables from your `.env` file. Make sure it's properly configured before building.

### 4. Access the Application

- **Main Site**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login
- **MongoDB**: Accessible internally by app (not exposed to host by default for security)

## Docker Architecture

### Multi-Stage Build

The Dockerfile uses a three-stage build process:

1. **deps**: Installs dependencies using npm ci
2. **builder**: Builds the Next.js application with environment variables passed as build args
3. **runner**: Minimal production image with only necessary files

This approach:
- Reduces final image size
- Improves security by excluding build tools
- Runs as non-root user (nextjs:1001)
- Passes environment variables during build for Next.js data collection

### Services

#### App Service
- **Image**: Built from Dockerfile
- **Port**: 3000 (configurable via APP_PORT)
- **Environment**: Reads from .env file
- **Depends on**: MongoDB (waits for health check)

#### MongoDB Service
- **Image**: mongo:7
- **Port**: 27017 (internal network only, not exposed to host by default)
- **Volumes**: Persistent data storage
- **Health Check**: Ensures database is ready before starting app

## Common Commands

### Starting and Stopping

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Stop and remove volumes (WARNING: deletes database)
docker compose down -v
```

### Monitoring

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f app
docker compose logs -f mongodb

# Check service status
docker compose ps
```

### Rebuilding

```bash
# Rebuild after code changes
docker compose up -d --build

# Force rebuild without cache (useful after dependency changes)
docker compose build --no-cache
docker compose up -d

# If you get build errors about missing environment variables:
# Make sure your .env file exists and contains all required variables
```

### Database Management

```bash
# Access MongoDB shell (from within container)
# Replace YOUR_PASSWORD with the value from MONGO_ROOT_PASSWORD in .env
docker exec -it aiyu-mongodb mongosh -u admin -p YOUR_PASSWORD --authenticationDatabase admin

# Alternative: Use environment variable (more secure)
docker exec -it aiyu-mongodb sh -c 'mongosh -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase admin'

# If you need external MongoDB access, uncomment the ports section in docker-compose.yml:
# ports:
#   - "27017:27017"

# Backup database (replace YOUR_PASSWORD with actual password from .env)
docker exec aiyu-mongodb mongodump --uri="mongodb://admin:YOUR_PASSWORD@localhost:27017/aiyu?authSource=admin" --out=/backup

# Restore database (replace YOUR_PASSWORD with actual password from .env)
docker exec aiyu-mongodb mongorestore --uri="mongodb://admin:YOUR_PASSWORD@localhost:27017/aiyu?authSource=admin" /backup/aiyu
```

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| MONGODB_URI | MongoDB connection string | Yes | mongodb://admin:YOUR_STRONG_PASSWORD@mongodb:27017/aiyu?authSource=admin |
| MONGO_ROOT_USERNAME | MongoDB root username | Yes | admin |
| MONGO_ROOT_PASSWORD | MongoDB root password | Yes | Use strong unique password |
| NEXT_PUBLIC_N8N_WEBHOOK_URL | N8N webhook endpoint | No | https://n8n.example.com/webhook/id |
| ADMIN_USERNAME | Admin panel username | Yes | admin |
| ADMIN_PASSWORD | Admin panel password | Yes | secure_password |
| JWT_SECRET | Secret for JWT tokens | Yes | random_secret_string |
| APP_PORT | Application port | No | 3000 (default) |

## Troubleshooting

### Build Error: "Please define the MONGODB_URI environment variable"

This error occurs when the `.env` file is missing or incomplete during build.

**Solution**:
```bash
# 1. Ensure .env file exists
cp .env.example .env

# 2. Fill in all required variables in .env
# 3. Rebuild
docker compose up -d --build
```

The Next.js build process requires MONGODB_URI environment variable because the database connection module is imported at the top level in API routes.

### Build Error: "Error occurred prerendering page" or "MongooseServerSelectionError: getaddrinfo EAI_AGAIN dummy"

This error occurs when Next.js tries to pre-render pages that require database access during the Docker build process. The dummy MongoDB URI used during build causes connection failures.

**Solution**: Both the site layout (`src/app/(site)/layout.js`) and admin layout (`src/app/admin/layout.js`) are configured with `export const dynamic = 'force-dynamic'` to prevent pre-rendering. This forces all pages to be rendered dynamically at runtime when the real database is available.

If you add new layouts or pages that require database access, make sure they're marked as dynamic:

```javascript
// Add this to any layout or page that needs database access
export const dynamic = 'force-dynamic';
```

**Why this happens**: Next.js standalone output tries to statically generate pages during build. Server components that fetch data from the database will attempt to connect, but the dummy MongoDB URI (`mongodb://dummy:27017/dummy`) used during build cannot be reached, causing timeouts and build failures.

### Port Already in Use

If port 3000 is already in use:

```bash
# Change APP_PORT in .env
APP_PORT=3001

# Or modify docker-compose.yml ports mapping
```

### Database Connection Issues

```bash
# Check MongoDB is healthy
docker compose ps

# View MongoDB logs
docker compose logs mongodb

# Verify connection string in .env matches MongoDB credentials
```

### Build Failures

```bash
# Clear Docker cache and rebuild
docker compose down
docker system prune -a
docker compose up -d --build
```

### Permission Issues

```bash
# Fix ownership (if needed)
sudo chown -R $USER:$USER .
```

## Production Deployment

For production deployments:

1. **Use strong passwords**: Generate secure credentials
2. **Use secrets management**: Consider Docker secrets or external secret managers
3. **Enable SSL/TLS**: Use a reverse proxy (nginx, traefik) with SSL certificates
4. **Regular backups**: Set up automated MongoDB backups
5. **Resource limits**: Add memory and CPU limits to docker-compose.yml
6. **Monitoring**: Implement logging and monitoring solutions

### Example with Resource Limits

```yaml
services:
  app:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          memory: 512M
```

## Security Considerations

- The application runs as non-root user (UID 1001)
- MongoDB data is persisted in named volumes
- Environment variables are never committed to Git
- Use strong passwords and JWT secrets in production
- Regular security updates: `docker compose pull && docker compose up -d`

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)
- [MongoDB Docker Guide](https://hub.docker.com/_/mongo)
