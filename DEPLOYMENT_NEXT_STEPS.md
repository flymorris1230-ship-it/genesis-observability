# 🚀 Genesis Observability - 部署下一步

**當前狀態**: Worker 已部署，等待 Supabase 配置

---

## ✅ 已完成

- [x] obs-edge Worker 已部署到 Cloudflare
- [x] API_KEY 已設置
- [x] KV Namespaces 已建立
- [x] obs-dashboard 已建置成功

**Worker URL**: https://obs-edge.flymorris1230.workers.dev

---

## ⏳ 待完成 (3 步驟，15 分鐘)

### 步驟 1: 建立 Supabase 專案 (5 分鐘)

#### 1.1 前往 Supabase 並建立專案

```bash
# 開啟瀏覽器
open https://app.supabase.com
```

或手動前往: https://app.supabase.com

#### 1.2 建立新專案

1. 點擊 **"New Project"**
2. 填寫資訊:
   - **Name**: `genesis-observability`
   - **Database Password**: 選擇一個強密碼（記下來！）
   - **Region**: 選擇 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`
3. 點擊 **"Create new project"**
4. 等待 2-3 分鐘讓專案初始化

#### 1.3 執行資料庫 Schema

1. 在 Supabase Dashboard 左側選單，點擊 **"SQL Editor"**
2. 點擊 **"New Query"**
3. 打開本地檔案: `scripts/setup-supabase.sql`
4. **複製整個檔案內容**
5. **貼到 Supabase SQL Editor**
6. 點擊 **"Run"** (右下角綠色按鈕)
7. 等待執行完成，應該會看到成功訊息

#### 1.4 取得 Credentials

1. 在 Supabase Dashboard，前往 **Settings → API**
2. 找到並複製以下兩個值:

**Project URL**:
```
https://xxxxxxxxxx.supabase.co
```

**service_role key** (在 "Project API keys" 區塊):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
```

⚠️ **重要**: service_role key 是機密資訊，不要分享或提交到 git！

---

### 步驟 2: 設置 Worker Secrets (2 分鐘)

**請將上一步取得的值填入下方命令並執行**:

```bash
cd /Users/morrislin/Desktop/genesis-observability/apps/obs-edge

# 設置 Supabase URL
echo "https://YOUR_PROJECT_ID.supabase.co" | npx wrangler secret put SUPABASE_URL

# 設置 Supabase Service Key
echo "YOUR_SERVICE_ROLE_KEY_HERE" | npx wrangler secret put SUPABASE_SERVICE_KEY
```

**驗證 secrets 已設置**:
```bash
npx wrangler secret list
```

應該會看到:
```
- API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
```

---

### 步驟 3: 部署 Dashboard 到 Vercel (5 分鐘)

#### 3.1 更新 Dashboard 環境變數

```bash
cd /Users/morrislin/Desktop/genesis-observability/apps/obs-dashboard

# 創建 .env.production (如果還沒有)
cat > .env.production << 'EOL'
NEXT_PUBLIC_OBS_EDGE_URL=https://obs-edge.flymorris1230.workers.dev
NEXT_PUBLIC_OBS_EDGE_API_KEY=a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e
EOL
```

#### 3.2 部署到 Vercel

```bash
# 首次使用需要登入
npx vercel login

# 部署到生產環境
npx vercel deploy --prod --yes
```

**Vercel 會詢問幾個問題**:
- "Set up and deploy?"  → Yes
- "Which scope?"  → 選擇你的帳號
- "Link to existing project?"  → No (第一次部署)
- "What's your project's name?"  → `genesis-obs-dashboard` (或任何你喜歡的名稱)
- "In which directory is your code located?"  → `./` (直接按 Enter)

部署完成後，Vercel 會顯示你的 Dashboard URL:
```
https://genesis-obs-dashboard.vercel.app
```

---

## 🧪 步驟 4: 測試整個系統 (3 分鐘)

### 4.1 測試 Worker API

```bash
# 測試 /ingest 端點
curl -X POST "https://obs-edge.flymorris1230.workers.dev/ingest" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
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

**預期回應**:
```json
{
  "success": true,
  "id": "uuid-here",
  "cost_usd": 0.045
}
```

### 4.2 測試 /metrics 端點

```bash
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=test-project" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

**預期回應**: JSON 格式的 metrics 資料

### 4.3 執行完整端對端測試

```bash
cd /Users/morrislin/Desktop/genesis-observability
./scripts/test-e2e.sh
```

### 4.4 檢查 Dashboard

1. 打開你的 Dashboard URL (Vercel 提供的)
2. 應該會看到 Genesis Observability 介面
3. 選擇 project: `test-project`
4. 應該會看到剛才測試的資料視覺化

---

## 📊 完成檢查清單

部署完成後，確認以下項目:

- [ ] Supabase 專案已建立
- [ ] 資料庫 schema 已執行成功
- [ ] Worker secrets 已全部設置 (3 個)
- [ ] Dashboard 已部署到 Vercel
- [ ] `/ingest` 端點測試通過
- [ ] `/metrics` 端點測試通過
- [ ] Dashboard 可以正常顯示資料
- [ ] 端對端測試全部通過

---

## 🎉 完成！

當所有檢查項目都完成後，你的 Genesis Observability 平台就完全上線了！

**系統 URLs**:
- **Worker API**: https://obs-edge.flymorris1230.workers.dev
- **Dashboard**: (你的 Vercel URL)
- **Supabase**: https://你的專案ID.supabase.co

**下一步**:
1. 整合到你的 LLM 應用程式 (參考 QUICK_START.md)
2. 開始追蹤 LLM 使用量與成本
3. 在 Dashboard 查看即時分析

---

## 🆘 需要協助？

如果遇到問題:
1. 檢查 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 的故障排除章節
2. 查看 [QUICK_START.md](./QUICK_START.md) 的常見問題
3. 檢查 Worker logs: `cd apps/obs-edge && npx wrangler tail`

---

**準備好了嗎？讓我們開始吧！** 🚀

從步驟 1 開始: https://app.supabase.com
