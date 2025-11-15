# Portfolio Setup Guide with PocketBase

This guide will help you set up and run the portfolio application with PocketBase as the backend.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- npm or yarn package manager

## Quick Start with Docker

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Aiyu
```

### 2. Configure Environment Variables

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your preferred PocketBase admin credentials:

```env
POCKETBASE_URL=http://pocketbase:8090
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=your-email@example.com
POCKETBASE_ADMIN_PASSWORD=your-secure-password
```

### 3. Start Services with Docker Compose

```bash
docker-compose up -d
```

This will start:
- PocketBase on `http://localhost:8090`
- Portfolio application on `http://localhost:3000`

### 4. Access PocketBase Admin Panel

1. Navigate to `http://localhost:8090/_/`
2. Create an admin account with the credentials from `.env.local`

### 5. Migrate Data to PocketBase

Run the migration script to populate PocketBase with initial data:

```bash
npm install
node scripts/migrate-to-pocketbase.js
```

The script will:
- Authenticate with PocketBase admin API
- Create necessary collections (`portfolio_settings`, `projects`)
- Populate the collections with data from the data folder

### 6. Access the Application

Open your browser and navigate to `http://localhost:3000`

## Local Development (Without Docker)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PocketBase Locally

Download PocketBase from [https://pocketbase.io/docs/](https://pocketbase.io/docs/) and run:

```bash
./pocketbase serve --http="0.0.0.0:8090"
```

### 3. Update Environment Variables

Update `.env.local` for local development:

```env
POCKETBASE_URL=http://localhost:8090
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=your-email@example.com
POCKETBASE_ADMIN_PASSWORD=your-secure-password
```

### 4. Run Migration Script

```bash
node scripts/migrate-to-pocketbase.js
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## PocketBase Collections

### portfolio_settings
Stores configuration data with key-value pairs:
- `about`: Personal information, skills, experiences, education, certifications
- `header`: Navigation links and contact information
- `homeScreen`: Home page data (name, roles, code snippets, GitHub link)
- `projectsRoles`: Project section roles/descriptions
- `site`: Social media links

### projects
Stores individual project details:
- `name`: Project name
- `techStack`: Array of technologies used
- `year`: Year of project
- `status`: Project status (Done, Working, etc.)
- `projectType`: Type of project (application, library, skill, theme)
- `description`: Project description
- `codeLink`: Link to project code/demo
- `image`: Optional project image URL

## Docker Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Rebuild containers
```bash
docker-compose up -d --build
```

### Remove all data (including PocketBase database)
```bash
docker-compose down -v
```

## Updating Data

To update portfolio data:

1. Edit the data in the PocketBase admin panel (`http://localhost:8090/_/`)
2. Or modify `scripts/migrate-to-pocketbase.js` and run it again

## Troubleshooting

### PocketBase connection issues
- Ensure PocketBase is running and accessible
- Check environment variables are correctly set
- Verify firewall/network settings

### Docker build issues
- Run `docker-compose down -v` to clean up
- Rebuild with `docker-compose up -d --build`
- Check Docker logs with `docker-compose logs`

### Migration script fails
- Ensure PocketBase is running
- Verify admin credentials in `.env.local`
- Check PocketBase logs for errors

## Production Deployment

For production deployment:

1. Update environment variables with production values
2. Use strong, unique passwords for PocketBase admin
3. Configure proper backup for `pb_data` directory
4. Set up reverse proxy (nginx/traefik) for HTTPS
5. Configure proper CORS settings in PocketBase if needed

## License

This project is private and proprietary.
