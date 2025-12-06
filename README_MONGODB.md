# MongoDB Backend Migration Guide

This document provides a comprehensive guide for the MongoDB backend implementation in the Aiyu portfolio project.

## Overview

The portfolio application has been migrated from static data files to a dynamic MongoDB backend. This allows for:
- Dynamic content updates without redeployment
- Centralized data management
- Scalable architecture
- Easy backup and restore capabilities
- Potential for admin panel integration in the future

## Quick Start

### 1. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your MongoDB connection string:
```env
MONGODB_URI=mongodb://localhost:27017/aiyu-portfolio
NODE_ENV=development
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start MongoDB

#### Option A: Local MongoDB
```bash
# Install MongoDB (if not already installed)
# On macOS with Homebrew:
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Or run MongoDB manually:
mongod --config /usr/local/etc/mongod.conf
```

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string
4. Update `.env.local` with your Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aiyu-portfolio?retryWrites=true&w=majority
   ```

#### Option C: Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

### 4. Seed the Database

Populate your MongoDB database with the portfolio data:
```bash
npm run seed
```

This command will:
- Connect to your MongoDB instance
- Clear any existing data
- Import all data from the static data files
- Confirm successful migration

### 5. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your portfolio.

## Docker Deployment

### Using Docker Compose (Recommended)

The project includes a `docker-compose.yml` file that sets up both the application and MongoDB:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Seed the database (after services are running)
docker-compose exec app npm run seed

# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

The application will be available at http://localhost:3000

### Manual Docker Build

Build the Docker image:
```bash
docker build -t aiyu-portfolio .
```

Run with external MongoDB:
```bash
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/aiyu-portfolio \
  aiyu-portfolio
```

## Architecture

### Directory Structure

```
├── src/
│   ├── app/
│   │   ├── api/                    # REST API endpoints
│   │   │   ├── about/             # GET /api/about
│   │   │   ├── projects/          # GET /api/projects
│   │   │   ├── header/            # GET /api/header
│   │   │   ├── site/              # GET /api/site
│   │   │   └── homescreen/        # GET /api/homescreen
│   │   ├── components/            # React components
│   │   └── data/                  # Static data files (for seeding)
│   ├── hooks/
│   │   └── usePortfolioData.js   # Custom hooks for API data fetching
│   ├── lib/
│   │   └── mongodb.js            # MongoDB connection utility
│   └── models/                   # Mongoose schemas
│       ├── About.js
│       ├── Project.js
│       ├── ProjectsPage.js
│       ├── Header.js
│       ├── Site.js
│       └── HomeScreen.js
├── scripts/
│   └── seed.js                   # Database seeding script
├── Dockerfile                    # Docker configuration
├── docker-compose.yml           # Multi-container setup
└── .env.example                 # Environment variables template
```

### API Endpoints

All endpoints return JSON and support GET requests:

#### GET /api/about
Returns personal information, skills, experiences, education, and certifications.

**Response:**
```json
{
  "name": "Ayaan Ansari",
  "roles": ["Android Developer", "Learner"],
  "professionalSummary": "...",
  "skills": [...],
  "experiences": [...],
  "education": [...],
  "certifications": [...]
}
```

#### GET /api/projects
Returns all projects and project page metadata.

**Response:**
```json
{
  "projects": [...],
  "roles": ["A collection of my work", "Click on a project to learn more"]
}
```

#### GET /api/header
Returns navigation links and contact information.

**Response:**
```json
{
  "navLinks": [...],
  "contactLink": {...}
}
```

#### GET /api/site
Returns social media links.

**Response:**
```json
{
  "socials": [...]
}
```

#### GET /api/homescreen
Returns home page data including roles and code snippets.

**Response:**
```json
{
  "name": "Ayaan Ansari",
  "homeRoles": [...],
  "githubLink": "...",
  "codeSnippets": [...]
}
```

### Data Models

The application uses Mongoose schemas for data validation:

- **About**: Personal information, skills, experiences, education, certifications
- **Project**: Individual project details with tech stack, year, status, type
- **ProjectsPage**: Metadata for the projects page
- **Header**: Navigation links and contact information
- **Site**: Social media links and site-wide settings
- **HomeScreen**: Home page specific data

### Client-Side Data Fetching

The `usePortfolioData.js` hook provides custom React hooks for fetching data:

