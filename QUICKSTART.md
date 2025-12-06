# Quick Start Guide

Get your MongoDB-powered portfolio running in minutes!

## Option 1: Docker (Recommended - Easiest Setup)

This is the fastest way to get everything running.

```bash
# 1. Start MongoDB and the application
docker-compose up -d

# 2. Wait a few seconds for MongoDB to initialize, then seed the database
sleep 5
docker-compose exec app npm run seed

# 3. Visit http://localhost:3000
```

To stop:
```bash
docker-compose down
```

To completely reset (including database):
```bash
docker-compose down -v
docker-compose up -d
sleep 5
docker-compose exec app npm run seed
```

## Option 2: Local Development (Full Control)

### Step 1: Install MongoDB

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

**Windows:**
Download from https://www.mongodb.com/try/download/community

**Or use Docker just for MongoDB:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

### Step 2: Setup Project

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local

# 3. Seed the database
npm run seed

# 4. Start development server
npm run dev
```

Visit http://localhost:3000

## Option 3: MongoDB Atlas (Cloud Database)

Perfect for production or if you don't want to run MongoDB locally.

### Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (M0 Free tier is perfect)
4. Wait 3-5 minutes for cluster creation

### Step 2: Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database password
5. Replace `<dbname>` with `aiyu-portfolio`

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/aiyu-portfolio?retryWrites=true&w=majority
```

### Step 3: Setup Project

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local

# 3. Edit .env.local and paste your Atlas connection string
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/aiyu-portfolio

# 4. Seed the database
npm run seed

# 5. Start development server
npm run dev
```

Visit http://localhost:3000

## Verifying Everything Works

1. **Check the Homepage**: Should show your name and roles
2. **Check About Page**: Should display skills, experience, education
3. **Check Projects Page**: Should show all your projects
4. **Check Theme Toggle**: Should switch between light and dark mode
5. **Check Database**: 
   ```bash
   # For local MongoDB
   mongosh aiyu-portfolio --eval "db.projects.count()"
   
   # For Docker
   docker-compose exec mongodb mongosh aiyu-portfolio --eval "db.projects.count()"
   ```

## Troubleshooting

### "Cannot connect to MongoDB"

**Solution 1**: Check if MongoDB is running
```bash
# For local MongoDB
brew services list | grep mongodb

# For Docker
docker ps | grep mongodb
```

**Solution 2**: Verify your connection string in `.env.local`

### "Database is empty"

**Solution**: Run the seed script
```bash
npm run seed
```

### "Port 3000 already in use"

**Solution**: Kill the process or use a different port
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

### Docker issues

**Solution**: Reset Docker containers
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d
```

## Admin Panel

Your portfolio includes a built-in admin panel for easy content management!

### Access the Admin Panel

1. **Login**: Visit `http://localhost:3000/admin/login`
2. **Credentials**: Use the username/password from your `.env.local`:
   ```env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=changeme123
   JWT_SECRET=your-secret-key
   ```
3. **Edit**: Update content through the dashboard
4. **Save**: Changes are instant - no redeployment needed!

📚 **See [ADMIN_PANEL.md](./ADMIN_PANEL.md) for detailed documentation**

## Next Steps

- ✅ Access the admin panel at `/admin/login`
- ✅ Update content through the dashboard (easier than seed scripts!)
- ✅ Customize the theme in `src/app/styles/globals.css`
- ✅ Deploy to Vercel, Railway, or your preferred platform

## Need More Help?

- 📚 See [README_MONGODB.md](./README_MONGODB.md) for detailed documentation
- 📚 See [SETUP.md](./SETUP.md) for advanced configuration
- 🐛 Check application logs: `docker-compose logs app`
- 🗄️ Check MongoDB logs: `docker-compose logs mongodb`

## Production Deployment

When you're ready to deploy:

1. Set up MongoDB Atlas (free tier available)
2. Set environment variables on your hosting platform
3. Deploy your application
4. Run the seed script once: `npm run seed`

Popular platforms:
- **Vercel**: Best for Next.js, easy MongoDB Atlas integration
- **Railway**: Simple Docker deployment
- **Heroku**: Classic PaaS with MongoDB add-ons
- **DigitalOcean**: Full control with App Platform

---

**Congratulations!** 🎉 Your portfolio is now powered by MongoDB!
