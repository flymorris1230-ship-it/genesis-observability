-- ============================================
-- Genesis Observability - Complete Test Data
-- Insert comprehensive test data for all tracking tables
-- ============================================

-- Insert additional tasks for GAC_FactoryOS
INSERT INTO task_progress (project_id, task_id, task_name, task_type, status, priority, module, sprint, assignee, estimated_hours, actual_hours, metadata)
VALUES
  ('GAC_FactoryOS', 'WMS-001', 'WMS Material CRUD API', 'feature', 'completed', 'high', 'WMS', 'Sprint 1', 'Backend Team', 8, 7.5, '{"tags": ["backend", "api", "wms"], "description": "Implement material management CRUD endpoints"}'::jsonb),
  ('GAC_FactoryOS', 'WMS-002', 'WMS Inventory Tracking', 'feature', 'completed', 'high', 'WMS', 'Sprint 1', 'Backend Team', 12, 11, '{"tags": ["backend", "wms", "realtime"], "description": "Implement real-time inventory tracking"}'::jsonb),
  ('GAC_FactoryOS', 'WMS-003', 'WMS Material Table UI', 'feature', 'completed', 'medium', 'WMS', 'Sprint 1', 'Frontend Team', 6, 5.5, '{"tags": ["frontend", "ui", "wms"], "description": "Create MaterialTable component with search/filter"}'::jsonb),
  ('GAC_FactoryOS', 'WMS-004', 'WMS Barcode Scanner', 'feature', 'in_progress', 'high', 'WMS', 'Sprint 1', 'Frontend Team', 10, 6, '{"tags": ["frontend", "wms", "scanner"], "description": "Integrate barcode/QR code scanning"}'::jsonb),
  ('GAC_FactoryOS', 'WMS-005', 'WMS Batch Number System', 'feature', 'in_progress', 'critical', 'WMS', 'Sprint 1', 'Backend Team', 16, 8, '{"tags": ["backend", "wms", "traceability"], "description": "Implement batch traceability system"}'::jsonb),
  ('GAC_FactoryOS', 'MES-001', 'MES Work Order Management', 'feature', 'completed', 'high', 'MES', 'Sprint 2', 'Backend Team', 14, 13, '{"tags": ["backend", "mes", "workflow"], "description": "Create work order CRUD and workflow"}'::jsonb),
  ('GAC_FactoryOS', 'MES-002', 'MES Production Scheduling', 'feature', 'in_progress', 'high', 'MES', 'Sprint 2', 'Backend Team', 20, 10, '{"tags": ["backend", "mes", "scheduling"], "description": "Implement production schedule optimizer"}'::jsonb),
  ('GAC_FactoryOS', 'MES-003', 'MES Equipment Management', 'feature', 'in_progress', 'medium', 'MES', 'Sprint 2', 'Backend Team', 12, 5, '{"tags": ["backend", "mes", "equipment"], "description": "Track equipment status and maintenance"}'::jsonb),
  ('GAC_FactoryOS', 'QMS-001', 'QMS Quality Check UI', 'feature', 'in_progress', 'medium', 'QMS', 'Sprint 3', 'Frontend Team', 8, 3, '{"tags": ["frontend", "qms", "ui"], "description": "Create quality inspection interface"}'::jsonb),
  ('GAC_FactoryOS', 'QMS-002', 'QMS Audit Trail', 'feature', 'todo', 'high', 'QMS', 'Sprint 3', 'Backend Team', 10, 0, '{"tags": ["backend", "qms", "audit"], "description": "Implement complete audit logging"}'::jsonb),
  ('GAC_FactoryOS', 'RD-001', 'R&D Formula Manager', 'feature', 'todo', 'medium', 'R&D', 'Sprint 4', 'Backend Team', 18, 0, '{"tags": ["backend", "rnd", "formula"], "description": "Create cosmetic formula management system"}'::jsonb),
  ('GAC_FactoryOS', 'CORE-001', 'Dashboard Integration', 'feature', 'in_progress', 'high', 'Core', 'Sprint 1', 'Frontend Team', 15, 8, '{"tags": ["frontend", "dashboard", "integration"], "description": "Integrate all modules into main dashboard"}'::jsonb),
  ('GAC_FactoryOS', 'CORE-002', 'API Rate Limiting', 'feature', 'completed', 'medium', 'Core', 'Sprint 1', 'Backend Team', 4, 3.5, '{"tags": ["backend", "api", "security"], "description": "Implement rate limiting for all endpoints"}'::jsonb),
  ('GAC_FactoryOS', 'CORE-003', 'Authentication System', 'feature', 'completed', 'critical', 'Core', 'Sprint 1', 'Backend Team', 12, 11, '{"tags": ["backend", "auth", "security"], "description": "Complete Supabase auth integration"}'::jsonb),
  ('GAC_FactoryOS', 'CORE-004', 'Multi-tenant Support', 'feature', 'completed', 'critical', 'Core', 'Sprint 1', 'Backend Team', 10, 9.5, '{"tags": ["backend", "security", "rls"], "description": "Implement Row Level Security"}'::jsonb);

