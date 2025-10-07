/**
 * Quick Fix: Rename timestamp column to event_time
 * Run this if the table was created with the old schema
 */

-- Rename the column
ALTER TABLE llm_usage
RENAME COLUMN timestamp TO event_time;

-- Update index name for clarity (optional but recommended)
DROP INDEX IF EXISTS idx_llm_usage_timestamp;
CREATE INDEX IF NOT EXISTS idx_llm_usage_event_time
  ON llm_usage(event_time DESC);

DROP INDEX IF EXISTS idx_llm_usage_project_timestamp;
CREATE INDEX IF NOT EXISTS idx_llm_usage_project_event_time
  ON llm_usage(project_id, event_time DESC);

-- Recreate views to use event_time
DROP VIEW IF EXISTS llm_usage_daily;
CREATE OR REPLACE VIEW llm_usage_daily AS
SELECT
  project_id,
  DATE(event_time) AS date,
  COUNT(*) AS request_count,
  SUM(total_tokens) AS total_tokens,
  SUM(cost_usd) AS total_cost,
  AVG(latency_ms) AS avg_latency,
  jsonb_object_agg(model, COUNT(*)) FILTER (WHERE model IS NOT NULL) AS model_breakdown
FROM llm_usage
GROUP BY project_id, DATE(event_time);

-- Update comment
COMMENT ON COLUMN llm_usage.event_time IS 'Event timestamp (when the LLM call occurred)';
