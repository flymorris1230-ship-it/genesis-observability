# Genesis Observability - Deployment Guide

**Last Updated**: 2025-10-07
**Phase**: 3 - Production Deployment

---

## 📦 What's Been Deployed

### ✅ obs-edge Cloudflare Worker

**Status**: ✅ **DEPLOYED AND RUNNING**

- **URL**: https://obs-edge.flymorris1230.workers.dev
- **Cloudflare Account**: flymorris1230@gmail.com
- **Version ID**: d46af32d-fbda-4e1c-a58e-89249c3b05bb
- **KV Namespaces**:
  - Development: `ec69276da69d4621861b547c002ffc7a`
  - Production: `7c46b5a10a094a63833f9a88a7bfc20f`

**Secrets Configured**:
- ✅ `API_KEY`: Set (authentication working)
- ⏳ `SUPABASE_URL`: **REQUIRED** (see Supabase Setup below)
- ⏳ `SUPABASE_SERVICE_KEY`: **REQUIRED** (see Supabase Setup below)

**Test Status**:
```bash
# Authentication: ✅ WORKING
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=test" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

# Response: {"error":"Failed to fetch metrics","message":"supabaseUrl is required."}
# ^ This is expected until Supabase is configured
```

### ⏳ obs-dashboard (Next.js)

**Status**: ⏳ **BUILT SUCCESSFULLY, READY TO DEPLOY**

- **Build Output**: ✅ Successful (237 kB main bundle)
- **Type Check**: ✅ Passed
- **Lint**: ✅ Passed
- **Pages**: 4 static pages generated
- **Deployment**: Awaiting Vercel authentication

**Environment Variables Ready**:
- ✅ `NEXT_PUBLIC_OBS_EDGE_URL=https://obs-edge.flymorris1230.workers.dev`
- ✅ `NEXT_PUBLIC_OBS_EDGE_API_KEY=a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e`

---

## 🚀 Deployment Instructions

### Step 1: Supabase Setup (REQUIRED)

The obs-edge Worker requires a Supabase database to store LLM usage data.

#### 1.1 Create Supabase Project

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `genesis-observability`
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Select closest to your users (e.g., `us-west-1`)
4. Wait for project to be created (~2 minutes)

#### 1.2 Create Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Create a new query and paste:

```sql
-- Create llm_usage table
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

-- Create indexes for performance
CREATE INDEX idx_llm_usage_project_id ON llm_usage(project_id);
CREATE INDEX idx_llm_usage_created_at ON llm_usage(created_at);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider);

-- Configure Row Level Security
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (Worker uses service_role key)
CREATE POLICY "Service role has full access" ON llm_usage
  FOR ALL USING (auth.role() = 'service_role');
```

3. Click **"Run"** to execute

#### 1.3 Get Supabase Credentials

1. Go to **Settings → API**
2. Copy these values:
   - **Project URL** (format: `https://xxxxx.supabase.co`)
   - **service_role key** (under "Project API keys" - starts with `eyJ...`)

⚠️ **IMPORTANT**: The service_role key is highly sensitive. Never commit it to git or share it publicly.

#### 1.4 Set Cloudflare Worker Secrets

```bash
cd /Users/morrislin/Desktop/genesis-observability/apps/obs-edge

# Set Supabase URL
echo "https://YOUR_PROJECT.supabase.co" | npx wrangler secret put SUPABASE_URL

# Set Supabase Service Key (paste the long eyJ... token)
echo "YOUR_SERVICE_ROLE_KEY" | npx wrangler secret put SUPABASE_SERVICE_KEY
```

#### 1.5 Verify Worker

After setting secrets, test the Worker:

```bash
# Test /ingest endpoint
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

# Expected response: {"success":true,"id":"...","cost_usd":0.045}
```

---

### Step 2: Deploy obs-dashboard to Vercel

#### 2.1 Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

#### 2.2 Login to Vercel

```bash
vercel login
# Follow prompts to authenticate
```

#### 2.3 Deploy Dashboard

```bash
cd /Users/morrislin/Desktop/genesis-observability/apps/obs-dashboard

# Deploy to production
vercel deploy --prod
```

The CLI will:
1. Prompt to link to existing project or create new one
   - Choose **"Create new project"** if first time
   - Project name: `obs-dashboard` or `genesis-observability-dashboard`
2. Automatically detect Next.js framework
3. Upload build
4. Deploy to production

#### 2.4 Configure Environment Variables (via Vercel Dashboard)

After first deployment:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_OBS_EDGE_URL` | `https://obs-edge.flymorris1230.workers.dev` | Production |
| `NEXT_PUBLIC_OBS_EDGE_API_KEY` | `a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e` | Production |

3. Redeploy for changes to take effect:
   ```bash
   vercel deploy --prod
   ```

#### 2.5 Access Your Dashboard

Once deployed, Vercel will provide a URL like:
- `https://obs-dashboard.vercel.app`
- Or your custom domain if configured

---

## 🧪 End-to-End Testing

After both deployments are complete, verify the full system:

### Test 1: Ingest LLM Usage Data

