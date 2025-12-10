# API Documentation

## Authentication
The API supports two methods of authentication for write operations:
1. **Session Cookie**: Used by the Admin Panel (requires login via `/admin/login`).
2. **API Key**: Used by external tools (e.g., n8n, Postman).
    - Header: `x-api-key`
    - Value: Your `BLOG_API_KEY` or `JWT_SECRET` defined in `.env`.

---

## Endpoints

### 1. Blogs
**Base URL**: `/api/blogs`

#### GET /api/blogs
Retrieves a list of all blog posts, sorted by newest first.
- **Auth**: Public
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "675...",
        "title": "My Blog Post",
        "content": "...",
        "date": "December 10, 2025",
        "image": "...",
        "tags": ["tech"]
      }
    ]
  }
  ```

#### POST /api/blogs
Creates a new blog post.
- **Auth**: Required (`x-api-key` header OR Admin Session)
- **Body** (JSON):
  ```json
  {
    "title": "My Post Title",
    "content": "Markdown content here...",
    "image": "https://example.com/image.jpg", // Optional
    "tags": ["react", "nextjs"], // Optional array of strings
    "date": "December 11, 2025" // Optional, defaults to today
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": { ...blogObject }
  }
  ```

---

### 2. File Uploads
**Base URL**: `/api/upload`

#### POST /api/upload
Uploads a file to the server's `public/uploads` directory.
- **Auth**: Public (currently, though relies on Admin UI context usually)
- **Body**: `multipart/form-data`
  - `file`: (Binary file data)
- **Response**:
  ```json
  {
    "success": true,
    "url": "/api/uploads/filename-timestamp.jpg"
  }
  ```

---

### 3. Configuration
**Base URL**: `/api/config`

#### GET /api/config
Fetches global site configuration (Site Title, Logo, Headers).
- **Auth**: Public

#### PUT /api/config
Updates global site configuration.
- **Auth**: Admin Session Required (Cookie)
- **Body**: JSON object with config fields.
