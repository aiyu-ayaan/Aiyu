# Aiyu Portfolio

A modern, interactive portfolio built with Next.js and PocketBase.

## Features

- 🎮 Interactive games (Snake, Tic-Tac-Toe)
- 💼 Dynamic project showcase
- 📝 Professional summary and experience timeline
- 🎨 Animated UI with Framer Motion
- 🗄️ PocketBase backend for data management
- 🐳 Docker support for easy deployment

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: PocketBase
- **Animation**: Framer Motion
- **Deployment**: Docker & Docker Compose

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (for local development)

### 1. Clone and Setup

```bash
git clone <repo-url>
cd Aiyu
cp .env.example .env.local
```

Edit `.env.local` with your PocketBase admin credentials:

```env
POCKETBASE_URL=http://pocketbase:8090
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your_secure_password
```

### 2. Start with Docker

```bash
docker-compose up -d
```

This starts:
- **PocketBase** on http://localhost:8090
- **Portfolio** on http://localhost:3000

### 3. Initialize PocketBase

First, create an admin account at http://localhost:8090/_/ using the credentials from `.env.local`

Then migrate the data:

```bash
npm install
npm run migrate
```

### 4. Access the Portfolio

Visit http://localhost:3000 to see your portfolio!

## Local Development (Without Docker)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PocketBase

Download PocketBase from [pocketbase.io](https://pocketbase.io) and run:

```bash
./pocketbase serve --http="0.0.0.0:8090"
```

### 3. Configure Environment

Update `.env.local`:

```env
POCKETBASE_URL=http://localhost:8090
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your_secure_password
```

### 4. Migrate Data

```bash
npm run migrate
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run migrate` - Migrate data to PocketBase

## Project Structure

```
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── components/   # React components
│   │   ├── data/         # Static data (fallback)
│   │   └── styles/       # Global styles
│   └── lib/              # Utilities and API
│       ├── api.js        # PocketBase API functions
│       └── pocketbase.js # PocketBase client
├── scripts/
│   └── migrate-to-pocketbase.js  # Data migration script
├── docker-compose.yml    # Docker composition
├── Dockerfile            # Next.js container
└── SETUP.md             # Detailed setup guide

```

## Data Management

The portfolio uses PocketBase for data storage with two collections:

- **portfolio_settings**: Stores configuration (about, header, home, site data)
- **projects**: Individual project records

See [SETUP.md](./SETUP.md) for detailed information about the data structure.

## Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build

# Remove all data
docker-compose down -v
```

## Production Deployment

For production:

1. Update environment variables with production URLs
2. Use strong, unique passwords
3. Set up regular backups of `pb_data` directory
4. Configure reverse proxy (nginx/traefik) for HTTPS
5. Set proper CORS settings in PocketBase

## Contributing

This is a personal portfolio project. Feel free to fork and customize for your own use!

## License

© 2025 Ayaan Ansari. All rights reserved.
