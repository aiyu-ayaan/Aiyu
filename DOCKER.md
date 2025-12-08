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
MONGODB_URI=mongodb://admin:YOUR_SECURE_PASSWORD@mongodb:27017/aiyu?authSource=admin

# MongoDB Root Credentials
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YOUR_SECURE_PASSWORD

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
docker compose up -d

# View logs (optional)
docker compose logs -f
```

### 4. Access the Application

- **Main Site**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login
- **MongoDB**: localhost:27017 (accessible with configured credentials)

## Docker Architecture

### Multi-Stage Build

The Dockerfile uses a three-stage build process:

1. **deps**: Installs dependencies using npm ci
2. **builder**: Builds the Next.js application
3. **runner**: Minimal production image with only necessary files

This approach:
- Reduces final image size
- Improves security by excluding build tools
- Runs as non-root user (nextjs:1001)

### Services

#### App Service
- **Image**: Built from Dockerfile
- **Port**: 3000 (configurable via APP_PORT)
- **Environment**: Reads from .env file
- **Depends on**: MongoDB (waits for health check)

#### MongoDB Service
- **Image**: mongo:7
- **Port**: 27017
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

# Force rebuild without cache
docker compose build --no-cache
docker compose up -d
```

### Database Management

```bash
# Access MongoDB shell
docker exec -it aiyu-mongodb mongosh -u admin -p YOUR_PASSWORD --authenticationDatabase admin

# Backup database
docker exec aiyu-mongodb mongodump --uri="mongodb://admin:YOUR_PASSWORD@localhost:27017/aiyu?authSource=admin" --out=/backup

# Restore database
docker exec aiyu-mongodb mongorestore --uri="mongodb://admin:YOUR_PASSWORD@localhost:27017/aiyu?authSource=admin" /backup/aiyu
```

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| MONGODB_URI | MongoDB connection string | Yes | mongodb://admin:YOUR_PASSWORD@mongodb:27017/aiyu?authSource=admin |
| MONGO_ROOT_USERNAME | MongoDB root username | Yes | admin |
| MONGO_ROOT_PASSWORD | MongoDB root password | Yes | YOUR_SECURE_PASSWORD |
| NEXT_PUBLIC_N8N_WEBHOOK_URL | N8N webhook endpoint | No | https://n8n.example.com/webhook/id |
| ADMIN_USERNAME | Admin panel username | Yes | admin |
| ADMIN_PASSWORD | Admin panel password | Yes | secure_password |
| JWT_SECRET | Secret for JWT tokens | Yes | random_secret_string |
| APP_PORT | Application port | No | 3000 (default) |

## Troubleshooting

### Port Already in Use

If port 3000 or 27017 is already in use:

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
