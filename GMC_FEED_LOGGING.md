# GMC Feed Upload Logging

## Overview

All GMC feed uploads (cron, manual, script) are now logged to the database for audit trail and monitoring.

## Database Table

**Table:** `gmc_feed_uploads`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `item_count` | INTEGER | Number of products in feed |
| `file_size_bytes` | BIGINT | Size of XML file in bytes |
| `s3_url` | TEXT | Full S3 URL of uploaded file |
| `s3_bucket` | TEXT | S3 bucket name |
| `s3_key` | TEXT | S3 object key |
| `source` | TEXT | Upload source: `cron`, `script`, or `manual` |
| `success` | BOOLEAN | Whether upload succeeded |
| `error_message` | TEXT | Error message if failed |
| `created_at` | TIMESTAMPTZ | Upload timestamp |

## Usage

### View Recent Logs

```bash
npm run feed:logs
```

This shows:
- Statistics (last 30 days): total uploads, success rate, avg items
- Recent uploads with timestamps, item counts, file sizes, and URLs

### API Endpoint

**GET** `/api/admin/gmc-feed-logs`

Returns:
```json
{
  "logs": [...],
  "stats": {
    "totalUploads": 10,
    "successfulUploads": 10,
    "failedUploads": 0,
    "lastSuccessfulUpload": "2026-02-09T01:36:06.000Z",
    "avgItemCount": 35826
  }
}
```

### Programmatic Access

```typescript
import { 
  getRecentGmcFeedUploads, 
  getGmcFeedUploadStats,
  logGmcFeedUpload,
  logGmcFeedUploadError
} from '@/lib/db/gmc-feed-log';

// Get recent logs
const logs = await getRecentGmcFeedUploads(20);

// Get statistics
const stats = await getGmcFeedUploadStats();

// Log successful upload
await logGmcFeedUpload({
  itemCount: 35826,
  fileSizeBytes: 58097652,
  s3Url: 'https://...',
  s3Bucket: 'theequestrian-gmc-feed',
  s3Key: 'gmc-feed.xml',
  source: 'cron', // or 'script' or 'manual'
});

// Log failed upload
await logGmcFeedUploadError({
  errorMessage: 'S3 upload failed',
  source: 'cron',
});
```

## Monitoring Cron Jobs

The cron job runs daily at **3:00 AM** (configured in `vercel.json`).

To verify it's working:

1. **Check logs after 3 AM:**
   ```bash
   npm run feed:logs
   ```
   Look for entries with `source: 'cron'`

2. **Check S3 file timestamp:**
   ```bash
   curl -I https://theequestrian-gmc-feed.s3.ap-southeast-2.amazonaws.com/gmc-feed.xml | grep Last-Modified
   ```

3. **Check API:**
   Visit `/api/admin/gmc-feed-logs` (requires admin auth)

## Migration

To create the table on a new database:

```bash
npx tsx scripts/add-gmc-feed-log-table.ts
```

Or use the main schema initialization:

```bash
npm run db:init
```

## Console Logs

The cron endpoint also logs to console:

- `[cron:gmc-feed] Start` - Job started
- `[cron:gmc-feed] Upload succeeded` - Job completed with details
- `Cron GMC feed upload error:` - Job failed

These appear in Vercel's function logs.
