# Aiyu Architecture & System Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User/Browser                                 │
│                    (Public & Admin Access)                           │
└────────────────┬────────────────────────────────────────────────────┘
                 │ HTTP/HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NGINX Reverse Proxy                           │
│    (Production Only - Port 80/443, Gzip, Static Cache, SSL)          │
│                   Routes & Load Balancing                            │
└────────────────┬────────────────────────────────────────────────────┘
                 │ Internal Network (docker network: aiyu-network)
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Next.js Application (Port 3000)                         │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  Frontend (React 19)                                            │ │
│ │  - Public Pages (Home, About, Projects, Blogs, Gallery)         │ │
│ │  - Admin Panel (/admin)                                         │ │
│ │  - Theme System (21+ presets + custom themes)                   │ │
│ │  - Markdown Rendering with Syntax Highlighting                 │ │
│ │  - Real-time UI Updates (Framer Motion)                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  Backend (Next.js API Routes)                                   │ │
│ │  - Authentication (JWT)                                         │ │
│ │  - Content Management (CRUD operations)                         │ │
│ │  - Image Processing (Sharp - HEIC, JPEG, PNG, WebP)             │ │
│ │  - Rate Limiting & Security Middleware                          │ │
│ │  - Webhook Integration (n8n, Notion, etc.)                      │ │
│ │  - Database Operations (Mongoose ODM)                           │ │
│ │  - AI Features (Google Gemini Integration)                      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  Security Features                                              │ │
│ │  ✓ Non-root user execution (nextjs user)                        │ │
│ │  ✓ Read-only filesystem (tmpfs for writable dirs)               │ │
│ │  ✓ /tmp with noexec (crypto miner prevention)                   │ │
│ │  ✓ Capability dropping (ALL dropped, NET_BIND_SERVICE only)     │ │
│ │  ✓ CPU/Memory limits (1 core / 512MB max)                       │ │
│ │  ✓ No privilege escalation allowed                              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└────────────────┬──────────────────┬──────────────────┬───────────────┘
                 │                  │                  │
                 ▼                  ▼                  ▼
    ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  MongoDB Cluster     │  │  Persistent Data │  │  External APIs   │
    │  (Replica Set)       │  │  (Named Volumes) │  │  - Google Gemini │
    │                      │  │                  │  │  - n8n Webhooks  │
    │  Primary: mongo1     │  │  - uploads_data  │  │  - GitHub API    │
    │  Secondary: mongo2   │  │  - mongodb_data  │  │  - MongoDB Atlas │
    │  Secondary: mongo3   │  │  - nginx_cache   │  │                  │
    │                      │  │  - nextjs_cache  │  │                  │
    │  Replica Set: rs0    │  │                  │  │                  │
    │  Port: 27017         │  └──────────────────┘  └──────────────────┘
    │  Auth: Enabled       │
    │  Persistence: Yes    │
    │  Network: aiyu-net   │
    └──────────────────────┘
```

---

## Production Deployment (docker-compose.yml)

```
User/Browser
     │
     │ HTTP/HTTPS (Port 80/443)
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              NGINX Reverse Proxy                                │
│  - SSL/TLS Termination                                          │
│  - Static File Serving (public, uploads)                        │
│  - Gzip Compression                                             │
│  - Response Caching (nginx_cache volume)                        │
│  - Route-level Proxy Behavior                                   │
│  - Health Checks (/nginx-health endpoint)                       │
│  Container: nginx:alpine                                        │
│  Port: 80 (internal) → APP_PORT (external, default 3000)        │
└────────────┬──────────────────────────────────────────────────┘
             │ Port 3000 (internal)
             ▼
┌──────────────────────────────────────────────────────────────┐
│         Next.js Application (Docker Image)                   │
│  aiyuayaan/aiyu:${APP_IMAGE_TAG:-latest}                     │
│  - Pre-built, optimized image                                │
│  - Environment: production                                   │
│  - Health check: ENABLED (150s start period)                 │
│  - Resource limits: CPU 1.0, Memory 512MB                    │
│  - Security hardened                                         │
│  - Pulls from Docker Hub                                     │
│  Container: aiyu-app                                         │
└────────┬───────────────────────┬───────────────────┬─────────┘
         │                       │                   │
    Port 27017              Internal Network    External APIs
         │                    (aiyu-network)          │
         ▼                       ▼                     │
