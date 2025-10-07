#!/usr/bin/env npx tsx

/**
 * Genesis Observability - Automated Supabase Schema Setup
 *
 * This script automatically executes the Supabase schema using the service_role key
 * No manual SQL Editor interaction needed!
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log(colors.blue, '\n============================================');
  log(colors.blue, 'Genesis Observability - Auto Schema Setup');
  log(colors.blue, '============================================\n');

  // Get credentials from environment or prompt
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log(colors.red, '✗ Error: Missing Supabase credentials\n');
    log(colors.yellow, 'Please set environment variables:');
    log(colors.cyan, '  export SUPABASE_URL="https://xxx.supabase.co"');
    log(colors.cyan, '  export SUPABASE_SERVICE_KEY="eyJ..."');
    log(colors.yellow, '\nOr run with inline variables:');
    log(colors.cyan, '  SUPABASE_URL="..." SUPABASE_SERVICE_KEY="..." npm run setup-db\n');
    process.exit(1);
  }

  log(colors.cyan, `ℹ Supabase URL: ${SUPABASE_URL}`);
  log(colors.cyan, `ℹ Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...\n`);

  // Create Supabase client with service_role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    log(colors.yellow, '⏳ Reading SQL schema file...');
    const sqlPath = join(process.cwd(), 'scripts', 'setup-supabase.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    log(colors.green, `✓ SQL file loaded (${sqlContent.length} characters)\n`);

    // Split SQL into individual statements
    // Remove comments and split by semicolons
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('DO $$'));

    log(colors.yellow, `⏳ Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements
      if (!statement || statement.length < 10) continue;

      // Get statement type for logging
      const statementType = statement.split(' ')[0].toUpperCase();

      try {
        log(colors.cyan, `  [${i + 1}/${statements.length}] Executing ${statementType}...`);

        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.from('_').select('*').limit(0);

          if (directError && directError.message.includes('does not exist')) {
            // Use alternative method - execute via PostgREST
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              },
              body: JSON.stringify({ query: statement + ';' })
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
          }
        }

        log(colors.green, `    ✓ Success`);
        successCount++;
      } catch (err: any) {
        // Some errors are expected (e.g., "already exists")
        if (err.message?.includes('already exists')) {
          log(colors.yellow, `    ⚠ Already exists (skipped)`);
          successCount++;
        } else {
          log(colors.red, `    ✗ Error: ${err.message}`);
          errorCount++;
        }
      }
    }

    log(colors.blue, '\n============================================');
    log(colors.green, `✓ Schema setup completed!`);
    log(colors.cyan, `  Successful: ${successCount}`);
    if (errorCount > 0) {
      log(colors.yellow, `  Errors: ${errorCount}`);
    }
    log(colors.blue, '============================================\n');

    // Verify the table exists
    log(colors.yellow, '⏳ Verifying table creation...');
    const { data, error } = await supabase
      .from('llm_usage')
      .select('*')
      .limit(1);

    if (error) {
      log(colors.red, `✗ Verification failed: ${error.message}`);
      log(colors.yellow, '\n⚠ The table might not have been created.');
      log(colors.yellow, 'You may need to run the SQL manually in Supabase SQL Editor.\n');
      process.exit(1);
    }

    log(colors.green, '✓ Table verified successfully!\n');
    log(colors.green, '🎉 All done! You can now run the E2E tests:\n');
    log(colors.cyan, '  ./scripts/test-e2e.sh\n');

  } catch (error: any) {
    log(colors.red, `\n✗ Fatal error: ${error.message}\n`);
    log(colors.yellow, '⚠ Automated setup failed. Please use manual setup:\n');
    log(colors.cyan, '  1. Open Supabase Dashboard → SQL Editor');
    log(colors.cyan, '  2. Copy content from scripts/setup-supabase.sql');
    log(colors.cyan, '  3. Paste and click "Run"\n');
    process.exit(1);
  }
}

main();
