-- Performance Scans Table
-- Stores PageSpeed Insights scan results and AI recommendations

CREATE TABLE IF NOT EXISTS performance_scans (
  id SERIAL PRIMARY KEY,
  
  -- Scan metadata
  page_type VARCHAR(100) NOT NULL,
  page_url TEXT NOT NULL,
  scan_date TIMESTAMP DEFAULT NOW(),
  
  -- PageSpeed Insights scores (0-100)
  performance_score INT,
  accessibility_score INT,
  best_practices_score INT,
  seo_score INT,
  
  -- Core Web Vitals
  fcp DECIMAL(10, 2), -- First Contentful Paint (seconds)
  lcp DECIMAL(10, 2), -- Largest Contentful Paint (seconds)
  cls DECIMAL(10, 4), -- Cumulative Layout Shift
  tbt DECIMAL(10, 2), -- Total Blocking Time (ms)
  si DECIMAL(10, 2),  -- Speed Index (seconds)
  
  -- Raw data from PageSpeed Insights
  raw_data JSONB,
  
  -- AI analysis
  ai_recommendations JSONB,
  ai_analyzed_at TIMESTAMP,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'analyzing'
  error_message TEXT,
  
  -- Indexing
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_scans_page_type ON performance_scans(page_type);
CREATE INDEX IF NOT EXISTS idx_performance_scans_page_url ON performance_scans(page_url);
CREATE INDEX IF NOT EXISTS idx_performance_scans_scan_date ON performance_scans(scan_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_scans_status ON performance_scans(status);

-- Comments
COMMENT ON TABLE performance_scans IS 'Stores PageSpeed Insights scan results and AI-generated recommendations';
COMMENT ON COLUMN performance_scans.page_type IS 'Type of page scanned (homepage, collection, product, etc.)';
COMMENT ON COLUMN performance_scans.raw_data IS 'Full PageSpeed Insights response as JSONB';
COMMENT ON COLUMN performance_scans.ai_recommendations IS 'AI-generated recommendations with code snippets';
