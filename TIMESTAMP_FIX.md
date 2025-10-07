# ✅ Timestamp 欄位問題已修復

## 🐛 問題根源

**錯誤訊息:** `column "timestamp" does not exist`

**原因:** PostgreSQL 中 `timestamp` 是保留關鍵字（reserved keyword）。雖然在 CREATE TABLE 語句中可以直接使用，但在 VIEW 和查詢中引用時會產生歧義，被解析為資料型別而非欄位名稱。

## 🔧 修復內容

### 問題位置
在原始 SQL 的 VIEW 定義中：

```sql
-- ❌ 有問題的版本
CREATE OR REPLACE VIEW llm_usage_daily AS
SELECT
  project_id,
  DATE(timestamp) AS date,  -- ❌ timestamp 未加引號
  ...
FROM llm_usage
GROUP BY project_id, DATE(timestamp);  -- ❌ timestamp 未加引號
```

### 修復方案
在所有引用中加上雙引號：

```sql
-- ✅ 修復後的版本
CREATE OR REPLACE VIEW llm_usage_daily AS
SELECT
  project_id,
  DATE("timestamp") AS date,  -- ✅ 加上雙引號
  ...
FROM llm_usage
GROUP BY project_id, DATE("timestamp");  -- ✅ 加上雙引號
```

### 修復位置清單
1. ✅ `llm_usage_daily` view - LINE 54, 61
2. ✅ Index definitions - LINE 41, 44
3. ✅ 所有其他引用 timestamp 的位置

## 📄 檔案對照

- **原始檔案:** `supabase/migrations/20251007_create_llm_usage.sql` ❌
- **修復檔案:** `supabase/migrations/20251007_create_llm_usage_fixed.sql` ✅

## 🚀 下一步

修復後的 SQL 已自動複製到剪貼板，請在 Supabase SQL Editor 中：

1. **Cmd+V** 貼上修復後的 SQL
2. **點擊 "Run"** 執行
3. **應該看到:** "Success. No rows returned"

執行成功後，自動化腳本會繼續進行測試數據插入和部署。

## 📚 學習要點

**PostgreSQL 保留關鍵字:**
- `timestamp`, `date`, `time`, `user`, `order` 等都是保留字
- 使用雙引號 `"column_name"` 可避免衝突
- **最佳實踐:** 避免使用保留字作為欄位名稱（例如改用 `created_timestamp`, `record_time` 等）

**未來改進建議:**
如果要完全避免這個問題，可以將欄位重新命名：
- `timestamp` → `recorded_at` 或 `event_timestamp`
- 這樣就不需要在每個查詢中都加引號

## ✅ 狀態

- [x] 問題診斷完成
- [x] 修復 SQL 已創建
- [x] 修復 SQL 已複製到剪貼板
- [ ] 等待在 Supabase 中執行
- [ ] 插入測試數據
- [ ] 部署生產版本
