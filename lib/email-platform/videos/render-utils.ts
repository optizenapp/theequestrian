import { spawn } from 'node:child_process';
import { uploadBufferToS3 } from '@/lib/s3/storage';

export const HYPERFRAMES_TIMEOUT_MS = 240000;
export const HYPERFRAMES_POSTCOMPLETE_GRACE_MS = 2500;
export const S3_UPLOAD_TIMEOUT_MS = 90000;
export const S3_UPLOAD_RETRIES = 1;
export const VARIANT_TIMEOUT_MS = 360000;

const COMPLETED_PATTERN = /·\s*completed\s*$/im;

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  stage: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'pipe' });
    let stderr = '';
    let resolved = false;
    let postCompleteTimer: ReturnType<typeof setTimeout> | null = null;
    const finalize = (action: () => void) => {
      if (resolved) return;
      resolved = true;
      if (postCompleteTimer) clearTimeout(postCompleteTimer);
      clearTimeout(timer);
      action();
    };
    const timer = setTimeout(() => {
      finalize(() => {
        try {
          child.kill('SIGKILL');
        } catch {}
        reject(new Error(`${stage} timed out after ${HYPERFRAMES_TIMEOUT_MS}ms`));
      });
    }, HYPERFRAMES_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text) console.log(`[video-render][${stage}] ${text}`);
      if (!postCompleteTimer && COMPLETED_PATTERN.test(text)) {
        console.log(
          `[video-render][${stage}] detected completion; killing child after ${HYPERFRAMES_POSTCOMPLETE_GRACE_MS}ms`
        );
        postCompleteTimer = setTimeout(() => {
          finalize(() => {
            try {
              child.kill('SIGKILL');
            } catch {}
            resolve();
          });
        }, HYPERFRAMES_POSTCOMPLETE_GRACE_MS);
      }
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      const trimmed = text.trim();
      if (trimmed) console.warn(`[video-render][${stage}][stderr] ${trimmed}`);
    });
    child.on('error', (error) => {
      finalize(() => reject(error));
    });
    child.on('close', (code) => {
      finalize(() => {
        if (code === 0 || code === null) resolve();
        else reject(new Error(stderr || `${command} exited with code ${code}`));
      });
    });
  });
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function uploadToS3WithRetry(
  buffer: Buffer,
  folder: string,
  contentType: string,
  stage: string,
  options: { slug?: string } = {}
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= S3_UPLOAD_RETRIES + 1; attempt++) {
    try {
      console.log(`[video-render] ${stage} upload attempt=${attempt} bytes=${buffer.length}`);
      return await withTimeout(
        uploadBufferToS3(buffer, folder, contentType, { forceUnique: true, slug: options.slug }),
        S3_UPLOAD_TIMEOUT_MS,
        `${stage} S3 upload`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown upload error';
      console.warn(`[video-render] ${stage} upload failed attempt=${attempt}: ${message}`);
      lastError = error instanceof Error ? error : new Error(message);
      if (attempt <= S3_UPLOAD_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError || new Error(`${stage} upload failed`);
}
