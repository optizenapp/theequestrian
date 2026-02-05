-- Add review_email_sends table for tracking email statistics
-- Run this in Vercel Postgres dashboard or via migration tool

CREATE TABLE IF NOT EXISTS review_email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(255) NOT NULL,
  order_number VARCHAR(255),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  product_title VARCHAR(500),
  product_handle VARCHAR(255),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_email_sends_order_id ON review_email_sends(order_id);
CREATE INDEX IF NOT EXISTS idx_review_email_sends_customer_email ON review_email_sends(customer_email);
CREATE INDEX IF NOT EXISTS idx_review_email_sends_sent_at ON review_email_sends(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_email_sends_status ON review_email_sends(status);
CREATE INDEX IF NOT EXISTS idx_review_email_sends_created_at ON review_email_sends(created_at DESC);
