import { initDb } from '../db';

initDb()
  .then(() => {
    console.log('[DB] Schema applied.');
  })
  .catch((error) => {
    console.error('[DB] Failed:', error);
    process.exit(1);
  });
