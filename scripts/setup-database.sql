-- Reviews Database Schema
-- Run this in Vercel Postgres dashboard or via migration tool

-- Main reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL,
  product_handle VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255),
  verified_purchase BOOLEAN DEFAULT false,
  helpful INTEGER DEFAULT 0,
  not_helpful INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  source VARCHAR(50) DEFAULT 'custom' CHECK (source IN ('custom', 'yotpo', 'imported')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Review images table
CREATE TABLE IF NOT EXISTS review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  alt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review email settings (singleton row, id = 1)
CREATE TABLE IF NOT EXISTS review_email_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  delay_days INTEGER DEFAULT 20,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  blocks JSONB DEFAULT '[]'::jsonb,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  brand_primary TEXT,
  brand_dark TEXT,
  logo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_email_settings_singleton
  ON review_email_settings (id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_handle ON reviews(product_handle);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);

-- Review email sends tracking
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_reviews_updated_at 
  BEFORE UPDATE ON reviews 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Sample data (optional - for testing)
-- INSERT INTO reviews (product_id, product_handle, rating, title, content, author_name, status)
-- VALUES 
--   ('123', 'leather-saddle-pad', 5, 'Amazing quality!', 'This saddle pad exceeded my expectations. The leather is top-notch.', 'Sarah Johnson', 'approved'),
--   ('123', 'leather-saddle-pad', 4, 'Good but pricey', 'Great product but a bit expensive for what it is.', 'Mike Smith', 'approved'),
--   ('456', 'jumping-boots', 5, 'Perfect fit', 'These boots fit my horse perfectly and look great!', 'Emma Wilson', 'approved');





