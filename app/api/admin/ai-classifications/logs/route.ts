import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const logPath = path.join(process.cwd(), 'logs', 'ai-classify-products.log');
    
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ logs: '', exists: false });
    }

    const stats = fs.statSync(logPath);
    const fileSize = stats.size;
    
    // Read last 50KB of logs (most recent)
    const maxBytes = 50 * 1024;
    const readSize = Math.min(fileSize, maxBytes);
    const buffer = Buffer.alloc(readSize);
    
    const fd = fs.openSync(logPath, 'r');
    const startPosition = Math.max(0, fileSize - readSize);
    fs.readSync(fd, buffer, 0, readSize, startPosition);
    fs.closeSync(fd);
    
    const logs = buffer.toString('utf-8');
    
    // Extract last run stats
    const lines = logs.split('\n');
    const lastStats = {
      total: 0,
      bothAgree: 0,
      needsReview: 0,
      avgConfidence: 0,
      dryRun: logs.includes('🧪 DRY RUN MODE'),
      running: !logs.includes('📋 NEXT STEPS:') || logs.lastIndexOf('📦 Fetching products') > logs.lastIndexOf('📋 NEXT STEPS:'),
    };
    
    // Parse stats from log
    const totalMatch = logs.match(/Total classified: (\d+)/);
    const agreeMatch = logs.match(/Both AIs agree: (\d+)/);
    const reviewMatch = logs.match(/Needs manual review: (\d+)/);
    const confMatch = logs.match(/Average confidence: ([\d.]+)%/);
    
    if (totalMatch) lastStats.total = parseInt(totalMatch[1]);
    if (agreeMatch) lastStats.bothAgree = parseInt(agreeMatch[1]);
    if (reviewMatch) lastStats.needsReview = parseInt(reviewMatch[1]);
    if (confMatch) lastStats.avgConfidence = parseFloat(confMatch[1]);
    
    return NextResponse.json({ 
      logs, 
      exists: true,
      lastStats,
    });
  } catch (error) {
    console.error('Error reading logs:', error);
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
  }
}
