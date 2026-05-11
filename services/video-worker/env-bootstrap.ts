import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  const envPath = resolve(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`[video-worker] loaded env from ${envPath}`);
  } else {
    console.warn(`[video-worker] no .env.local at ${envPath}`);
  }
}
