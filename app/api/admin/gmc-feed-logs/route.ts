import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getRecentGmcFeedUploads, getGmcFeedUploadStats } from '@/lib/db/gmc-feed-log';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [logs, stats] = await Promise.all([
    getRecentGmcFeedUploads(50),
    getGmcFeedUploadStats(),
  ]);

  return NextResponse.json({
    logs,
    stats,
  });
}
