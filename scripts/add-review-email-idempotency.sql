-- Enforce idempotency for review-email scheduling per order.
-- Safe to run multiple times.

-- Cancel duplicate scheduled rows, keeping the oldest schedule per order.
WITH ranked AS (
  SELECT
    id,
    order_id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM review_email_sends
  WHERE status = 'scheduled'
)
UPDATE review_email_sends AS res
SET
  status = 'cancelled',
  cancelled_at = NOW(),
  cancel_reason = 'Auto-cancelled duplicate scheduled review email during idempotency migration',
  error_message = COALESCE(
    res.error_message,
    'duplicate_scheduled_order_id'
  )
FROM ranked
WHERE res.id = ranked.id
  AND ranked.rn > 1
  AND res.status = 'scheduled';

-- Prevent multiple active schedules for the same order.
CREATE UNIQUE INDEX IF NOT EXISTS ux_review_email_sends_one_scheduled_per_order
  ON review_email_sends(order_id)
  WHERE status = 'scheduled';
