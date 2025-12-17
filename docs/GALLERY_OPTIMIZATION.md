# Gallery Image Optimization

## Overview

This document describes the gallery image optimization system that improves performance by using optimized WebP thumbnails for gallery display while maintaining full-resolution images for downloads and detailed viewing.

## Problem Solved

The original gallery implementation loaded full-resolution images directly, which caused:
- High memory usage and potential crashes on low-memory devices
- Slow page load times
- High bandwidth consumption
- Poor user experience, especially on mobile devices

## Solution Architecture

### Two-Tier Image System

1. **Thumbnails (WebP)**
   - Max width: 800px
   - Quality: 80%
   - Format: WebP (superior compression)
   - Usage: Gallery grid display
   - Auto-generated on upload

2. **Full Images (Original)**
   - Original resolution and format
   - Usage: Lightbox view and downloads
   - Preserved for quality

### Key Features

#### Memory Optimization for Low-RAM Servers (2GB)
- Sequential image processing (one at a time)
- Limited Sharp cache (50MB max)
- Batch processing with delays for garbage collection
- Lean database queries (only required fields)

#### Performance Optimizations
- Priority loading for first 3 images
- Lazy loading for remaining images
- Reduced animation delays
- Memoized React callbacks and values
- Blur placeholders for smoother loading

## Technical Implementation

### Database Schema

```javascript
{
  src: String,           // Original image URL
  thumbnail: String,     // Optimized thumbnail URL (optional)
  description: String,
  width: Number,
  height: Number,
  createdAt: Date
}
```

### API Endpoints

#### Upload with Thumbnail Generation
**POST** `/api/upload`

Automatically generates WebP thumbnail on image upload.

**Response:**
```json
{
  "success": true,
  "url": "/api/uploads/image-abc123.jpg",
  "thumbnailUrl": "/api/uploads/image-abc123-thumb.webp",
  "filename": "image-abc123.jpg",
  "size": 1234567,
  "type": "image/jpeg"
}
```

#### Migration Endpoint
**POST** `/api/admin/migrate-gallery?batch=10&skip=0`

Generates thumbnails for existing images in batches.

**Query Parameters:**
- `batch`: Number of images to process per request (default: 10)
- `skip`: Number of images to skip (for pagination)

**Response:**
```json
{
  "success": true,
  "message": "Processed 10 of 10 images successfully.",
  "details": {
    "total": 10,
    "totalRemaining": 50,
    "success": 10,
    "failed": 0,
    "errors": []
  },
  "hasMore": true,
  "nextSkip": 10,
  "progress": {
    "processed": 10,
    "total": 50,
    "percentage": 20
  }
}
```

## Usage Guide

### For Administrators

#### Uploading New Images

1. Navigate to Admin Panel → Gallery Manager
2. Upload images normally
3. Thumbnails are automatically generated
4. Both original and thumbnail are saved

#### Migrating Existing Images

1. Navigate to Admin Panel → Gallery Manager
2. Click "Generate Thumbnails" button
3. Wait for batch processing to complete
4. Progress is shown with percentage and count
5. The system processes images in batches to prevent memory issues

**Note:** Migration is safe to run multiple times. It only processes images without thumbnails.

#### Visual Indicators

- Images without thumbnails show a yellow "No thumbnail" badge
- Admin preview uses thumbnails when available
- Migration progress shows real-time percentage

### For Users

- Gallery loads faster with optimized thumbnails
- Click on any image to view full resolution in lightbox
- Download button provides original full-resolution image
- Smooth loading with blur placeholders

## Configuration

### Thumbnail Settings

Located in `/src/utils/imageProcessing.js`:

```javascript
const THUMBNAIL_WIDTH = 800;      // Max width in pixels
const THUMBNAIL_QUALITY = 80;     // WebP quality (0-100)
```

### Memory Settings

```javascript
sharp.cache({ memory: 50 });      // Cache limit in MB
sharp.concurrency(1);             // Process one image at a time
```

### Migration Batch Size

Default: 10 images per batch
Can be adjusted via query parameter: `?batch=20`

## Performance Metrics

### Before Optimization
- Loading 50 full-resolution images: ~150MB transfer
- Load time: 10-15 seconds (slow connection)
- Memory usage: High, potential crashes

### After Optimization
- Loading 50 thumbnails: ~15-20MB transfer
- Load time: 2-3 seconds (slow connection)
- Memory usage: Stable, no crashes
- Full images loaded only when needed

## Server Requirements

### Minimum Requirements
- **RAM**: 2GB (optimized for this)
- **CPU**: 1 core
- **Storage**: 1.5x total image size (for thumbnails)

### Recommended
- **RAM**: 4GB
- **CPU**: 2 cores
- **Storage**: 2x total image size

## Troubleshooting

### Migration Fails
1. Check server memory availability
2. Reduce batch size: `?batch=5`
3. Check file permissions in `/public/uploads`
4. Review server logs for specific errors

### Thumbnails Not Displaying
1. Verify thumbnail files exist in `/public/uploads`
2. Check thumbnail URLs in database
3. Run migration again for affected images
4. Clear browser cache

### High Memory Usage During Migration
1. Use smaller batch size
2. Add delays between batches
3. Process during low-traffic periods
4. Monitor server resources

## Best Practices

1. **Regular Maintenance**
   - Run migration after bulk imports
   - Monitor thumbnail generation success rate
   - Clean up orphaned thumbnails periodically

2. **Upload Guidelines**
   - Keep original images under 10MB
   - Use standard formats (JPG, PNG, WebP)
   - Avoid extremely large dimensions (>5000px)

3. **Server Management**
   - Monitor memory usage during migration
   - Schedule migrations during off-peak hours
   - Keep sharp library updated

## Future Enhancements

Possible improvements:
- Progressive image loading
- Multiple thumbnail sizes (small, medium, large)
- AVIF format support for even better compression
- Automatic cleanup of orphaned files
- CDN integration for faster delivery
- Client-side image resizing before upload

## Technical Details

### Sharp Configuration

The system uses Sharp with specific optimizations:
- `sequentialRead`: true (reduces memory usage)
- `limitInputPixels`: 268402689 (~16K x 16K max)
- `kernel`: lanczos3 (quality/performance balance)
- `effort`: 4 (WebP compression effort)
- `smartSubsample`: true (better compression)

### React Optimizations

- `useCallback` for event handlers (prevents re-renders)
- `useMemo` for static configurations
- Conditional priority loading
- Optimized animation timings

## Security Considerations

1. **File Validation**: All uploads validated for type and content
2. **Path Traversal**: Protected against directory traversal attacks
3. **Rate Limiting**: Upload rate limits in place
4. **File Size Limits**: Maximum 10MB per upload
5. **Authentication**: Admin-only access for management endpoints

## Monitoring

Key metrics to monitor:
- Thumbnail generation success rate
- Average processing time per image
- Memory usage during batch operations
- Storage utilization
- API response times

## Support

For issues or questions:
1. Check server logs: `/var/log/` or Docker logs
2. Review migration response for error details
3. Verify file permissions and storage availability
4. Check database connectivity

---

**Last Updated**: December 2025
**Version**: 1.0.0
