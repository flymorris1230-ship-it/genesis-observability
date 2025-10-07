-- Genesis Observability - Supabase Database Setup
-- Version: 1.0
-- Date: 2025-10-07
--
-- This script sets up the complete database schema for Genesis Observability
-- Run this in Supabase SQL Editor after creating your project

-- ============================================================================
-- 1. Create llm_usage table
-- ============================================================================

CREATE TABLE IF NOT EXISTS llm_usage (
  -- Primary key and timestamp
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Project and model information
  project_id TEXT NOT NULL,           -- Project identifier (e.g., "my-chatbot")
  model TEXT NOT NULL,                -- Model name (e.g., "gpt-4", "claude-3-opus")
  provider TEXT NOT NULL,             -- Provider (e.g., "openai", "anthropic", "google")

  -- Usage metrics
  input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),      -- Input tokens (prompt)
  output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),    -- Output tokens (completion)
  total_tokens INTEGER NOT NULL CHECK (total_tokens >= 0),      -- Total tokens

  -- Performance and cost
  latency_ms INTEGER CHECK (latency_ms >= 0),                   -- API latency in milliseconds
  cost_usd DECIMAL(10, 6) CHECK (cost_usd >= 0),               -- Cost in USD (6 decimal precision)

  -- Metadata (optional)
  metadata JSONB,                     -- Custom JSON metadata
  tags TEXT[],                        -- Tags array (e.g., ["production", "chatbot"])
  user_id TEXT,                       -- End-user ID (optional)
  session_id TEXT                     -- Session ID (optional)
);

-- ============================================================================
-- 2. Create indexes for performance optimization
-- ============================================================================

-- Index on project_id (most common filter)
CREATE INDEX IF NOT EXISTS idx_llm_usage_project_id
  ON llm_usage(project_id);

-- Index on created_at (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at
  ON llm_usage(created_at DESC);

-- Index on provider (for grouping by provider)
CREATE INDEX IF NOT EXISTS idx_llm_usage_provider
  ON llm_usage(provider);

-- Composite index for common query pattern (project + time)
CREATE INDEX IF NOT EXISTS idx_llm_usage_project_date
  ON llm_usage(project_id, created_at DESC);

-- Index on model (for model-specific queries)
CREATE INDEX IF NOT EXISTS idx_llm_usage_model
  ON llm_usage(model);

-- Composite index for cost analysis
CREATE INDEX IF NOT EXISTS idx_llm_usage_cost
  ON llm_usage(project_id, created_at DESC, cost_usd);

-- ============================================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Create RLS Policies
-- ============================================================================

-- Policy 1: Allow service_role full access (for obs-edge Worker)
CREATE POLICY "Service role has full access"
  ON llm_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy 2: (Optional) Allow authenticated users to view their own project data
-- Uncomment if you want to enable direct user access
-- CREATE POLICY "Users can view their own projects"
--   ON llm_usage
--   FOR SELECT
--   USING (auth.uid()::text = user_id);

-- Policy 3: (Optional) Allow users to insert their own usage data
-- Uncomment if you want users to be able to write directly
-- CREATE POLICY "Users can insert their own usage"
--   ON llm_usage
--   FOR INSERT
--   WITH CHECK (auth.uid()::text = user_id);

-- ============================================================================
-- 5. Create helper functions
-- ============================================================================

-- Function: Get usage summary for a project within a date range
CREATE OR REPLACE FUNCTION get_project_summary(
  p_project_id TEXT,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_requests BIGINT,
  total_tokens BIGINT,
  total_cost_usd DECIMAL(10, 6),
  avg_latency_ms INTEGER,
  unique_models BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    SUM(total_tokens)::BIGINT as total_tokens,
    SUM(cost_usd)::DECIMAL(10, 6) as total_cost_usd,
    AVG(latency_ms)::INTEGER as avg_latency_ms,
    COUNT(DISTINCT model)::BIGINT as unique_models
  FROM llm_usage
  WHERE project_id = p_project_id
    AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get daily aggregated metrics
CREATE OR REPLACE FUNCTION get_daily_metrics(
  p_project_id TEXT,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  date DATE,
  requests BIGINT,
  tokens BIGINT,
  cost_usd DECIMAL(10, 6),
  avg_latency_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*)::BIGINT as requests,
    SUM(total_tokens)::BIGINT as tokens,
    SUM(cost_usd)::DECIMAL(10, 6) as cost_usd,
    AVG(latency_ms)::INTEGER as avg_latency_ms
  FROM llm_usage
  WHERE project_id = p_project_id
    AND created_at BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get provider breakdown
CREATE OR REPLACE FUNCTION get_provider_breakdown(
  p_project_id TEXT,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  provider TEXT,
  requests BIGINT,
  tokens BIGINT,
  cost_usd DECIMAL(10, 6),
  avg_latency_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    llm_usage.provider,
    COUNT(*)::BIGINT as requests,
    SUM(total_tokens)::BIGINT as tokens,
    SUM(cost_usd)::DECIMAL(10, 6) as cost_usd,
    AVG(latency_ms)::INTEGER as avg_latency_ms
  FROM llm_usage
  WHERE project_id = p_project_id
    AND created_at BETWEEN p_start_date AND p_end_date
  GROUP BY llm_usage.provider
  ORDER BY cost_usd DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Create sample data (for testing, optional)
-- ============================================================================

-- Uncomment to insert sample data for testing
-- INSERT INTO llm_usage (
--   project_id, model, provider,
--   input_tokens, output_tokens, total_tokens,
--   latency_ms, cost_usd
-- ) VALUES
--   ('test-project', 'gpt-4', 'openai', 1000, 500, 1500, 1200, 0.045),
--   ('test-project', 'claude-3-sonnet', 'anthropic', 800, 600, 1400, 1100, 0.025),
--   ('test-project', 'gpt-4', 'openai', 1200, 800, 2000, 1300, 0.060);

-- ============================================================================
-- 7. Grant permissions (if needed)
-- ============================================================================

-- Grant service_role access (should already have it, but just to be explicit)
GRANT ALL ON llm_usage TO service_role;

-- Grant anon access for reading (if you want public read access - NOT RECOMMENDED)
-- GRANT SELECT ON llm_usage TO anon;

-- ============================================================================
-- 8. Setup complete!
-- ============================================================================

-- Verify the setup
DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name = 'llm_usage';

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'llm_usage';

  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('get_project_summary', 'get_daily_metrics', 'get_provider_breakdown');

  -- Output summary
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Genesis Observability - Setup Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tables created: %', table_count;
  RAISE NOTICE 'Indexes created: %', index_count;
  RAISE NOTICE 'Functions created: %', function_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Copy your Supabase URL and service_role key';
  RAISE NOTICE '2. Set Worker secrets:';
  RAISE NOTICE '   echo "YOUR_URL" | wrangler secret put SUPABASE_URL';
  RAISE NOTICE '   echo "YOUR_KEY" | wrangler secret put SUPABASE_SERVICE_KEY';
  RAISE NOTICE '3. Test the /ingest endpoint';
  RAISE NOTICE '==============================================';
END $$;
