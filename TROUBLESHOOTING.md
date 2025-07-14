# Papermark Troubleshooting Guide

## Common Upload Issues

### 1. Document Upload Failures

**Symptoms:**
- Users unable to upload documents
- Server-side upload timeouts
- File upload errors in browser

**Solutions:**

1. **Check Environment Variables:**
   ```bash
   # Verify these are set in your .env file:
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
   POSTGRES_PRISMA_URL=xxxxx
   ```

2. **File Size Limits:**
   - Free plan: 30MB max
   - Business/Datarooms plan: 100MB max
   - Check team plan in database if uploads fail

3. **Supported File Types:**
   - PDF documents
   - Microsoft Office files (Word, Excel, PowerPoint)
   - Images (PNG, JPEG, GIF, WebP)
   - Plain text files

### 2. Tinybird Statistics Errors

**Symptoms:**
- Log errors: "Failed to get total document duration"
- Stats page showing incomplete data
- "Unauthorized" errors in logs

**Solutions:**

1. **Check Tinybird Token:**
   ```bash
   # Add to .env file:
   TINYBIRD_TOKEN=p.xxxxx
   ```

2. **Verify Token Permissions:**
   - Token must have read access to pipes:
     - `get_total_average_page_duration__v5`
     - `get_total_document_duration__v1`

3. **Token Format:**
   - Should start with `p.`
   - Get from Tinybird dashboard

### 3. Upload Transport Configuration

**Vercel Blob (Default):**
```env
NEXT_PUBLIC_UPLOAD_TRANSPORT="vercel"
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST="<BLOB_STORE_ID>.public.blob.vercel-storage.com"
```

**AWS S3:**
```env
NEXT_PUBLIC_UPLOAD_TRANSPORT="s3"
NEXT_PRIVATE_UPLOAD_BUCKET="your-bucket-name"
NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID="xxxxx"
NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY="xxxxx"
NEXT_PRIVATE_UPLOAD_REGION="us-east-1"
```

### 4. Database Issues

**Connection Problems:**
```bash
# Check Postgres connection
npx prisma db pull
npx prisma generate
```

**Migration Issues:**
```bash
npx prisma migrate deploy
```

## Monitoring and Debugging

### Enable Debug Logging

Add to your environment:
```env
DEBUG=papermark:*
LOG_LEVEL=debug
```

### Common Log Patterns

1. **Tinybird Errors:**
   - Look for: "Failed to get average page duration"
   - Solution: Check TINYBIRD_TOKEN

2. **Upload Errors:**
   - Look for: "BLOB_READ_WRITE_TOKEN prefix"
   - Solution: Verify Vercel Blob token

3. **Authentication Errors:**
   - Look for: "Unauthorized"
   - Solution: Check session or API token

### Performance Optimization

1. **Large File Uploads:**
   - Use TUS resumable upload for files > 50MB
   - Configure appropriate timeout values

2. **Database Performance:**
   - Enable connection pooling
   - Monitor query performance

3. **Storage Optimization:**
   - Use CloudFront for S3 distributions
   - Enable gzip compression

## Getting Help

If issues persist:
1. Check the GitHub issues: https://github.com/mfts/papermark/issues
2. Join Discord community
3. Review application logs carefully
4. Test with minimal configuration first

## Environment Variable Checklist

### Required:
- [ ] `NEXTAUTH_SECRET`
- [ ] `POSTGRES_PRISMA_URL`
- [ ] `BLOB_READ_WRITE_TOKEN`

### Optional but Recommended:
- [ ] `TINYBIRD_TOKEN`
- [ ] `RESEND_API_KEY`
- [ ] `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`

### Storage (if using S3):
- [ ] `NEXT_PRIVATE_UPLOAD_BUCKET`
- [ ] `NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID`
- [ ] `NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY`