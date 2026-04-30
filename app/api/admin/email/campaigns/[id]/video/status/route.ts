import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const id = String((await params).id || '');
    if (!id) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    await ensureEmailPlatformSchema();
    const result = await sql`
      SELECT status, s3_video_url, s3_thumbnail_url, error_message, approved_at, prompt_json, render_config_json, updated_at
      FROM email_campaign_videos
      WHERE campaign_id = ${id}
      LIMIT 1
    `;
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ video: null }, { headers: NO_STORE_HEADERS });
    }
    return NextResponse.json(
      {
        video: {
          status: String(row.status),
          videoUrl: (row.s3_video_url as string | null) ?? null,
          thumbnailUrl: (row.s3_thumbnail_url as string | null) ?? null,
          errorMessage: (row.error_message as string | null) ?? null,
          prompt: (row.prompt_json as Record<string, unknown> | null) ?? null,
          renderConfig: (row.render_config_json as Record<string, unknown> | null) ?? null,
          approvedAt: row.approved_at ? new Date(row.approved_at as string).toISOString() : null,
          updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : null,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load video status' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
