# Aiyu - Personal Portfolio

This is a [Next.js](https://nextjs.org) portfolio project with MongoDB backend support.

## Features

- ✨ Modern Next.js 15 with App Router
- 🎨 Beautiful dark/light theme support
- 🎮 Interactive mini-games (Snake & Tic-Tac-Toe)
- 🗄️ MongoDB backend for dynamic content
- 🐳 Docker & Docker Compose support
- 📱 Fully responsive design
- 🚀 Optimized for production

## Getting Started

### Prerequisites

- Node.js 20 or higher
- MongoDB (local, Atlas, or Docker)

### Quick Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env.local
# Edit .env.local with your MongoDB connection string
```

3. **Seed the Database**
```bash
npm run seed
```

4. **Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## MongoDB Backend

This project uses MongoDB to store all portfolio data dynamically. For detailed MongoDB setup instructions, Docker deployment, and API documentation, see:

📚 **[MongoDB Setup Guide](./README_MONGODB.md)**

### Quick MongoDB Options

**Option 1: Docker (Easiest)**
```bash
docker-compose up -d
docker-compose exec app npm run seed
```

**Option 2: Local MongoDB**
```bash
# Install and start MongoDB
mongod

# In another terminal
npm run seed
npm run dev
```

**Option 3: MongoDB Atlas (Cloud)**
- Create account at https://www.mongodb.com/cloud/atlas
- Get connection string
- Update `.env.local`
- Run `npm run seed`

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
