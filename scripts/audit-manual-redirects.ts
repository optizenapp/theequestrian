import 'dotenv/config';
import { auditManualRedirects } from '@/lib/redirects/audit';

async function run() {
  const conflicts = await auditManualRedirects();
  console.log(`Audited redirects. Conflicts found: ${conflicts.length}`);
  if (conflicts.length > 0) {
    console.table(
      conflicts.map((item) => ({
        id: item.id,
        from: item.from_path,
        to: item.to_path,
        conflict: item.conflict_target,
      }))
    );
  }
}

run().catch((error) => {
  console.error('Redirect audit failed:', error);
  process.exit(1);
});
