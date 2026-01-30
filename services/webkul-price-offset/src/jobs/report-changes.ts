import { initDb, pool } from '../db';

async function run() {
  await initDb();

  const totals = await pool.query(
    `
      SELECT
        COUNT(*) AS total_rows,
        COUNT(adjusted_price) AS adjusted_count
      FROM price_offset_audit
    `
  );

  const recent = await pool.query(
    `
      SELECT variant_id, product_id, vendor_name, adjusted_price, updated_at
      FROM price_offset_audit
      WHERE adjusted_price IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 25
    `
  );

  console.log('[Report] Total audit rows:', totals.rows[0].total_rows);
  console.log('[Report] Adjusted rows:', totals.rows[0].adjusted_count);

  if (recent.rowCount === 0) {
    console.log('[Report] No adjusted prices recorded.');
    return;
  }

  console.log('[Report] Latest adjusted variants (up to 25):');
  for (const row of recent.rows) {
    console.log(
      `- variant ${row.variant_id} product ${row.product_id} vendor ${row.vendor_name} adjusted ${row.adjusted_price} at ${row.updated_at}`
    );
  }
}

run().catch((error) => {
  console.error('[Report] Failed:', error);
  process.exit(1);
});
