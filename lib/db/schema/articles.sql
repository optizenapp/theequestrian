-- Articles System Database Schema
-- For Neon PostgreSQL

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_html TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  featured_image_url TEXT,
  featured_image_alt TEXT,
  author_name TEXT DEFAULT 'The Equestrian Team',
  author_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  copiq_source_id TEXT,
  copiq_synced_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}'
);

-- Article categories table
CREATE TABLE IF NOT EXISTS article_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES article_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Article places table (for location-based content)
CREATE TABLE IF NOT EXISTS article_places (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Junction table: articles to categories
CREATE TABLE IF NOT EXISTS article_category_assignments (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES article_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (article_id, category_id)
);

-- Junction table: articles to places
CREATE TABLE IF NOT EXISTS article_place_assignments (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  place_id INTEGER NOT NULL REFERENCES article_places(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (article_id, place_id)
);

-- Article images table (for gallery images)
CREATE TABLE IF NOT EXISTS article_images (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_alt TEXT,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Copiq webhook log (for debugging ingestion)
CREATE TABLE IF NOT EXISTS copiq_webhook_logs (
  id SERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_name);
CREATE INDEX IF NOT EXISTS idx_articles_copiq_source ON articles(copiq_source_id);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_article_categories_parent ON article_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_article_places_location ON article_places(city, state, country);

CREATE INDEX IF NOT EXISTS idx_article_category_assignments_category ON article_category_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_article_place_assignments_place ON article_place_assignments(place_id);
CREATE INDEX IF NOT EXISTS idx_article_images_article ON article_images(article_id);

CREATE INDEX IF NOT EXISTS idx_copiq_webhook_logs_status ON copiq_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_copiq_webhook_logs_created ON copiq_webhook_logs(created_at DESC);

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_article_categories_updated_at ON article_categories;
CREATE TRIGGER update_article_categories_updated_at
  BEFORE UPDATE ON article_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_article_places_updated_at ON article_places;
CREATE TRIGGER update_article_places_updated_at
  BEFORE UPDATE ON article_places
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE articles IS 'Blog articles managed via admin and Copiq API';
COMMENT ON TABLE article_categories IS 'Categories for organizing articles';
COMMENT ON TABLE article_places IS 'Locations mentioned in articles';
COMMENT ON TABLE copiq_webhook_logs IS 'Audit log for Copiq API webhook calls';
