# 🤖 Genesis Observability - 自動化 Supabase 設置選項

您有 **4 種方式**自動化 Supabase schema 部署，無需手動在 Dashboard 操作！

---

## 📊 方案比較

| 方案 | 優點 | 缺點 | 推薦度 |
|------|------|------|--------|
| **方案 1: Supabase CLI** | 最正規、支援 migration | 需安裝 CLI | ⭐⭐⭐⭐⭐ |
| **方案 2: PostgreSQL 直連** | 簡單直接 | 需要 DB password | ⭐⭐⭐⭐ |
| **方案 3: Node.js 腳本** | 跨平台、無需額外安裝 | 較複雜 | ⭐⭐⭐ |
| **方案 4: 手動 (當前)** | 最簡單 | 需要手動操作 | ⭐⭐ |

---

## 🎯 方案 1: Supabase CLI（最推薦）

### 優點
- ✅ 官方工具，最穩定
- ✅ 支援 database migrations
- ✅ 版本控制友好
- ✅ 適合團隊協作

### 執行步驟

```bash
# 1. 安裝 Supabase CLI
brew install supabase/tap/supabase
# 或
npm install -g supabase

# 2. 執行自動化腳本
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_KEY="eyJ..." \
./scripts/auto-setup-supabase-cli.sh
```

### 腳本功能
- 自動安裝 CLI（如果未安裝）
- 自動 link 到遠端專案
- 創建 migration 文件
- 推送 schema 到遠端
- 驗證部署成功

---

## 🔌 方案 2: PostgreSQL 直連

### 優點
- ✅ 最直接的方式
- ✅ 不需要額外工具
- ✅ 執行速度快

### 缺點
- ⚠️ 需要 database password
- ⚠️ 需要安裝 PostgreSQL client

### 執行步驟

```bash
# 1. 安裝 PostgreSQL client (如果未安裝)
brew install postgresql

# 2. 取得 Database Password
# 前往 Supabase Dashboard:
#   Settings → Database → Connection string
# 複製 password

# 3. 執行自動化腳本
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_DB_PASSWORD="your-db-password" \
./scripts/auto-setup-supabase-psql.sh
```

---

## 💻 方案 3: Node.js/TypeScript 腳本

### 優點
- ✅ 跨平台
- ✅ 使用已有的 service_role key
- ✅ 無需額外安裝工具
- ✅ 可程式化控制

### 缺點
- ⚠️ 需要 @supabase/supabase-js
- ⚠️ 某些 SQL 語句可能受限

### 執行步驟

```bash
# 1. 安裝依賴
npm install @supabase/supabase-js tsx

# 2. 執行腳本
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_KEY="eyJ..." \
npx tsx scripts/auto-setup-supabase.ts
```

### 注意事項
由於 Supabase client 的限制，某些複雜 SQL（如 DO $$ 區塊）可能無法執行。
如果失敗，會自動提示使用方案 1 或 2。

---

## 📝 方案 4: 手動執行（當前預設）

### 執行步驟

1. 打開 Supabase Dashboard
   ```bash
   open https://app.supabase.com
   ```

2. SQL Editor → New Query

3. 複製 `scripts/setup-supabase.sql` 內容

4. 貼上並點擊 "Run"

**參考**: `SETUP_SUPABASE_NOW.md`

---

## 🚀 快速選擇指南

### 如果您...

**有 Homebrew（macOS）**
→ 使用方案 1（Supabase CLI）
```bash
brew install supabase/tap/supabase
SUPABASE_URL="..." SUPABASE_SERVICE_KEY="..." ./scripts/auto-setup-supabase-cli.sh
```

**熟悉 PostgreSQL**
→ 使用方案 2（直連）
```bash
brew install postgresql
SUPABASE_URL="..." SUPABASE_DB_PASSWORD="..." ./scripts/auto-setup-supabase-psql.sh
```

**不想安裝任何工具**
→ 使用方案 3（Node.js）
```bash
npm install @supabase/supabase-js tsx
SUPABASE_URL="..." SUPABASE_SERVICE_KEY="..." npx tsx scripts/auto-setup-supabase.ts
```

**想要最簡單的方式**
→ 使用方案 4（手動）
```bash
open https://app.supabase.com
# 然後參考 SETUP_SUPABASE_NOW.md
```

---

## 🔑 所需憑證

### SUPABASE_URL
在 Supabase Dashboard → Settings → API → Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```

### SUPABASE_SERVICE_KEY
在 Supabase Dashboard → Settings → API → service_role key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### SUPABASE_DB_PASSWORD（僅方案 2 需要）
在 Supabase Dashboard → Settings → Database → Connection string
```
您創建專案時設置的密碼
```

---

## 📋 完整自動化範例（推薦）

### 一鍵完成所有部署

創建 `.env.local`:
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

執行：
```bash
# 載入環境變數
source .env.local

# 安裝 Supabase CLI
brew install supabase/tap/supabase

# 自動部署 schema
./scripts/auto-setup-supabase-cli.sh

# 執行測試驗證
./scripts/test-e2e.sh

# 打開 Dashboard 查看
open https://genesis-observability-obs-dashboard.vercel.app
```

---

## 🆘 故障排除

### 問題 1: Supabase CLI 安裝失敗

**解決方案**：
```bash
# 使用 npm 代替 Homebrew
npm install -g supabase
```

### 問題 2: PostgreSQL 連接失敗

**解決方案**：
1. 確認 database password 正確
2. 檢查防火牆設置
3. 確認 Supabase 專案在正確的 region

### 問題 3: Node.js 腳本執行失敗

**解決方案**：
使用方案 1 或 2 代替。某些 SQL 功能在 Supabase client 中受限。

### 問題 4: Permission denied

**解決方案**：
```bash
chmod +x scripts/auto-setup-*.sh
```

---

## ✅ 驗證部署成功

無論使用哪種方案，部署完成後執行：

```bash
# 1. 運行測試
./scripts/test-e2e.sh

# 2. 應該看到
✓ Data Ingestion: 4/4 samples
✓ Metrics Query: Success
✓ Cost Query: Success
```

---

## 🎯 我的推薦

**對於 Genesis Observability 專案**：

1. **開發環境**: 使用方案 1（Supabase CLI）
   - 支援 migration
   - 版本控制友好
   - 團隊協作方便

2. **CI/CD**: 使用方案 2（PostgreSQL）
   - 最快速
   - 容易整合到 GitHub Actions

3. **快速測試**: 使用方案 4（手動）
   - 最簡單
   - 適合一次性設置

---

**選好方案了嗎？執行對應的命令即可自動完成！** 🚀
