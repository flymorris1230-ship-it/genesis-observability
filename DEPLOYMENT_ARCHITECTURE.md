# Genesis Observability - 部署架構文檔

**版本**: v1.0 (Phase 3)
**最後更新**: 2025-10-07
**狀態**: ✅ Worker 已部署，🟡 Dashboard 待部署

---

## 📋 目錄

- [系統架構概覽](#系統架構概覽)
- [API 資料流向](#api-資料流向)
- [認證與安全架構](#認證與安全架構)
- [部署平台架構](#部署平台架構)
- [完整使用流程](#完整使用流程)
- [資料庫 Schema](#資料庫-schema)
- [URL 與端點](#url-與端點)
- [環境變數配置](#環境變數配置)
- [性能與擴展性](#性能與擴展性)

---

## 🏗️ 系統架構概覽

```
┌─────────────────────────────────────────────────────────────────┐
│                          用戶瀏覽器                              │
│                     (https://你的域名.vercel.app)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    obs-dashboard (Vercel)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js 15 App Router                                   │   │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────┐      │   │
│  │  │ FilterPanel│  │ MetricsChart │  │ CostTrend   │      │   │
│  │  └────────────┘  └──────────────┘  └─────────────┘      │   │
│  │                                                           │   │
│  │  React Query (資料獲取 & 快取)                           │   │
│  │  API Client (obs-edge 整合)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API
                             │ Authorization: Bearer {API_KEY}
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            obs-edge Worker (Cloudflare Workers)                  │
│        https://obs-edge.flymorris1230.workers.dev                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API 端點                               │   │
│  │  POST /ingest   - 接收 LLM 使用資料                      │   │
│  │  GET  /metrics  - 查詢使用指標 (tokens, latency)         │   │
│  │  GET  /costs    - 查詢成本分析                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  中介層 (Middleware)                      │   │
│  │  ┌──────────────┐         ┌──────────────────┐           │   │
│  │  │ Auth         │  ───>   │ Rate Limiting    │           │   │
│  │  │ (Bearer)     │         │ (100 req/min)    │           │   │
│  │  └──────────────┘         └──────────────────┘           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Cloudflare KV (Rate Limiting 儲存)               │   │
│  │         Namespace: RATE_LIMIT                             │   │
│  │         - Dev: ec69276da69d4621861b547c002ffc7a           │   │
│  │         - Prod: 7c46b5a10a094a63833f9a88a7bfc20f          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Supabase JS Client
                             │ service_role key
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                         │
│               https://你的專案.supabase.co                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Table: llm_usage                                         │   │
│  │  ┌────────────┬─────────────┬──────────┬─────────┐       │   │
│  │  │ id (UUID)  │ project_id  │ model    │ provider│       │   │
│  │  │ created_at │ input_tokens│ output   │ latency │       │   │
│  │  │ cost_usd   │ metadata    │ tags     │ user_id │       │   │
│  │  └────────────┴─────────────┴──────────┴─────────┘       │   │
│  │                                                           │   │
│  │  Indexes:                                                │   │
│  │  - idx_llm_usage_project_id                              │   │
│  │  - idx_llm_usage_created_at                              │   │
│  │  - idx_llm_usage_provider                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📡 API 資料流向

### 1. 寫入流程 (Ingest)

```
LLM 應用程式
    │
    │ POST /ingest
    │ {
    │   "project_id": "your-project",
    │   "model": "gpt-4",
    │   "input_tokens": 1000,
    │   "output_tokens": 500,
    │   "latency_ms": 1234
    │ }
    ▼
obs-edge Worker
    │
    ├─> Auth Middleware (驗證 API_KEY)
    │   └─> 比對: env.API_KEY === request.header.Authorization
    │
    ├─> Rate Limit (檢查 KV，100 req/min)
    │   ├─> KV.get(`rate_limit:${ip}`)
    │   ├─> 檢查計數 < 100
    │   └─> KV.put(`rate_limit:${ip}`, count + 1, {ttl: 60})
    │
    ├─> 計算成本 (基於 model + tokens)
    │   └─> cost = (input_tokens + output_tokens) / 1M * model_price
    │
    └─> Supabase.insert('llm_usage', data)
            │
            ▼
        PostgreSQL
        (資料持久化)
            │
            └─> 回傳 {success: true, id: "uuid", cost_usd: 0.045}
```

### 2. 讀取流程 (Dashboard)

```
用戶瀏覽器
    │
    │ 開啟 Dashboard
    │
    ▼
obs-dashboard (Vercel)
    │
    │ React Query 發起請求
    │ GET /metrics?project_id=xxx&start_date=...&end_date=...
    │
    ▼
obs-edge Worker
    │
    ├─> Auth Middleware (驗證 Bearer token)
    │
    ├─> Rate Limit (檢查請求頻率)
    │
    └─> Supabase.query('llm_usage')
            │
            ├─> WHERE project_id = ? AND created_at BETWEEN ? AND ?
            ├─> 聚合計算:
            │   - SUM(input_tokens + output_tokens) as total_tokens
            │   - AVG(latency_ms) as avg_latency
            │   - SUM(cost_usd) as total_cost
            │   - COUNT(*) as total_requests
            │   - GROUP BY date, provider
            └─> 返回 JSON
                │
                ▼
            Dashboard
                │
                ├─> MetricsChart (Recharts 渲染雙軸折線圖)
                │   - tokens 趨勢
                │   - latency 趨勢
                │
                ├─> CostTrend (Recharts 渲染柱狀圖 + 圓餅圖)
                │   - 每日成本
                │   - 供應商分佈
                │
                └─> 即時更新顯示 (React Query 自動 refetch)
```

---

## 🔐 認證與安全架構

### 認證層級

```
┌──────────────────────────────────────────────────────────┐
│                    認證層級                              │
└──────────────────────────────────────────────────────────┘

Level 1: Dashboard → Worker (客戶端認證)
┌────────────────────────────────────────────┐
│ Dashboard (.env.production)                │
│ NEXT_PUBLIC_OBS_EDGE_API_KEY               │
│ = a590aec22adeab9bb9fcf8ff81ccf790...      │
│   (256-bit 隨機生成)                       │
└────────────────┬───────────────────────────┘
                 │
                 │ 每個 API 請求帶上
                 │ Authorization: Bearer {API_KEY}
                 ▼
┌────────────────────────────────────────────┐
│ Worker Auth Middleware                     │
│ - 解析 Authorization header                │
│ - 驗證格式: "Bearer <token>"               │
│ - 比對: token === env.API_KEY              │
│ - 401 Unauthorized if invalid              │
│ - 403 Forbidden if format wrong            │
└────────────────┬───────────────────────────┘
                 │
                 │ 認證通過
                 ▼

Level 2: Worker → Supabase (服務端認證)
┌────────────────────────────────────────────┐
│ Worker (Cloudflare Secrets)                │
│ SUPABASE_SERVICE_KEY                       │
│ = eyJhbGc... (service_role JWT)            │
│   (完整資料庫權限)                         │
└────────────────┬───────────────────────────┘
                 │
                 │ 每個 DB 操作帶上
                 │ Authorization: Bearer {SERVICE_KEY}
                 ▼
┌────────────────────────────────────────────┐
│ Supabase Row Level Security (RLS)          │
│ - 驗證 JWT 簽名                            │
│ - 檢查 role: service_role                  │
│ - 允許完整 CRUD 操作                       │
│ - 其他角色需要明確授權 policy              │
└────────────────────────────────────────────┘
```

### Rate Limiting 機制

```typescript
// Rate Limiting 實作邏輯
async function rateLimitMiddleware(c: Context, next: Next) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:${ip}`;

  // 從 KV 取得當前計數
  const count = parseInt(await c.env.RATE_LIMIT.get(key) || '0');

  // 檢查是否超過限制
  if (count >= 100) {
    return c.json({
      error: 'Rate limit exceeded',
      limit: 100,
      window: '1 minute'
    }, 429);
  }

  // 增加計數並設置 60 秒 TTL
  await c.env.RATE_LIMIT.put(key, (count + 1).toString(), {
    expirationTtl: 60
  });

  await next();
}
```

### 安全措施清單

- ✅ **API Key 認證**: 256-bit 隨機生成的 Bearer token
- ✅ **Rate Limiting**: 100 requests/min per IP，基於 Cloudflare KV
- ✅ **HTTPS Only**: 所有通訊強制使用 TLS 1.3
- ✅ **Environment Secrets**: API keys 儲存在 Cloudflare Secrets，不在代碼中
- ✅ **RLS (Row Level Security)**: Supabase 資料庫行級安全策略
- ✅ **CORS**: 可配置允許的來源域名
- ✅ **Input Validation**: 所有 API 輸入驗證 (Zod schema)
- ⏳ **Custom Domain**: 建議使用自訂域名 (如 api.observability.yourdomain.com)

---

## 🌐 部署平台架構

```
┌─────────────────────────────────────────────────────────────┐
│                     部署環境總覽                            │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Vercel          │      │  Cloudflare      │      │  Supabase        │
│  (Frontend)      │      │  (Edge Worker)   │      │  (Database)      │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ • Next.js 15     │      │ • Hono Framework │      │ • PostgreSQL 15  │
│ • React 19       │      │ • TypeScript     │      │ • PostgREST API  │
│ • SSG/SSR        │      │ • Edge Runtime   │      │ • pgvector       │
│ • CDN 全球分發   │      │ • KV Storage     │      │ • Realtime       │
│ • 自動化建置     │      │ • 全球邊緣節點   │      │ • Row Level Sec. │
│                  │      │ • Wrangler CLI   │      │ • 自動備份       │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ Region:          │      │ Region:          │      │ Region:          │
│ • Global CDN     │      │ • Global Edge    │      │ • 可選 (建議     │
│ • Auto Scale     │      │ • 300+ 城市      │      │   美國或亞洲)    │
│ • 0ms Cold Start │      │ • ~17ms 冷啟動   │      │ • 專用 IP        │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ 成本:            │      │ 成本:            │      │ 成本:            │
│ • Hobby: FREE    │      │ • Free: 100K req │      │ • Free:          │
│ • Pro: $20/mo    │      │ • Paid: $5/10M   │      │   500MB DB       │
│                  │      │   req            │      │   2GB transfer   │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ 環境變數:        │      │ Secrets:         │      │ 配置:            │
│ • OBS_EDGE_URL   │      │ • API_KEY        │      │ • Project URL    │
│ • API_KEY        │      │ • SUPABASE_URL   │      │ • Service Key    │
│ (via Dashboard)  │      │ • SUPABASE_KEY   │      │ • Anon Key       │
│                  │      │ (via CLI)        │      │ (via Dashboard)  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
        │                         │                          │
        │                         │                          │
        └─────────────────────────┴──────────────────────────┘
                                  │
                                  ▼
                        ┌─────────────────────┐
                        │   GitHub Actions    │
                        │   (CI/CD Pipeline)  │
                        ├─────────────────────┤
                        │ • 自動測試 (70)     │
                        │ • 自動部署          │
                        │ • PR 預覽           │
                        │ • 3 workflows       │
                        └─────────────────────┘
```

### CI/CD Pipeline

```yaml
# .github/workflows/obs-edge-ci.yml
name: obs-edge CI/CD

on:
  push:
    branches: [main]
    paths: ['apps/obs-edge/**']

jobs:
  test:
    - Run tests (70 tests)
    - Check coverage (>80%)
    - Type check

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    - Deploy to Cloudflare Workers
    - Update secrets
    - Verify deployment
```

---

## 🔄 完整使用流程範例

### 場景：監控 GPT-4 API 使用

#### 步驟 1: LLM 應用程式調用

```typescript
// 你的應用程式代碼
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const startTime = Date.now();

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello, how are you?" }],
});

const latency = Date.now() - startTime;

// 取得使用量資訊
const usage = response.usage;
// {
//   prompt_tokens: 1000,
//   completion_tokens: 500,
//   total_tokens: 1500
// }
```

#### 步驟 2: 發送使用資料到 obs-edge

```typescript
// 發送到 Observability Platform
await fetch('https://obs-edge.flymorris1230.workers.dev/ingest', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    project_id: 'my-chatbot',
    model: 'gpt-4',
    provider: 'openai',
    input_tokens: usage.prompt_tokens,
    output_tokens: usage.completion_tokens,
    latency_ms: latency,
    metadata: {
      endpoint: '/chat/completions',
      user_id: 'user-123'
    }
  })
});

// Response:
// {
//   "success": true,
//   "id": "550e8400-e29b-41d4-a716-446655440000",
//   "cost_usd": 0.045,
//   "provider": "openai"
// }
```

#### 步驟 3: Worker 處理與儲存

```
obs-edge Worker:
  1. 驗證 API Key ✅
  2. 檢查 Rate Limit (45/100) ✅
  3. 計算成本: (1000 + 500) / 1M * $30 = $0.045
  4. 寫入 Supabase:
     INSERT INTO llm_usage (
       id, created_at, project_id, model, provider,
       input_tokens, output_tokens, total_tokens,
       latency_ms, cost_usd, metadata
     ) VALUES (
       '550e8400-...', NOW(), 'my-chatbot', 'gpt-4', 'openai',
       1000, 500, 1500,
       1200, 0.045, '{"endpoint":"/chat/completions","user_id":"user-123"}'
     )
  5. 回傳確認
```

#### 步驟 4: Dashboard 查詢與視覺化

```
用戶打開 Dashboard:
  https://你的域名.vercel.app

Dashboard 自動發起查詢:
  GET https://obs-edge.flymorris1230.workers.dev/metrics
      ?project_id=my-chatbot
      &start_date=2025-10-01
      &end_date=2025-10-07

Worker 查詢 Supabase:
  SELECT
    DATE(created_at) as date,
    SUM(total_tokens) as tokens,
    AVG(latency_ms) as avg_latency,
    SUM(cost_usd) as cost,
    COUNT(*) as requests,
    provider
  FROM llm_usage
  WHERE project_id = 'my-chatbot'
    AND created_at BETWEEN '2025-10-01' AND '2025-10-07'
  GROUP BY date, provider
  ORDER BY date DESC

返回 JSON:
{
  "total_tokens": 15000,
  "total_requests": 10,
  "avg_latency_ms": 1200,
  "total_cost_usd": 0.45,
  "by_date": [
    {
      "date": "2025-10-07",
      "tokens": 1500,
      "latency": 1200,
      "cost": 0.045,
      "requests": 1,
      "provider": "openai"
    },
    // ... more dates
  ],
  "by_provider": [
    {
      "provider": "openai",
      "tokens": 15000,
      "cost": 0.45,
      "requests": 10
    }
  ]
}

Dashboard 渲染:
  - MetricsChart: 顯示 tokens 與 latency 折線圖
  - CostTrend: 顯示每日成本柱狀圖
  - 供應商成本圓餅圖
```

---

## 💾 資料庫 Schema

### llm_usage 資料表

```sql
-- 建立主要資料表
CREATE TABLE llm_usage (
  -- 主鍵與時間戳
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 專案與模型資訊
  project_id TEXT NOT NULL,           -- 專案識別碼 (如: "my-chatbot")
  model TEXT NOT NULL,                -- 模型名稱 (如: "gpt-4", "claude-3-opus")
  provider TEXT NOT NULL,             -- 供應商 (如: "openai", "anthropic")

  -- 使用量資訊
  input_tokens INTEGER NOT NULL,      -- 輸入 tokens (prompt_tokens)
  output_tokens INTEGER NOT NULL,     -- 輸出 tokens (completion_tokens)
  total_tokens INTEGER NOT NULL,      -- 總 tokens (自動計算或傳入)

  -- 性能與成本
  latency_ms INTEGER,                 -- API 延遲 (毫秒)
  cost_usd DECIMAL(10, 6),           -- 成本 (美元，精確到 6 位小數)

  -- 元資料 (可選)
  metadata JSONB,                     -- 自定義 JSON 資料
                                      -- 例: {"endpoint": "/chat/completions", "user_id": "123"}
  tags TEXT[],                        -- 標籤陣列 (如: ["production", "chatbot"])
  user_id TEXT,                       -- 終端用戶 ID (可選)
  session_id TEXT                     -- 會話 ID (可選)
);

-- 建立索引 (加速查詢)
CREATE INDEX idx_llm_usage_project_id ON llm_usage(project_id);
CREATE INDEX idx_llm_usage_created_at ON llm_usage(created_at DESC);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider);
CREATE INDEX idx_llm_usage_project_date ON llm_usage(project_id, created_at DESC);

-- 啟用 Row Level Security
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

-- 允許 service_role 完整存取
CREATE POLICY "Service role has full access" ON llm_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- (可選) 允許認證用戶查看自己專案的資料
CREATE POLICY "Users can view their own projects" ON llm_usage
  FOR SELECT
  USING (auth.uid()::text = user_id);
```

### 成本估算模型

```typescript
// apps/obs-edge/src/utils/cost-calculator.ts
const PRICING = {
  'openai': {
    'gpt-4': { input: 30, output: 60 },        // per 1M tokens
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 }
  },
  'anthropic': {
    'claude-3-opus': { input: 15, output: 75 },
    'claude-3-sonnet': { input: 3, output: 15 },
    'claude-3-haiku': { input: 0.25, output: 1.25 }
  },
  'google': {
    'gemini-pro': { input: 0.5, output: 1.5 },
    'gemini-ultra': { input: 10, output: 30 }
  }
};

function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[provider]?.[model];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}
```

---

## 🌍 URL 與端點

### 生產環境 URLs

| 組件 | URL | 狀態 | 認證 |
|------|-----|------|------|
| **Worker API** | https://obs-edge.flymorris1230.workers.dev | ✅ 已部署 | Bearer Token |
| **Dashboard** | https://你的專案.vercel.app | ⏳ 待部署 | 無 (公開) |
| **Supabase** | https://你的專案.supabase.co | ⏳ 待建立 | API Keys |

### API 端點詳細說明

#### 1. POST /ingest

**用途**: 寫入 LLM 使用資料

**請求**:
```bash
curl -X POST "https://obs-edge.flymorris1230.workers.dev/ingest" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "my-chatbot",
    "model": "gpt-4",
    "provider": "openai",
    "input_tokens": 1000,
    "output_tokens": 500,
    "latency_ms": 1234,
    "metadata": {"user_id": "user-123"}
  }'
```

**回應**:
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "cost_usd": 0.045,
  "provider": "openai",
  "timestamp": "2025-10-07T14:30:00.000Z"
}
```

#### 2. GET /metrics

**用途**: 查詢使用指標與趨勢

**請求**:
```bash
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=my-chatbot&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

**查詢參數**:
- `project_id` (required): 專案識別碼
- `start_date` (optional): 開始日期 (ISO 8601)
- `end_date` (optional): 結束日期 (ISO 8601)

**回應**:
```json
{
  "project_id": "my-chatbot",
  "period": {
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-07T23:59:59.999Z"
  },
  "summary": {
    "total_tokens": 150000,
    "total_requests": 100,
    "avg_latency_ms": 1200,
    "total_cost_usd": 4.50
  },
  "by_date": [
    {
      "date": "2025-10-07",
      "tokens": 15000,
      "requests": 10,
      "avg_latency": 1200,
      "cost": 0.45
    }
  ],
  "by_provider": [
    {
      "provider": "openai",
      "tokens": 120000,
      "requests": 80,
      "cost": 3.60
    },
    {
      "provider": "anthropic",
      "tokens": 30000,
      "requests": 20,
      "cost": 0.90
    }
  ]
}
```

#### 3. GET /costs

**用途**: 查詢成本分析與預測

**請求**:
```bash
curl "https://obs-edge.flymorris1230.workers.dev/costs?project_id=my-chatbot&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

**回應**:
```json
{
  "project_id": "my-chatbot",
  "total_cost_usd": 4.50,
  "daily_average": 0.64,
  "monthly_projection": 19.20,
  "by_model": [
    {
      "model": "gpt-4",
      "provider": "openai",
      "cost": 3.00,
      "requests": 50,
      "avg_cost_per_request": 0.06
    },
    {
      "model": "claude-3-sonnet",
      "provider": "anthropic",
      "cost": 1.50,
      "requests": 50,
      "avg_cost_per_request": 0.03
    }
  ],
  "trend": [
    { "date": "2025-10-01", "cost": 0.50 },
    { "date": "2025-10-02", "cost": 0.60 },
    // ...
  ]
}
```

---

## ⚙️ 環境變數配置

### Dashboard (.env.production)

```bash
# obs-edge Worker API 端點
NEXT_PUBLIC_OBS_EDGE_URL=https://obs-edge.flymorris1230.workers.dev

# API 認證金鑰 (與 Worker 的 API_KEY 相同)
NEXT_PUBLIC_OBS_EDGE_API_KEY=a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e
```

### Worker (Cloudflare Secrets)

```bash
# 設置方式 (在 apps/obs-edge 目錄):
echo "a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" | npx wrangler secret put API_KEY
echo "https://你的專案.supabase.co" | npx wrangler secret put SUPABASE_URL
echo "你的 service_role key" | npx wrangler secret put SUPABASE_SERVICE_KEY
```

**Secrets 清單**:
- `API_KEY`: Bearer token for API authentication
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key (完整權限)

### Supabase 配置

在 Supabase Dashboard 取得:
- **Project URL**: Settings → API → Project URL
- **service_role key**: Settings → API → Project API keys → service_role (secret)

⚠️ **重要**: service_role key 擁有完整資料庫權限，絕不可暴露於客戶端代碼或公開儲存庫。

---

## 📈 性能與擴展性

### Cloudflare Worker 性能

| 指標 | 數值 | 說明 |
|------|------|------|
| **冷啟動時間** | ~17ms | 第一次請求或長時間未使用後 |
| **熱執行時間** | <5ms | 已啟動的 Worker 實例 |
| **Bundle 大小** | 88.69 KiB (gzip) | 壓縮後的 Worker 代碼 |
| **CPU 限制** | 50ms (Free), 30s (Paid) | 單次請求執行時間 |
| **併發請求** | 無限制 | 自動擴展 |
| **全球節點** | 300+ 城市 | 自動路由到最近節點 |

### Vercel Dashboard 性能

| 指標 | 數值 | 說明 |
|------|------|------|
| **Main Bundle** | 237 kB | 主頁面 JS bundle |
| **首次載入** | <3s (目標) | 首次內容繪製 (FCP) |
| **靜態生成** | 4 頁 | SSG 預渲染頁面 |
| **CDN 節點** | 全球 | Vercel Edge Network |

### Supabase 資料庫

| 指標 | Free Tier | 說明 |
|------|-----------|------|
| **資料庫大小** | 500MB | PostgreSQL 儲存空間 |
| **頻寬** | 2GB/月 | 資料傳輸 |
| **連線數** | 60 | 同時連線數 |
| **行數** | 無限制 | llm_usage 表可無限增長 |

### 擴展性建議

#### 短期 (<10K requests/day)
- ✅ 目前架構足夠
- Free tier 可滿足需求

#### 中期 (10K-100K requests/day)
- 考慮升級 Supabase 至 Pro ($25/mo)
- 增加資料庫連線池
- 啟用 Cloudflare Workers 付費版

#### 長期 (>100K requests/day)
- 實作資料聚合 (減少查詢次數)
- 使用 Cloudflare Durable Objects 做實時聚合
- 考慮資料分層儲存 (熱資料 vs 冷資料)
- 使用 R2 儲存歷史資料 (長期保存)

---

## 🚀 快速部署指令

### 1. 部署 Worker

```bash
cd apps/obs-edge
npx wrangler deploy
```

### 2. 設置 Secrets

```bash
echo "YOUR_API_KEY" | npx wrangler secret put API_KEY
echo "https://xxx.supabase.co" | npx wrangler secret put SUPABASE_URL
echo "YOUR_SERVICE_KEY" | npx wrangler secret put SUPABASE_SERVICE_KEY
```

### 3. 部署 Dashboard

```bash
cd apps/obs-dashboard
vercel deploy --prod
```

### 4. 驗證部署

```bash
# 測試 Worker
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=test" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 測試 Dashboard
open https://你的專案.vercel.app
```

---

## 📚 相關文檔

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 完整部署指南
- [DEPLOYMENT_SECRETS.md](apps/obs-edge/DEPLOYMENT_SECRETS.md) - Secrets 管理
- [PHASE_3_QUALITY_REPORT.md](PHASE_3_QUALITY_REPORT.md) - 品質報告
- [TEST_REPORT.md](apps/obs-edge/TEST_REPORT.md) - 測試報告
- [CICD_SETUP.md](.github/CICD_SETUP.md) - CI/CD 配置

---

**文檔版本**: v1.0 (Phase 3)
**最後更新**: 2025-10-07
**維護者**: Genesis Observability Team
