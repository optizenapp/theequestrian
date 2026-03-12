-- Migration 030: Place and Entity (dependencies for article system)
-- Creates minimal place and entity tables so migration 031 can create FKs

-- Place table (minimal for article_place junction)
CREATE TABLE IF NOT EXISTS place (
  place_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'city',
  description TEXT,
  image_url VARCHAR(500),
  parent_place_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_slug ON place(slug);
CREATE INDEX IF NOT EXISTS idx_place_type ON place(type);
CREATE INDEX IF NOT EXISTS idx_place_parent ON place(parent_place_id);

-- Place association for region hierarchy (optional, used by export edit page)
CREATE TABLE IF NOT EXISTS place_association (
  parent_id UUID NOT NULL REFERENCES place(place_id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES place(place_id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, child_id)
);

-- Entity table (minimal for article_entity junction)
CREATE TABLE IF NOT EXISTS entity (
  entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE place IS 'Locations for article place linking (article system)';
COMMENT ON TABLE entity IS 'Minimal entity table for article_entity FK';
