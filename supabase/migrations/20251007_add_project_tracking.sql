-- Genesis Observability: Project Tracking Schema
-- Adds support for comprehensive project progress tracking

-- ============================================
-- 1. 模組進度表 (Module Progress)
-- ============================================
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  module TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'blocked')),
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  features_total INTEGER NOT NULL DEFAULT 0,
  features_completed INTEGER NOT NULL DEFAULT 0,
  features_in_progress INTEGER NOT NULL DEFAULT 0,
  features_blocked INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(project_id, module),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_progress_project ON module_progress(project_id);
CREATE INDEX idx_module_progress_status ON module_progress(status);
CREATE INDEX idx_module_progress_updated ON module_progress(last_updated DESC);

COMMENT ON TABLE module_progress IS 'Tracks development progress of project modules (WMS, MES, QMS, R&D)';

-- ============================================
-- 2. Sprint 進度表 (Sprint Progress)
-- ============================================
CREATE TABLE IF NOT EXISTS sprint_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  sprint_name TEXT NOT NULL,
  sprint_day INTEGER,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  goals TEXT[],
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  velocity DECIMAL,
  metadata JSONB,
  UNIQUE(project_id, sprint_name),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sprint_progress_project ON sprint_progress(project_id);
CREATE INDEX idx_sprint_progress_status ON sprint_progress(project_id, status);
CREATE INDEX idx_sprint_progress_dates ON sprint_progress(started_at, ended_at);

COMMENT ON TABLE sprint_progress IS 'Tracks sprint execution and progress';

-- ============================================
-- 3. 任務追蹤表 (Task Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS task_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('feature', 'bug', 'refactor', 'docs', 'test', 'devops')),
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'completed', 'blocked', 'cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  module TEXT,
  sprint TEXT,
  assignee TEXT,
  estimated_hours DECIMAL,
  actual_hours DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  UNIQUE(project_id, task_id)
);

CREATE INDEX idx_task_progress_project ON task_progress(project_id);
CREATE INDEX idx_task_progress_status ON task_progress(project_id, status);
CREATE INDEX idx_task_progress_module ON task_progress(module);
CREATE INDEX idx_task_progress_sprint ON task_progress(sprint);
CREATE INDEX idx_task_progress_assignee ON task_progress(assignee);

COMMENT ON TABLE task_progress IS 'Fine-grained task tracking for project management';

-- ============================================
-- 4. API 健康表 (API Health)
-- ============================================
CREATE TABLE IF NOT EXISTS api_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
  response_time_ms INTEGER NOT NULL,
  success_rate DECIMAL NOT NULL CHECK (success_rate >= 0 AND success_rate <= 100),
  error_count INTEGER NOT NULL DEFAULT 0,
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uptime_percentage DECIMAL CHECK (uptime_percentage >= 0 AND uptime_percentage <= 100),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_health_project ON api_health(project_id);
CREATE INDEX idx_api_health_endpoint ON api_health(project_id, endpoint);
CREATE INDEX idx_api_health_check ON api_health(last_check DESC);
CREATE INDEX idx_api_health_status ON api_health(status);

COMMENT ON TABLE api_health IS 'Monitors health and performance of API endpoints';

-- ============================================
-- 5. 數據庫健康表 (Database Health)
-- ============================================
CREATE TABLE IF NOT EXISTS database_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  database TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'slow', 'disconnected', 'error')),
  connection_count INTEGER,
  query_avg_ms DECIMAL,
  slow_queries_count INTEGER DEFAULT 0,
  last_migration TEXT,
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_database_health_project ON database_health(project_id);
CREATE INDEX idx_database_health_database ON database_health(project_id, database);
CREATE INDEX idx_database_health_check ON database_health(last_check DESC);

COMMENT ON TABLE database_health IS 'Monitors database performance and health';

-- ============================================
-- 6. 整合健康表 (Integration Health)
-- ============================================
CREATE TABLE IF NOT EXISTS integration_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'offline', 'unknown')),
  success_rate DECIMAL NOT NULL CHECK (success_rate >= 0 AND success_rate <= 100),
  avg_latency_ms DECIMAL,
  last_successful_call TIMESTAMPTZ,
  last_failed_call TIMESTAMPTZ,
  error_count_24h INTEGER DEFAULT 0,
  metadata JSONB,
  UNIQUE(project_id, integration_name),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_health_project ON integration_health(project_id);
CREATE INDEX idx_integration_health_status ON integration_health(status);

COMMENT ON TABLE integration_health IS 'Monitors health of system integrations';

-- ============================================
-- 7. Agent 執行表 (Agent Executions)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  llm_calls_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL DEFAULT 0,
  success BOOLEAN,
  metadata JSONB
);

CREATE INDEX idx_agent_executions_project ON agent_executions(project_id);
CREATE INDEX idx_agent_executions_agent ON agent_executions(project_id, agent_name);
CREATE INDEX idx_agent_executions_started ON agent_executions(started_at DESC);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);

COMMENT ON TABLE agent_executions IS 'Tracks AI agent task executions';

-- ============================================
-- 8. Agent 性能表 (Agent Performance)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('hour', 'day', 'week', 'month')),
  total_executions INTEGER NOT NULL,
  successful_executions INTEGER NOT NULL,
  failed_executions INTEGER NOT NULL,
  success_rate DECIMAL NOT NULL CHECK (success_rate >= 0 AND success_rate <= 100),
  avg_duration_ms DECIMAL,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_performance_project ON agent_performance(project_id);
CREATE INDEX idx_agent_performance_agent ON agent_performance(project_id, agent_name, timestamp DESC);
CREATE INDEX idx_agent_performance_period ON agent_performance(period, timestamp DESC);

