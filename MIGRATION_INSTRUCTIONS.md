# LLM Usage Table Migration Instructions

## Quick Steps

1. **Open Supabase Dashboard** (already opened in browser)
   - Navigate to your Genesis Observability project
   - Click on "SQL Editor" in the left sidebar

2. **Execute Migration SQL**
   - Click "New Query"
   - Copy the SQL from the file: `infra/supabase/migrations/20250107130000_create_llm_usage.sql`
   - Paste into the SQL editor
   - Click "Run" button

3. **Verify Success**
   - You should see: "Success. No rows returned"
   - Check the "Table Editor" - you should see `llm_usage` table

## Alternative: Use psql Command Line

If you prefer command line, you can find your database connection string in:
- Supabase Dashboard → Project Settings → Database → Connection String

Then run:
```bash
psql "YOUR_CONNECTION_STRING" -f infra/supabase/migrations/20250107130000_create_llm_usage.sql
```

## What This Migration Creates

- `llm_usage` table with columns:
  - `id`, `created_at`, `project_id`, `model`, `provider`
  - `input_tokens`, `output_tokens`, `total_tokens`
  - `cost_usd`, `latency_ms`, `timestamp`, `metadata`

- 5 indexes for efficient queries
- Row Level Security (RLS) policies
- Permissions for authenticated users and service role

## Next Steps

After successful migration:
1. Insert test data (7 days of LLM usage)
2. Verify /metrics and /costs APIs work
3. Create unified dashboard

---

**Status**: ⏳ Waiting for migration execution
**File Location**: `/Users/morrislin/Desktop/genesis-observability/infra/supabase/migrations/20250107130000_create_llm_usage.sql`
