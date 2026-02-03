/**
 * GA4 Purchase Events Table
 * 
 * Stores purchase events from Shopify order webhooks for GA4 tracking.
 * These events are queued here and can be sent to GA4 via:
 * 1. Client-side on thank-you page (if we build one)
 * 2. Server-side via GA4 Measurement Protocol API
 * 3. Batch export to GA4
 */

CREATE TABLE IF NOT EXISTS ga4_purchase_events (
  id SERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  order_number TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  items JSONB NOT NULL,
  sent_to_ga4 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ga4_order_id ON ga4_purchase_events(order_id);
CREATE INDEX IF NOT EXISTS idx_ga4_sent ON ga4_purchase_events(sent_to_ga4);
CREATE INDEX IF NOT EXISTS idx_ga4_created ON ga4_purchase_events(created_at DESC);

COMMENT ON TABLE ga4_purchase_events IS 'Queue for GA4 purchase events from Shopify order fulfillments';