COMMENT ON TABLE agent_performance IS 'Aggregated performance metrics for AI agents';

-- ============================================
-- 9. Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can access all rows" ON module_progress FOR ALL USING (true);
CREATE POLICY "Service role can access all rows" ON sprint_progress FOR ALL USING (true);
CREATE POLICY "Service role can access all rows" ON task_progress FOR ALL USING (true);
CREATE POLICY "Service role can access all rows" ON api_health FOR ALL USING (true);
CREATE POLICY "Service role can access all rows" ON database_health FOR ALL USING (true);
CREATE POLICY "Service role can access all rows" ON integration_health FOR ALL USING (true);
CREATE POLICY "Service role can access all rows" ON agent_executions FOR ALL USING (true);
CREATE POLICY "Service role can access all rows" ON agent_performance FOR ALL USING (true);

-- ============================================
-- 10. Helper Functions
-- ============================================

-- Calculate overall project progress
CREATE OR REPLACE FUNCTION calculate_project_progress(p_project_id TEXT)
RETURNS DECIMAL AS $$
DECLARE
  avg_progress DECIMAL;
BEGIN
  SELECT AVG(progress_percentage)
  INTO avg_progress
  FROM module_progress
  WHERE project_id = p_project_id
    AND status != 'planned';

  RETURN COALESCE(avg_progress, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_project_progress IS 'Calculates weighted average progress across all modules';

-- Get active sprint
CREATE OR REPLACE FUNCTION get_active_sprint(p_project_id TEXT)
RETURNS sprint_progress AS $$
DECLARE
  active_sprint sprint_progress;
BEGIN
  SELECT *
  INTO active_sprint
  FROM sprint_progress
  WHERE project_id = p_project_id
    AND status = 'active'
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN active_sprint;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_sprint IS 'Returns the currently active sprint for a project';

-- Calculate agent success rate
CREATE OR REPLACE FUNCTION calculate_agent_success_rate(
  p_project_id TEXT,
  p_agent_name TEXT,
  p_hours INTEGER DEFAULT 24
)
RETURNS DECIMAL AS $$
DECLARE
  success_rate DECIMAL;
BEGIN
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)) * 100
    END
  INTO success_rate
  FROM agent_executions
  WHERE project_id = p_project_id
    AND agent_name = p_agent_name
    AND started_at > NOW() - (p_hours || ' hours')::INTERVAL;

  RETURN COALESCE(success_rate, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_agent_success_rate IS 'Calculates agent success rate over specified time period';

-- ============================================
-- 11. Sample Data (for testing)
-- ============================================

-- Insert sample module progress for GAC_FactoryOS
INSERT INTO module_progress (project_id, module, version, status, progress_percentage, features_total, features_completed, features_in_progress, features_blocked, metadata)
VALUES
  ('GAC_FactoryOS', 'WMS', '0.1.0', 'in_progress', 80, 15, 12, 3, 0, '{"description": "Warehouse Management System", "phase": "Sprint 1"}'),
  ('GAC_FactoryOS', 'MES', '0.1.0', 'in_progress', 40, 20, 8, 5, 0, '{"description": "Manufacturing Execution System", "phase": "Sprint 2"}'),
  ('GAC_FactoryOS', 'QMS', '0.1.0', 'planned', 10, 18, 2, 1, 0, '{"description": "Quality Management System", "phase": "Sprint 3"}'),
  ('GAC_FactoryOS', 'R&D', '0.1.0', 'planned', 0, 12, 0, 0, 0, '{"description": "Research & Development", "phase": "Sprint 4"}')
ON CONFLICT (project_id, module) DO UPDATE
SET
  progress_percentage = EXCLUDED.progress_percentage,
  features_completed = EXCLUDED.features_completed,
  features_in_progress = EXCLUDED.features_in_progress,
  last_updated = NOW();

-- Insert sample sprint progress
INSERT INTO sprint_progress (project_id, sprint_name, sprint_day, status, goals, completed_tasks, total_tasks, started_at, velocity, metadata)
VALUES
  ('GAC_FactoryOS', 'Sprint 1', 4, 'active', ARRAY['Complete WMS core features', 'Integrate GAC with Factory OS', 'User initialization'], 8, 15, '2025-10-04'::TIMESTAMPTZ, 2.0, '{"focus_areas": ["WMS", "Auth", "Integration"]}')
ON CONFLICT (project_id, sprint_name) DO UPDATE
SET
  sprint_day = EXCLUDED.sprint_day,
  completed_tasks = EXCLUDED.completed_tasks,
  total_tasks = EXCLUDED.total_tasks,
  velocity = EXCLUDED.velocity;

-- Insert sample integration health
INSERT INTO integration_health (project_id, integration_name, status, success_rate, avg_latency_ms, last_successful_call, error_count_24h, metadata)
VALUES
  ('GAC_FactoryOS', 'GAC ↔ Factory OS', 'operational', 100, 103, NOW(), 0, '{"capabilities": ["health-check", "api-keys", "auth", "multi-tenant"]}'),
  ('GAC_FactoryOS', 'Factory OS ↔ Supabase', 'operational', 100, 45, NOW(), 0, '{"database": "connected", "auth": "enabled"}')
ON CONFLICT (project_id, integration_name) DO UPDATE
SET
  status = EXCLUDED.status,
  success_rate = EXCLUDED.success_rate,
  avg_latency_ms = EXCLUDED.avg_latency_ms,
  last_successful_call = EXCLUDED.last_successful_call;

-- ============================================
-- Migration Complete
-- ============================================

COMMENT ON SCHEMA public IS 'Genesis Observability - Project Tracking Schema v1.0 (2025-10-07)';
