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

The dashboard has 5 tabs with user-friendly forms:

1. **About** - Edit personal information, skills, experiences, education, certifications
2. **Projects** - Manage project portfolio
3. **Header** - Update navigation links and contact information
4. **Site** - Modify social media links
5. **Home Screen** - Edit home page content

### Editing Data

1. Click on the tab you want to edit
2. Forms load with your current data
3. Use the form fields to make changes
4. Click "Save All Changes" to update
5. Changes are instant - refresh your portfolio to see them

### Using the Forms

#### About Tab
- **Basic Info**: Edit name, roles (with Add/Remove buttons), and professional summary
- **Skills**: Add skills with name and level slider (0-100%), edit or delete existing ones
- **Experience/Education/Certifications**: Use Add buttons, fill in forms, save or cancel

#### Projects Tab
- **Page Description**: Add/remove description lines
- **Projects List**: View all projects in cards
- **Add Project**: Click "+ Add Project", fill the form with:
  - Name, year, status (dropdown), type (dropdown)
  - Tech stack (add multiple technologies)
  - Description, code link (URL validated)
  - Optional image URL
- **Edit/Delete**: Use buttons on each project card

#### Header Tab
- **Navigation Links**: Add/edit/delete nav links with name, URL, and optional target
- **Contact Link**: Edit the contact button name and URL

#### Site Tab
- **Social Media**: Add/edit/delete social links
  - Platform name, URL, icon (dropdown with common options)

#### Home Screen Tab
- **Basic Info**: Edit name and GitHub link
- **Home Roles**: Add/remove role descriptions
- **Code Snippets**: Add/remove text snippets displayed on home page

### Form Features

- **Error Prevention**: No JSON syntax errors possible
- **Validation**: Required fields marked with *, URL fields validated
- **Input Types**: Appropriate inputs (text, URL, dropdowns, sliders)
- **Add/Edit/Delete**: Clear buttons for managing list items
- **Visual Feedback**: Current data displayed in readable format
- **Instant Save**: All changes saved to database immediately

### Example Edits

**Adding a new skill:**
1. Go to About tab
2. Click "+ Add Skill" button
3. Enter skill name (e.g., "Next.js")
4. Adjust slider to skill level (e.g., 85%)
5. Click "Save"
6. Click "Save All Changes" at bottom

**Adding a project:**
1. Go to Projects tab
2. Click "+ Add Project"
3. Fill in the form fields
4. Add technologies one by one (press Enter after each)
5. Click "Save Project"
6. Click "Save All Changes"

**Updating social links:**
1. Go to Site tab
2. Click "Edit" on existing social link or "+ Add Social"
3. Update platform name, URL, and select icon
4. Click "Save"
5. Click "Save All Changes"
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

### Form Validation Errors

**Problem**: Can't save due to validation error
**Solutions**:
- Check that all required fields (marked with *) are filled
- Ensure URLs are in correct format (https://...)
- Verify numeric fields have valid numbers
- Check that lists have at least one item if required

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

- [x] Form-based editing (COMPLETED!)
- [ ] Rich text editor for descriptions
- [ ] Image upload functionality
- [ ] Preview changes before saving
- [ ] Undo/redo functionality
- [ ] Multi-user support with roles
- [ ] Activity/audit logs
- [ ] Drag-and-drop reordering
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
