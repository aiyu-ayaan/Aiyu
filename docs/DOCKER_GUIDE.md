# Docker Setup & Troubleshooting

## Prerequisites
- Docker Desktop installed and running.
- `.env` file created in root directory (see `SETUP_GUIDE.md`).

## Building and Running

To start the application in a container:

```bash
docker-compose up -d --build
```

- `--build`: Forces a rebuild of the Docker image (essential if you modify `package.json` or `Dockerfile`).
- `-d`: Detached mode (runs in background).

To stop the application:

```bash
docker-compose down
```

## Data Persistence
This setup uses **Docker Volumes** to ensure data is not lost when containers are restarted.

1. **MongoDB Data**: Stored in named volume `mongodb_data`.
2. **Uploaded Images**: Stored in named volume `uploads_data` mounted to `/app/public/uploads` in the container.
   - Using a named volume ensures proper permissions for the container user (nextjs:nodejs with UID 1001).
   - Images persist across container restarts and rebuilds.
   
### Accessing Uploaded Files from Host
To copy uploaded files from the Docker volume to your host machine:
```bash
# List all Docker volumes (find the uploads volume name)
docker volume ls | grep uploads

# List files in the uploads volume (adjust volume name if needed)
# The volume name format is <project-name>_uploads_data (e.g., aiyu_uploads_data)
docker run --rm -v <project-name>_uploads_data:/uploads alpine ls -lah /uploads

# Copy all uploads to host directory
docker run --rm -v <project-name>_uploads_data:/uploads -v $(pwd)/backup:/backup alpine cp -r /uploads/. /backup/

# Copy a specific file from running container
docker cp aiyu-app:/app/public/uploads/filename.jpg ./local-filename.jpg
```

## Common Issues & Fixes

### 1. "EACCES: permission denied" on Upload
**Cause**: Permission mismatch between the container user and the upload directory.
**Fix**:
This has been resolved by using a named Docker volume (`uploads_data`) instead of a bind mount. The named volume is created with proper permissions for the `nextjs` user (UID 1001) inside the container. After updating your docker-compose.yml, rebuild:
```bash
docker-compose down
docker-compose up -d --build
```

### 2. Images 404 Not Found after Upload
**Cause**: Next.js "Standalone" mode (used in Docker) optimizes performance by pre-scanning the `public` folder. It often misses files added *after* the build starts.
**Fix**:
We implemented a custom API route to serve these files.
- **Upload URL**: Returns `/api/uploads/filename.jpg` instead of `/uploads/...`
- **Serving Route**: `/api/uploads/[filename]` reads the file directly from disk, bypassing Next.js static asset cache.

### 3. Database Connection Error
**Cause**: Incorrect `MONGODB_URI` in `.env`.
**Fix**:
- **Inside Docker**: Use the service name `mongodb`.
  - `MONGODB_URI=mongodb://root:password@mongodb:27017/portfolio?authSource=admin`
- **Localhost (running outside Docker)**: Use `localhost`.
  - `MONGODB_URI=mongodb://root:password@localhost:27017/portfolio?authSource=admin`
