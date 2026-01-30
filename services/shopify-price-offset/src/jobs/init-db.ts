import { initDb } from '../db/index.js';

async function run() {
  console.log('Initializing database...');
  await initDb();
  console.log('✅ Database initialized successfully');
  process.exit(0);
}

run().catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
