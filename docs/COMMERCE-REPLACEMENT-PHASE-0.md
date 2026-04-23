# Commerce Replacement Phase 0 (jono-dev lane)

This runbook locks all commerce-replacement delivery to `jono-dev` until explicit cutover.

## Mandatory branch gate

Run before any implementation task:

```bash
git branch --show-current
```

Expected value:

```text
jono-dev
```

If the branch is not `jono-dev`, stop and switch to the jono-dev worktree:

```bash
cd /Users/jonosmmachine/Documents/Cursor/theequestrian-jono-dev
git branch --show-current
```

## Environment lane gate

- Use jono-dev Neon only (`CUSTOM_DATABASE_URL` or `DATABASE_URL` pointing to jono-dev DB).
- Use preview deployment only for this stream.
- Do not run commerce migrations against production DB.

## Phase 1 schema apply order

Apply these files in order:

1. `lib/db/schema/commerce-core-00-integrations.sql`
2. `lib/db/schema/commerce-core-01-catalog.sql`
3. `lib/db/schema/commerce-core-02-orders.sql`
4. `lib/db/schema/commerce-core-03-finance-events.sql`

## Rollback (schema-only)

If rollout must be reversed in jono-dev, drop phase tables in reverse dependency order:

1. `sync_jobs`
2. `event_receipts`
3. `payout_batch_lines`
4. `payout_batches`
5. `commission_ledger`
6. `commission_rules_category`
7. `vendor_child_orders`
8. `commerce_order_lines`
9. `commerce_orders`
10. `source_variant_map`
11. `canonical_variants`
12. `canonical_products`
13. `vendor_integration_registry`

Use `DROP TABLE ...` only in jono-dev unless a formal production rollback is approved.

## Verification checklist

- Branch confirmed as `jono-dev`
- DB URL confirmed as jono-dev
- Schema files applied without error
- App build passes
- Type check passes
