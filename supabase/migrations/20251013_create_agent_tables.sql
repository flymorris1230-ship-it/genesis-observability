-- ============================================================================
-- Genesis Observability - Agent Monitoring Tables
-- Created: 2025-10-13
-- Purpose: Track GAC team agent executions and performance
-- ============================================================================

-- ============================================================================
-- 1. Create agent_executions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_executions (
  -- Primary key and timestamp
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Project and agent information
  project_id TEXT NOT NULL,                    -- Project identifier (e.g., "GAC_FactoryOS")
  agent_name TEXT NOT NULL,                    -- Agent name (e.g., "BackendDeveloper")
  
  -- Task information
  task_id UUID,                                -- Related task ID (optional)
  task_type TEXT,                              -- Type of task (e.g., "development", "review")
  task_description TEXT,                       -- Task description
  
  -- Execution details
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  success BOOLEAN,                             -- Whether execution was successful
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER CHECK (duration_ms >= 0),
  
  -- LLM usage metrics
  llm_calls_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  
  -- Additional information
  metadata JSONB,                              -- Custom metadata
  error_message TEXT,                          -- Error message if failed
  output TEXT                                  -- Execution output/result
);

-- ============================================================================
-- 2. Create agent_performance table (aggregated metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_performance (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Aggregation details
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('hour', 'day', 'week', 'month')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,  -- Start of the period
  
  -- Performance metrics
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  cancelled_executions INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2),                   -- Percentage (0-100)
  avg_duration_ms INTEGER,
  
  -- Resource usage
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  total_llm_calls INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  
  -- Unique constraint to prevent duplicates
  UNIQUE(project_id, agent_name, period, timestamp)
);

-- ============================================================================
-- 3. Create agent_registry table (configured agents)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_registry (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Agent information
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  display_name TEXT,                            -- User-friendly name
  description TEXT,                             -- Agent description
  role TEXT,                                    -- Agent role/specialty
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  current_status TEXT DEFAULT 'idle' CHECK (current_status IN ('idle', 'busy', 'offline', 'error')),
  
  -- Configuration
  config JSONB,                                 -- Agent configuration
  capabilities TEXT[],                          -- List of capabilities
  
  -- Metadata
  metadata JSONB,
  
  -- Unique constraint
  UNIQUE(project_id, agent_name)
);

-- ============================================================================
-- 4. Create indexes for performance
-- ============================================================================

-- agent_executions indexes
CREATE INDEX IF NOT EXISTS idx_agent_executions_project_id
  ON agent_executions(project_id);

CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_name
  ON agent_executions(agent_name);

CREATE INDEX IF NOT EXISTS idx_agent_executions_started_at
  ON agent_executions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_executions_status
  ON agent_executions(status);

CREATE INDEX IF NOT EXISTS idx_agent_executions_project_date
  ON agent_executions(project_id, started_at DESC);

-- agent_performance indexes
CREATE INDEX IF NOT EXISTS idx_agent_performance_project_id
  ON agent_performance(project_id);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_name
  ON agent_performance(agent_name);

CREATE INDEX IF NOT EXISTS idx_agent_performance_timestamp
  ON agent_performance(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_performance_period
  ON agent_performance(period);

-- agent_registry indexes
CREATE INDEX IF NOT EXISTS idx_agent_registry_project_id
  ON agent_registry(project_id);

CREATE INDEX IF NOT EXISTS idx_agent_registry_is_active
  ON agent_registry(is_active);

CREATE INDEX IF NOT EXISTS idx_agent_registry_current_status
  ON agent_registry(current_status);

-- ============================================================================
-- 5. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. Create RLS Policies
-- ============================================================================

-- agent_executions policies
CREATE POLICY "Service role has full access to agent_executions"
  ON agent_executions
  FOR ALL
  USING (auth.role() = 'service_role');

-- agent_performance policies
CREATE POLICY "Service role has full access to agent_performance"
  ON agent_performance
  FOR ALL
  USING (auth.role() = 'service_role');

-- agent_registry policies
CREATE POLICY "Service role has full access to agent_registry"
  ON agent_registry
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 7. Create helper functions
-- ============================================================================

-- Function: Get agent summary
CREATE OR REPLACE FUNCTION get_agent_summary(
  p_project_id TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  agent_name TEXT,
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  success_rate DECIMAL(5, 2),
  avg_duration_ms INTEGER,
  total_tokens BIGINT,
  total_cost_usd DECIMAL(10, 6)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.agent_name,
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE ae.status = 'completed' AND ae.success)::BIGINT as successful_executions,
    COUNT(*) FILTER (WHERE ae.status = 'failed' OR (ae.status = 'completed' AND NOT ae.success))::BIGINT as failed_executions,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE ae.status = 'completed' AND ae.success)::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0
    END as success_rate,
    AVG(ae.duration_ms)::INTEGER as avg_duration_ms,
    SUM(ae.tokens_used)::BIGINT as total_tokens,
    SUM(ae.cost_usd)::DECIMAL(10, 6) as total_cost_usd
  FROM agent_executions ae
  WHERE ae.project_id = p_project_id
  GROUP BY ae.agent_name
  ORDER BY total_executions DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update agent status in registry
