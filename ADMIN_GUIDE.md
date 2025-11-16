# Admin Panel Guide

## Quick Start

### 1. Setup Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_random_secret_key_minimum_32_characters
```

**Security Note**: Use a strong, random JWT secret. You can generate one using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Run the Application

#### Development Mode
```bash
npm install
npm run dev
```

#### Production with Docker
```bash
docker-compose up -d
```

### 3. Access Admin Panel

1. Navigate to `http://localhost:3000/admin/login`
2. Enter your username and password
3. You'll be redirected to the dashboard

## Using the Admin Dashboard

### Dashboard Overview

The admin dashboard has four main sections (tabs):
- **Homescreen**: Edit home page content, name, roles, and code snippets
- **Projects**: Manage your portfolio projects
- **About**: Update skills, experience, education, and certifications
- **Site**: Configure navigation, contact links, and social media

### Editing Content

1. **Select a Tab**: Click on the section you want to edit
2. **Edit JSON**: The content appears as formatted JSON in a text editor
3. **Save Changes**: Click "Save Changes" when done
4. **Reload**: Use "Reload Data" to discard unsaved changes

### Tips

- ✅ Maintain valid JSON format when editing
- ✅ Changes are immediately visible on the website
- ✅ Use "Reload Data" to discard mistakes
- ✅ Test on staging before production changes
- ⚠️ Invalid JSON will not be saved

### Data Structure

#### Homescreen Data
```json
{
  "name": "Your Name",
  "homeRoles": ["Role 1", "Role 2"],
  "githubLink": "https://github.com/username",
  "codeSnippets": ["Line 1", "Line 2"]
}
```

#### Projects Data
```json
{
  "roles": ["Subtitle 1", "Subtitle 2"],
  "projects": [
    {
      "name": "Project Name",
      "techStack": ["Tech1", "Tech2"],
      "year": "2025",
      "status": "Done|Working",
      "projectType": "application|library|theme|skill",
      "description": "Project description",
      "codeLink": "https://github.com/..."
    }
  ]
}
```

#### About Data
```json
{
  "name": "Your Name",
  "roles": ["Role 1", "Role 2"],
  "professionalSummary": "Your summary",
  "skills": [
    { "name": "Skill Name", "level": 90 }
  ],
  "experiences": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Jan 2024 - Present",
      "description": "Job description"
    }
  ],
  "education": [
    {
      "institution": "University",
      "degree": "Degree Name",
      "duration": "2020 - 2024",
      "cgpa": "9.0/10.0"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "Jan 2024",
      "url": "https://...",
      "skills": ["Skill1", "Skill2"]
    }
  ]
}
```

#### Site Data
```json
{
  "navLinks": [
    {
      "name": "Link Name",
      "href": "/path",
      "target": "_blank"  // optional
    }
  ],
  "contactLink": {
    "name": "contact-me",
    "href": "https://..."
  },
  "socials": [
    {
      "name": "GitHub",
      "url": "https://github.com/...",
      "icon": "FaGithub"
    }
  ]
}
```

## Security Best Practices

1. **Strong Passwords**: Use passwords with at least 12 characters, including uppercase, lowercase, numbers, and symbols
2. **JWT Secret**: Use a random 32+ character secret
3. **HTTPS**: Always use HTTPS in production
4. **Regular Updates**: Change credentials periodically
5. **Backup**: Keep backups of your data files

## Troubleshooting

### Cannot Login
- Check your `.env` file has correct credentials
- Verify the server is running
- Clear browser cache and cookies
- Check browser console for errors

### Changes Not Saving
- Ensure JSON format is valid
- Check file permissions on `data/` directory
- Verify you're logged in (token hasn't expired)
- Check server logs for errors

### Docker Issues
- Ensure port 3000 is not in use
- Check Docker is running
- Verify `.env` file exists
- Check logs: `docker-compose logs -f`

## API Reference

### Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

### Data Endpoints

All GET endpoints are public. PUT endpoints require authentication.

```bash
# Get data (public)
curl http://localhost:3000/api/data/homescreen
curl http://localhost:3000/api/data/projects
curl http://localhost:3000/api/data/about
curl http://localhost:3000/api/data/site

# Update data (requires auth)
curl -X PUT http://localhost:3000/api/data/homescreen \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "New Name", ...}'
```

## Support

For issues or questions, please create an issue on GitHub.
