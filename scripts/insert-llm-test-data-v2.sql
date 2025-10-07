/**
 * Test Data for LLM Usage Tracking
 * Inserts 7 days of simulated LLM usage for GAC_FactoryOS project
 *
 * Models:
 * - claude-3-7-sonnet-20250219 (Anthropic)
 * - gpt-4-0125-preview (OpenAI)
 * - gemini-pro-1.5 (Google)
 *
 * Pricing (per 1M tokens):
 * - Claude Sonnet: $3 input / $15 output
 * - GPT-4: $10 input / $30 output
 * - Gemini Pro: $1.25 input / $5 output
 */

-- Insert test data for the past 7 days
-- Day 7 (oldest)
INSERT INTO llm_usage (project_id, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, event_time)
VALUES
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1200, 450, 1650, 0.0104, 1250, NOW() - INTERVAL '7 days' + INTERVAL '9 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 800, 320, 1120, 0.0176, 1890, NOW() - INTERVAL '7 days' + INTERVAL '11 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1500, 600, 2100, 0.0135, 1150, NOW() - INTERVAL '7 days' + INTERVAL '14 hours'),
  ('GAC_FactoryOS', 'gemini-pro-1.5', 'google', 950, 380, 1330, 0.0031, 890, NOW() - INTERVAL '7 days' + INTERVAL '16 hours');

-- Day 6
INSERT INTO llm_usage (project_id, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, event_time)
VALUES
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1350, 520, 1870, 0.0119, 1320, NOW() - INTERVAL '6 days' + INTERVAL '8 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 920, 410, 1330, 0.0215, 2100, NOW() - INTERVAL '6 days' + INTERVAL '10 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1100, 440, 1540, 0.0099, 1080, NOW() - INTERVAL '6 days' + INTERVAL '13 hours'),
  ('GAC_FactoryOS', 'gemini-pro-1.5', 'google', 1100, 450, 1550, 0.0037, 920, NOW() - INTERVAL '6 days' + INTERVAL '15 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1600, 650, 2250, 0.0146, 1420, NOW() - INTERVAL '6 days' + INTERVAL '18 hours');

-- Day 5
INSERT INTO llm_usage (project_id, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, event_time)
VALUES
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1280, 490, 1770, 0.0112, 1180, NOW() - INTERVAL '5 days' + INTERVAL '9 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 850, 360, 1210, 0.0193, 1950, NOW() - INTERVAL '5 days' + INTERVAL '11 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1450, 580, 2030, 0.0131, 1290, NOW() - INTERVAL '5 days' + INTERVAL '14 hours'),
  ('GAC_FactoryOS', 'gemini-pro-1.5', 'google', 1020, 410, 1430, 0.0033, 870, NOW() - INTERVAL '5 days' + INTERVAL '16 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1380, 550, 1930, 0.0124, 1230, NOW() - INTERVAL '5 days' + INTERVAL '19 hours');

-- Day 4
INSERT INTO llm_usage (project_id, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, event_time)
VALUES
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1420, 560, 1980, 0.0127, 1340, NOW() - INTERVAL '4 days' + INTERVAL '8 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 900, 390, 1290, 0.0207, 2050, NOW() - INTERVAL '4 days' + INTERVAL '10 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1250, 500, 1750, 0.0113, 1160, NOW() - INTERVAL '4 days' + INTERVAL '13 hours'),
  ('GAC_FactoryOS', 'gemini-pro-1.5', 'google', 980, 390, 1370, 0.0032, 910, NOW() - INTERVAL '4 days' + INTERVAL '15 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1520, 610, 2130, 0.0138, 1380, NOW() - INTERVAL '4 days' + INTERVAL '17 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 1100, 480, 1580, 0.0254, 2200, NOW() - INTERVAL '4 days' + INTERVAL '19 hours');

-- Day 3
INSERT INTO llm_usage (project_id, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, event_time)
VALUES
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1320, 530, 1850, 0.0119, 1220, NOW() - INTERVAL '3 days' + INTERVAL '9 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 880, 370, 1250, 0.0199, 1980, NOW() - INTERVAL '3 days' + INTERVAL '11 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1480, 590, 2070, 0.0133, 1310, NOW() - INTERVAL '3 days' + INTERVAL '13 hours'),
  ('GAC_FactoryOS', 'gemini-pro-1.5', 'google', 1050, 420, 1470, 0.0034, 880, NOW() - INTERVAL '3 days' + INTERVAL '15 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1400, 560, 1960, 0.0126, 1260, NOW() - INTERVAL '3 days' + INTERVAL '18 hours');

-- Day 2
INSERT INTO llm_usage (project_id, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, event_time)
VALUES
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1380, 540, 1920, 0.0123, 1280, NOW() - INTERVAL '2 days' + INTERVAL '8 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 940, 400, 1340, 0.0214, 2080, NOW() - INTERVAL '2 days' + INTERVAL '10 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1180, 470, 1650, 0.0106, 1120, NOW() - INTERVAL '2 days' + INTERVAL '12 hours'),
  ('GAC_FactoryOS', 'gemini-pro-1.5', 'google', 1080, 430, 1510, 0.0035, 900, NOW() - INTERVAL '2 days' + INTERVAL '14 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1550, 620, 2170, 0.0140, 1400, NOW() - INTERVAL '2 days' + INTERVAL '16 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 1050, 450, 1500, 0.024, 2150, NOW() - INTERVAL '2 days' + INTERVAL '19 hours');

-- Day 1 (yesterday)
INSERT INTO llm_usage (project_id, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, event_time)
VALUES
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1420, 560, 1980, 0.0127, 1340, NOW() - INTERVAL '1 day' + INTERVAL '9 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 910, 380, 1290, 0.0205, 2020, NOW() - INTERVAL '1 day' + INTERVAL '11 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1260, 500, 1760, 0.0113, 1190, NOW() - INTERVAL '1 day' + INTERVAL '13 hours'),
  ('GAC_FactoryOS', 'gemini-pro-1.5', 'google', 1000, 400, 1400, 0.0033, 890, NOW() - INTERVAL '1 day' + INTERVAL '15 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1490, 600, 2090, 0.0135, 1370, NOW() - INTERVAL '1 day' + INTERVAL '17 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 1120, 490, 1610, 0.0259, 2180, NOW() - INTERVAL '1 day' + INTERVAL '19 hours');

-- Today
INSERT INTO llm_usage (project_id, model, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, event_time)
VALUES
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1350, 530, 1880, 0.0120, 1250, NOW() - INTERVAL '5 hours'),
  ('GAC_FactoryOS', 'gpt-4-0125-preview', 'openai', 890, 370, 1260, 0.0200, 1990, NOW() - INTERVAL '3 hours'),
  ('GAC_FactoryOS', 'claude-3-7-sonnet-20250219', 'anthropic', 1460, 580, 2040, 0.0131, 1300, NOW() - INTERVAL '1 hour'),
  ('GAC_FactoryOS', 'gemini-pro-1.5', 'google', 1030, 410, 1440, 0.0034, 880, NOW() - INTERVAL '30 minutes');

-- Summary statistics
-- Total: ~42 API calls over 7 days (~6 calls/day average)
-- Total tokens: ~71,570 tokens
-- Total cost: ~$0.70
-- Average latency: ~1,350ms
-- Distribution: 60% Claude, 30% GPT-4, 10% Gemini
