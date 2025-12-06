# Admin Panel Documentation

This portfolio includes a built-in admin panel for managing content dynamically without needing to redeploy or run seed scripts.

## Features

- 🔐 Secure authentication with JWT tokens
- ✏️ Edit all portfolio data in real-time
- 📝 JSON-based editor for full control
- 🚀 Instant updates (no redeployment needed)
- 🔒 Environment-based credentials

## Setup

### 1. Configure Admin Credentials

Add admin credentials to your `.env.local` file:

```env
# Admin Panel Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-secret-jwt-key-min-32-chars
```

**Important Security Notes:**
- Change the default username and password immediately
- Use a strong, unique password
- Generate a secure JWT secret (min 32 characters)
- Never commit `.env.local` to version control
- Use different credentials for production

### 2. Generate Secure JWT Secret

Generate a secure JWT secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Start Your Application

```bash
npm run dev
```

## Accessing the Admin Panel

### Login

Navigate to: `http://localhost:3000/admin/login`

Use the credentials from your `.env.local` file:
- Username: Your `ADMIN_USERNAME`
- Password: Your `ADMIN_PASSWORD`

### Dashboard

After successful login, you'll be redirected to: `http://localhost:3000/admin/dashboard`

## Using the Admin Panel

### Dashboard Overview

The dashboard has 5 tabs:

1. **About** - Edit personal information, skills, experiences, education, certifications
2. **Projects** - Manage project portfolio
3. **Header** - Update navigation links and contact information
4. **Site** - Modify social media links
5. **Home Screen** - Edit home page content

### Editing Data

1. Click on the tab you want to edit
2. The current data loads as formatted JSON
3. Edit the JSON directly in the textarea
4. Click "Save Changes" to update
5. Changes are instant - refresh your portfolio to see them

### JSON Editor Tips

- The editor validates JSON automatically
- Invalid JSON won't be saved
- Be careful with syntax (commas, quotes, brackets)
- Use an online JSON validator if needed
- The `_id`, `createdAt`, and `updatedAt` fields are managed by MongoDB

### Example Edits

**Adding a new skill:**
```json
{
  "skills": [
    {
      "name": "New Technology",
      "level": 80
    }
  ]
}
```

**Updating professional summary:**
```json
{
  "professionalSummary": "Your new summary text here..."
}
```

**Adding a social link:**
```json
{
  "socials": [
    {
      "name": "Twitter",
      "url": "https://twitter.com/yourhandle",
      "icon": "Twitter"
    }
  ]
}
```

## API Endpoints

The admin panel uses these protected API endpoints:

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Admin CRUD Operations
- `PUT /api/admin/about` - Update about data
- `PUT /api/admin/header` - Update header data
- `PUT /api/admin/site` - Update site data
- `PUT /api/admin/homescreen` - Update home screen data
- `POST /api/admin/projects` - Create new project
- `PUT /api/admin/projects` - Update projects page metadata
- `PUT /api/admin/projects/[id]` - Update specific project
- `DELETE /api/admin/projects/[id]` - Delete specific project

All admin endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Security Features

### Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Server validates against environment variables
3. If valid, server generates JWT token (24h expiry)
4. Token stored in browser cookie
5. All admin API calls include token in Authorization header
6. Server validates token on each request

### Token Management

- Tokens expire after 24 hours
- Stored securely in HTTP-only cookies
- Automatically included in API requests
- Logout removes token from cookies

### Best Practices

- **Production Security:**
  - Use HTTPS in production
  - Set secure cookie flags
  - Implement rate limiting
  - Add IP whitelisting if possible
  - Monitor login attempts
  - Use environment-specific secrets

- **Password Security:**
  - Use a password manager
  - Minimum 12 characters
  - Mix uppercase, lowercase, numbers, symbols
  - Don't reuse passwords
  - Rotate credentials periodically

- **JWT Secret:**
  - Minimum 32 characters
  - Use cryptographically random generation
  - Never expose in client code
  - Rotate periodically
  - Different secret per environment

## Troubleshooting

### Cannot Login

**Problem**: Invalid credentials error
**Solutions**:
- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local`
- Ensure no extra spaces in credentials
- Check that `.env.local` is in the project root
- Restart the development server after changing `.env.local`

### Token Expired

**Problem**: Redirected to login after some time
**Solution**: This is normal - tokens expire after 24 hours for security. Just log in again.

### Changes Not Saving

**Problem**: Save button doesn't work
**Solutions**:
- Check browser console for errors
- Verify JSON syntax is valid
- Ensure you're logged in (check for token in cookies)
- Check that MongoDB is running
- Verify MongoDB connection in `.env.local`

### JSON Syntax Errors

**Problem**: Can't parse JSON
**Solutions**:
- Use an online JSON validator (jsonlint.com)
- Check for missing/extra commas
- Ensure all strings are in quotes
- Match all opening/closing brackets
- Don't add trailing commas

## Production Deployment

### Environment Variables

Set these in your production environment:

```env
MONGODB_URI=your-production-mongodb-uri
ADMIN_USERNAME=your-production-admin-username
ADMIN_PASSWORD=your-strong-production-password
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
```

### Platform-Specific Setup

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add each variable with production values
3. Redeploy

**Docker:**
```bash
docker-compose up -d
# Set environment variables in docker-compose.yml or .env file
```

**Railway/Heroku:**
Use their dashboard or CLI to set environment variables

### Security Checklist

- [ ] Changed default admin credentials
- [ ] Generated secure JWT secret (32+ chars)
- [ ] Enabled HTTPS
- [ ] Set secure cookie flags in production
- [ ] Different credentials than development
- [ ] MongoDB authentication enabled
- [ ] Firewall/security groups configured
- [ ] Regular password rotation scheduled
- [ ] Backup strategy in place

## Advanced Usage

### Programmatic Access

You can use the admin API programmatically:

```javascript
// Login
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'password' })
});
const { token } = await loginRes.json();

// Update data
const updateRes = await fetch('/api/admin/about', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ name: 'New Name', ... })
});
```

### Bulk Updates

For bulk updates, consider:
1. Export data from admin panel
2. Edit in your preferred editor
3. Import back through admin panel
4. Or use the seed script with updated data files

## Future Enhancements

Potential improvements for the admin panel:

- [ ] Rich text editor for descriptions
- [ ] Image upload functionality
- [ ] Form-based editing (instead of raw JSON)
- [ ] Preview changes before saving
- [ ] Undo/redo functionality
- [ ] Multi-user support with roles
- [ ] Activity/audit logs
- [ ] Data validation UI
- [ ] Backup/restore functionality
- [ ] Two-factor authentication

## Support

For issues related to the admin panel:
1. Check this documentation
2. Review browser console for errors
3. Check server logs
4. Verify environment variables
5. Test MongoDB connection
6. Open an issue on GitHub

---

**Security Reminder:** Always use strong, unique credentials and keep your JWT secret secure! 🔐
