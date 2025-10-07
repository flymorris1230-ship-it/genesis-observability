# obs-edge Deployment Secrets

**Worker URL**: https://obs-edge.flymorris1230.workers.dev
**Cloudflare Account**: flymorris1230@gmail.com
**Version ID**: d46af32d-fbda-4e1c-a58e-89249c3b05bb

## 🔒 Required Secrets

### 1. API_KEY
**Purpose**: Bearer token authentication for Worker API endpoints
**Current Value**: `a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e`
**Status**: ✅ Set

**Set command**:
```bash
cd /Users/morrislin/Desktop/genesis-observability/apps/obs-edge
echo "a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" | npx wrangler secret put API_KEY
```

### 2. SUPABASE_URL
**Purpose**: Supabase project URL for database operations
**Format**: `https://your-project.supabase.co`
**Status**: ⏳ REQUIRED - Need to configure with actual Supabase project URL

**Set command**:
```bash
# Replace with actual Supabase URL
echo "https://your-project.supabase.co" | npx wrangler secret put SUPABASE_URL
```

**How to find**:
1. Go to https://app.supabase.com
2. Select your project (or create new one for genesis-observability)
3. Go to Settings → API
4. Copy "Project URL"

### 3. SUPABASE_SERVICE_KEY
**Purpose**: Supabase service role key for authenticated database operations
**Format**: Long JWT token starting with `eyJ...`
**Status**: ⏳ REQUIRED - Need to configure with actual Supabase service key

**Set command**:
```bash
# Replace with actual service key
echo "your_service_key_here" | npx wrangler secret put SUPABASE_SERVICE_KEY
```

**How to find**:
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy "service_role" key (under "Project API keys")
5. ⚠️ **NEVER commit this key or share it publicly**

---

## 🗂️ Supabase Database Schema

The obs-edge Worker expects the following table structure:

### Table: `llm_usage`

```sql
CREATE TABLE llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  latency_ms INTEGER,
  cost_usd DECIMAL(10, 6),
  metadata JSONB,
  tags TEXT[],
  user_id TEXT,
  session_id TEXT
);

-- Indexes for performance
CREATE INDEX idx_llm_usage_project_id ON llm_usage(project_id);
CREATE INDEX idx_llm_usage_created_at ON llm_usage(created_at);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider);
```

### Setup Instructions

1. **Create Supabase Project** (if not exists):
   - Go to https://app.supabase.com
   - Click "New Project"
   - Name: "genesis-observability"
   - Region: Choose closest to your users
   - Database password: Use strong password

2. **Create Table**:
   - Go to SQL Editor
   - Paste the schema above
   - Click "Run"

3. **Configure RLS** (Row Level Security):
   ```sql
   -- Disable RLS for service_role access (Worker uses service_role)
   ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

   -- Allow service_role full access
   CREATE POLICY "Service role has full access" ON llm_usage
     FOR ALL USING (auth.role() = 'service_role');
   ```

---

## 📋 Deployment Checklist

- [x] Create Cloudflare KV namespaces
  - [x] Development: `ec69276da69d4621861b547c002ffc7a`
  - [x] Production: `7c46b5a10a094a63833f9a88a7bfc20f`
- [x] Deploy Worker to Cloudflare
  - [x] URL: https://obs-edge.flymorris1230.workers.dev
- [x] Generate and set API_KEY
- [ ] Create Supabase project for genesis-observability
- [ ] Set up database schema (`llm_usage` table)
- [ ] Configure RLS policies
- [ ] Set SUPABASE_URL secret
- [ ] Set SUPABASE_SERVICE_KEY secret
- [ ] Test /ingest endpoint
- [ ] Test /metrics endpoint
- [ ] Test /costs endpoint
- [ ] Verify rate limiting (100 req/min)

---

## 🧪 Testing the Worker

### Test Authentication

```bash
# Should return "Invalid API key"
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=test" \
  -H "Authorization: Bearer wrong-key"

# Should work (after Supabase is configured)
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=test" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

### Test Ingest

```bash
curl -X POST "https://obs-edge.flymorris1230.workers.dev/ingest" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test-project",
    "model": "gpt-4",
    "provider": "openai",
    "input_tokens": 1000,
    "output_tokens": 500,
    "latency_ms": 1234
  }'
```

### Test Metrics

```bash
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=test-project&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

### Test Costs

```bash
curl "https://obs-edge.flymorris1230.workers.dev/costs?project_id=test-project&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

---

## 🔄 Secret Management

### List all secrets
```bash
npx wrangler secret list
```

### Update a secret
```bash
echo "new_value" | npx wrangler secret put SECRET_NAME
```

### Delete a secret
```bash
npx wrangler secret delete SECRET_NAME
```

---

## 📊 Next Steps

1. ✅ Worker deployed successfully
2. ⏳ Configure Supabase project
3. ⏳ Set up database schema
4. ⏳ Set Supabase secrets
5. ⏳ Test all endpoints end-to-end
6. ⏳ Deploy obs-dashboard
7. ⏳ Configure dashboard environment variables
8. ⏳ Full integration testing

---

**Last Updated**: 2025-10-07
**Deployment Date**: 2025-10-07 13:53
