-- ============================================================================
-- COLLECTION CONTENT TABLE
-- ============================================================================
-- Stores all category and subcategory page content (H1, meta, descriptions, FAQs, etc.)
-- Replaces: exports/collection-content.csv
-- Performance: Indexed queries ~2-5ms, with in-memory caching for 0ms on cache hit
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_content (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- URL & Hierarchy
  url_path TEXT UNIQUE NOT NULL,                    -- e.g., "/horse/boots/bell-boots"
  breadcrumb_label TEXT,                            -- Display name in breadcrumbs
  parent_url TEXT,                                  -- Parent category URL (e.g., "/horse/boots")
  category_level INTEGER NOT NULL DEFAULT 1,       -- 1=top-level, 2=subcategory, 3=sub-subcategory
  
  -- SEO & Meta
  h1_title TEXT NOT NULL,                           -- Page H1 heading
  meta_title TEXT,                                  -- SEO title tag
  meta_description TEXT,                            -- SEO meta description
  
  -- Content
  short_description TEXT,                           -- Brief intro text (1-2 sentences)
  long_description TEXT,                            -- Rich HTML content (includes <h2>, <ul>, links, etc.)
  
  -- Structured Data (JSON)
  faq_items JSONB DEFAULT '[]'::jsonb,              -- Array of {question, answer} objects
  related_categories JSONB DEFAULT '[]'::jsonb,     -- Array of {url, title, description} objects
  
  -- Configuration
  status TEXT DEFAULT 'published',                  -- 'published', 'draft', 'archived'
  default_sort TEXT DEFAULT 'best-selling',         -- Default product sort order
  
  -- Metadata & Versioning
  generated_by TEXT,                                -- 'openai', 'claude', 'manual', 'script'
  version INTEGER DEFAULT 1,                        -- Content version number
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_category_level CHECK (category_level >= 1 AND category_level <= 3),
  CONSTRAINT valid_status CHECK (status IN ('published', 'draft', 'archived'))
);

-- ============================================================================
-- INDEXES for Fast Queries
-- ============================================================================

-- Primary lookup by URL path (most common query)
CREATE INDEX IF NOT EXISTS idx_collection_url_path ON collection_content(url_path);

-- Filter by status (for admin UI)
CREATE INDEX IF NOT EXISTS idx_collection_status ON collection_content(status);

-- Filter by category level (for bulk operations)
CREATE INDEX IF NOT EXISTS idx_collection_level ON collection_content(category_level);

-- Sort by update time (for "recently updated" queries)
CREATE INDEX IF NOT EXISTS idx_collection_updated ON collection_content(updated_at DESC);

-- Full-text search on content (for admin search)
CREATE INDEX IF NOT EXISTS idx_collection_search ON collection_content 
  USING GIN(to_tsvector('english', 
    COALESCE(h1_title, '') || ' ' || 
    COALESCE(meta_title, '') || ' ' || 
    COALESCE(short_description, '')
  ));

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_collection_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_collection_content_updated
  BEFORE UPDATE ON collection_content
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_content_timestamp();

-- ============================================================================
-- COMMENTS (Documentation for AI agents)
-- ============================================================================

COMMENT ON TABLE collection_content IS 'Stores all category and subcategory page content. Replaces collection-content.csv for dynamic, real-time updates.';

