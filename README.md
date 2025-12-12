This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Documentation

For detailed guides, please refer to the `docs/` folder:

- 📖 **[API Documentation](docs/API_DOCUMENTATION.md)**: Endpoints, Authentication, and usage for API integrations.
- 🐳 **[Docker Guide](docs/DOCKER_GUIDE.md)**: Comprehensive guide for building, running, and troubleshooting Docker containers.
- ⚙️ **[Setup Guide](docs/SETUP_GUIDE.md)**: Instructions for local development environment setup.
- 🚀 **[Deployment Guide](docs/DEPLOYMENT.md)**: Strategies for deploying to VPS, Vercel, or custom servers.
- 🔒 **[Security Remediation](SECURITY_REMEDIATION.md)**: Comprehensive security hardening guide (crypto miner incident response).
- ✅ **[Deployment Security Checklist](DEPLOYMENT_SECURITY_CHECKLIST.md)**: Pre-deployment security verification checklist.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Docker Setup

This project includes Docker support for easy deployment and development.

### Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

### Quick Start with Docker

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Update the .env file with your credentials:**
   - **Critical**: The password in `MONGODB_URI` MUST match `MONGO_ROOT_PASSWORD`:
     ```
     MONGODB_URI=mongodb://admin:YOUR_PASSWORD@mongodb:27017/aiyu?authSource=admin
     MONGO_ROOT_PASSWORD=YOUR_PASSWORD
     ```
     Use the SAME password in both places!
   - Configure `ADMIN_USERNAME` and `ADMIN_PASSWORD` with secure values
   - Generate a secure `JWT_SECRET` (e.g., using `openssl rand -base64 32`)
   - Set other required environment variables
   - **Security Note**: Use strong, unique passwords - never use placeholder values in production

3. **Start the application:**
   ```bash
   docker compose up -d --build
   ```

4. **Access the application:**
   - Application: [http://localhost:3000](http://localhost:3000)
   - Admin Panel: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   - MongoDB: Accessible internally by app only (not exposed to host by default for security)
     - To access externally, uncomment the ports section in docker-compose.yml

### Docker Commands

- **Start services:** `npm run docker:up` or `docker compose up -d`
- **Stop services:** `npm run docker:down` or `docker compose down`
- **View logs:** `npm run docker:logs` or `docker compose logs -f`
- **Rebuild application:** `npm run docker:build` or `docker compose build --no-cache`
- **Stop and remove volumes (WARNING: deletes database):** `docker compose down -v`

### Security Commands

- **Security health check:** `npm run security-check`
- **Verify Docker security:** `npm run docker:verify` (must be run after containers are started)
- **Emergency cleanup (if compromised):** `npm run emergency:cleanup`

> **⚠️ IMPORTANT:** After crypto miner incident, all Docker containers now run with:
> - Read-only root filesystem
> - `/tmp` mounted with `noexec` (prevents malware execution)
> - All Linux capabilities dropped
> - CPU/memory resource limits
> - Health checks and monitoring
>
> See [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md) for complete details.

### Development with Docker

For development, you can mount the source code as a volume to enable hot-reloading:

```bash
docker-compose -f docker-compose.yml up
```

## Database & Migrations

This project uses a MongoDB database. For instructions on how to seed the database with initial data (or reset it), please refer to [Migration.md](Migration.md).

> **Quick Command:** `node scripts/seed.mjs` (Warning: Destructive!)

## Deploy on Vercel


The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