- `useAboutData()` - Fetches about page data
- `useProjectsData()` - Fetches projects data
- `useHeaderData()` - Fetches header data
- `useSiteData()` - Fetches site data
- `useHomeScreenData()` - Fetches home screen data

Each hook includes:
- Loading state management
- Error handling with fallback to static data
- Automatic client-side caching via React state

## Updating Content

### Method 1: Re-seed the Database

1. Edit the files in `src/app/data/`
2. Run the seed script:
   ```bash
   npm run seed
   ```

### Method 2: Direct Database Updates

Use MongoDB Compass, Atlas UI, or CLI to update documents directly.

**Example using MongoDB CLI:**
```javascript
use aiyu-portfolio

// Update a skill level
db.abouts.updateOne(
  { "skills.name": "Next.js" },
  { $set: { "skills.$.level": 70 } }
)

// Add a new project
db.projects.insertOne({
  name: "New Project",
  techStack: ["React", "Node.js"],
  year: "2025",
  status: "Working",
  projectType: "application",
  description: "...",
  codeLink: "https://github.com/..."
})
```

### Method 3: Create an Admin Panel (Future Enhancement)

You could add admin API routes with authentication to manage content through a UI.

## Production Deployment

### Environment Variables

Ensure these are set in your production environment:

```env
MONGODB_URI=<your-production-mongodb-uri>
NODE_ENV=production
```

### Security Considerations

1. **MongoDB Authentication**: Enable authentication in production
2. **Connection String Security**: Never commit `.env` files
3. **Network Security**: Use MongoDB Atlas IP whitelisting
4. **SSL/TLS**: Enable SSL for MongoDB connections
5. **Backups**: Set up automated backups
6. **Rate Limiting**: Consider adding API rate limiting
7. **CORS**: Configure appropriate CORS settings

### Deployment Platforms

#### Vercel
```bash
vercel --prod
```

Set environment variables in Vercel dashboard.

#### Docker
```bash
docker-compose up -d
```

#### Cloud Platforms (AWS, GCP, Azure)
Deploy the Docker container to your preferred cloud service.

## Troubleshooting

### Database Connection Issues

**Problem**: Can't connect to MongoDB
**Solutions**:
- Verify MongoDB is running: `mongosh`
- Check `MONGODB_URI` format
- For Atlas: Ensure IP is whitelisted
- For Docker: Ensure containers are on the same network

### Seed Script Fails

**Problem**: Seeding fails with errors
**Solutions**:
- Verify MongoDB is accessible
- Check database user permissions
- Ensure `.env.local` exists with correct `MONGODB_URI`
- Clear existing data: `mongosh aiyu-portfolio --eval "db.dropDatabase()"`

### Build Errors

**Problem**: Next.js build fails
**Solutions**:
- Ensure all dependencies are installed: `npm install`
- Clear Next.js cache: `rm -rf .next`
- Check for TypeScript/JavaScript errors: `npm run lint`

### API Returns 404

**Problem**: API endpoints return 404
**Solutions**:
- Ensure Next.js config doesn't have `output: 'export'`
- Verify API routes are in `src/app/api/` directory
- Check API route file names are `route.js`

## Migration Notes

### Changes from Static to Dynamic

1. **Next.js Config**: Changed from `output: 'export'` to `output: 'standalone'`
2. **Components**: Updated to use `usePortfolioData` hooks instead of static imports
3. **API Routes**: Added API routes for all data endpoints
4. **Database**: Added MongoDB models and connection logic
5. **Docker**: Added containerization support

### Backward Compatibility

The application maintains fallback to static data if the API fails, ensuring:
- Development works without MongoDB running
- Graceful degradation if database is unavailable
- Original static data files remain as seed source

## Performance Considerations

- **Client-side Caching**: React state caches API responses
- **Connection Pooling**: MongoDB connection is reused across requests
- **Indexes**: Consider adding indexes for frequently queried fields
- **CDN**: Use Vercel's CDN for static assets

## Future Enhancements

- Add authentication and admin panel
- Implement data validation and sanitization
- Add API versioning
- Create data export/import tools
- Add analytics and tracking
- Implement caching layer (Redis)
- Add API documentation (Swagger/OpenAPI)

## Support

For issues or questions:
1. Check this documentation
2. Review the code comments
3. Check MongoDB logs: `docker-compose logs mongodb`
4. Check app logs: `docker-compose logs app`
5. Open an issue on GitHub

## License

This project is part of the Aiyu portfolio and follows the same license.
