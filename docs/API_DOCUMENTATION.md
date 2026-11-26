# API Documentation

> **📚 This documentation has moved to the GitHub Wiki**
>
> **Please visit**: **[API Documentation Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki/API-Documentation)**
>
> The wiki version includes complete REST API reference with examples, authentication methods, and integration tutorials.

---

## Sign-in requirements changed

Since the fix on `migrate/rust-vite` (not yet in a release), these routes need an admin session and answer `401`
without one. Before, anyone could call them.

| Route | Access |
|---|---|
| `PUT /api/blogs/{id}`, `DELETE /api/blogs/{id}` | admin session (a bearer token is not accepted) |
| `GET /api/contact/message`, `DELETE /api/contact/message` | admin session |

`POST /api/blogs` still accepts an admin session or a bearer token, and `POST /api/contact/message` (the contact form)
stays public.

---

## Quick Links

- **[Complete API Documentation](https://github.com/aiyu-ayaan/Aiyu/wiki/API-Documentation)** - Full API reference
- **[Database Seeding](https://github.com/aiyu-ayaan/Aiyu/wiki/Database-Seeding)** - Initial data population  
- **[Security Guide](https://github.com/aiyu-ayaan/Aiyu/wiki/Security-Guide)** - API security best practices
- **[Admin Panel Manual](https://github.com/aiyu-ayaan/Aiyu/wiki/Admin-Panel-Manual)** - UI alternative to API

---

**For complete and up-to-date documentation, visit the [GitHub Wiki](https://github.com/aiyu-ayaan/Aiyu/wiki)**

