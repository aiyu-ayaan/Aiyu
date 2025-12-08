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
   - Set `MONGODB_URI` to `mongodb://admin:password@mongodb:27017/aiyu?authSource=admin` (for Docker Compose)
   - Configure `ADMIN_USERNAME` and `ADMIN_PASSWORD`
   - Generate a secure `JWT_SECRET`
   - Set other required environment variables

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Application: [http://localhost:3000](http://localhost:3000)
   - Admin Panel: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   - MongoDB: `localhost:27017`

### Docker Commands

- **Start services:** `docker-compose up -d`
- **Stop services:** `docker-compose down`
- **View logs:** `docker-compose logs -f`
- **Rebuild application:** `docker-compose up -d --build`
- **Stop and remove volumes (WARNING: deletes database):** `docker-compose down -v`

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
