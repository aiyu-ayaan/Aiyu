# Portfolio Website

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


A modern, responsive portfolio website built with Next.js, Tailwind CSS, and MongoDB. This project showcases my skills, detailed project case studies, and provides a way for visitors to contact me. It also features a comprehensive Admin Panel for managing content.

## Features

### Public Interface
- **Home Page**: Interactive landing page with a dynamic space-themed background.
- **About Me**: Detailed introduction and professional background.
- **Projects**: Showcase of my work with detailed project pages.
- **Contact**: Functional contact form for inquiries.
- **Gallery**: A visual collection of achievements and certifications.
- **Blogs**: A section to share thoughts and technical articles.

### Admin Panel
- **Dashboard**: Overview of site activity and statistics.
- **Project Management**: Add, edit, and delete projects.
- **Message Center**: specific section to view and reply to contact form messages (Chat feature).
- **GitHub Integration**: Integration with GitHub for fetching repository data.
- **Database Export**: Functionality to backup/export database records.

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

## Tech Stack

- **Frontend**: Next.js 15 (React 19), Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Mongoose (MongoDB)
- **Utilities**: Lucide React (Icons), date-fns, lodash
- **Infrastructure**: Docker, Docker Compose

## Quick Start (Docker)

The recommended way to run this application is using Docker.

### Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- 2GB+ available RAM

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd portfolio
   ```

2. **Configure Environment**
   Copy the example environment file and update the credentials.
   ```bash
   cp .env.example .env
   ```
   
   > **IMPORTANT**: You must update `MONGO_ROOT_PASSWORD`, `ADMIN_PASSWORD` and `JWT_SECRET` in your `.env` file with strong, unique passwords before starting.

3. **Start the Application**
   ```bash
   docker compose up -d --build
   ```

   The application will be available at:
   - **Main Site**: [http://localhost:3000](http://localhost:3000)
   - **Admin Panel**: [http://localhost:3000/admin](http://localhost:3000/admin)

## Manual Installation (Development)

If you wish to run the project without Docker for development purposes:

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup MongoDB**
   You need a running MongoDB instance. Update `.env` with your `MONGODB_URI`.

3. **Run the development server**
   ```bash
   npm run dev
   ```

## Security & Deployment

This project requires specific security configurations for production deployment.

- **Security Checklist**: Please refer to [DEPLOYMENT_SECURITY_CHECKLIST.md](DEPLOYMENT_SECURITY_CHECKLIST.md) before deploying.
- **Docker Guide**: For detailed Docker instructions, maintenance, and troubleshooting, see [DOCKER.md](DOCKER.md).

### Key Security Measures
- Run crypto-safe credential generation before first deployment.
- Ensure the application runs as a non-root user (configured in Dockerfile).
- Verify all file upload permissions and authentications.

## License

This project is licensed under the MIT License.
