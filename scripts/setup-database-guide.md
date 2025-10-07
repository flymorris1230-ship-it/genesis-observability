# 📋 數據庫設置指南 - 3 個簡單步驟

**目標**: 創建 `llm_usage` 資料表並插入測試數據

---

## ✅ 步驟 1: 執行資料表創建 SQL

### 方法 A: 使用 Supabase Dashboard (推薦)

1. **打開 Supabase Dashboard**
   - 網址: https://app.supabase.com
   - 登入你的帳號
   - 選擇 Genesis Observability 專案

2. **進入 SQL Editor**
   - 點擊左側選單的 "SQL Editor"
   - 點擊 "New Query" 按鈕

3. **複製並執行 SQL**
   ```bash
   # 複製 SQL 到剪貼板
   cat supabase/migrations/20251007_create_llm_usage.sql | pbcopy
   ```

   - 在 SQL Editor 中貼上 (Cmd+V)
   - 點擊 "Run" 按鈕 (或按 Cmd+Enter)
   - 應該會看到: **"Success. No rows returned"** ✅

4. **驗證表格創建**
   - 點擊左側選單的 "Table Editor"
   - 你應該會看到新的 `llm_usage` 表格

### 方法 B: 使用 psql (進階)

```bash
# 1. 從 Supabase Dashboard 獲取連接字串
#    Project Settings → Database → Connection String

# 2. 執行遷移
psql "YOUR_CONNECTION_STRING" -f supabase/migrations/20251007_create_llm_usage.sql
```

---

## ✅ 步驟 2: 插入測試數據

### 複製測試數據 SQL 到剪貼板

```bash
cat scripts/insert-llm-test-data.sql | pbcopy
```

### 在 Supabase SQL Editor 中:

1. 點擊 "New Query"
2. 貼上測試數據 SQL (Cmd+V)
3. 點擊 "Run"
4. 應該會看到: **"Success. X rows inserted"** ✅

### 測試數據內容:
- **42 個 API 呼叫** (分布在 7 天)
- **3 個 LLM 提供商**: Claude (60%), GPT-4 (30%), Gemini (10%)
- **總 Tokens**: ~71,570
- **總成本**: ~$0.72
- **平均延遲**: ~1,348ms

---

## ✅ 步驟 3: 驗證 APIs 正常運作

### 自動驗證腳本

```bash
./scripts/verify-and-insert-testdata.sh
```

### 手動驗證

```bash
# 測試 /metrics API
curl -s "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
  | python3 -m json.tool

# 測試 /costs API
curl -s "https://obs-edge.flymorris1230.workers.dev/costs?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
  | python3 -m json.tool
```

**預期結果**: 應該返回 JSON 格式的數據，而不是錯誤訊息 ✅

---

## 🎉 完成後

### 開啟實際的統一儀表板

```bash
open index-unified.html
```

**你應該會看到**:
- ✅ Factory OS 數據 (已存在)
- ✅ LLM 使用統計 (新創建)
- ✅ Token 趨勢圖表
- ✅ 成本分析圖表
- ✅ 模型分布表格

---

## ❌ 常見問題排查

### 問題 1: "Could not find the table 'public.llm_usage'"

**原因**: 資料表尚未創建

**解決方法**: 回到步驟 1，確保 SQL 執行成功

### 問題 2: SQL 執行錯誤 - "Policy already exists"

**原因**: 策略已存在 (可能之前執行過)

**解決方法**: 忽略此錯誤，或在 SQL 中使用 `DROP POLICY IF EXISTS` 先刪除

### 問題 3: APIs 返回空數據

**原因**: 測試數據尚未插入

**解決方法**: 執行步驟 2 插入測試數據

### 問題 4: 儀表板顯示 "Error"

**原因**: API 無法連接或數據庫未設置

**解決方法**:
1. 開啟瀏覽器開發者工具 (F12)
2. 查看 Console 中的錯誤訊息
3. 驗證 APIs 是否正常運作 (步驟 3)

---

## 📊 數據驗證 Checklist

設置完成後，確認以下數據正確顯示：

- [ ] **Total Tokens**: ~71,570
- [ ] **Total Cost**: ~$0.72
- [ ] **API Requests**: 42
- [ ] **Avg Latency**: ~1,348ms
- [ ] **Token Trend Chart**: 顯示 7 天趨勢線
- [ ] **Cost Chart**: 顯示 3 個提供商的成本柱狀圖
- [ ] **Model Table**: 顯示 3 個模型 (Claude, GPT-4, Gemini)
- [ ] **Mobile View**: 在小螢幕上顯示為卡片式佈局

---

## 🚀 下一步: 部署到 Vercel

```bash
# 1. 複製統一儀表板到 public 目錄
cp index-unified.html public/index.html

# 2. 部署到 Vercel production
npx vercel deploy public --prod --yes

# 3. 驗證部署成功
# 訪問返回的 URL 確認一切正常
```

---

**需要幫助？**
- 查看完整文檔: `UNIFIED_DASHBOARD_SUMMARY.md`
- 測試遷移 SQL: `supabase/migrations/20251007_create_llm_usage.sql`
- 測試數據 SQL: `scripts/insert-llm-test-data.sql`
