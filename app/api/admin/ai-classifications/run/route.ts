import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === 'number' ? body.limit : 50;
    const start = typeof body.start === 'number' ? body.start : 0;
    const dryRun = Boolean(body.dryRun);

    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logPath = path.join(logsDir, 'ai-classify-products.log');
    const logStream = fs.openSync(logPath, 'a');

    const tsxPath = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
    const scriptPath = path.join(process.cwd(), 'scripts', 'ai-classify-products.ts');
    const args = [scriptPath];
    if (dryRun) args.push('--dry-run');
    if (Number.isFinite(start) && start > 0) args.push(`--start=${start}`);
    if (Number.isFinite(limit) && limit > 0) args.push(`--limit=${limit}`);

    const child = spawn(tsxPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', logStream, logStream],
      detached: true,
    });

    child.unref();

    return NextResponse.json({
      started: true,
      pid: child.pid,
      logPath,
      message: `Classification job started (start=${start}, limit=${limit}${dryRun ? ', dry-run' : ''}). Logs: ${logPath}`,
    });
  } catch (error) {
    console.error('Error starting classification job:', error);
    return NextResponse.json({ error: 'Failed to start classification job' }, { status: 500 });
  }
}