┌──────────────────────┐  ┌──────────────────┐       │
│   MongoDB Cluster    │  │  Named Volumes   │       ▼
│   (Replica Set)      │  │                  │  ┌────────────────┐
│                      │  │  uploads_data    │  │ External APIs  │
│ mongo1:27017 (Primary)  │  mongodb_data    │  │ - Google Gemini│
│ mongo2:27017           │  mongodb_config   │  │ - n8n Webhooks │
│ mongo3:27017           │  nginx_cache      │  │ - GitHub API   │
│                      │  nextjs_cache      │  │ - Email Service│
│ Replica Set: rs0     │                    │  └────────────────┘
│ Auth: Enabled        │  Persistence: Yes  │
│ Persistence: Yes     └──────────────────┘
└──────────────────────┘
```

**Key Production Features:**
- Pre-built Docker image from Docker Hub (faster startup)
- NGINX reverse proxy with SSL/TLS support
- MongoDB replica set for high availability & failover
- Persistent named volumes for data durability
- Health checks on all services
- Zero-downtime deployments possible
- Suitable for cloud platforms (AWS, DigitalOcean, etc.)

---

## Local Development (docker-compose-local.yml)

```
Developer's Machine
      │
      │ Port 3000
      ▼
┌─────────────────────────────────────────────────────────────────┐
│         Next.js Application (Local Build)                       │
│  - Built from local source (docker-compose-local.yml)           │
│  - Dockerfile in project root                                   │
│  - Environment: production                                      │
│  - Health check: ENABLED (40s start period)                     │
│  - Resource limits: CPU 1.0, Memory 512MB                       │
│  - Security hardened                                            │
│  - Direct port exposure (NO NGINX)                              │
│  Container: aiyu-app                                            │
└────────────┬───────────────────────────────────────────────────┘
             │ Port 27017
             ▼
        ┌─────────────────────────┐
        │  MongoDB (Single Node)   │
        │  image: mongo:7          │
        │  Container: aiyu-mongodb │
        │  Port: 27017             │
        │  Auth: Enabled           │
        │  Persistence: Named vol  │
        │  (NO replica set)        │
        │  Health check: ENABLED   │
        └─────────────────────────┘
```

**Key Local Development Features:**
- Built from local source code (instant code updates with rebuild)
- No NGINX (direct app access on port 3000)
- Single MongoDB instance (not replica set)
- Faster startup time than production
- Ideal for testing Docker changes before production
- Same security configurations as production
- Mount local directories for development

---

## Data Flow & Request Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     USER REQUEST LIFECYCLE                                │
└──────────────────────────────────────────────────────────────────────────┘

1. INCOMING REQUEST (Production)
   ├─ User Browser sends HTTP/HTTPS request
   │  │
   │  └─→ NGINX Reverse Proxy (Port 80/443)
   │      ├─ Parse request
   │      ├─ Check SSL/TLS (if HTTPS)
   │      ├─ Serve static files if available (public/, uploads/)
   │      └─ Forward to Next.js app:3000 (if dynamic)

2. APPLICATION PROCESSING
   ├─ Next.js App receives request
   │  │
   │  ├─ Check route type:
   │  │  ├─ Static page → Serve from cache
   │  │  ├─ API route → Process request
   │  │  └─ Dynamic page → Render with data
   │  │
   │  └─ API Route Processing:
   │      ├─ Middleware checks:
   │      │  ├─ Rate limiting
   │      │  ├─ Authentication (JWT)
   │      │  └─ Input validation
   │      │
   │      ├─ Business Logic:
   │      │  ├─ Process request
   │      │  ├─ Image processing (if needed)
   │      │  └─ Data transformation
   │      │
   │      └─ Database Operations:
   │          ├─ Connect to MongoDB
   │          ├─ Execute query (Mongoose)
   │          └─ Return results

3. DATABASE OPERATIONS (MongoDB)
   ├─ Connect to Primary Node (mongo1)
   │  │
   │  ├─ Read Operations:
   │  │  └─ Primary node responds
   │  │
   │  └─ Write Operations:
   │      ├─ Primary receives write
   │      ├─ Replicates to Secondary nodes (mongo2, mongo3)
   │      ├─ Waits for majority acknowledgment
   │      └─ Returns success

4. RESPONSE GENERATION
   ├─ Next.js app prepares response
   │  ├─ Generate HTML/JSON
   │  ├─ Add security headers
   │  └─ Compress if needed
   │
   └─ Return response (if production → through NGINX first)

5. RESPONSE DELIVERY (Production)
   ├─ Response travels through NGINX
   │  ├─ Apply gzip compression
   │  ├─ Cache if applicable
   │  └─ Set cache headers
   │
   └─ Browser receives response
      ├─ Render page/handle API response
      └─ Execute client-side JavaScript (React)
```