CREATE OR REPLACE FUNCTION update_agent_status(
  p_project_id TEXT,
  p_agent_name TEXT,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_registry
  SET current_status = p_status,
      updated_at = NOW()
  WHERE project_id = p_project_id
    AND agent_name = p_agent_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Initialize GAC_FactoryOS agents
-- ============================================================================

INSERT INTO agent_registry (project_id, agent_name, display_name, role, is_active, current_status) VALUES
  ('GAC_FactoryOS', 'BackendDeveloper', 'Backend Developer', 'Development', true, 'idle'),
  ('GAC_FactoryOS', 'Coordinator', 'Coordinator', 'Management', true, 'idle'),
  ('GAC_FactoryOS', 'DataAnalyst', 'Data Analyst', 'Analysis', true, 'idle'),
  ('GAC_FactoryOS', 'DevOpsEngineer', 'DevOps Engineer', 'Infrastructure', true, 'idle'),
  ('GAC_FactoryOS', 'FinOpsGuardian', 'FinOps Guardian', 'Cost Management', true, 'idle'),
  ('GAC_FactoryOS', 'FrontendDeveloper', 'Frontend Developer', 'Development', true, 'idle'),
  ('GAC_FactoryOS', 'KnowledgeManager', 'Knowledge Manager', 'Documentation', true, 'idle'),
  ('GAC_FactoryOS', 'ProductManager', 'Product Manager', 'Management', true, 'idle'),
  ('GAC_FactoryOS', 'QAEngineer', 'QA Engineer', 'Quality Assurance', true, 'idle'),
  ('GAC_FactoryOS', 'SaaSFullStackDeveloper', 'SaaS Full Stack Developer', 'Development', true, 'idle'),
  ('GAC_FactoryOS', 'SecurityGuardian', 'Security Guardian', 'Security', true, 'idle'),
  ('GAC_FactoryOS', 'SolutionArchitect', 'Solution Architect', 'Architecture', true, 'idle'),
  ('GAC_FactoryOS', 'UIUXDesigner', 'UI/UX Designer', 'Design', true, 'idle')
ON CONFLICT (project_id, agent_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- ============================================================================
-- 9. Grant permissions
-- ============================================================================

GRANT ALL ON agent_executions TO service_role;
GRANT ALL ON agent_performance TO service_role;
GRANT ALL ON agent_registry TO service_role;

-- ============================================================================
-- 10. Setup complete notification
-- ============================================================================

DO $$
DECLARE
  exec_count INTEGER;
  perf_count INTEGER;
  reg_count INTEGER;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO exec_count FROM agent_executions;
  SELECT COUNT(*) INTO perf_count FROM agent_performance;
  SELECT COUNT(*) INTO reg_count FROM agent_registry WHERE project_id = 'GAC_FactoryOS';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Agent Monitoring Tables - Setup Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'agent_executions records: %', exec_count;
  RAISE NOTICE 'agent_performance records: %', perf_count;
  RAISE NOTICE 'agent_registry records (GAC): %', reg_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update obs-edge Worker agents handler';
  RAISE NOTICE '2. Start tracking agent executions';
  RAISE NOTICE '==============================================';
END $$;
