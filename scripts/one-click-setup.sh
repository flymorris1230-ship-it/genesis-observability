#!/bin/bash

# One-Click Setup for Real Data
# Minimizes manual steps to just SQL execution

set -e

PROJECT_ID="ikfrzzysetuwijupefor"
API_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

clear

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║          🚀 一鍵設置真實數據 - 最簡化流程                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

這個腳本將自動完成所有可能的步驟，
您只需要在 Supabase 中點擊兩次"Run"按鈕。

EOF

echo "按 ENTER 開始..."
read dummy

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步驟 1/2: 創建資料表"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Copy table creation SQL
cd /Users/morrislin/Desktop/genesis-observability
cat supabase/migrations/20251007_create_llm_usage.sql | pbcopy

echo "✅ SQL 已複製到剪貼板"
echo ""

# Open SQL Editor directly
echo "🌐 正在打開 Supabase SQL Editor..."
open "https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"

sleep 3

cat << 'EOF'

在瀏覽器中：
  1. SQL Editor 應該已經打開
  2. 貼上 SQL (Cmd+V)
  3. 點擊 "Run" 按鈕
  4. 看到 "Success" 後返回這裡

EOF

echo "完成後按 ENTER 繼續..."
read dummy

# Verify table creation
echo ""
echo "🔍 驗證資料表創建..."
RESPONSE=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$RESPONSE" | grep -q "Could not find the table"; then
    echo "❌ 資料表尚未創建成功"
    echo ""
    echo "請確保："
    echo "  • 在 Supabase SQL Editor 中看到 'Success' 訊息"
    echo "  • 刷新頁面後在 Table Editor 中看到 llm_usage 表"
    echo ""
    echo "完成後重新運行此腳本"
    exit 1
fi

echo "✅ 資料表創建成功！"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步驟 2/2: 插入測試數據"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Copy test data SQL
cat scripts/insert-llm-test-data.sql | pbcopy

echo "✅ 測試數據 SQL 已複製到剪貼板"
echo ""
echo "測試數據包含："
echo "  • 42 個 API 呼叫 (7 天)"
echo "  • ~71,570 tokens, ~\$0.72 成本"
echo ""

echo "🌐 SQL Editor 應該還在瀏覽器中..."
sleep 1

cat << 'EOF'

在同一個 SQL Editor 中：
  1. 清空編輯器 (或點擊 "New Query")
  2. 貼上測試數據 SQL (Cmd+V)
  3. 點擊 "Run" 按鈕
  4. 看到 "Success. X rows inserted" 後返回這裡

EOF

echo "完成後按 ENTER 繼續..."
read dummy

# Verify data insertion
echo ""
echo "🔍 驗證數據插入..."
METRICS=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if ! echo "$METRICS" | grep -q "totalTokens"; then
    echo "❌ 數據尚未成功插入"
    echo ""
    echo "請確保在 Supabase SQL Editor 中看到 'Success' 訊息"
    echo "完成後重新運行此腳本"
    exit 1
fi

TOTAL_TOKENS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalTokens', 0))" 2>/dev/null || echo "N/A")
TOTAL_COST=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalCost', 0))" 2>/dev/null || echo "N/A")
TOTAL_REQUESTS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalRequests', 0))" 2>/dev/null || echo "N/A")

echo "✅ 測試數據插入成功！"
echo ""
echo "📊 LLM 使用統計："
echo "   • Total Tokens: $TOTAL_TOKENS"
echo "   • Total Cost: \$$TOTAL_COST"
echo "   • Total Requests: $TOTAL_REQUESTS"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "自動部署真實數據版本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🚀 正在部署..."

# Backup current version
if [ -f public/index.html ]; then
    cp public/index.html public/index-backup-$(date +%Y%m%d-%H%M%S).html
fi

# Deploy real data version
cp index-unified.html public/index.html
echo "✅ 已複製真實數據版本"

echo ""
echo "📦 部署到 Vercel..."
npx vercel deploy public --prod --yes

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 完成！真實數據版本已上線"
echo ""
echo "📊 儀表板數據："
echo "   • Total Tokens: $TOTAL_TOKENS"
echo "   • Total Cost: \$$TOTAL_COST"
echo "   • Total Requests: $TOTAL_REQUESTS"
echo ""
echo "🌐 訪問: https://genesis-observability-dashboard-j3412nk3b.vercel.app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
