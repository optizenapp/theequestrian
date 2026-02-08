-- ============================================================================
-- STATIC PAGES
-- ============================================================================
-- Stores editable content for static/informational pages
-- ============================================================================

CREATE TABLE IF NOT EXISTS static_pages (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  intro_html TEXT,
  body_html TEXT,
  bottom_html TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_static_pages_slug ON static_pages(slug);
CREATE INDEX IF NOT EXISTS idx_static_pages_status ON static_pages(status);
