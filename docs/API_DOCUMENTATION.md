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
Retrieves a list of blog posts.
- **Auth**: Public or Admin
- **Query Parameters**:
  - `all=true`: (Admin only) Returns ALL blogs including drafts.
- **Behavior**:
  - **Public**: Returns only blogs where `published: true` (or missing).
  - **Admin**: Returns all blogs if `all=true`, otherwise follows public behavior.
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "675...",
        "title": "My Blog Post",
        "published": true, // New field, defaults to true (if missing) or explicit value
        "content": "...",
        // ...
      }
    ]
  }
  ```

#### POST /api/blogs
Creates a new blog post.
- **Auth**: Required (`x-api-key` header OR Admin Session)
- **Behavior**: New blogs are created as **Drafts** (`published: false`) by default unless specified otherwise.
- **Body** (JSON):
  ```json
  {
    "title": "My Post Title",
    "content": "Markdown content here...",
    "image": "https://example.com/image.jpg", // Optional
    "tags": ["react", "nextjs"], // Optional array of strings
    "date": "December 11, 2025", // Optional, defaults to today
    "published": false // Optional, defaults to false (Draft) if omitted
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
- **Auth**: Admin Session Required (Cookie) or API Key
- **Supported Formats**: JPG, PNG, WebP, GIF, HEIC, HEIF
- **File Size Limit**: 10MB maximum
- **Security**: Magic number validation, rate limiting, secure filename generation
- **Body**: `multipart/form-data`
  - `file`: (Binary file data)
- **Response**:
  ```json
  {
    "success": true,
    "url": "/api/uploads/filename-timestamp.jpg",
    "thumbnailUrl": "/api/uploads/filename-timestamp-thumb.webp",
    "filename": "filename-timestamp.jpg",
    "size": 1234567,
    "type": "image/jpeg"
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
