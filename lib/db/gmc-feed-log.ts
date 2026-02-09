/**
 * GMC Feed Upload Logging
 * Tracks all feed uploads to S3 for audit trail
 */

import { sql } from './client';

export interface GmcFeedUploadLog {
  id: number;
  item_count: number;
  file_size_bytes: bigint | null;
  s3_url: string;
  s3_bucket: string;
  s3_key: string;
  source: string;
  success: boolean;
  error_message: string | null;
  created_at: Date;
}

/**
 * Log a successful GMC feed upload
 */
export async function logGmcFeedUpload(params: {
  itemCount: number;
  fileSizeBytes?: number;
  s3Url: string;
  s3Bucket: string;
  s3Key: string;
  source?: 'cron' | 'manual' | 'script';
}): Promise<void> {
  try {
    await sql`
      INSERT INTO gmc_feed_uploads (
        item_count,
        file_size_bytes,
        s3_url,
        s3_bucket,
        s3_key,
        source,
        success
      ) VALUES (
        ${params.itemCount},
        ${params.fileSizeBytes ?? null},
        ${params.s3Url},
        ${params.s3Bucket},
        ${params.s3Key},
        ${params.source ?? 'cron'},
        true
      )
    `;
  } catch (error) {
    console.error('[logGmcFeedUpload] Failed to log upload:', error);
  }
}

/**
 * Log a failed GMC feed upload attempt
 */
export async function logGmcFeedUploadError(params: {
  errorMessage: string;
  source?: 'cron' | 'manual' | 'script';
}): Promise<void> {
  try {
    await sql`
      INSERT INTO gmc_feed_uploads (
        item_count,
        s3_url,
        s3_bucket,
        s3_key,
        source,
        success,
        error_message
      ) VALUES (
        0,
        '',
        '',
        '',
        ${params.source ?? 'cron'},
        false,
        ${params.errorMessage}
      )
    `;
  } catch (error) {
    console.error('[logGmcFeedUploadError] Failed to log error:', error);
  }
}

/**
 * Get recent upload logs
 */
export async function getRecentGmcFeedUploads(limit = 20): Promise<GmcFeedUploadLog[]> {
  try {
    const result = await sql`
      SELECT 
        id,
        item_count,
        file_size_bytes,
        s3_url,
        s3_bucket,
        s3_key,
        source,
        success,
        error_message,
        created_at
      FROM gmc_feed_uploads
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    
    const rows = Array.isArray(result) ? result : [];
    return rows.map(row => row as GmcFeedUploadLog);
  } catch (error) {
    console.error('[getRecentGmcFeedUploads] Error:', error);
    return [];
  }
}

/**
 * Get upload statistics
 */
export async function getGmcFeedUploadStats() {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_uploads,
        COUNT(*) FILTER (WHERE success = true) as successful_uploads,
        COUNT(*) FILTER (WHERE success = false) as failed_uploads,
        MAX(created_at) FILTER (WHERE success = true) as last_successful_upload,
        AVG(item_count) FILTER (WHERE success = true) as avg_item_count
      FROM gmc_feed_uploads
      WHERE created_at > NOW() - INTERVAL '30 days'
    `;
    
    const row = Array.isArray(result) ? (result[0] as Record<string, unknown>) : null;
    
    if (!row) return null;
    
    return {
      totalUploads: parseInt(row.total_uploads as string),
      successfulUploads: parseInt(row.successful_uploads as string),
      failedUploads: parseInt(row.failed_uploads as string),
      lastSuccessfulUpload: row.last_successful_upload as Date | null,
      avgItemCount: row.avg_item_count ? parseFloat(row.avg_item_count as string) : 0,
    };
  } catch (error) {
    console.error('[getGmcFeedUploadStats] Error:', error);
    return null;
  }
}
