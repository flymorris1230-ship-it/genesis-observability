# 執行專案追蹤 Migration

## 📋 概述

專案追蹤系統的資料庫 schema 已準備完成，需要執行 migration 以建立 8 個追蹤表格。

**Migration 檔案**: `supabase/migrations/20251007_add_project_tracking.sql`

**將建立的表格** (8 個):
1. `module_progress` - 模組進度 (WMS, MES, QMS, R&D)
2. `sprint_progress` - Sprint 進度追蹤
3. `task_progress` - 任務進度管理
4. `api_health` - API 健康狀態監控
5. `database_health` - 資料庫健康檢查
6. `integration_health` - 整合服務健康狀態
7. `agent_executions` - AI Agent 執行記錄
8. `agent_performance` - Agent 性能指標

---

## ⚡ 方案 1: 自動化執行 (推薦)

### 前置要求
- PostgreSQL client (psql) 已安裝
- Supabase 資料庫密碼

### 步驟

#### 1. 設置環境變數

```bash
# 設置 Supabase URL
export SUPABASE_URL=https://your-project.supabase.co

# 設置資料庫密碼（可選，腳本會提示輸入）
export SUPABASE_DB_PASSWORD=your_database_password
```

**獲取資料庫密碼**:
1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 選擇您的專案
3. Settings → Database → Connection string
4. 查看 Password 欄位

#### 2. 執行 Migration 腳本

```bash
cd /Users/morrislin/Desktop/genesis-observability
./scripts/apply-project-tracking-migration.sh
```

#### 3. 驗證結果

腳本會自動驗證所有 8 個表格是否成功建立，並顯示：

```
🎉 Migration Complete!
All 8 project tracking tables have been created!

Tables created:
  • module_progress
  • sprint_progress
  • task_progress
  • api_health
  • database_health
  • integration_health
  • agent_executions
  • agent_performance

Sample data:
  • 4 GAC_FactoryOS modules (WMS 80%, MES 40%, QMS 10%, R&D 0%)
```

---

## 📝 方案 2: 手動執行 (Web Dashboard)

如果您沒有安裝 psql 或偏好使用 Web 介面：

### 步驟

#### 1. 打開 Supabase Dashboard

```bash
open https://app.supabase.com
```

或直接在瀏覽器訪問：https://app.supabase.com

#### 2. 進入 SQL Editor

1. 選擇您的 `genesis-observability` 專案
2. 左側選單點擊 **"SQL Editor"**
3. 點擊 **"New Query"**

#### 3. 複製 Migration SQL

在本機打開 migration 檔案：

```bash
open supabase/migrations/20251007_add_project_tracking.sql
```

或使用編輯器查看：
```bash
cat supabase/migrations/20251007_add_project_tracking.sql
```

#### 4. 執行 SQL

1. 將整個 SQL 檔案內容複製到 SQL Editor
2. 點擊右下角綠色 **"Run"** 按鈕
3. 等待執行完成（約 10-15 秒）

#### 5. 驗證表格

在 SQL Editor 中執行：

```sql
-- 檢查所有表格
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'module_progress',
    'sprint_progress',
    'task_progress',
    'api_health',
    'database_health',
    'integration_health',
    'agent_executions',
    'agent_performance'
  )
ORDER BY table_name;
```

應該看到 8 個表格。

#### 6. 檢查範例資料

```sql
-- 檢查 GAC_FactoryOS 模組進度
SELECT module, status, progress_percentage, features_completed, features_total
FROM module_progress
WHERE project_id = 'gac-factory-os'
ORDER BY module;
```

應該看到 4 個模組的進度資料（WMS 80%, MES 40%, QMS 10%, R&D 0%）。

---

## 🔍 Migration 內容說明

### 建立的表格結構

#### 1. module_progress - 模組進度
```sql
- module: WMS, MES, QMS, R&D
- status: planned, in_progress, completed, blocked
- progress_percentage: 0-100
- features_total/completed/in_progress/blocked
```

#### 2. sprint_progress - Sprint 追蹤
```sql
- sprint_number, sprint_name
- start_date, end_date
- status: planning, active, completed, cancelled
- velocity, completed_points
```

