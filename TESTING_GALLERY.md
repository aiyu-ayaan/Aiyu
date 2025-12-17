# Gallery Optimization Testing Guide

## Quick Start Testing

### 1. Test New Image Upload
```bash
# Start the development server
npm run dev

# Or with Docker
docker-compose up
```

**Steps:**
1. Navigate to `/admin` (login if required)
2. Go to Gallery Manager section
3. Upload a new image with description
4. Verify two files are created:
   - Original: `/public/uploads/image-{hash}.{ext}`
   - Thumbnail: `/public/uploads/image-{hash}-thumb.webp`
5. Check database entry has both `src` and `thumbnail` fields
6. Visit `/gallery` to see the new image displayed

**Expected Result:**
- Upload completes successfully
- Thumbnail badge NOT shown on the new image in admin
- Gallery grid loads quickly using thumbnail
- Clicking image shows full resolution in lightbox

### 2. Test Migration for Existing Images

**Prerequisites:** Have some images in the gallery without thumbnails

**Steps:**
1. Go to Admin → Gallery Manager
2. Look for images with yellow "No thumbnail" badge
3. Click "Generate Thumbnails" button
4. Observe progress bar showing percentage
5. Wait for completion message
6. Refresh the admin page
7. Verify "No thumbnail" badges are gone

**Expected Result:**
- Migration processes images in batches
- Progress bar updates smoothly
- All images get thumbnails
- No server crashes or timeouts

**API Test:**
```bash
# Test single batch
curl -X POST http://localhost:3000/api/admin/migrate-gallery?batch=5 \
  -H "Cookie: your-auth-cookie"

# Expected response:
# {
#   "success": true,
#   "message": "Processed X of Y images successfully.",
#   "hasMore": true/false,
#   "progress": { "percentage": 50, "processed": 5, "total": 10 }
# }
```

### 3. Test Gallery Performance

**Before Migration:**
1. Open browser DevTools → Network tab
2. Navigate to `/gallery`
3. Note:
   - Total data transferred
   - Number of requests
   - Load time
   - Memory usage (Performance Monitor)

**After Migration:**
1. Clear browser cache
2. Repeat the same steps
3. Compare metrics

**Expected Improvements:**
- 80-90% reduction in data transferred
- Faster load times
- Lower memory usage
- Smoother scrolling

### 4. Test Lightbox Full-Resolution

**Steps:**
1. Go to `/gallery`
2. Click any image to open lightbox
3. Verify image is sharp and high quality
4. Click "Download Full Size" button
5. Check downloaded file is full resolution

**Expected Result:**
- Lightbox shows full-quality image (not thumbnail)
- Download provides original file
- No quality loss visible

### 5. Test Image Deletion

**Steps:**
1. Go to Admin → Gallery Manager
2. Delete an image that has a thumbnail
3. Check filesystem:
   ```bash
   ls -la public/uploads/
   ```
4. Verify both files are removed (or at least original is gone)

**Expected Result:**
- Image removed from database
- Original file removed
- Thumbnail cleanup attempted (non-blocking)

### 6. Memory Testing on Low-RAM Server

**Simulate Low Memory (Docker):**
```yaml
# docker-compose.yml
services:
  app:
    mem_limit: 2g
    memswap_limit: 2g
```

**Test:**
1. Restart with memory limit
2. Upload 5-10 large images
3. Run migration with batch size 5
4. Monitor memory usage:
   ```bash
   docker stats
   ```

**Expected Result:**
- Memory stays under 2GB
- No OOM errors
- Migration completes successfully
- Server remains responsive

### 7. Edge Cases

#### Large Image Upload
```bash
# Test with 8000x6000px image (within limits)
# Expected: Thumbnail generated, scaled to 800px width
```

#### Very Small Image
```bash
# Test with 400x300px image
# Expected: Thumbnail same size as original (no upscaling)
```

#### Non-Image File
```bash
# Try uploading PDF or text file
# Expected: Rejected by upload validation
```

#### Concurrent Uploads
```bash
# Upload 3 images simultaneously
# Expected: All process correctly, rate limiting applies if needed
```

## Performance Benchmarks

### Target Metrics
- Gallery load time: < 3 seconds (100 images, slow 3G)
- Thumbnail size: 50-150KB each (vs 2-5MB originals)
- Memory usage: < 1.5GB during migration
- Migration speed: 5-10 images per second

### Measurement Commands

**Check image sizes:**
```bash
cd public/uploads
ls -lh *-thumb.webp | awk '{print $5}' | head -10
```

**Check total storage:**
```bash
du -sh public/uploads
```

**Monitor server resources:**
```bash
# Linux
top -p $(pgrep node)

# Docker
docker stats
```

## Troubleshooting Tests

### Test 1: Migration Fails
**Simulate:** Remove write permissions
```bash
chmod 555 public/uploads
```
**Expected:** Error message, graceful handling

### Test 2: Missing Original File
**Simulate:** Delete original file manually
**Expected:** Migration skips it with warning

### Test 3: Corrupted Image
**Simulate:** Upload broken image file
**Expected:** Upload validation catches it

## Automated Testing Checklist

- [ ] All new images get thumbnails
- [ ] Migration processes existing images
- [ ] Gallery loads with thumbnails
- [ ] Lightbox shows full resolution
- [ ] Download provides full resolution
- [ ] Deletion removes both files
- [ ] Memory stays under 2GB during migration
- [ ] No security vulnerabilities
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Works in Docker

## Manual Testing Notes

**Browser Testing:**
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Chrome
- [ ] Mobile Safari

**Network Conditions:**
- [ ] Fast 3G
- [ ] Slow 3G
- [ ] Offline (cached images)

**Device Testing:**
- [ ] Desktop
- [ ] Tablet
- [ ] Mobile
- [ ] Low-end device

## Success Criteria

✅ All tests pass
✅ No memory issues on 2GB server
✅ Gallery loads 5-10x faster
✅ No quality loss in lightbox
✅ Migration completes without errors
✅ No security vulnerabilities
✅ Good user experience on mobile

## Rollback Plan

If issues found:
1. Revert changes: `git revert HEAD~3`
2. Gallery falls back to original images (backward compatible)
3. Schema change is additive (optional field)
4. No data loss

---

**Note:** This is a non-breaking change. Old images without thumbnails will still display (falling back to `src`).
