# Deployment Guide

## Docker Deployment

### Prerequisites
- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)

### Quick Deploy

1. **Clone the repository**
```bash
git clone https://github.com/aiyu-ayaan/Aiyu.git
cd Aiyu
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
nano .env  # or use your preferred editor
```

3. **Build and run**
```bash
docker-compose up -d
```

4. **Access the application**
- Portfolio: http://localhost:3000
- Admin Panel: http://localhost:3000/admin/login

### Docker Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View running containers
docker ps

# Access container shell
docker-compose exec web sh
```

### Production Deployment

#### Environment Variables

For production, ensure strong credentials:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_very_secure_password_here
JWT_SECRET=generate_a_long_random_string_at_least_32_chars
DATA_DIR=/app/data
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

#### Using External Data Volume

To persist data outside the container:

```yaml
# docker-compose.yml
services:
  web:
    volumes:
      - /path/to/your/data:/app/data
```

#### Reverse Proxy (Nginx Example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

### Cloud Deployment Options

#### AWS ECS/Fargate

1. Build and push to ECR:
```bash
aws ecr get-login-password --region region | docker login --username AWS --password-stdin account.dkr.ecr.region.amazonaws.com
docker build -t aiyu-portfolio .
docker tag aiyu-portfolio:latest account.dkr.ecr.region.amazonaws.com/aiyu-portfolio:latest
docker push account.dkr.ecr.region.amazonaws.com/aiyu-portfolio:latest
```

2. Create ECS task definition with environment variables
3. Create ECS service
4. Set up Application Load Balancer

#### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/aiyu-portfolio
gcloud run deploy aiyu-portfolio \
  --image gcr.io/PROJECT_ID/aiyu-portfolio \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ADMIN_USERNAME=admin,JWT_SECRET=your_secret
```

#### Azure Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name aiyu-portfolio \
  --image your-registry.azurecr.io/aiyu-portfolio:latest \
  --dns-name-label aiyu-portfolio \
  --ports 3000 \
  --environment-variables \
    ADMIN_USERNAME=admin \
    JWT_SECRET=your_secret
```

#### DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure as a Web Service
3. Set environment variables in the dashboard
4. Deploy

#### Vercel (Serverless)

Note: The current implementation uses file-based storage which isn't ideal for serverless. For Vercel deployment, consider using a database instead.

```bash
npm install -g vercel
vercel
```

### Traditional Server Deployment

#### Using PM2

```bash
# Install dependencies
npm install

# Install PM2
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start npm --name "aiyu-portfolio" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

#### Using systemd

Create `/etc/systemd/system/aiyu-portfolio.service`:

```ini
[Unit]
Description=Aiyu Portfolio
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/aiyu
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
EnvironmentFile=/var/www/aiyu/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable aiyu-portfolio
sudo systemctl start aiyu-portfolio
```

### Backup and Restore

#### Backup Data

```bash
# Create backup
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Or with Docker
docker-compose exec web tar -czf /tmp/backup.tar.gz /app/data
docker cp $(docker-compose ps -q web):/tmp/backup.tar.gz ./backup.tar.gz
```

#### Restore Data

```bash
# Extract backup
tar -xzf backup-20250116.tar.gz

# Or with Docker
docker cp backup.tar.gz $(docker-compose ps -q web):/tmp/
docker-compose exec web tar -xzf /tmp/backup.tar.gz -C /app
```

### Monitoring

#### Health Check

```bash
curl http://localhost:3000/api/data/homescreen
```

#### Docker Health Check

Already configured in `docker-compose.yml`:
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Troubleshooting

#### Container won't start
```bash
# Check logs
docker-compose logs

# Check if port is in use
lsof -i :3000

# Check Docker status
docker ps -a
```

#### Permission issues with data folder
```bash
# Inside container
docker-compose exec web chown -R nextjs:nodejs /app/data
```

#### Out of disk space
```bash
# Clean up Docker
docker system prune -a
docker volume prune
```

### Security Checklist

- [ ] Strong admin password set
- [ ] Secure JWT secret configured
- [ ] HTTPS enabled (SSL certificate)
- [ ] Firewall configured
- [ ] Regular backups scheduled
- [ ] Docker images updated regularly
- [ ] Environment variables not committed to Git
- [ ] Rate limiting configured (if needed)
- [ ] Monitoring set up

### Performance Optimization

1. **Enable Caching**: Use Redis or similar for API responses
2. **CDN**: Serve static assets via CDN
3. **Database**: Consider migrating to a database for better performance
4. **Load Balancing**: Use multiple instances behind a load balancer
5. **Compression**: Enable gzip compression in Nginx/proxy

## Need Help?

- Check the [Admin Guide](ADMIN_GUIDE.md) for usage instructions
- Review [README.md](README.md) for general information
- Create an issue on GitHub for bugs or questions
