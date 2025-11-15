# Testing Guide for PocketBase Migration

This guide outlines how to test the PocketBase migration to ensure everything works correctly.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed
- npm or yarn package manager

## Test Scenarios

### Scenario 1: Fresh Installation with Docker

**Purpose**: Verify complete Docker setup works from scratch

**Steps**:
1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Update credentials in `.env.local`
4. Run `./run.sh` or `docker-compose up -d`
5. Create admin account at http://localhost:8090/_/
6. Run `npm install && npm run migrate`
7. Access portfolio at http://localhost:3000

**Expected Results**:
- ✅ Docker containers start successfully
- ✅ PocketBase accessible at port 8090
- ✅ Portfolio accessible at port 3000
- ✅ Admin panel allows login
- ✅ Migration script completes without errors
- ✅ Portfolio displays all data correctly

**Verification Commands**:
```bash
# Check containers are running
docker-compose ps

# Check PocketBase health
curl http://localhost:8090/api/health

# Check portfolio is accessible
curl http://localhost:3000

# View logs
docker-compose logs -f
```

### Scenario 2: Local Development Without PocketBase

**Purpose**: Verify backward compatibility with local data

**Steps**:
1. Clone the repository
2. Run `npm install`
3. Run `npm run dev` (without starting PocketBase)
4. Access http://localhost:3000

**Expected Results**:
- ✅ Application starts without errors
- ✅ Portfolio displays using local data files
- ✅ All pages load correctly
- ✅ Console shows warnings about PocketBase (acceptable)
- ✅ No broken functionality

### Scenario 3: Data Migration

**Purpose**: Verify data is correctly migrated to PocketBase

**Steps**:
1. Start PocketBase (via Docker or standalone)
2. Create admin account
3. Run `npm run migrate`
4. Check PocketBase admin panel at http://localhost:8090/_/

**Expected Results**:
- ✅ `portfolio_settings` collection created
- ✅ `projects` collection created
- ✅ All settings records present (about, header, homeScreen, projectsRoles, site)
- ✅ All project records migrated
- ✅ Data matches original data files

**PocketBase Records to Verify**:

**portfolio_settings:**
- Record with key='about' containing personal info, skills, experiences, education, certifications
- Record with key='header' containing navLinks and contactLink
- Record with key='homeScreen' containing name, homeRoles, githubLink, codeSnippets
- Record with key='projectsRoles' containing roles array
- Record with key='site' containing socials array

**projects:**
- 10 project records (Neon Cyberpunk, BetweenUs-Server, Azure-Function-Start, etc.)
- Each with required fields: name, techStack, year, status, projectType, description, codeLink

### Scenario 4: Dynamic Content Updates

**Purpose**: Verify PocketBase data changes reflect in portfolio

**Steps**:
1. Ensure PocketBase and portfolio are running
2. Access PocketBase admin at http://localhost:8090/_/
3. Edit a project record (change description)
4. Reload portfolio page
5. Edit portfolio_settings (change professional summary)
6. Reload portfolio page

**Expected Results**:
- ✅ Changes in PocketBase immediately visible in portfolio
- ✅ No need to restart application
- ✅ All data updates reflect correctly

### Scenario 5: Error Handling

**Purpose**: Verify graceful degradation when PocketBase is unavailable

**Steps**:
1. Start portfolio with PocketBase running
2. Stop PocketBase: `docker-compose stop pocketbase`
3. Reload portfolio pages
4. Start PocketBase again: `docker-compose start pocketbase`
5. Reload portfolio pages

**Expected Results**:
- ✅ Portfolio continues working with local data when PocketBase down
- ✅ Console warnings logged but no errors
- ✅ Portfolio reconnects when PocketBase available again
- ✅ No manual intervention needed

### Scenario 6: Production Build

**Purpose**: Verify production build works correctly

**Steps**:
1. Ensure PocketBase is running
2. Run migration: `npm run migrate`
3. Build application: `npm run build`
4. Start production server: `npm start`
5. Access http://localhost:3000

**Expected Results**:
- ✅ Build completes without errors
- ✅ Production server starts successfully
- ✅ All pages load correctly
- ✅ Data fetched from PocketBase
- ✅ Performance is acceptable