#### 3. task_progress - 任務管理
```sql
- task_name, description, priority
- status: todo, in_progress, review, done, blocked
- estimated_hours, actual_hours
- assigned_to, tags
```

#### 4. api_health - API 健康監控
```sql
- endpoint, method
- status_code, response_time_ms
- success_rate, error_count
- is_healthy
```

#### 5. database_health - 資料庫健康
```sql
- database_name, connection_pool_size
- active_connections, slow_queries
- disk_usage_gb, is_healthy
```

#### 6. integration_health - 整合健康狀態
```sql
- integration_name (Supabase, Cloudflare, NAS, etc.)
- status: healthy, degraded, down
- last_check_at, uptime_percentage
```

#### 7. agent_executions - Agent 執行記錄
```sql
- agent_name, task_type
- status: success, failed, timeout
- duration_ms, tokens_used
- cost_usd, error_message
```

#### 8. agent_performance - Agent 性能
```sql
- agent_name, date
- total_executions, success_rate
- avg_duration_ms, total_tokens
- total_cost_usd
```

### 初始範例資料

Migration 會自動插入 4 個 GAC_FactoryOS 模組的當前進度：

| Module | Status | Progress | Features Completed/Total |
|--------|--------|----------|---------------------------|
| WMS | in_progress | 80% | 24/30 |
| MES | in_progress | 40% | 8/20 |
| QMS | planned | 10% | 2/20 |
| R&D | planned | 0% | 0/15 |

---

## ✅ Migration 完成後

### 1. 驗證資料庫

```bash
# 使用 psql
psql "$SUPABASE_CONNECTION_STRING" -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name LIKE '%progress%' OR table_name LIKE '%health%' OR table_name LIKE '%agent%'
  ORDER BY table_name;
"
```

### 2. 下一步驟

Migration 完成後，需要：

1. **實現 Progress API Endpoints** (obs-edge Worker)
   - `/progress/modules` - 模組進度查詢
   - `/progress/sprint` - Sprint 追蹤
   - `/progress/tasks` - 任務管理
   - `/health/system` - 系統健康監控
   - `/agents/executions` - Agent 執行記錄
   - `/agents/performance` - Agent 性能統計

2. **創建 Dashboard UI 組件**
   - ModuleProgressCard - 模組進度卡片
   - SprintOverview - Sprint 總覽
   - SystemHealthPanel - 系統健康面板
   - AgentPerformanceTable - Agent 性能表格

3. **整合到 GAC_FactoryOS**
   - 自動上報進度數據
   - 實時更新 Sprint 狀態
   - 追蹤 Agent 使用量

---

## 🐛 常見問題

### 問題 1: psql command not found

**解決方案**:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt install postgresql-client
```

### 問題 2: Connection refused

**解決方案**:
1. 檢查 SUPABASE_URL 是否正確
2. 確認資料庫密碼無誤
3. 確認網路連接正常
4. 檢查 Supabase 專案是否已啟用

### 問題 3: Permission denied

**解決方案**:
```sql
-- 在 Supabase SQL Editor 執行
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO service_role;
```

### 問題 4: Table already exists

**解決方案**:
- 表格已存在，migration 已經執行過
- 可以跳過此步驟
- 如需重新執行，先刪除表格：
```sql
DROP TABLE IF EXISTS module_progress CASCADE;
-- 對其他 7 個表格重複執行
```

---

## 📊 完成檢查清單

- [ ] ✅ Migration 腳本執行成功
- [ ] ✅ 8 個表格全部建立
- [ ] ✅ 範例資料已插入 (4 個模組進度)
- [ ] ✅ 可以查詢 module_progress 表格
- [ ] ⏳ 準備實現 Progress API endpoints
- [ ] ⏳ 準備創建 Dashboard UI 組件

---

**Migration 檔案**: `supabase/migrations/20251007_add_project_tracking.sql` (14 KB)
**建立日期**: 2025-10-07
**作者**: Claude Code
**版本**: 1.0
