-- Migration 031: Article System
-- Description: Creates tables for the article system including taxonomies and relationships
-- Based on: ARTICLE_SYSTEM_DESIGN.md
-- Date: 2025-12-23

-- ============================================================================
-- PART 1: Main Article Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS article (
  article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  
  -- Article Type
  article_type VARCHAR(50) NOT NULL, -- 'blog-post', 'news', 'guide', 'review', etc.
  
  -- Publishing
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Authorship
  author_id UUID, -- References user table (to be created later or NULL for now)
  author_name VARCHAR(255), -- Byline override
  author_bio TEXT,
  author_image_url VARCHAR(500),
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  featured_image_url VARCHAR(500),
  featured_image_alt TEXT,
  
  -- Legacy WordPress
  legacy_wp_id INTEGER,
  legacy_post_type VARCHAR(50),
  
  -- Engagement Metrics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  -- Google Metrics
  ga_page_views INTEGER DEFAULT 0,
  ga_unique_visitors INTEGER DEFAULT 0,
  ga_avg_session_duration INTEGER DEFAULT 0,
  ga_bounce_rate NUMERIC(5,2),
  gsc_clicks INTEGER DEFAULT 0,
  gsc_impressions INTEGER DEFAULT 0,
  gsc_avg_position NUMERIC(5,2),
  gsc_ctr NUMERIC(5,2),
  gsc_last_synced_at TIMESTAMPTZ,
  
  -- Content Scoring
  content_score NUMERIC(5,2),
  needs_improvement BOOLEAN DEFAULT FALSE,
  improvement_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_slug ON article(slug);
CREATE INDEX IF NOT EXISTS idx_article_type ON article(article_type);
CREATE INDEX IF NOT EXISTS idx_article_status ON article(status);
CREATE INDEX IF NOT EXISTS idx_article_published_at ON article(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_content_score ON article(content_score DESC);
CREATE INDEX IF NOT EXISTS idx_article_legacy_wp_id ON article(legacy_wp_id);

COMMENT ON TABLE article IS 'Blog posts, news articles, guides, and editorial content';

-- ============================================================================
-- PART 2: Taxonomies (Categories, Tags, People)
-- ============================================================================

-- Categories (Hierarchical)
CREATE TABLE IF NOT EXISTS article_category (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES article_category(category_id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  legacy_wp_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_category_slug ON article_category(slug);
CREATE INDEX IF NOT EXISTS idx_article_category_parent ON article_category(parent_category_id);

-- Tags (Flat)
CREATE TABLE IF NOT EXISTS article_tag (
  tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  use_count INTEGER DEFAULT 0,
  legacy_wp_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_tag_slug ON article_tag(slug);

-- People (Custom Taxonomy)
CREATE TABLE IF NOT EXISTS person (
  person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  person_type VARCHAR(50), -- 'sponsored-athlete', 'celebrity', 'author', etc.
  profile_image_url VARCHAR(500),
  website_url VARCHAR(500),
  is_sponsored BOOLEAN DEFAULT FALSE,
  sponsorship_start_date DATE,
  sponsorship_end_date DATE,
  twitter_handle VARCHAR(100),
  instagram_handle VARCHAR(100),
  legacy_wp_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_slug ON person(slug);
CREATE INDEX IF NOT EXISTS idx_person_type ON person(person_type);

-- ============================================================================
-- PART 3: Junction Tables (Relationships)
-- ============================================================================

-- Article <-> Entity
CREATE TABLE IF NOT EXISTS article_entity (
  article_entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES article(article_id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entity(entity_id) ON DELETE CASCADE,
  featured BOOLEAN DEFAULT FALSE,
  order_position INTEGER,
  mention_type VARCHAR(50), -- 'featured', 'mentioned', 'related'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_article_entity_article ON article_entity(article_id);
CREATE INDEX IF NOT EXISTS idx_article_entity_entity ON article_entity(entity_id);

-- Article <-> Place
CREATE TABLE IF NOT EXISTS article_place (
  article_place_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES article(article_id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES place(place_id) ON DELETE CASCADE,
  primary_place BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_article_place_article ON article_place(article_id);
CREATE INDEX IF NOT EXISTS idx_article_place_place ON article_place(place_id);

-- Article <-> Category
CREATE TABLE IF NOT EXISTS article_category_link (
  article_id UUID NOT NULL REFERENCES article(article_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES article_category(category_id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (article_id, category_id)
);

-- Article <-> Tag
CREATE TABLE IF NOT EXISTS article_tag_link (
  article_id UUID NOT NULL REFERENCES article(article_id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES article_tag(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Article <-> Person
CREATE TABLE IF NOT EXISTS article_person (
  article_id UUID NOT NULL REFERENCES article(article_id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  role VARCHAR(100), -- 'subject', 'author', 'mentioned'
  PRIMARY KEY (article_id, person_id)
);

-- ============================================================================
-- PART 4: Log Completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 031 complete: Article system tables and taxonomies created';
END $$;