### Scenario 7: Docker Rebuild

**Purpose**: Verify Docker setup can be rebuilt cleanly

**Steps**:
1. Stop all services: `docker-compose down -v`
2. Rebuild: `docker-compose up -d --build`
3. Create admin account
4. Run migration
5. Test portfolio

**Expected Results**:
- ✅ Clean rebuild works
- ✅ No orphaned volumes or data
- ✅ Fresh setup identical to initial setup

## Component Testing

### Test Each Page

1. **Home Page** (`http://localhost:3000/`)
   - ✅ Name and roles display correctly
   - ✅ Code snippets show
   - ✅ Snake game works
   - ✅ TicTacToe game works
   - ✅ Professional summary displays
   - ✅ Latest 2 projects show

2. **About Page** (`http://localhost:3000/about-me`)
   - ✅ Name and roles display
   - ✅ Professional summary shows
   - ✅ Skills with progress bars
   - ✅ Experience timeline
   - ✅ Education timeline
   - ✅ Certifications with links

3. **Projects Page** (`http://localhost:3000/projects`)
   - ✅ All projects display
   - ✅ Tech stack filter works
   - ✅ Project type filter works
   - ✅ Project cards clickable
   - ✅ Project dialog opens with details
   - ✅ Timeline view works

4. **Header**
   - ✅ Navigation links work
   - ✅ Active page highlighted
   - ✅ Contact button works
   - ✅ Mobile menu works

5. **Footer**
   - ✅ Social links display
   - ✅ Icons render correctly
   - ✅ Links open in new tabs
   - ✅ Copyright notice shows

## Performance Testing

1. **Page Load Times**
   - Home page: < 2 seconds
   - About page: < 2 seconds
   - Projects page: < 2 seconds

2. **PocketBase Response Times**
   - Settings queries: < 100ms
   - Projects list: < 200ms

3. **Docker Resources**
   - PocketBase memory: < 100MB
   - Next.js memory: < 500MB
   - Total disk usage: < 1GB

## Known Issues & Workarounds

### Issue: Font Loading Fails in Build

**Symptom**: Build fails with "Failed to fetch Geist from Google Fonts"

**Workaround**: This is a network issue in restricted environments. The application works fine in normal environments with internet access.

### Issue: PocketBase Health Check Fails

**Symptom**: PocketBase container restarts repeatedly

**Workaround**: 
1. Check if port 8090 is available
2. Verify Docker has network access
3. Check PocketBase logs: `docker-compose logs pocketbase`

### Issue: Migration Script Authentication Fails

**Symptom**: "Admin authentication failed" error

**Workaround**:
1. Ensure admin account created in PocketBase
2. Verify credentials in `.env.local` match PocketBase admin
3. Check PocketBase is accessible at configured URL

## Troubleshooting Commands

```bash
# Check all containers
docker-compose ps

# View all logs
docker-compose logs

# View specific service logs
docker-compose logs pocketbase
docker-compose logs portfolio

# Restart specific service
docker-compose restart pocketbase

# Clean slate (removes all data!)
docker-compose down -v
rm -rf pb_data

# Check PocketBase API
curl -X GET http://localhost:8090/api/health

# List PocketBase collections
curl -X GET http://localhost:8090/api/collections

# Test Next.js API route (if you add one)
curl -X GET http://localhost:3000/api/test
```

## Success Criteria

The migration is successful if:

1. ✅ All 7 test scenarios pass
2. ✅ All pages render correctly
3. ✅ Data fetched from PocketBase when available
4. ✅ Fallback to local data works
5. ✅ Docker setup works end-to-end
6. ✅ Migration script completes without errors
7. ✅ No console errors in browser
8. ✅ Performance is acceptable
9. ✅ Documentation is clear and complete
10. ✅ Code is maintainable and follows best practices

## Reporting Issues

If you encounter issues:

1. Check this testing guide for known issues
2. Review SETUP.md for configuration help
3. Check Docker and PocketBase logs
4. Verify environment variables
5. Try with fresh Docker containers
6. Report with full error logs and steps to reproduce
