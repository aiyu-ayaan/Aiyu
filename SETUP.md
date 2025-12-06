# MongoDB Backend Setup

This project now uses MongoDB to store and serve all portfolio data dynamically.

## Prerequisites

- Node.js 20 or higher
- MongoDB (local installation or MongoDB Atlas account)
- Docker and Docker Compose (optional, for containerized deployment)

## Local Development Setup

### 1. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your MongoDB connection string:

```env
MONGODB_URI=mongodb://localhost:27017/aiyu-portfolio
NODE_ENV=development
```

For MongoDB Atlas, use:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aiyu-portfolio?retryWrites=true&w=majority
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Seed the Database

Populate MongoDB with your portfolio data:

```bash
npm run seed
```

This will migrate all data from the static data files to your MongoDB database.

### 4. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your portfolio.

## Docker Deployment

### Using Docker Compose (Recommended)

The easiest way to deploy the application with MongoDB:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

After starting with Docker Compose:
1. The app will be available at [http://localhost:3000](http://localhost:3000)
2. MongoDB will be running on port 27017
3. You need to seed the database (see below)

### Seeding Database in Docker

To seed the database when running in Docker:

```bash
# Create a temporary .env.local for seeding
echo "MONGODB_URI=mongodb://mongodb:27017/aiyu-portfolio" > .env.local

# Run seed script in the app container
docker-compose exec app npm run seed

# Or run seed script from host (if MongoDB is exposed)
npm run seed
```

### Building Docker Image Manually

```bash
# Build the image
docker build -t aiyu-portfolio .

# Run the container (assuming MongoDB is running separately)
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/aiyu-portfolio \
  aiyu-portfolio
```

## API Endpoints

The application exposes the following REST API endpoints:

- `GET /api/about` - Personal information, skills, experiences, education, and certifications
- `GET /api/projects` - All projects and project page metadata
- `GET /api/header` - Navigation links and contact information
- `GET /api/site` - Social media links
- `GET /api/homescreen` - Home page data including roles and code snippets

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── about/
│   │   │   ├── projects/
│   │   │   ├── header/
│   │   │   ├── site/
│   │   │   └── homescreen/
│   │   ├── components/       # React components
│   │   └── data/            # Original static data (used for seeding)
│   ├── lib/
│   │   └── mongodb.js       # MongoDB connection utility
│   └── models/              # Mongoose schemas
├── scripts/
│   └── seed.js             # Database seeding script
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Multi-container setup
└── .env.example           # Environment variables template
```

## Updating Data

To update your portfolio data:

1. Edit the files in `src/app/data/`
2. Run the seed script: `npm run seed`
3. The changes will be reflected in the database

Alternatively, you can:
- Create an admin panel to update data through the UI
- Use MongoDB Compass or Atlas UI to edit documents directly
- Create additional API endpoints for data management

## Troubleshooting

### Connection Issues

If you can't connect to MongoDB:
- Ensure MongoDB is running
- Check your MONGODB_URI in `.env.local`
- For Atlas, ensure your IP is whitelisted
- For Docker, ensure the containers are on the same network

### Seed Script Fails

If seeding fails:
- Verify MongoDB is accessible
- Check the MONGODB_URI format
- Ensure the database user has write permissions

### Build Errors

If Docker build fails:
- Ensure you have enough disk space
- Try clearing Docker cache: `docker system prune -a`
- Check Node.js version compatibility

## Production Considerations

- Use environment variables for sensitive data
- Enable MongoDB authentication in production
- Consider using MongoDB Atlas for managed hosting
- Set up proper backup strategies for your database
- Use HTTPS for API endpoints
- Implement rate limiting on API routes
- Add proper error handling and logging
