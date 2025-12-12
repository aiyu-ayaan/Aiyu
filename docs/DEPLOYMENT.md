# Deployment Guide

## Option 1: Docker (VPS / DigitalOcean / EC2) - **Recommended**
This project is optimized for Docker deployment, which handles the database and application scaling easily.

1. **Provision a Server**: Ubuntu 20.04/22.04 LTS recommended.
2. **Install Docker & Docker Compose**:
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose
   ```
3. **Copy Files**:
   Copy the project files to the server (git clone or SCP).
4. **Configure Environment**:
   Create `.env` file on the server with production values.
5. **Start Services**:
   ```bash
   docker-compose up -d --build
   ```
   The app will run on port `3000`. You can use Nginx as a reverse proxy to serve it on port `80/443`.

---

## Option 2: Vercel (Serverless)
**Note**: Vercel is great for the frontend, but file uploads (`/public/uploads`) **WILL NOT PERSIST** because Vercel file systems are read-only/ephemeral. 
If you deploy to Vercel, you must:
1. Use an external database (MongoDB Atlas).
2. Rewrite the Upload API to use S3, Cloudinary, or UploadThing instead of local file storage.

### Steps for Vercel:
1. Connect your GitHub repository to Vercel.
2. Add Environment Variables in Vercel Project Settings.
   - `MONGODB_URI` (Use Atlas connection string)
   - `JWT_SECRET`, etc.
3. Deploy.
4. **Warning**: Do not use the generic "Upload Image" feature unless you've refactored it to use cloud storage.

---

## Option 3: Manual Node.js (PM2)
If you have a VPS but don't want to use Docker.

1. Install Node.js, NPM, and MongoDB on the server.
2. `npm install`
3. `npm run build`
4. Start with PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name "portfolio" -- start
   ```
