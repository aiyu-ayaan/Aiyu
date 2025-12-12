# Local Development Setup Guide

## Prerequisites
- Node.js (v18 or v20 recommended)
- MongoDB (Local server or Atlas URL)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd portfolio
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory. You can copy `.env.example` if it exists.
   
   **Required Variables**:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/portfolio
   
   # Admin Authentication
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=securepassword
   
   # Security
   JWT_SECRET=your_long_random_secret_key
   BLOG_API_KEY=your_api_key_for_n8n
   
   # External Integrations
   NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook/...
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Admin Panel Access
- URL: `http://localhost:3000/admin/login`
- Use the credentials defined in your `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

## Project Structure
- `src/app`: App Router pages and layouts.
- `src/components`: Reusable UI components.
- `src/models`: Mongoose database schemas (Blog, Config).
- `src/lib`: Utilities (db connection, auth helpers).
- `public/uploads`: Storage for uploaded files.