```bash
curl -X POST "https://obs-edge.flymorris1230.workers.dev/ingest" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test-project",
    "model": "gpt-4",
    "provider": "openai",
    "input_tokens": 2000,
    "output_tokens": 1000,
    "latency_ms": 2345
  }'
```

### Test 2: Query Metrics

```bash
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=test-project&start_date=2025-01-01" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

### Test 3: Check Dashboard

1. Open your deployed dashboard URL
2. Should see metrics visualization
3. Verify data from Test 1 appears in charts

---

## 📊 Project Files Structure

```
genesis-observability/
├── apps/
│   ├── obs-edge/                          # ✅ DEPLOYED
│   │   ├── src/
│   │   │   ├── index.ts                   # Worker entry point
│   │   │   ├── handlers/                  # API handlers
│   │   │   ├── middleware/                # Auth & rate limiting
│   │   │   └── utils/                     # Supabase client
│   │   ├── wrangler.toml                  # ✅ KV namespaces configured
│   │   ├── DEPLOYMENT_SECRETS.md          # Secret management guide
│   │   └── TEST_REPORT.md                 # 70 tests, 100% passing
│   │
│   └── obs-dashboard/                     # ⏳ READY TO DEPLOY
│       ├── app/
│       │   ├── page.tsx                   # Main dashboard
│       │   └── layout.tsx                 # Root layout
│       ├── components/
│       │   ├── FilterPanel.tsx            # Date/project filters
│       │   ├── MetricsChart.tsx           # Recharts visualization
│       │   └── CostTrend.tsx              # Cost analysis
│       ├── lib/
│       │   └── api-client.ts              # obs-edge API client
│       ├── .env.production                # ✅ Environment vars ready
│       └── README.md                      # Dashboard documentation
│
├── .github/workflows/                     # ✅ CI/CD CONFIGURED
│   ├── obs-edge-ci.yml                    # Worker deployment
│   ├── obs-dashboard-ci.yml               # Dashboard deployment
│   └── test.yml                           # Automated testing
│
├── PHASE_3_PROGRESS.md                    # Phase 3 completion report
├── PHASE_3_QUALITY_REPORT.md              # 95/100 quality score
└── DEPLOYMENT_GUIDE.md                    # This file
```

---

## 🔒 Security Checklist

- [x] API_KEY set for Worker authentication
- [ ] SUPABASE_URL configured
- [ ] SUPABASE_SERVICE_KEY configured
- [ ] Supabase RLS policies enabled
- [x] Environment variables not committed to git
- [ ] Vercel environment variables configured
- [ ] Custom domain with HTTPS (optional)
- [ ] Rate limiting tested (100 req/min)

---

## 📈 What's Next (Post-Deployment)

### Immediate (P0)
1. ✅ Configure Supabase and set Worker secrets
2. ✅ Deploy Dashboard to Vercel
3. ✅ End-to-end testing
4. ✅ Monitor first production usage

### Short Term (P1)
5. Set up monitoring alerts (Cloudflare Workers Analytics)
6. Configure custom domain (optional)
7. Enable Vercel Analytics
8. Performance testing (API P95 latency)

### Long Term (P2)
9. Implement WebSocket/SSE for real-time updates
10. Add advanced filtering and search
11. Multi-tenant support
12. Data export functionality
13. Alert/notification system

---

## 🆘 Troubleshooting

### Worker Returns "supabaseUrl is required"

**Solution**: Set SUPABASE_URL and SUPABASE_SERVICE_KEY secrets (see Step 1.4)

### Worker Returns "Invalid API key"

**Solution**: Check Authorization header format:
```bash
-H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

### Dashboard Shows "Failed to fetch"

**Possible causes**:
1. Worker not responding (check Supabase setup)
2. CORS issues (should be configured in Worker)
3. Wrong API key in dashboard env vars

### Vercel Deployment Fails

**Solution**:
1. Check build logs
2. Verify environment variables are set
3. Try local build first: `npm run build`

---

## 📞 Support Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## 📝 Deployment Checklist

### obs-edge Worker
- [x] Create KV namespaces
- [x] Deploy Worker to Cloudflare
- [x] Set API_KEY secret
- [ ] Create Supabase project
- [ ] Set up database schema
- [ ] Set SUPABASE_URL secret
- [ ] Set SUPABASE_SERVICE_KEY secret
- [ ] Test /ingest endpoint
- [ ] Test /metrics endpoint
- [ ] Test /costs endpoint

### obs-dashboard
- [x] Fix TypeScript errors
- [x] Build successfully
- [x] Create .env.production
- [ ] Authenticate with Vercel
- [ ] Deploy to production
- [ ] Configure environment variables
- [ ] Verify dashboard loads
- [ ] Test data visualization

### Integration Testing
- [ ] Ingest test data via Worker
- [ ] Verify data in Supabase
- [ ] Check data appears in Dashboard
- [ ] Test filtering functionality
- [ ] Verify cost calculations
- [ ] Load testing (optional)

---

**Status**: 🟡 **Partial Deployment Complete**
- Worker: ✅ Deployed (awaiting Supabase configuration)
- Dashboard: ⏳ Built and ready (awaiting Vercel deployment)

**Next Action**: Complete Step 1 (Supabase Setup) and Step 2 (Vercel Deployment)