COMMENT ON COLUMN collection_content.url_path IS 'Unique URL path (e.g., /horse/boots). Must start with /. Used as primary lookup key.';
COMMENT ON COLUMN collection_content.h1_title IS 'Main page heading (H1). Required. Should be descriptive and SEO-friendly.';
COMMENT ON COLUMN collection_content.meta_title IS 'SEO title tag. Should be 50-60 characters. Include brand name.';
COMMENT ON COLUMN collection_content.meta_description IS 'SEO meta description. Should be 150-160 characters. Include primary keywords.';
COMMENT ON COLUMN collection_content.short_description IS 'Brief intro text (1-2 sentences) displayed below H1. Should be engaging and informative.';
COMMENT ON COLUMN collection_content.long_description IS 'Rich HTML content. Can include <h2>, <h3>, <ul>, <li>, <a>, <strong>, <em>. Used for SEO and user education.';
COMMENT ON COLUMN collection_content.faq_items IS 'JSON array of FAQ objects: [{"question": "...", "answer": "..."}]. Generates FAQ schema for rich snippets.';
COMMENT ON COLUMN collection_content.related_categories IS 'JSON array of related category links: [{"url": "/path", "title": "...", "description": "..."}]. For internal linking and navigation.';
COMMENT ON COLUMN collection_content.category_level IS '1 = top-level (e.g., /horse), 2 = subcategory (e.g., /horse/boots), 3 = sub-subcategory (e.g., /horse/boots/bell-boots)';
COMMENT ON COLUMN collection_content.status IS 'Content status: published (live), draft (not visible), archived (hidden but kept for history)';
COMMENT ON COLUMN collection_content.generated_by IS 'Source of content: openai, claude, manual, script. Used for tracking and analytics.';
COMMENT ON COLUMN collection_content.version IS 'Content version number. Incremented on each update. Used for A/B testing and rollback.';

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Top-level category example
INSERT INTO collection_content (
  url_path, h1_title, meta_title, meta_description, 
  short_description, long_description, breadcrumb_label, 
  category_level, status, generated_by
) VALUES (
  '/horse',
  'Horse Equipment & Supplies',
  'Horse Equipment, Boots, Rugs & More | The Equestrian',
  'Shop premium horse equipment including boots, rugs, bits, grooming supplies, and supplements. Free shipping Australia-wide. Expert advice available.',
  'Quality horse equipment selected for performance and durability. Trusted brands, expert advice, and fast delivery across Australia.',
  '<h2>Premium Horse Equipment</h2><p>Browse our comprehensive horse collection, carefully selected for quality and performance. Each product is chosen from trusted equestrian brands with proven track records.</p><h3>What Makes Great Horse Equipment?</h3><ul><li><strong>Premium Quality:</strong> Products from trusted equestrian brands</li><li><strong>Expert Selection:</strong> Carefully chosen by experienced equestrians</li><li><strong>Australian Ready:</strong> Suitable for our climate and conditions</li></ul>',
  'Horse',
  1,
  'published',
  'script'
) ON CONFLICT (url_path) DO NOTHING;

-- ============================================================================
-- COLUMN REFERENCE FOR AI CONTENT GENERATION
-- ============================================================================
/*

COLUMN GUIDE FOR AI AGENTS:

1. url_path (TEXT, REQUIRED)
   - Format: Must start with "/" (e.g., "/horse/boots")
   - Unique identifier for the collection page
   - Used as lookup key in application

2. h1_title (TEXT, REQUIRED)
   - Main page heading visible to users
   - Should be descriptive and SEO-friendly
   - Example: "Horse Boots & Leg Protection"

3. meta_title (TEXT, OPTIONAL)
   - SEO title tag (shown in search results)
   - Should be 50-60 characters
   - Include brand name: "Horse Boots | The Equestrian"

4. meta_description (TEXT, OPTIONAL)
   - SEO meta description (shown in search results)
   - Should be 150-160 characters
   - Include primary keywords and call-to-action

5. short_description (TEXT, OPTIONAL)
   - Brief intro text (1-2 sentences)
   - Displayed below H1 on category page
   - Should be engaging and informative

6. long_description (TEXT, OPTIONAL)
   - Rich HTML content for SEO and user education
   - Can include: <h2>, <h3>, <ul>, <li>, <a>, <strong>, <em>
   - Should include internal links to related categories
   - Aim for 200-400 words

7. faq_items (JSONB, OPTIONAL)
   - JSON array of FAQ objects
   - Format: [{"question": "...", "answer": "..."}, ...]
   - Generates FAQ schema for rich snippets
   - 2-5 FAQs per page recommended

8. related_categories (JSONB, OPTIONAL)
   - JSON array of related category links
   - Format: [{"url": "/path", "title": "...", "description": "..."}, ...]
   - Used for internal linking and navigation
   - 2-4 related categories recommended

9. breadcrumb_label (TEXT, OPTIONAL)
   - Display name in breadcrumbs
   - Usually same as h1_title but can be shorter
   - Example: "Boots" instead of "Horse Boots & Leg Protection"

10. category_level (INTEGER, REQUIRED)
    - 1 = top-level (e.g., /horse)
    - 2 = subcategory (e.g., /horse/boots)
    - 3 = sub-subcategory (e.g., /horse/boots/bell-boots)

11. status (TEXT, DEFAULT 'published')
    - 'published' = live on site
    - 'draft' = not visible to users
    - 'archived' = hidden but kept for history

12. generated_by (TEXT, OPTIONAL)
    - Source of content: 'openai', 'claude', 'manual', 'script'
    - Used for tracking and analytics

*/
