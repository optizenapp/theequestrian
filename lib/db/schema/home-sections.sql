-- ============================================================================
-- HOME SECTIONS
-- ============================================================================
-- Stores homepage section configuration (mirrors exports/home-sections.csv)
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_sections (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  eyebrow TEXT,
  title_html TEXT,
  subtitle_html TEXT,
  body_html TEXT,

  cta_text TEXT,
  cta_link TEXT,
  secondary_cta_text TEXT,
  secondary_cta_link TEXT,

  image_url TEXT,
  image_alt TEXT,
  image_link TEXT,

  most_wanted_items_json JSONB,
  product_handles TEXT,
  faqs_json JSONB,
  seen_in_json JSONB,
  items_json JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_sections_enabled ON home_sections(enabled);
CREATE INDEX IF NOT EXISTS idx_home_sections_sort_order ON home_sections(sort_order);
CREATE INDEX IF NOT EXISTS idx_home_sections_type ON home_sections(type);
