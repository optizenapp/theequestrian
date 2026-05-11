import './env-bootstrap';
import { hostname } from 'node:os';
import { processClaimedJob, claimNextJob } from './processor';

const POLL_INTERVAL_MS = Number(process.env.VIDEO_WORKER_POLL_MS || 5000);
const WORKER_ID = `${hostname()}-${process.pid}`;

let shuttingDown = false;

async function main(): Promise<void> {
  console.log(`[video-worker] starting workerId=${WORKER_ID} poll=${POLL_INTERVAL_MS}ms`);

  process.on('SIGTERM', () => {
    console.log('[video-worker] SIGTERM received — finishing current job then exiting');
    shuttingDown = true;
  });
  process.on('SIGINT', () => {
    console.log('[video-worker] SIGINT received — finishing current job then exiting');
    shuttingDown = true;
  });

  while (!shuttingDown) {
    try {
      const job = await claimNextJob(WORKER_ID);
      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      console.log(`[video-worker] claimed campaign=${job.campaignId} kind=${job.jobKind}`);
      await processClaimedJob(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      console.error(`[video-worker] poll error: ${message}`);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.log('[video-worker] shut down cleanly');
  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'fatal';
  console.error(`[video-worker] fatal: ${message}`);
  process.exit(1);
});
