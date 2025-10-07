/**
 * Phase 2: Feedback Loop Support
 * Add tables and columns for quality scoring and failure tracking
 */

-- Add failure tracking columns to knowledge_base
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failure_rate FLOAT DEFAULT 0.0;

-- Create task_failures table
CREATE TABLE IF NOT EXISTS task_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  task_id TEXT NOT NULL,
  description TEXT NOT NULL,
  error_message TEXT NOT NULL,
  attempted_knowledge TEXT[] DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_task_failures_timestamp
  ON task_failures(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_task_failures_task_id
  ON task_failures(task_id);

-- Create agent_executions table for quality tracking
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  task_description TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  error_count INTEGER DEFAULT 0,
  knowledge_used INTEGER DEFAULT 0,
  output_length INTEGER DEFAULT 0,
  has_tests BOOLEAN DEFAULT false,
  has_documentation BOOLEAN DEFAULT false,
  quality_score FLOAT, -- 0-10 scale
  quality_breakdown JSONB, -- {efficiency, reliability, knowledgeUtilization, completeness}
  feedback TEXT[], -- Array of feedback messages
  phase TEXT,
  status TEXT DEFAULT 'success', -- success, failure, partial
  metadata JSONB -- Additional context
);

-- Create indexes for agent_executions
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at
  ON agent_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_executions_phase
  ON agent_executions(phase);

CREATE INDEX IF NOT EXISTS idx_agent_executions_status
  ON agent_executions(status);

CREATE INDEX IF NOT EXISTS idx_agent_executions_quality_score
  ON agent_executions(quality_score DESC);

-- Create function to calculate knowledge health score
CREATE OR REPLACE FUNCTION calculate_knowledge_health(knowledge_id UUID)
RETURNS FLOAT AS $$
DECLARE
  health_score FLOAT;
  item RECORD;
BEGIN
  SELECT
    avg_rating,
    usage_count,
    failure_count,
    failure_rate,
    EXTRACT(EPOCH FROM (NOW() - last_used_at)) / 86400 AS days_since_use
  INTO item
  FROM knowledge_base
  WHERE id = knowledge_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Health score formula:
  -- Base: avg_rating (0-10)
  -- Penalty: failure_rate (-5 max)
  -- Bonus: usage_count (up to +2)
  -- Penalty: recency (up to -3 if not used in 90+ days)

  health_score := item.avg_rating;

  -- Failure penalty
  health_score := health_score - (item.failure_rate * 5);

  -- Usage bonus (capped at +2)
  health_score := health_score + LEAST(item.usage_count / 10.0, 2);

  -- Recency penalty
  IF item.days_since_use > 90 THEN
    health_score := health_score - 3;
  ELSIF item.days_since_use > 60 THEN
    health_score := health_score - 2;
  ELSIF item.days_since_use > 30 THEN
    health_score := health_score - 1;
  END IF;

  -- Clamp to 0-10 range
  RETURN GREATEST(0, LEAST(10, health_score));
END;
$$ LANGUAGE plpgsql;

-- Create function to get quality trend over time
CREATE OR REPLACE FUNCTION get_quality_trend(
  days_ago INTEGER DEFAULT 7
)
RETURNS TABLE (
  date DATE,
  avg_quality FLOAT,
  task_count BIGINT,
  success_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) AS date,
    AVG(quality_score) AS avg_quality,
    COUNT(*) AS task_count,
    (COUNT(*) FILTER (WHERE status = 'success')::FLOAT / COUNT(*)) AS success_rate
  FROM agent_executions
  WHERE created_at >= NOW() - INTERVAL '1 day' * days_ago
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get cost tracking data
CREATE OR REPLACE FUNCTION get_cost_tracking(
  days_ago INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_executions BIGINT,
  avg_execution_time_ms FLOAT,
  estimated_llm_calls BIGINT,
  estimated_cost_usd FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) AS date,
    COUNT(*) AS total_executions,
    AVG(execution_time_ms) AS avg_execution_time_ms,
    COUNT(*) * 3 AS estimated_llm_calls, -- Assume 3 LLM calls per task (embedding, RAG, response)
    COUNT(*) * 0.001 AS estimated_cost_usd -- Rough estimate: $0.001 per task
  FROM agent_executions
  WHERE created_at >= NOW() - INTERVAL '1 day' * days_ago
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get learning curve metrics
CREATE OR REPLACE FUNCTION get_learning_curve_metrics(
  phase_name TEXT
)
RETURNS TABLE (
  week_number INTEGER,
  avg_quality FLOAT,
  task_count BIGINT,
  knowledge_growth INTEGER,
  success_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH weekly_data AS (
    SELECT
      EXTRACT(WEEK FROM created_at)::INTEGER AS week,
      AVG(quality_score) AS avg_quality,
      COUNT(*) AS task_count,
      (COUNT(*) FILTER (WHERE status = 'success')::FLOAT / COUNT(*)) AS success_rate
    FROM agent_executions
    WHERE phase = phase_name
    GROUP BY EXTRACT(WEEK FROM created_at)
  ),
  knowledge_data AS (
    SELECT
      EXTRACT(WEEK FROM created_at)::INTEGER AS week,
      COUNT(*) AS knowledge_count
    FROM knowledge_base
    WHERE phase = phase_name AND type = 'learning'
    GROUP BY EXTRACT(WEEK FROM created_at)
  )
  SELECT
    w.week,
    w.avg_quality,
    w.task_count,
    COALESCE(k.knowledge_count, 0) AS knowledge_growth,
    w.success_rate
  FROM weekly_data w
  LEFT JOIN knowledge_data k ON w.week = k.week
  ORDER BY w.week DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE task_failures IS 'Records of failed tasks for learning and analysis';
COMMENT ON TABLE agent_executions IS 'Complete execution history with quality metrics';
COMMENT ON FUNCTION calculate_knowledge_health IS 'Calculate overall health score for knowledge item (0-10)';
COMMENT ON FUNCTION get_quality_trend IS 'Get quality metrics trend over specified days';
COMMENT ON FUNCTION get_cost_tracking IS 'Get cost tracking data for LLM usage';
COMMENT ON FUNCTION get_learning_curve_metrics IS 'Get learning curve metrics by phase and week';

-- Grant permissions (adjust based on your RLS setup)
GRANT SELECT, INSERT ON task_failures TO authenticated;
GRANT SELECT, INSERT ON agent_executions TO authenticated;
