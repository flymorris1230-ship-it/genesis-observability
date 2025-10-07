/**
 * TEMPORARY Admin Handler - Execute LLM Usage Table Migration
 * This endpoint will be removed after migration is complete
 */

import { Context } from 'hono';
import { Env } from '../index';

export const adminMigrateHandler = async (c: Context<{ Bindings: Env }>) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return c.json({
        error: 'Missing database configuration',
      }, 500);
    }

    // Extract connection details from SUPABASE_URL
    // Format: https://xxxxx.supabase.co
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

    // Use Supabase's Database endpoint for executing SQL
    // This requires using the connection pooler or SQL editor API
    const dbApiUrl = `${SUPABASE_URL}/rest/v1/rpc/exec`;

    // Migration SQL - split into individual statements for better compatibility
    const statements = [
      `CREATE TABLE IF NOT EXISTS llm_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        project_id TEXT NOT NULL,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        metadata JSONB DEFAULT '{}'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_llm_usage_project_id ON llm_usage(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_usage_timestamp ON llm_usage(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_usage_project_timestamp ON llm_usage(project_id, timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_usage_provider ON llm_usage(provider)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_usage_model ON llm_usage(model)`,
      `ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS "Public can read llm_usage" ON llm_usage`,
      `DROP POLICY IF EXISTS "Authenticated users can insert llm_usage" ON llm_usage`,
      `DROP POLICY IF EXISTS "Service role can manage llm_usage" ON llm_usage`,
      `CREATE POLICY "Public can read llm_usage" ON llm_usage FOR SELECT USING (true)`,
      `CREATE POLICY "Authenticated users can insert llm_usage" ON llm_usage FOR INSERT TO authenticated WITH CHECK (true)`,
      `CREATE POLICY "Service role can manage llm_usage" ON llm_usage FOR ALL TO service_role USING (true) WITH CHECK (true)`,
      `GRANT SELECT, INSERT ON llm_usage TO authenticated`,
      `GRANT ALL ON llm_usage TO service_role`,
    ];

    console.log(`Executing ${statements.length} SQL statements...`);

    // Note: Since Supabase REST API doesn't support raw SQL execution,
    // we'll return the SQL for manual execution instead
    return c.json({
      success: false,
      message: 'Automated migration not supported via REST API',
      instructions: [
        '1. Open Supabase Dashboard: https://app.supabase.com',
        '2. Navigate to SQL Editor',
        '3. Copy and execute the SQL from: infra/supabase/migrations/20250107130000_create_llm_usage.sql',
        '4. Or use psql command line with connection string from Project Settings',
      ],
      project_url: SUPABASE_URL,
      migration_file: 'infra/supabase/migrations/20250107130000_create_llm_usage.sql',
      alternative: 'Use the provided SQL statements above in Supabase SQL Editor',
      sql_statements: statements,
    });

  } catch (error) {
    console.error('Admin migration handler error:', error);
    return c.json({
      error: 'Migration preparation failed',
      message: error instanceof Error ? error.message : String(error),
    }, 500);
  }
};
