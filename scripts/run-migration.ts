#!/usr/bin/env node
/**
 * Migration script to create llm_usage table
 * Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  console.error('');
  console.error('Usage:');
  console.error('  SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npx tsx scripts/run-migration.ts');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting migration...');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read migration SQL
  const migrationPath = join(__dirname, '..', 'infra', 'supabase', 'migrations', '20250107130000_create_llm_usage.sql');
  console.log(`📄 Reading migration from: ${migrationPath}`);

  const sql = readFileSync(migrationPath, 'utf-8');
  console.log(`📝 Migration SQL length: ${sql.length} characters`);

  try {
    // Execute migration using raw SQL
    console.log('⚙️  Executing migration...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      // If exec_sql function doesn't exist, try using the REST API directly
      console.log('⚠️  exec_sql RPC not available, trying direct query...');

      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        throw new Error(`Migration failed: ${await response.text()}`);
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify table was created
    console.log('🔍 Verifying table creation...');
    const { data: tableCheck, error: checkError } = await supabase
      .from('llm_usage')
      .select('*')
      .limit(0);

    if (checkError) {
      console.error('❌ Table verification failed:', checkError);
      process.exit(1);
    }

    console.log('✅ Table llm_usage verified successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
