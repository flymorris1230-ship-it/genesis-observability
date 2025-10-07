# Genesis Observability - Quick Start Guide

**Get up and running in 15 minutes** ⚡

---

## 📋 Prerequisites

- ✅ Node.js 18+ installed
- ✅ Git installed
- ✅ A Cloudflare account (free tier works)
- ✅ A Supabase account (free tier works)
- ✅ A Vercel account (free tier works) - optional, for Dashboard

---

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Supabase (5 minutes)

#### 1.1 Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `genesis-observability`
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
4. Wait ~2 minutes for project creation

#### 1.2 Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire content from `scripts/setup-supabase.sql`
4. Paste and click **"Run"**
5. You should see: "Setup Complete!" message

#### 1.3 Get Your Credentials

1. Go to **Settings → API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **service_role key**: `eyJ...` (under "Project API keys")

⚠️ **Keep service_role key secret!** Never commit it to git.

---

### Step 2: Deploy obs-edge Worker (5 minutes)

#### 2.1 Install Dependencies

```bash
cd apps/obs-edge
pnpm install  # or npm install
```

#### 2.2 Set Worker Secrets

```bash
# Set Supabase URL
echo "https://YOUR_PROJECT.supabase.co" | npx wrangler secret put SUPABASE_URL

# Set Supabase Service Key
echo "YOUR_SERVICE_KEY" | npx wrangler secret put SUPABASE_SERVICE_KEY

# Generate and set API Key (for authentication)
API_KEY=$(openssl rand -hex 32)
echo $API_KEY | npx wrangler secret put API_KEY

# Save this API_KEY for later!
echo "Your API Key: $API_KEY"
```

#### 2.3 Deploy Worker

```bash
npx wrangler deploy
```

✅ **Done!** Your Worker is now live at `https://obs-edge.YOUR_SUBDOMAIN.workers.dev`

---

### Step 3: Deploy obs-dashboard (5 minutes)

#### 3.1 Configure Environment Variables

Create `apps/obs-dashboard/.env.production`:

```bash
NEXT_PUBLIC_OBS_EDGE_URL=https://obs-edge.YOUR_SUBDOMAIN.workers.dev
NEXT_PUBLIC_OBS_EDGE_API_KEY=YOUR_API_KEY_FROM_STEP_2
```

#### 3.2 Build and Deploy

```bash
cd apps/obs-dashboard
pnpm install
pnpm run build

# Deploy to Vercel
npx vercel login  # first time only
npx vercel deploy --prod
```

✅ **Done!** Your Dashboard is live!

---

## 🧪 Verify Your Setup

### Test 1: Worker Health Check

```bash
curl https://obs-edge.YOUR_SUBDOMAIN.workers.dev/
```

Expected: HTTP 200

### Test 2: Ingest Test Data

```bash
curl -X POST "https://obs-edge.YOUR_SUBDOMAIN.workers.dev/ingest" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test-project",
    "model": "gpt-4",
    "provider": "openai",
    "input_tokens": 1000,
    "output_tokens": 500,
    "latency_ms": 1200
  }'
```

Expected Response:
```json
{
  "success": true,
  "id": "uuid-here",
  "cost_usd": 0.045
}
```

### Test 3: Query Metrics

```bash
curl "https://obs-edge.YOUR_SUBDOMAIN.workers.dev/metrics?project_id=test-project" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Expected: JSON with metrics data

### Test 4: Check Dashboard

1. Open your Vercel deployment URL
2. You should see the Genesis Observability Dashboard
3. Metrics for `test-project` should appear in charts

---

## 🎯 Alternative: One-Click Deployment

We've prepared an automated script that does all the above:

```bash
# From project root
./scripts/deploy-all.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Deploy obs-edge Worker
- ✅ Deploy obs-dashboard
- ✅ Verify deployment

---

## 📖 Next Steps

### Integrate with Your LLM Application

Add this to your app after each LLM API call:

```typescript
import fetch from 'node-fetch';

// After calling OpenAI/Anthropic/etc.
const response = await openai.chat.completions.create({/*...*/});

// Send usage data to obs-edge
await fetch('https://obs-edge.YOUR_SUBDOMAIN.workers.dev/ingest', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    project_id: 'my-app',
    model: response.model,
    provider: 'openai',
    input_tokens: response.usage.prompt_tokens,
    output_tokens: response.usage.completion_tokens,
    latency_ms: performance.now() - startTime
  })
});
```

### Run End-to-End Tests

```bash
./scripts/test-e2e.sh
```

This will:
- Test authentication
- Ingest sample data
- Query metrics and costs
- Verify rate limiting

### Explore the Dashboard

- **Metrics Charts**: View token usage and latency trends
- **Cost Analysis**: Track spending by model and provider
- **Filters**: Filter by project and date range

---

## 📚 Full Documentation

For detailed documentation, see:

- [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) - System architecture
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [PHASE_3_DEPLOYMENT_SUMMARY.md](PHASE_3_DEPLOYMENT_SUMMARY.md) - Deployment status
- [apps/obs-edge/TEST_REPORT.md](apps/obs-edge/TEST_REPORT.md) - Test coverage
- [PHASE_3_QUALITY_REPORT.md](PHASE_3_QUALITY_REPORT.md) - Quality metrics

---

## 🆘 Troubleshooting

### Problem: "Invalid API key" error

**Solution**: Verify your API_KEY matches in:
- Worker secrets (`wrangler secret list`)
- Dashboard `.env.production`
- Your API requests

### Problem: "supabaseUrl is required" error

**Solution**: Set SUPABASE_URL and SUPABASE_SERVICE_KEY:
```bash
cd apps/obs-edge
echo "YOUR_URL" | npx wrangler secret put SUPABASE_URL
echo "YOUR_KEY" | npx wrangler secret put SUPABASE_SERVICE_KEY
```

### Problem: Dashboard shows "Failed to fetch"

**Possible causes**:
1. Worker not deployed → Check `wrangler deployments list`
2. Wrong API key → Verify `.env.production`
3. CORS issues → Check Worker is deployed correctly

### Problem: Tests fail with "Connection refused"

**Solution**: Verify Worker URL is correct:
```bash
# Check current deployment
cd apps/obs-edge
npx wrangler deployments list
```

---

## 💡 Tips

### Generate Secure API Keys

```bash
# 256-bit random key
openssl rand -hex 32
```

### List Worker Secrets

```bash
cd apps/obs-edge
npx wrangler secret list
```

### View Worker Logs

```bash
cd apps/obs-edge
npx wrangler tail
```

### Check Supabase Data

```sql
-- In Supabase SQL Editor
SELECT * FROM llm_usage ORDER BY created_at DESC LIMIT 10;
```

---

## 🎉 You're All Set!

Your Genesis Observability platform is now running!

**What you have**:
- ✅ Global edge API (Cloudflare Workers)
- ✅ Scalable database (Supabase PostgreSQL)
- ✅ Beautiful dashboard (Vercel + Next.js)
- ✅ Full LLM usage tracking
- ✅ Cost analysis
- ✅ Performance monitoring

**Next**: Integrate it with your LLM applications and start tracking!

---

**Need Help?** Check out the full [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) or open an issue on GitHub.
