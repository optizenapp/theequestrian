-- ============================================================================
-- COLLECTION MAPPING TABLE
-- ============================================================================
-- Stores category/subcategory to product_type mappings
-- Replaces: exports/mapping-template-draft2.csv
-- Performance: Indexed queries ~2-5ms, with in-memory caching for 0ms on cache hit
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_mapping (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Hierarchy Path
  top_level TEXT NOT NULL,                          -- e.g., "horse", "rider", "clothing"
  parent_category TEXT,                             -- e.g., "boots", "helmets"
  subcategory_handle TEXT,                          -- e.g., "bell-boots", "tendon-boots"
  
  -- Product Type Mapping
  product_type TEXT NOT NULL,                       -- Shopify product_type value
  action TEXT NOT NULL CHECK (action IN ('include', 'exclude', 'merge')),
  merge_to TEXT,                                    -- Target product_type if action='merge'
  notes TEXT,                                       -- Optional notes/comments
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_mapping_entry UNIQUE (top_level, parent_category, subcategory_handle, product_type)
);

-- ============================================================================
-- INDEXES for Fast Queries
-- ============================================================================

-- Primary lookup by collection path (most common query)
CREATE INDEX IF NOT EXISTS idx_mapping_path ON collection_mapping(top_level, parent_category, subcategory_handle);

-- Lookup by product type (for reverse mapping)
CREATE INDEX IF NOT EXISTS idx_mapping_product_type ON collection_mapping(product_type);

-- Filter by action type
CREATE INDEX IF NOT EXISTS idx_mapping_action ON collection_mapping(action);

-- Lookup merge targets (for audit queries)
CREATE INDEX IF NOT EXISTS idx_mapping_merge_to ON collection_mapping(merge_to) WHERE merge_to IS NOT NULL;

-- Sort by update time (for "recently updated" queries)
CREATE INDEX IF NOT EXISTS idx_mapping_updated ON collection_mapping(updated_at DESC);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mapping_updated
  BEFORE UPDATE ON collection_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_mapping_timestamp();

-- ============================================================================
-- COMMENTS (Documentation for AI agents)
-- ============================================================================

COMMENT ON TABLE collection_mapping IS 'Stores category/subcategory to product_type mappings. Replaces mapping-template-draft2.csv for dynamic, real-time updates.';

COMMENT ON COLUMN collection_mapping.top_level IS 'Top-level category (e.g., horse, rider, clothing, pet). Required.';
COMMENT ON COLUMN collection_mapping.parent_category IS 'Parent category/subcategory (e.g., boots, helmets). Optional for top-level.';
COMMENT ON COLUMN collection_mapping.subcategory_handle IS 'Sub-subcategory handle (e.g., bell-boots). Optional.';
COMMENT ON COLUMN collection_mapping.product_type IS 'Shopify product_type value. This is the exact string from Shopify product data.';
COMMENT ON COLUMN collection_mapping.action IS 'Action type: include (add to query), exclude (ignore), merge (alias to another type).';
COMMENT ON COLUMN collection_mapping.merge_to IS 'Target product_type if action=merge. Both original and target are included in queries.';
COMMENT ON COLUMN collection_mapping.notes IS 'Optional notes for documentation or future reference.';
