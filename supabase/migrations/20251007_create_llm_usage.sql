/**
 * Phase 3: LLM Usage Tracking Table
 * Stores LLM API usage data for observability
 */

-- Create llm_usage table
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Project and model info
  project_id TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,

  -- Token usage
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,

  -- Cost tracking
  cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,

  -- Performance
  latency_ms INTEGER DEFAULT 0,

  -- Timestamp (can be different from created_at for delayed ingestion)
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_project_id
  ON llm_usage(project_id);

CREATE INDEX IF NOT EXISTS idx_llm_usage_timestamp
  ON llm_usage(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_llm_usage_project_timestamp
  ON llm_usage(project_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_llm_usage_provider
  ON llm_usage(provider);

CREATE INDEX IF NOT EXISTS idx_llm_usage_model
  ON llm_usage(model);

-- Create view for daily aggregated metrics
CREATE OR REPLACE VIEW llm_usage_daily AS
SELECT
  project_id,
  DATE(timestamp) AS date,
  COUNT(*) AS request_count,
  SUM(total_tokens) AS total_tokens,
  SUM(cost_usd) AS total_cost,
  AVG(latency_ms) AS avg_latency,
  jsonb_object_agg(model, COUNT(*)) FILTER (WHERE model IS NOT NULL) AS model_breakdown
FROM llm_usage
GROUP BY project_id, DATE(timestamp);

-- Create view for provider cost breakdown
CREATE OR REPLACE VIEW llm_cost_by_provider AS
SELECT
  project_id,
  provider,
  COUNT(*) AS request_count,
  SUM(total_tokens) AS total_tokens,
  SUM(cost_usd) AS total_cost,
  AVG(cost_usd) AS avg_cost_per_request
FROM llm_usage
GROUP BY project_id, provider;

-- Add RLS policies
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read all data (for now - adjust based on needs)
CREATE POLICY "Public can read llm_usage"
  ON llm_usage FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert data
CREATE POLICY "Authenticated users can insert llm_usage"
  ON llm_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage llm_usage"
  ON llm_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE llm_usage IS 'LLM API usage tracking for observability and cost analysis';
COMMENT ON COLUMN llm_usage.project_id IS 'Project identifier for grouping usage';
COMMENT ON COLUMN llm_usage.model IS 'LLM model name (e.g., gpt-4, claude-3-sonnet)';
COMMENT ON COLUMN llm_usage.provider IS 'LLM provider (openai, anthropic, google)';
COMMENT ON COLUMN llm_usage.total_tokens IS 'Total tokens (input + output)';
COMMENT ON COLUMN llm_usage.cost_usd IS 'Estimated cost in USD (4 decimal places)';
COMMENT ON COLUMN llm_usage.latency_ms IS 'API response latency in milliseconds';
COMMENT ON COLUMN llm_usage.timestamp IS 'Actual usage timestamp (may differ from created_at)';

-- Grant permissions
GRANT SELECT, INSERT ON llm_usage TO authenticated;
GRANT ALL ON llm_usage TO service_role;
GRANT SELECT ON llm_usage_daily TO authenticated;
GRANT SELECT ON llm_cost_by_provider TO authenticated;
