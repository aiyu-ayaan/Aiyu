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
2. **Uploaded Images**: Stored in host directory `./public/uploads` mounted to `/app/public/uploads` in the container.
   - This ensures images uploaded via the app are saved to your actual local hard drive (or VPS disk).

## Common Issues & Fixes

### 1. "EACCES: permission denied" on Upload
**Cause**: The Node.js user inside the container doesn't have write permissions to the mounted volume on the host.
**Fix**:
The `Dockerfile` has been configured to run as `root` temporarily to bypass this. Ensure you have rebuilt:
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
