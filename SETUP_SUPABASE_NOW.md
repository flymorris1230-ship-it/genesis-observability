# ⚠️ 重要：需要執行 Supabase Schema

## 🔴 當前問題

端對端測試顯示錯誤：
```
"Could not find the table 'public.llm_usage' in the schema cache"
```

這表示 **Supabase 資料庫 schema 尚未執行**。

---

## ✅ 解決方案（5 分鐘）

### 步驟 1: 前往 Supabase Dashboard

1. 打開您的 Supabase 專案：
   ```bash
   open https://app.supabase.com
   ```

2. 選擇您的 `genesis-observability` 專案

### 步驟 2: 執行 SQL Schema

1. 在左側選單，點擊 **"SQL Editor"**
2. 點擊 **"New Query"**
3. 複製以下 SQL 內容並貼到編輯器

### 步驟 3: SQL Schema 內容

打開本地文件查看完整內容：
```bash
open scripts/setup-supabase.sql
```

或直接複製以下簡化版本：

```sql
-- ============================================
-- Genesis Observability - Supabase Schema
-- ============================================

-- Create llm_usage table
CREATE TABLE IF NOT EXISTS public.llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
  total_tokens INTEGER NOT NULL CHECK (total_tokens >= 0),
  latency_ms INTEGER CHECK (latency_ms >= 0),
  cost_usd DECIMAL(10, 6) CHECK (cost_usd >= 0),
  metadata JSONB,
  tags TEXT[],
  user_id TEXT,
  session_id TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_llm_usage_project_id ON public.llm_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at ON public.llm_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_provider ON public.llm_usage(provider);
CREATE INDEX IF NOT EXISTS idx_llm_usage_model ON public.llm_usage(model);
CREATE INDEX IF NOT EXISTS idx_llm_usage_project_date ON public.llm_usage(project_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;

-- Create policy for service_role access
DROP POLICY IF EXISTS "Service role has full access" ON public.llm_usage;
CREATE POLICY "Service role has full access" ON public.llm_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Genesis Observability Schema Setup Complete!';
  RAISE NOTICE 'Table created: public.llm_usage';
  RAISE NOTICE 'Indexes created: 5';
  RAISE NOTICE 'RLS enabled: Yes';
END $$;
```

### 步驟 4: 執行 SQL

1. 貼上 SQL 後，點擊右下角 **綠色 "Run" 按鈕**
2. 等待執行完成（約 5-10 秒）
3. 您應該會看到成功訊息：
   ```
   ✅ Genesis Observability Schema Setup Complete!
   ```

### 步驟 5: 驗證表格已創建

在 SQL Editor 中執行：
```sql
SELECT * FROM public.llm_usage LIMIT 5;
```

應該會顯示空結果（0 rows），這是正常的，因為還沒有數據。

---

## 🧪 完成後重新測試

Schema 設置完成後，執行以下命令重新測試：

```bash
cd /Users/morrislin/Desktop/genesis-observability
./scripts/test-e2e.sh
```

預期結果：
```
✓ Health Check: Passed
✓ Authentication: Passed
✓ Data Ingestion: 4/4 samples ✅
✓ Metrics Query: Success ✅
✓ Cost Query: Success ✅
✓ Rate Limiting: Tested
```

---

## 📊 測試成功後可以做什麼

1. **查看 Dashboard**:
   ```bash
   open https://genesis-observability-obs-dashboard.vercel.app
   ```

2. **查看測試數據**:
   - 在 Dashboard 選擇 project: `e2e-test-XXXXXXXXXX`
   - 應該會看到 4 筆測試記錄的圖表

3. **整合到您的應用**:
   - 查看 `INTEGRATION_GUIDE.md`（即將創建）
   - 開始追蹤您的 LLM 使用量

---

## 🆘 如果遇到問題

### 問題 1: "permission denied for schema public"

**解決方案**：
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO service_role;
```

### 問題 2: "relation already exists"

**解決方案**：表格已經存在，您可以直接進行測試。

### 問題 3: SQL 執行失敗

**解決方案**：
1. 確認您在正確的專案
2. 嘗試一次執行一個 CREATE TABLE 語句
3. 檢查 Supabase Dashboard → Database → Tables 確認表格狀態

---

## ⏭️ 下一步

Schema 設置完成並測試通過後：
1. ✅ 所有 API 端點將正常工作
2. ✅ Dashboard 可以顯示數據
3. ✅ 可以開始整合到實際應用

**準備好了嗎？前往 Supabase 執行 Schema！** 🚀

打開 Supabase:
```bash
open https://app.supabase.com
```

打開 SQL 文件:
```bash
open scripts/setup-supabase.sql
```