-- Insert API health monitoring data
INSERT INTO api_health (project_id, endpoint, status, response_time_ms, success_rate, error_count, uptime_percentage)
VALUES
  ('GAC_FactoryOS', '/api/trpc/material.list', 'healthy', 85, 99.5, 2, 99.8),
  ('GAC_FactoryOS', '/api/trpc/material.create', 'healthy', 120, 98.2, 8, 99.5),
  ('GAC_FactoryOS', '/api/trpc/inventory.list', 'healthy', 95, 99.1, 3, 99.7),
  ('GAC_FactoryOS', '/api/trpc/inventory.update', 'healthy', 110, 97.8, 12, 99.2),
  ('GAC_FactoryOS', '/api/trpc/auth.login', 'healthy', 450, 99.9, 1, 99.9),
  ('GAC_FactoryOS', '/api/trpc/auth.register', 'healthy', 520, 98.5, 6, 99.4),
  ('GAC_FactoryOS', '/api/health', 'healthy', 25, 100, 0, 100),
  ('GAC_FactoryOS', '/api/trpc/workOrder.list', 'degraded', 850, 92.3, 45, 96.5),
  ('GAC_FactoryOS', '/api/trpc/workOrder.create', 'healthy', 180, 98.7, 7, 99.3);

-- Insert database health monitoring data
INSERT INTO database_health (project_id, database, status, connection_count, query_avg_ms, slow_queries_count, last_migration)
VALUES
  ('GAC_FactoryOS', 'supabase-postgres', 'connected', 15, 45.5, 2, '20251007_add_project_tracking'),
  ('GAC_FactoryOS', 'supabase-postgres', 'connected', 18, 52.3, 3, '20251007_add_project_tracking'),
  ('GAC_FactoryOS', 'supabase-postgres', 'connected', 12, 38.7, 1, '20251007_add_project_tracking');

-- Insert agent execution records
INSERT INTO agent_executions (project_id, agent_name, task_id, task_type, status, success, started_at, completed_at, duration_ms, llm_calls_count, tokens_used, cost_usd)
VALUES
  ('GAC_FactoryOS', 'Product Manager', 'task-001', 'PRD Generation', 'completed', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes', 300000, 5, 12500, 0.0375),
  ('GAC_FactoryOS', 'Solution Architect', 'task-002', 'System Design', 'completed', true, NOW() - INTERVAL '1 hour 50 minutes', NOW() - INTERVAL '1 hour 30 minutes', 1200000, 8, 25000, 0.075),
  ('GAC_FactoryOS', 'Backend Developer', 'task-003', 'API Implementation', 'completed', true, NOW() - INTERVAL '1 hour 25 minutes', NOW() - INTERVAL '45 minutes', 2400000, 15, 45000, 0.135),
  ('GAC_FactoryOS', 'Frontend Developer', 'task-004', 'UI Component', 'completed', true, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '20 minutes', 1200000, 10, 30000, 0.09),
  ('GAC_FactoryOS', 'QA Engineer', 'task-005', 'Test Case Generation', 'completed', true, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '10 minutes', 300000, 6, 18000, 0.054),
  ('GAC_FactoryOS', 'Backend Developer', 'task-006', 'API Implementation', 'running', NULL, NOW() - INTERVAL '5 minutes', NULL, NULL, 0, 0, 0),
  ('GAC_FactoryOS', 'Data Analyst', 'task-007', 'Analytics Report', 'failed', false, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 55 minutes', 300000, 3, 5000, 0.015),
  ('GAC_FactoryOS', 'DevOps Engineer', 'task-008', 'Deployment', 'completed', true, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes', 300000, 4, 8000, 0.024);

-- Insert agent performance metrics (daily aggregates)
INSERT INTO agent_performance (project_id, agent_name, period, timestamp, total_executions, successful_executions, failed_executions, success_rate, avg_duration_ms, total_tokens, total_cost_usd)
VALUES
  ('GAC_FactoryOS', 'Product Manager', 'day', CURRENT_DATE, 12, 11, 1, 91.67, 350000, 150000, 0.45),
  ('GAC_FactoryOS', 'Solution Architect', 'day', CURRENT_DATE, 8, 8, 0, 100, 1100000, 200000, 0.60),
  ('GAC_FactoryOS', 'Backend Developer', 'day', CURRENT_DATE, 25, 23, 2, 92.00, 1800000, 1125000, 3.375),
  ('GAC_FactoryOS', 'Frontend Developer', 'day', CURRENT_DATE, 18, 17, 1, 94.44, 1000000, 540000, 1.62),
  ('GAC_FactoryOS', 'QA Engineer', 'day', CURRENT_DATE, 15, 14, 1, 93.33, 400000, 270000, 0.81),
  ('GAC_FactoryOS', 'DevOps Engineer', 'day', CURRENT_DATE, 10, 10, 0, 100, 350000, 80000, 0.24),
  ('GAC_FactoryOS', 'Data Analyst', 'day', CURRENT_DATE, 6, 5, 1, 83.33, 450000, 60000, 0.18),
  ('GAC_FactoryOS', 'Product Manager', 'day', CURRENT_DATE - 1, 10, 9, 1, 90.00, 380000, 140000, 0.42),
  ('GAC_FactoryOS', 'Backend Developer', 'day', CURRENT_DATE - 1, 22, 20, 2, 90.91, 1850000, 1100000, 3.30);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Test data inserted successfully!';
  RAISE NOTICE 'Tables populated:';
  RAISE NOTICE '  - task_progress: 15 tasks';
  RAISE NOTICE '  - api_health: 9 API endpoints';
  RAISE NOTICE '  - database_health: 3 health checks';
  RAISE NOTICE '  - agent_executions: 8 executions';
  RAISE NOTICE '  - agent_performance: 9 daily metrics';
END $$;