---

## Service Dependencies & Startup Order

### Production (docker-compose.yml)

```
Startup Sequence:
1. Start mongo1, mongo2, mongo3 (parallel)
   └─ Wait for health checks (30s each)

2. Start mongo-init (depends on all 3 healthy)
   └─ Initialize replica set (waits for all nodes ready)

3. Start app (depends on mongo-init success)
   ├─ Load environment variables
   ├─ Connect to MongoDB replica set
   ├─ Start Next.js server
   └─ Wait for health check (150s max startup time)

4. Start nginx (depends on app started)
   ├─ Load nginx.conf
   ├─ Configure reverse proxy
   └─ Ready to accept requests

Ready for Traffic:
   Browser → NGINX (port 3000) → App (port 3000) → MongoDB (port 27017)
```

### Local Development (docker-compose-local.yml)

```
Startup Sequence:
1. Start mongodb (single instance)
   └─ Wait for health check (10s startup period)

2. Build app image from local Dockerfile
   └─ Install dependencies
   └─ Build Next.js app

3. Start app (depends on mongodb healthy)
   ├─ Load environment variables
   ├─ Connect to MongoDB
   ├─ Start Next.js server
   └─ Wait for health check (40s max startup time)

Ready for Traffic:
   Browser → App (port 3000) → MongoDB (port 27017)
```

---

## Volume & Data Persistence

### Named Volumes (Persistent Data)

```
Volume Type: Named Volumes (Docker-managed)
Location: /var/lib/docker/volumes/ (Docker host)
Persistence: Survives container restarts and recreations

Production (docker-compose.yml):
├─ mongo1_data       → /data/db (mongo1 data files)
├─ mongo1_config     → /data/configdb (mongo1 replica set config)
├─ mongo2_data       → /data/db (mongo2 data files)
├─ mongo2_config     → /data/configdb (mongo2 replica set config)
├─ mongo3_data       → /data/db (mongo3 data files)
├─ mongo3_config     → /data/configdb (mongo3 replica set config)
├─ uploads_data      → /app/public/uploads (user uploads)
├─ nextjs_cache      → /app/.next/cache (Next.js build cache)
└─ nginx_cache       → /var/cache/nginx (NGINX response cache)

Local (docker-compose-local.yml):
├─ mongodb_data      → /data/db (MongoDB data)
├─ mongodb_config    → /data/configdb (MongoDB config)
├─ uploads_data      → /app/public/uploads (user uploads)
└─ nextjs_cache      → /app/.next/cache (Next.js build cache)

tmpfs Mounts (In-Memory, Non-Persistent):
├─ /tmp              → noexec,nosuid,nodev (100-500MB, crypto miner prevention)
├─ /var/tmp          → noexec,nosuid,nodev (50MB, temporary files)
└─ /run              → noexec,nosuid,nodev (10MB, PID files only)
```

---

## Security Layers

