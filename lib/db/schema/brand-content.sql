-- ============================================================================
-- BRAND CONTENT
-- ============================================================================
-- Stores editable content for brand landing pages
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_content (
  id SERIAL PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  h1_title TEXT,
  meta_title TEXT,
  meta_description TEXT,
  short_description TEXT,
  long_description TEXT,
  breadcrumb_label TEXT,
  faq_json TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_content_handle ON brand_content(handle);
CREATE INDEX IF NOT EXISTS idx_brand_content_status ON brand_content(status);
