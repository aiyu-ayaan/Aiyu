# Aiyu Portfolio

A dynamic portfolio website built with [Next.js](https://nextjs.org) featuring an admin panel for content management.

## Features

- 🎨 Modern, responsive design with Tailwind CSS
- 🔐 Secure admin panel with JWT authentication
- 📝 Dynamic content management via API
- 🐳 Docker support for easy deployment
- 🗂️ File-based data storage (JSON)
- 🔄 Real-time content updates without redeployment

## Getting Started

### Prerequisites

- Node.js 18+ or Docker
- npm, yarn, pnpm, or bun

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your credentials:
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_random_secret_key
```

### Development

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the portfolio.

### Admin Panel

Access the admin panel at [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

Default credentials (change in `.env`):
- Username: `admin`
- Password: `admin123`

## Docker Deployment

### Using Docker Compose (Recommended)

1. Set up your environment variables in `.env`

2. Build and run:
```bash
docker-compose up -d
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Using Docker directly

Build the image:
```bash
docker build -t aiyu-portfolio .
```

Run the container:
```bash
docker run -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_password \
  -e JWT_SECRET=your_secret \
  -v $(pwd)/data:/app/data \
  aiyu-portfolio
```

## Data Management

All content is stored in the `data/` directory as JSON files:
- `homeScreenData.json` - Home page content
- `projectsData.json` - Projects and portfolio items
- `aboutData.json` - About, skills, experience, and education
- `siteData.json` - Site-wide settings

You can edit these files directly or use the admin panel.

## API Endpoints

### Public Endpoints
- `GET /api/data/homescreen` - Fetch home screen data
- `GET /api/data/projects` - Fetch projects data
- `GET /api/data/about` - Fetch about data
- `GET /api/data/site` - Fetch site data

### Protected Endpoints (Require Authentication)
- `PUT /api/data/homescreen` - Update home screen data
- `PUT /api/data/projects` - Update projects data
- `PUT /api/data/about` - Update about data
- `PUT /api/data/site` - Update site data

### Authentication
- `POST /api/auth/login` - Login and receive JWT token

## Project Structure

```
├── data/                    # JSON data files
├── src/
│   ├── app/
│   │   ├── admin/          # Admin panel pages
│   │   ├── api/            # API routes
│   │   ├── components/     # React components
│   │   └── data/           # Static data exports (legacy)
│   └── lib/                # Utility functions
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose configuration
└── .env.example           # Environment variables template
```

## Security Notes

- Always change default credentials in production
- Use a strong JWT secret
- Keep your `.env` file secure and never commit it
- The admin panel requires authentication for all write operations
- Public API endpoints are read-only

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