```
┌────────────────────────────────────────────────────────────────────┐
│                         SECURITY ARCHITECTURE                       │
└────────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
├─ Internal Docker network (aiyu-network)
│  └─ Services communicate internally only
├─ NGINX reverse proxy (production)
│  └─ Single entry point (port 80/443)
├─ Firewall rules (on VPS)
│  └─ Only ports 22, 80, 443 open
└─ No direct MongoDB exposure to internet
   └─ No external port mapping

Layer 2: Container Security
├─ Non-root user execution
│  └─ Container runs as 'nextjs' user (UID 1000)
├─ Capability dropping
│  └─ ALL capabilities dropped except NET_BIND_SERVICE
├─ Read-only root filesystem
│  └─ Only /tmp, /var/tmp, /run are writable
├─ /tmp protection (noexec flag)
│  └─ Prevents crypto miner script execution
├─ Resource limits
│  ├─ CPU: 1.0 core maximum
│  └─ Memory: 512MB maximum
└─ No privilege escalation
   └─ no-new-privileges security option enabled

Layer 3: Application Security
├─ JWT-based authentication
│  └─ Admin panel & API routes protected
├─ Rate limiting
│  └─ Protection against brute force attacks
├─ Input validation & sanitization
│  └─ All user inputs validated
├─ CORS & security headers
│  ├─ Strict-Transport-Security
│  ├─ Content-Security-Policy
│  └─ X-Frame-Options
└─ Environment variable protection
   └─ Sensitive data never in image layers

Layer 4: Database Security
├─ Authentication enabled
│  └─ Root username/password required
├─ Replica set key authentication
│  └─ Inter-node communication secured
├─ Network isolation
│  └─ Only accessible from app container
├─ Data encryption in transit
│  └─ SSL/TLS for replication
└─ Persistent backups
   └─ Named volumes for recovery

Layer 5: Cryptographic Security
├─ JWT Secret (64 chars)
│  └─ Signs authentication tokens
├─ Blog API Key (32 chars)
│  └─ Secures automated blog posting API
├─ MongoDB passwords
│  └─ Strong random 32+ characters
└─ Replica set keyfile
   └─ 48 bytes random key for node auth

Layer 6: Monitoring & Auditing
├─ Health checks on all services
│  └─ Detect unhealthy containers
├─ Log monitoring
│  └─ Application logs viewable via Docker
├─ Resource monitoring
│  └─ CPU/memory usage tracked
└─ Startup verification
   └─ Security checks on deployment (npm run docker:verify)
```

---

## Development vs Production Differences

```
┌─────────────────────────────┬─────────────────────────────┐
│     Development (Local)     │    Production (Cloud/VPS)   │
├─────────────────────────────┼─────────────────────────────┤
│ Source: Local source code   │ Source: Docker Hub image    │
│ Build: On-demand (docker)   │ Build: CI/CD pipeline       │
│ MongoDB: Single node        │ MongoDB: Replica set (3)    │
│ Network: Direct app access  │ Network: NGINX + app        │
│ Port: 3000 (direct)         │ Port: 80/443 (NGINX)        │
│ SSL: None (localhost)       │ SSL: Let's Encrypt          │
│ Startup: 40s                │ Startup: 150s (+replica)    │
│ Monitoring: Basic           │ Monitoring: Full logging    │
│ Backup: Manual              │ Backup: Automated           │
│ Scaling: Not needed         │ Scaling: Horizontal ready   │
└─────────────────────────────┴─────────────────────────────┘
```

---

## Environment Separation

### Production Environment (.env.production)
```
NODE_ENV=production
MONGODB_URI=mongodb://admin:PASSWORD@mongo1:27017,mongo2:27017,mongo3:27017/aiyu?replicaSet=rs0&authSource=admin
MONGO_REPLICA_SET_KEY=<64-char-key>
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
SITE_URL=https://yourdomain.com
APP_IMAGE_TAG=latest (or specific version)
```

### Local Development Environment (.env)
```
NODE_ENV=production (for testing)
MONGODB_URI=mongodb://localhost:27017/aiyu (or docker: mongodb URI)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
```

---

## Scaling Considerations

### Horizontal Scaling
- Multiple app instances behind NGINX load balancer
- MongoDB replica set already supports high availability
- Static assets cached by NGINX
- Session data stored in MongoDB (no in-memory state)

### Vertical Scaling
- Increase CPU/memory limits in deployment.resources
- Increase MongoDB storage volumes
- Increase NGINX worker processes

### Performance Optimization
- NGINX response caching (nginx_cache volume)
- Next.js image optimization (Sharp)
- MongoDB indexes on frequently queried fields
- CDN for static assets (optional)
- Gzip compression enabled in NGINX
