import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const FFPROBE_BIN = process.env.FFPROBE_PATH || 'ffprobe';

function extFromContentType(contentType: string): string {
  const value = contentType.toLowerCase();
  if (value.includes('wav')) return 'wav';
  if (value.includes('ogg')) return 'ogg';
  if (value.includes('mp4') || value.includes('m4a') || value.includes('aac')) return 'm4a';
  return 'mp3';
}

function runProbe(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(FFPROBE_BIN, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => {
      out += c.toString();
    });
    child.stderr.on('data', (c) => {
      err += c.toString();
    });
    child.on('error', (e) => reject(e));
    child.on('close', (code) => {
      if (code === 0) {
        const n = Number.parseFloat(out.trim());
        if (Number.isFinite(n) && n > 0) {
          resolve(n);
        } else {
          reject(new Error(`ffprobe parsed invalid duration: "${out.trim()}"`));
        }
      } else {
        reject(new Error(`ffprobe failed (${code}): ${err.slice(-400)}`));
      }
    });
  });
}

export async function probeAudioDurationSeconds(
  buffer: Buffer,
  contentType: string
): Promise<number | null> {
  if (!buffer || buffer.length === 0) return null;
  const dir = await mkdtemp(path.join(tmpdir(), 'audio-probe-'));
  const filePath = path.join(dir, `audio.${extFromContentType(contentType)}`);
  try {
    await writeFile(filePath, buffer);
    return await runProbe(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown probe error';
    console.warn(`[audio-probe] ${message}`);
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
