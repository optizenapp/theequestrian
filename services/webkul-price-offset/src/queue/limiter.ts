import PQueue from 'p-queue';
import { config } from '../config';

export const webkulQueue = new PQueue({
  concurrency: 1,
  interval: 1000,
  intervalCap: config.rateLimitPerSec,
});
