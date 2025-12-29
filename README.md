# Portfolio Website

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green?logo=mongodb)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![Documentation](https://img.shields.io/badge/Wiki-Documentation-blue?logo=github)](https://github.com/aiyu-ayaan/Aiyu/wiki)

A modern, responsive, and **fully customizable** portfolio website built with Next.js 15, Tailwind CSS, and MongoDB. This project showcases skills, detailed project case studies, blogs, and provides a way for visitors to contact you. It features a comprehensive **Admin Panel** for managing all content without touching code, making it perfect for developers who want a professional portfolio with zero-hassle content management.

**🌟 Perfect for**: Developers, designers, freelancers, and tech professionals looking for a production-ready portfolio solution.

**📚 [Complete Documentation Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki)** | **🚀 [Quick Start Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Quick-Start)** | **📖 [Installation Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Installation-Guide)**

## ✨ Features

### 🌐 Public Interface
- **Home Page**: Interactive landing page with a dynamic space-themed background and customizable hero section
- **About Me**: Detailed introduction with skills grid, experience timeline, and professional background
- **Projects**: Showcase your work with:
  - Detailed project pages with Markdown support
  - Tech stack badges and tags
  - Live demo and GitHub repository links
  - Project screenshots and galleries
- **Contact**: Functional contact form with:
  - Email integration via n8n webhook
  - Message management in admin panel
  - Real-time chat-style interface
- **Gallery**: Visual collection of achievements, certifications, and awards with masonry layout
- **Blogs**: Technical articles and blog posts with:
  - Draft/Published status
  - Markdown rendering with syntax highlighting
  - Code block support with React Syntax Highlighter
  - Automated posting via API integration (Notion, external CMS)
- **SEO Optimized**: Built-in sitemap, meta tags, Open Graph, and schema.org structured data

### 🔧 Admin Panel (Full Content Management System)
Access the admin panel at `/admin` to manage everything without touching code:

#### Content Management
- **Home**: Edit hero section text, tagline, and "Open to Work" status
- **About**: Update biography, manage skills grid with icons, and experience timeline
- **Projects**: Full CRUD operations with:
  - Rich Markdown editor with preview
  - Image upload and management
  - Tech stack tagging with auto-suggestions
  - GitHub statistics integration
  - Drag-and-drop image galleries
- **Blogs**: Create and manage articles with:
  - Draft/Published workflow
  - Markdown editor with live preview
  - Featured image uploads
  - Tags and categories
  - Automated API creation support
- **Gallery**: Upload and manage certifications/awards with:
  - Drag-and-drop interface
  - Image optimization (Sharp)
  - HEIC format support
  - Masonry grid layout

#### System Configuration
- **Header**: Configure navigation links, logo text, and menu items
- **Footer**: Manage footer links, social media, version tags, and copyright text
- **Contact Messages**: View and manage incoming form messages with:
  - Read/unread status
  - Reply functionality
  - Chat-style interface
  - Message threading
- **Themes**: Live theme editor with:
  - 21 pre-built theme presets (VS Code Dark, Ocean Blue, Forest Green, Sunset Orange, Royal Purple, Monochrome, Dracula, Nord, Cyberpunk, Gruvbox, Solarized, Catppuccin, Tokyo Night, Material Ocean, Synthwave, Forest, Sunset, Aurora, Coral Reef, Espresso, Midnight Blue)
  - Custom color generation
  - Real-time preview
  - Export/import theme configurations
- **GitHub Integration**: 
  - Fetch repository statistics (stars, forks, language)
  - Display GitHub activity
  - Automated sync with your repos
- **Global Config**: 
  - SEO metadata (title, description, keywords)
  - Google Analytics integration
  - Feature flags and site-wide settings
  - Base URL configuration
- **Database Management**: 
  - Export full database to JSON
  - Backup and restore functionality
  - Data migration tools

### 🔒 Security Features
- **JWT Authentication**: Secure admin panel access
- **Rate Limiting**: Protection against brute force attacks
- **Docker Security**: 
  - Non-root user execution
  - Read-only filesystem
  - CPU and memory limits
  - No-execution /tmp directory (crypto miner prevention)
- **Environment Variables**: Secure credential management
- **API Key Protection**: Secure blog API with token authentication

> **📚 Complete Documentation**: 
> - **[GitHub Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki)** - Comprehensive guides and tutorials
> - **[Quick Start](https://github.com/aiyu-ayaan/Aiyu/wiki/Quick-Start)** - Get running in 5 minutes
> - **[Admin Panel Manual](docs/admin_manual.md)** - Detailed admin panel guide with screenshots
> - **[API Documentation](https://github.com/aiyu-ayaan/Aiyu/wiki/API-Documentation)** - REST API reference
> - **[Deployment Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Deployment-Guide)** - Production deployment instructions

## Screenshots

### Home Page
![Home Page](public/screenshots/home.png)

### About Me
![About Me](public/screenshots/about.png)

### Projects
![Projects](public/screenshots/projects.png)

### Contact Us
![Contact Us](public/screenshots/contact.png)

### Admin Panel (Homepage)
![Admin Panel](public/screenshots/admin.png)

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router and React 19
- **Styling**: Tailwind CSS 4 with custom configuration
- **Animations**: Framer Motion for smooth transitions and interactions
- **Icons**: Lucide React, React Icons, Simple Icons
- **Markdown**: React Markdown with GitHub Flavored Markdown (GFM)
- **Syntax Highlighting**: React Syntax Highlighter for code blocks
- **Date Handling**: date-fns with timezone support
- **Drag & Drop**: @dnd-kit for sortable interfaces
- **UI Components**: Custom components with Tailwind CSS

### Backend
- **API**: Next.js API Routes (serverless functions)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with jose library
- **Image Processing**: Sharp for optimization, HEIC conversion support
- **Validation**: Built-in Next.js middleware for route protection

### Infrastructure & DevOps
- **Containerization**: Docker with Docker Compose
- **Image Optimization**: Next.js Image component with Sharp
- **Security**: 
  - Rate limiting
  - Content Security Policy
  - Secure headers
  - Environment-based configuration
- **Deployment**: 
  - Docker-ready (VPS, DigitalOcean, AWS EC2)
  - Vercel-compatible (with external storage setup)
  - PM2-ready for traditional Node.js hosting

### Developer Experience
- **Linting**: ESLint with Next.js configuration
- **Type Safety**: JSConfig for JavaScript projects
- **Scripts**: Automated security checks, Docker management, emergency cleanup
- **Documentation**: Comprehensive guides for setup, deployment, and usage

## 🚀 Quick Start (Docker) - Recommended

The fastest and most secure way to run this application is using Docker. Everything is pre-configured!

> **📚 New to this project?** Check out our **[5-Minute Quick Start Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Quick-Start)** or **[Detailed Installation Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Installation-Guide)**

### Prerequisites

- **Docker Engine**: 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: v2.0+ (included with Docker Desktop)
- **System Requirements**: 
  - 2GB+ available RAM
  - 1 CPU core minimum
  - 5GB disk space

### Installation & Running

#### 1. **Clone the Repository**
```bash
git clone https://github.com/aiyu-ayaan/Aiyu.git
cd Aiyu
```

#### 2. **Configure Environment Variables**
Copy the example environment file and update with your credentials:

```bash
cp .env.example .env
```

**🔐 IMPORTANT - Generate Secure Credentials**:
```bash
# Generate JWT Secret (64 characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate MongoDB Password (32 characters)
node -e "console.log('MONGO_ROOT_PASSWORD=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Blog API Key (32 characters)
node -e "console.log('BLOG_API_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Edit `.env` file and update these CRITICAL variables**:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://admin:YOUR_GENERATED_PASSWORD@mongodb:27017/aiyu?authSource=admin
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YOUR_GENERATED_PASSWORD  # Must match password in MONGODB_URI!

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!  # Change this! (min 12 chars)

# JWT Secret (paste generated value)
JWT_SECRET=your_64_character_generated_secret

# Blog API Key (paste generated value)
BLOG_API_KEY=your_32_character_generated_key

# SEO Configuration
NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # Your website URL
NEXT_PUBLIC_AUTHOR_NAME=Your Name  # Your name for SEO

# Optional: n8n Webhook for contact form
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/contact
```

> 💡 **Tip**: Never use default passwords! The security of your admin panel depends on strong credentials.

#### 3. **Build and Start the Application**
```bash
# Build with security hardening
npm run docker:build

# Start all services (app + MongoDB)
npm run docker:up

# View logs
npm run docker:logs
```

#### 4. **Verify Security (CRITICAL)**
```bash
npm run docker:verify
```
All security checks must pass! This verifies:
- /tmp directory is non-executable (crypto miner prevention)
- Read-only filesystem is enabled
- Resource limits are active
- Container is running as non-root user

#### 5. **Seed Initial Data (REQUIRED - First Time Only)**

🚨 **IMPORTANT**: Before accessing the site, you must seed the database with initial data:

```bash
# Open browser and visit (or use curl):
http://localhost:3000/api/seed
```

Or using curl:
```bash
curl http://localhost:3000/api/seed
```

**Expected Response**:
```json
{"message": "Database seeded successfully"}
```

This populates the database with:
- Default home page content
- Sample projects
- About section data
- Header navigation
- Social links
- Initial configuration

**Note**: Only run this ONCE during initial setup. Running it again will reset all data to defaults!

#### 6. **Access Your Portfolio**
- **🌐 Main Site**: [http://localhost:3000](http://localhost:3000)
- **⚙️ Admin Panel**: [http://localhost:3000/admin](http://localhost:3000/admin)
  - Username: `admin` (or your configured username)
  - Password: Your `ADMIN_PASSWORD` from `.env`

### 🎯 Post-Installation Steps

1. **Seed Database**: Visit `http://localhost:3000/api/seed` (first time only!)
2. **Login to Admin Panel**: Navigate to `/admin` and login
3. **Update Home Content**: Edit hero section, tagline, and "Open to Work" status
4. **Add Your Projects**: Create project entries with descriptions, images, and links
5. **Configure GitHub Integration**: Add GitHub token to fetch repository statistics
6. **Customize Theme**: Choose or create a theme that matches your brand
7. **Setup SEO**: Configure meta tags, analytics, and sitemap settings

## 💻 Manual Installation (Development)

If you wish to run the project without Docker for local development:

> **📖 Full Guide**: [Manual Installation Steps](https://github.com/aiyu-ayaan/Aiyu/wiki/Installation-Guide#-manual-installation)

### Prerequisites
- **Node.js**: 18.17+ or 20.0+ ([Download Node.js](https://nodejs.org/))
- **MongoDB**: 6.0+ running locally or remote instance
- **npm**: 9.0+ (comes with Node.js)

### Setup Steps

#### 1. **Install Dependencies**
```bash
npm install
```

#### 2. **Setup MongoDB**
You need a running MongoDB instance:

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# https://docs.mongodb.com/manual/installation/

# Start MongoDB service
mongod --dbpath /path/to/your/data/directory
```

**Option B: MongoDB Atlas (Cloud)**
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Update `.env` file

#### 3. **Configure Environment**
```bash
cp .env.example .env
```

**Update `.env` for local development**:
```env
# For LOCAL MongoDB (not Docker)
MONGODB_URI=mongodb://localhost:27017/aiyu

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!

# Generate these with crypto
JWT_SECRET=your_generated_jwt_secret
BLOG_API_KEY=your_generated_blog_api_key

# SEO Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_AUTHOR_NAME=Your Name
```

#### 4. **Run Development Server**
```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000) with hot-reload enabled (Turbopack).

#### 5. **Seed Initial Data (REQUIRED - First Time Only)**

🚨 **IMPORTANT**: Before using the site, seed the database with initial data:

```bash
# Visit in browser or use curl:
curl http://localhost:3000/api/seed
```

**Expected Response**: `{"message": "Database seeded successfully"}`

**Note**: Only run this ONCE during initial setup. It will reset all data to defaults if run again!

📖 **Learn More**: [Database Seeding Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Database-Seeding)

### 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Build production bundle
npm run start            # Start production server
npm run lint             # Run ESLint

# Docker Operations
npm run docker:build     # Build Docker images
npm run docker:up        # Start Docker containers
npm run docker:down      # Stop Docker containers
npm run docker:logs      # View container logs

# Security & Maintenance
npm run security-check   # Run security checks
npm run docker:verify    # Verify Docker security configuration
npm run emergency:cleanup # Emergency cleanup script (if compromised)
```

### 🔍 Development Tips

1. **Hot Reload**: Changes to files trigger automatic rebuilds
2. **API Routes**: Located in `src/app/api/` - test with tools like Postman or Thunder Client
3. **Database Inspection**: Use MongoDB Compass to view your local database
4. **Environment Variables**: Add `NEXT_PUBLIC_` prefix for client-side variables
5. **Image Optimization**: Place images in `public/` folder for static serving

📖 **More Tips**: [Development Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Architecture)

## 🔒 Security & Production Deployment

This project includes enterprise-grade security features and has been hardened against common attacks, including crypto mining exploits.

> **📖 Complete Guides**: 
> - **[Security Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Security-Guide)** - Comprehensive security practices
> - **[Deployment Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Deployment-Guide)** - Production deployment options
> - **[Quick Security Guide](QUICK_SECURITY_GUIDE.md)** - Essential security checklist

### 🛡️ Built-in Security Features

1. **Docker Security Hardening**:
   - ✅ Non-executable /tmp directory (prevents crypto miner attacks)
   - ✅ Read-only filesystem (prevents malware writing)
   - ✅ CPU and memory limits (caps resource usage at 1 core / 512MB)
   - ✅ No privilege escalation (can't become root)
   - ✅ Dropped all Linux capabilities
   - ✅ Runs as non-root user (`nextjs`)

2. **Application Security**:
   - ✅ JWT-based authentication with secure tokens
   - ✅ Rate limiting on API routes
   - ✅ Environment-based credential management
   - ✅ CORS and security headers
   - ✅ Input validation and sanitization
   - ✅ Protected admin routes with middleware

3. **Database Security**:
   - ✅ MongoDB authentication enabled
   - ✅ Separate admin and application credentials
   - ✅ Network isolation in Docker
   - ✅ Data encryption in transit

### 🚀 Production Deployment Options

#### **Option 1: Docker on VPS (Recommended)**
Perfect for DigitalOcean, AWS EC2, Linode, Vultr, etc.

**See detailed guide**: **[Deployment Guide - Docker on VPS](https://github.com/aiyu-ayaan/Aiyu/wiki/Deployment-Guide#-option-1-docker-on-vps-recommended)**

**Quick Steps**:
```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose

# 3. Clone and configure
git clone https://github.com/aiyu-ayaan/Aiyu.git
cd Aiyu
cp .env.example .env
nano .env  # Update credentials

# 4. Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 5. Deploy
npm run docker:build
npm run docker:up
npm run docker:verify  # CRITICAL: Verify security

# 6. Setup reverse proxy (Nginx/Caddy) for HTTPS
```

#### **Option 2: Vercel (Serverless)**
⚠️ **Important Limitations**:
- File uploads won't persist (use S3, Cloudinary, or UploadThing instead)
- Need external MongoDB (MongoDB Atlas recommended)

**Steps**:
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Update upload API to use cloud storage
4. Deploy

**See**: [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed Vercel setup

#### **Option 3: PM2 on VPS**
Traditional Node.js hosting without Docker.

```bash
# Install dependencies
npm install -g pm2
npm install
npm run build

# Start with PM2
pm2 start npm --name "portfolio" -- start
pm2 save
pm2 startup
```

### 🔐 Pre-Deployment Security Checklist

Before deploying to production:

- [ ] Generate strong, random credentials (never use defaults!)
- [ ] Update all passwords in `.env` file
- [ ] Set correct `NEXT_PUBLIC_BASE_URL` for your domain
- [ ] Configure `NEXT_PUBLIC_AUTHOR_NAME` for SEO
- [ ] Add GitHub token for repository integration
- [ ] Setup n8n webhook (optional, for contact form)
- [ ] Enable HTTPS with valid SSL certificate (use Let's Encrypt)
- [ ] Configure firewall rules (only ports 80, 443, 22 open)
- [ ] Setup automated backups for MongoDB
- [ ] Configure monitoring (CPU, memory, disk usage)
- [ ] Test admin panel login after deployment
- [ ] Run `npm run docker:verify` and ensure all checks pass

**📖 Complete Security Guide**: **[Security Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Security-Guide)** | **[Quick Security Checklist](QUICK_SECURITY_GUIDE.md)**

### 🚨 Emergency Response

If you suspect compromise:
```bash
npm run emergency:cleanup
# Follow the script prompts for forensic analysis and cleanup
```

### 📊 Monitoring & Maintenance

```bash
# Check resource usage
docker stats aiyu-app --no-stream

# View application logs
npm run docker:logs

# Check for security issues
npm run security-check

# Health check endpoint
curl http://localhost:3000/api/health
```

## 📚 Documentation

This project includes extensive documentation to help you get started and make the most of all features.

### 🌟 GitHub Wiki (Recommended)

**Visit our [Complete Documentation Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki)** for comprehensive guides:

#### Getting Started
- **[📖 Home](https://github.com/aiyu-ayaan/Aiyu/wiki)** - Wiki overview and navigation
- **[⚡ Quick Start Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Quick-Start)** - Get running in 5 minutes
- **[🔧 Installation Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Installation-Guide)** - Detailed setup instructions
- **[⚙️ Configuration](https://github.com/aiyu-ayaan/Aiyu/wiki/Configuration)** - Environment variables and settings

#### Features & Usage  
- **[🎛️ Admin Panel Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Admin-Panel)** - Complete admin panel documentation
- **[📝 Content Management](https://github.com/aiyu-ayaan/Aiyu/wiki/Content-Management)** - Managing projects, blogs, and gallery
- **[🎨 Theme Customization](https://github.com/aiyu-ayaan/Aiyu/wiki/Theme-Customization)** - Creating and applying themes
- **[🔗 GitHub Integration](https://github.com/aiyu-ayaan/Aiyu/wiki/GitHub-Integration)** - Repository statistics and automation

#### Development
- **[🔌 API Documentation](https://github.com/aiyu-ayaan/Aiyu/wiki/API-Documentation)** - REST API endpoints and usage
- **[💾 Database Seeding](https://github.com/aiyu-ayaan/Aiyu/wiki/Database-Seeding)** - Populating initial data (REQUIRED)
- **[🏗️ Architecture](https://github.com/aiyu-ayaan/Aiyu/wiki/Architecture)** - Project structure and design patterns
- **[🤝 Contributing Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Contributing-Guide)** - How to contribute

#### Deployment
- **[🚀 Deployment Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Deployment-Guide)** - Production deployment options
- **[🔒 Security Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Security-Guide)** - Security best practices and hardening
- **[📊 Monitoring](https://github.com/aiyu-ayaan/Aiyu/wiki/Monitoring)** - Health checks and performance monitoring

#### Help & Troubleshooting
- **[❓ Common Issues & FAQ](https://github.com/aiyu-ayaan/Aiyu/wiki/Common-Issues)** - Solutions to frequent problems
- **[🐛 Debugging](https://github.com/aiyu-ayaan/Aiyu/wiki/Debugging)** - Debugging tips and tools

---

### 📁 Local Documentation (docs/ folder)

Additional detailed guides available in the `docs/` directory:

#### Getting Started
- **[README.md](README.md)** (this file) - Overview, installation, and quick start
- **[QUICK_SECURITY_GUIDE.md](QUICK_SECURITY_GUIDE.md)** - Essential security setup and crypto miner prevention

#### Admin & Usage
- **[Admin Panel User Manual](docs/admin_manual.md)** - Complete guide with screenshots
  - Content management (Projects, Blogs, Gallery)
  - Theme customization
  - Message management
  - GitHub integration
  - Database exports

#### Development & Integration
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Technical API details
  - Authentication endpoints
  - Blog automation API (integrate with Notion, n8n, Zapier)
  - Project and gallery APIs
  - Rate limiting and security
  - Example requests with cURL and JavaScript

#### Deployment & Operations
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Step-by-step deployment guides
  - Docker on VPS (DigitalOcean, AWS, Linode)
  - Vercel serverless deployment
  - PM2 traditional hosting
  - Domain and DNS setup
  - SSL certificate configuration

- **[DOCKER_GUIDE.md](docs/DOCKER_GUIDE.md)** - Docker-specific documentation
  - Container architecture
  - Volume management
  - Networking
  - Troubleshooting

#### Optimization & Performance
- **[SEO_OPTIMIZATION.md](docs/SEO_OPTIMIZATION.md)** - SEO best practices
  - Meta tags and Open Graph
  - Structured data (schema.org)
  - Sitemap generation
  - Performance optimization

- **[SEO_TESTING.md](docs/SEO_TESTING.md)** - Testing and validation
  - Google Search Console
  - Rich results testing
  - Performance audits

- **[GALLERY_OPTIMIZATION.md](docs/GALLERY_OPTIMIZATION.md)** - Image optimization
  - Image compression
  - Responsive images
  - Lazy loading
  - HEIC format support

---

### 🎯 Quick Links by Use Case

**I want to...**
- **Get started quickly**: Read [Quick Start Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Quick-Start) (5 minutes)
- **Install from scratch**: Follow [Installation Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Installation-Guide)
- **Seed the database**: See [Database Seeding Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Database-Seeding) ⚠️ REQUIRED
- **Customize content**: Use [Admin Panel Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Admin-Panel)
- **Deploy to production**: Follow [Deployment Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Deployment-Guide)
- **Automate blog posting**: Check [API Documentation](https://github.com/aiyu-ayaan/Aiyu/wiki/API-Documentation)
- **Improve SEO**: Review [SEO Optimization](docs/SEO_OPTIMIZATION.md)
- **Secure my deployment**: Follow [Security Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Security-Guide)
- **Troubleshoot issues**: Check [Common Issues](https://github.com/aiyu-ayaan/Aiyu/wiki/Common-Issues)

---

### 📖 Documentation Format

- **Wiki (Recommended)**: Interactive, searchable, community-editable documentation on GitHub
- **Local Files**: Markdown files you can read offline in the repository
- **Both in Sync**: Wiki and local docs cover the same topics with consistent information

## 🎨 Customization & Theming

This portfolio is built to be **fully customizable** without touching code!

### Live Theme Editor
Access the theme editor in the admin panel to:
- Choose from **21 pre-built themes**: VS Code Dark, Ocean Blue, Forest Green, Sunset Orange, Royal Purple, Monochrome, Dracula, Nord, Cyberpunk, Gruvbox, Solarized, Catppuccin, Tokyo Night, Material Ocean, Synthwave, Forest, Sunset, Aurora, Coral Reef, Espresso, and Midnight Blue
- Create **custom themes** with real-time preview
- Configure colors, fonts, and spacing
- Export/import theme configurations
- Apply themes instantly across the entire site

### Content Customization
Everything can be managed through the admin panel:
- **Hero Section**: Headline, tagline, description, CTA buttons
- **About Page**: Biography, skills with icons, experience timeline
- **Navigation**: Add/remove/reorder menu items
- **Footer**: Social links, copyright text, version info
- **SEO Metadata**: Page titles, descriptions, keywords
- **Analytics**: Google Analytics ID, tracking configuration

### Design System
Built on **Tailwind CSS 4** with:
- Utility-first CSS approach
- Responsive design (mobile, tablet, desktop)
- Dark/light theme support
- Smooth animations with Framer Motion
- Accessible components (WCAG 2.1 compliant)

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

1. **🐛 Report Bugs**: Open an issue on GitHub with detailed reproduction steps
2. **💡 Suggest Features**: Share your ideas in the GitHub Discussions
3. **📖 Improve Documentation**: Fix typos, add examples, clarify instructions
4. **🔧 Submit Pull Requests**: Fix bugs, add features, optimize code

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Aiyu.git
   cd Aiyu
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Setup environment**:
   ```bash
   cp .env.example .env
   # Update .env with local development values
   ```
6. **Start development server**:
   ```bash
   npm run dev
   ```
7. **Make your changes** and test thoroughly
8. **Commit with meaningful messages**:
   ```bash
   git add .
   git commit -m "feat: add new feature X"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format
9. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
10. **Open a Pull Request** on GitHub with:
    - Clear description of changes
    - Screenshots (if UI changes)
    - Link to related issue (if applicable)

### Coding Standards

- **Code Style**: Follow the existing code style (ESLint configuration)
- **Components**: Keep components small, focused, and reusable
- **Naming**: Use descriptive names for variables and functions
- **Comments**: Add comments for complex logic, not obvious code
- **Testing**: Test your changes manually before submitting
- **Commits**: Write clear, atomic commits with conventional commit messages

### Commit Message Format

```
type(scope): brief description

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples**:
```
feat(admin): add bulk delete for projects
fix(contact): resolve email validation issue
docs(readme): update installation instructions
style(theme): adjust button hover colors
```

### Pull Request Guidelines

- **Keep PRs focused**: One feature or fix per PR
- **Update documentation**: If you change functionality, update relevant docs
- **Add screenshots**: For UI changes, include before/after screenshots
- **Test thoroughly**: Ensure your changes work in development and production modes
- **Link issues**: Reference related issues with "Fixes #123" or "Closes #456"

### Project Structure

```
portfolio/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (site)/      # Public pages (home, about, projects, etc.)
│   │   ├── admin/       # Admin panel pages
│   │   ├── api/         # API routes
│   │   └── components/  # Shared components
│   ├── lib/             # Utility functions and database
│   ├── middleware/      # Authentication middleware
│   ├── models/          # Mongoose schemas
│   └── utils/           # Helper functions
├── public/              # Static assets
│   ├── screenshots/    # README screenshots
│   └── uploads/        # User uploaded files
├── docs/               # Documentation files
└── scripts/           # Utility scripts
```

### Need Help?

- **🌟 [GitHub Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki)** - Comprehensive documentation
- **❓ [Common Issues](https://github.com/aiyu-ayaan/Aiyu/wiki/Common-Issues)** - Quick solutions to frequent problems
- **🐛 [GitHub Issues](https://github.com/aiyu-ayaan/Aiyu/issues)** - Report bugs or request features
- **💬 [GitHub Discussions](https://github.com/aiyu-ayaan/Aiyu/discussions)** - Ask questions and share ideas
- **📧 Email** - Contact the maintainer at ayaan35200@gmail.com

---

**Estimated Time**: 
- Basic setup: **5 minutes** (with Docker)
- Full customization: **30 minutes**
- Production deployment: **1-2 hours**

**⚠️ Don't forget**: After installation, visit `http://localhost:3000/api/seed` to populate the database with initial data!

### Code of Conduct

Be respectful, inclusive, and constructive. We're all here to learn and build together!

## 🌟 Show Your Support

If you find this project helpful, consider:
- ⭐ **[Star the repository](https://github.com/aiyu-ayaan/Aiyu)** on GitHub
- 📚 **[Explore the Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki)** for comprehensive guides
- 🍴 **Fork and customize** for your own use
- 📢 **Share with others** who might need a portfolio
- 🐛 **Report issues** to help improve the project
- 💡 **Contribute** features or fixes (see [Contributing Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Contributing-Guide))
- 📝 **Improve documentation** in the Wiki


## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Ayaan Ansari

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

### What This Means
- ✅ **Free to use** for personal and commercial projects
- ✅ **Modify** the code as you wish
- ✅ **Distribute** your modified versions
- ✅ **Use commercially** without restrictions
- ℹ️ **Attribution appreciated** but not required

---

<div align="center">

**Built with ❤️ by [Aiyu Ayaan](https://github.com/aiyu-ayaan)**

[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-blue)](https://me.aiyu.co.in)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black?logo=github)](https://github.com/aiyu-ayaan)
[![Wiki](https://img.shields.io/badge/Wiki-Documentation-blue?logo=github)](https://github.com/aiyu-ayaan/Aiyu/wiki)

---

### 📚 Quick Links

**[Home](https://github.com/aiyu-ayaan/Aiyu)** • 
**[Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki)** • 
**[Quick Start](https://github.com/aiyu-ayaan/Aiyu/wiki/Quick-Start)** • 
**[Installation](https://github.com/aiyu-ayaan/Aiyu/wiki/Installation-Guide)** • 
**[API Docs](https://github.com/aiyu-ayaan/Aiyu/wiki/API-Documentation)** • 
**[Deployment](https://github.com/aiyu-ayaan/Aiyu/wiki/Deployment-Guide)** • 
**[Security](https://github.com/aiyu-ayaan/Aiyu/wiki/Security-Guide)** • 
**[FAQ](https://github.com/aiyu-ayaan/Aiyu/wiki/Common-Issues)**

---

**[⬆ Back to Top](#portfolio-website)**

</div>


