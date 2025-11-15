# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Portfolio Application                    │
│                                                              │
│  ┌────────────────────┐         ┌─────────────────────┐    │
│  │   Next.js App      │◄────────┤   PocketBase        │    │
│  │   (Port 3000)      │  HTTP   │   (Port 8090)       │    │
│  │                    │         │                     │    │
│  │  ┌──────────────┐  │         │  ┌──────────────┐  │    │
│  │  │ Server       │  │         │  │   SQLite     │  │    │
│  │  │ Components   │  │         │  │   Database   │  │    │
│  │  │ (Pages)      │  │         │  └──────────────┘  │    │
│  │  └──────┬───────┘  │         │                     │    │
│  │         │          │         │  Collections:       │    │
│  │         ▼          │         │  - portfolio_       │    │
│  │  ┌──────────────┐  │         │    settings        │    │
│  │  │ API Layer    │──┼────────►│  - projects        │    │
│  │  │ (lib/api.js) │  │         │                     │    │
│  │  └──────┬───────┘  │         └─────────────────────┘    │
│  │         │          │                                     │
│  │         ▼          │                                     │
│  │  ┌──────────────┐  │                                     │
│  │  │ Client       │  │                                     │
│  │  │ Components   │  │                                     │
│  │  │ (UI)         │  │                                     │
│  │  └──────────────┘  │                                     │
│  │         │          │                                     │
│  │         ▼          │                                     │
│  │  ┌──────────────┐  │         ┌─────────────────────┐    │
│  │  │ Fallback     │  │         │   Local Data        │    │
│  │  │ Logic        │──┼────────►│   (app/data/*.js)   │    │
│  │  └──────────────┘  │         └─────────────────────┘    │
│  └────────────────────┘                                     │
│                                                              │
│  Docker Compose Orchestration                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
Root Layout (layout.js)
├── Header (fetches headerData)
├── Page Content
│   ├── Home Page (page.js)
│   │   ├── GamePortfolio (homeData)
│   │   ├── HomeAbout (aboutData)
│   │   └── HomeProjects (projects)
│   ├── About Page (about-me/page.js)
│   │   └── About (aboutData)
│   └── Projects Page (projects/page.js)
│       └── Projects (projects, roles)
└── Footer (fetches siteData)
```

## Data Flow

### Primary Flow (With PocketBase)

```
User Request
    ↓
Next.js Server Component (Page)
    ↓
API Layer (lib/api.js)
    ↓
PocketBase Client (lib/pocketbase.js)
    ↓
PocketBase Server (HTTP)
    ↓
SQLite Database
    ↓
JSON Response
    ↓
API Layer Processes
    ↓
Server Component Receives Data
    ↓
Props Passed to Client Component
    ↓
UI Renders
```

### Fallback Flow (Without PocketBase)

```
User Request
    ↓
Next.js Server Component (Page)
    ↓
API Layer (lib/api.js)
    ↓
PocketBase Request Fails
    ↓
Returns null
    ↓
Server Component Receives null
    ↓
Client Component Receives null in Props
    ↓
Component Uses Local Data Import
    ↓
UI Renders with Local Data
```

## File Structure

```
Aiyu/
├── Docker Configuration
│   ├── Dockerfile                   # Next.js container
│   ├── docker-compose.yml           # Services orchestration
│   └── .dockerignore                # Docker ignore rules
│
├── Environment Configuration
│   ├── .env.example                 # Template
│   ├── .env.local                   # Local config (gitignored)
│   └── next.config.mjs              # Next.js config
│
├── Scripts
│   ├── run.sh                       # Setup automation
│   ├── scripts/migrate-to-pocketbase.js
│   └── scripts/wait-for-pocketbase.sh
│
├── Documentation
│   ├── README.md                    # Quick start
│   ├── SETUP.md                     # Detailed setup
│   ├── MIGRATION_SUMMARY.md         # Migration details
│   ├── TESTING_GUIDE.md             # Test scenarios
│   ├── COMPLETION_SUMMARY.md        # Final summary
│   └── ARCHITECTURE.md              # This file
│
├── Application Code
│   └── src/
│       ├── lib/                     # Utilities
│       │   ├── pocketbase.js        # PocketBase client
│       │   └── api.js               # Data fetching API
│       │
│       └── app/                     # Next.js app
│           ├── layout.js            # Root layout (server)
│           ├── page.js              # Home page (server)
│           │
│           ├── about-me/
│           │   └── page.js          # About page (server)
│           │
│           ├── projects/
│           │   └── page.js          # Projects page (server)
│           │
│           ├── components/
│           │   ├── Header.js        # Navigation (client)
│           │   ├── Footer.js        # Footer (client)
│           │   ├── about/
│           │   │   └── About.js     # About content (client)
│           │   ├── projects/
│           │   │   └── Projects.js  # Projects list (client)
│           │   └── landing/
│           │       ├── GamePortfolio.js
│           │       ├── HomeAbout.js
│           │       └── HomeProjects.js
│           │
│           └── data/                # Static fallback data
│               ├── aboutData.js
│               ├── headerData.js
│               ├── homeScreenData.js
│               ├── projectsData.js
│               └── siteData.js
│
└── Generated/Runtime
    ├── node_modules/                # Dependencies (gitignored)
    ├── .next/                       # Next.js build (gitignored)
    └── pb_data/                     # PocketBase data (gitignored)
```

## API Layer Design

### lib/pocketbase.js
```javascript
// Singleton PocketBase client
export default pb;
```

### lib/api.js
```javascript
// Generic settings fetcher
getSettings(key) → data | null

// Specific data fetchers
getAboutData() → aboutData | null
getHeaderData() → headerData | null
getHomeScreenData() → homeData | null
getSiteData() → siteData | null
getProjects() → projects[] | null
getProjectsRoles() → roles[] | null
```

## Component Prop Patterns

### Server Components (Data Fetching)
```javascript
// Fetch data server-side
export default async function Page() {
  const data = await getDataFromAPI();
  return <ClientComponent data={data} />;
}
```

### Client Components (Interactive UI)
```javascript
// Receive data, fallback to local
export default function Component({ data }) {
  const actualData = data || localData;
  return <UI data={actualData} />;
}
```

## PocketBase Collections

### portfolio_settings
```
Type: base
Schema:
  - key: text (unique identifier)
  - data: json (the actual data object)

Records:
  - key: "about"
  - key: "header"
  - key: "homeScreen"
  - key: "projectsRoles"
  - key: "site"

Permissions:
  - List: public
  - View: public
  - Create: admin only
  - Update: admin only
  - Delete: admin only
```

### projects
```
Type: base
Schema:
  - name: text
  - techStack: json (array)
  - year: text
  - status: text
  - projectType: text
  - description: text
  - codeLink: url
  - image: url (optional)

Permissions:
  - List: public
  - View: public
  - Create: admin only
  - Update: admin only
  - Delete: admin only
```

## Docker Architecture

```
Docker Compose
├── pocketbase service
│   ├── Image: ghcr.io/muchobien/pocketbase:latest
│   ├── Port: 8090
│   ├── Volumes: 
│   │   ├── ./pb_data → /pb_data
│   │   └── ./pb_migrations → /pb_migrations
│   ├── Environment: admin credentials
│   └── Healthcheck: /api/health endpoint
│
└── portfolio service
    ├── Build: ./Dockerfile
    ├── Port: 3000
    ├── Environment: PocketBase URLs
    ├── Depends on: pocketbase (healthy)
    └── Build stages:
        ├── deps: Install dependencies
        ├── builder: Build Next.js
        └── runner: Production runtime
```

## Environment Variables

```
Server-side (POCKETBASE_URL):
  Used by: API layer
  Purpose: Internal container-to-container communication
  Value: http://pocketbase:8090

Client-side (NEXT_PUBLIC_POCKETBASE_URL):
  Used by: Browser requests (if any)
  Purpose: External access from browser
  Value: http://localhost:8090

Admin Credentials:
  POCKETBASE_ADMIN_EMAIL
  POCKETBASE_ADMIN_PASSWORD
  Used by: Migration script
```

## Error Handling Strategy

```
Level 1: API Layer
  - Catch PocketBase errors
  - Log to console
  - Return null

Level 2: Server Components
  - Receive null from API
  - Pass null to client components
  - No error thrown

Level 3: Client Components
  - Check if props data is null
  - Use local data as fallback
  - Continue rendering normally

Result: Graceful degradation, no crashes
```

## Performance Considerations

### Caching
- Server components execute on each request
- Consider adding caching layer for production
- PocketBase responses are fast (<100ms)

### Build Optimization
- Standalone output for Docker
- Multi-stage build reduces image size
- Static assets optimized by Next.js

### Runtime
- PocketBase: ~50MB memory
- Next.js: ~200MB memory
- Total: ~250MB for full stack

## Security Model

### Authentication
- PocketBase admin panel protected
- API calls require authentication for writes
- Public read access for portfolio data

### Data Access
- Read: Public (no auth needed)
- Write: Admin only
- Environment variables for credentials
- No secrets in code or git

### Network
- Internal Docker network for service communication
- External ports only for user access
- CORS handled by PocketBase

## Scalability

### Current Setup
- Single container for each service
- SQLite database (suitable for portfolio)
- Vertical scaling possible

### Future Options
- PostgreSQL backend for PocketBase
- Multiple Next.js replicas
- CDN for static assets
- Redis caching layer
- Load balancer

## Monitoring

### Available Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f pocketbase
docker-compose logs -f portfolio

# PocketBase admin
# Access at http://localhost:8090/_/
```

### Health Checks
- PocketBase: /api/health
- Next.js: HTTP 200 on root
- Docker: Built-in health checks

## Deployment Options

### Development
```bash
npm run dev
# Uses local data fallback
```

### Docker Compose (Recommended)
```bash
docker-compose up -d
# Complete stack with one command
```

### Production Cloud
- Deploy PocketBase separately
- Deploy Next.js to Vercel/Netlify
- Update environment variables
- Set up backups

### Manual
- Run PocketBase binary
- Run Next.js (npm start)
- Configure reverse proxy
- Set up SSL certificates

## Backup Strategy

### What to Backup
- `pb_data/` directory (SQLite + files)
- `.env.local` (encrypted storage)
- Migration scripts (version control)

### How to Backup
```bash
# Stop services
docker-compose down

# Backup data
tar -czf backup-$(date +%Y%m%d).tar.gz pb_data/

# Restart services
docker-compose up -d
```

### Restore
```bash
# Stop services
docker-compose down

# Restore data
tar -xzf backup-YYYYMMDD.tar.gz

# Restart services
docker-compose up -d
```

## Maintenance

### Regular Tasks
- [ ] Backup pb_data weekly
- [ ] Update PocketBase version monthly
- [ ] Update Next.js dependencies monthly
- [ ] Review logs for errors
- [ ] Monitor disk usage

### Updates
```bash
# Update dependencies
npm update

# Rebuild containers
docker-compose up -d --build

# Re-run migrations if schema changed
npm run migrate
```

## Troubleshooting

### PocketBase Won't Start
- Check port 8090 available
- Check Docker logs
- Verify file permissions on pb_data

### Next.js Won't Connect
- Verify environment variables
- Check PocketBase is running
- Test PocketBase directly

### Data Not Showing
- Check migration ran successfully
- Verify data in PocketBase admin
- Check API layer logs
- Confirm fallback data exists

---

For implementation details, see MIGRATION_SUMMARY.md
For testing procedures, see TESTING_GUIDE.md
For setup instructions, see SETUP.md
