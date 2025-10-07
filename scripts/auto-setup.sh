#!/bin/bash

# Fully Automated Setup (Maximum Automation Possible)
# This script automates everything that CAN be automated
# Only requires user to click "Run" button in browser

set -e

PROJECT_ID="ikfrzzysetuwijupefor"
API_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

clear

cat << 'EOF'

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🚀 Genesis Observability - 自動化設置                     ║
║                                                               ║
║     最大化自動化 - 只需點擊瀏覽器中的 "Run" 按鈕              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

EOF

echo "⏳ 正在準備自動設置..."
echo ""

cd /Users/morrislin/Desktop/genesis-observability

# Step 1: Check if table already exists
echo "🔍 檢查資料表狀態..."
RESPONSE=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$RESPONSE" | grep -q "Could not find the table"; then
    echo "❌ 資料表尚未創建"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 步驟 1/2: 創建資料表"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Copy SQL to clipboard
    cat supabase/migrations/20251007_create_llm_usage.sql | pbcopy
    echo "✅ [自動完成] 資料表 SQL 已複製到剪貼板"

    # Open SQL Editor directly
    echo "✅ [自動完成] 正在打開 Supabase SQL Editor..."
    open "https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"

    sleep 2

    echo ""
    echo "┌─────────────────────────────────────────────────────┐"
    echo "│  👉 在瀏覽器中執行以下操作:                        │"
    echo "│                                                     │"
    echo "│     1. SQL Editor 已自動打開                       │"
    echo "│     2. SQL 已在剪貼板中                            │"
    echo "│     3. 在編輯器中按 Cmd+V 貼上                     │"
    echo "│     4. 點擊右上角綠色 \"Run\" 按鈕                  │"
    echo "│     5. 看到 \"Success\" 訊息後回到終端              │"
    echo "│                                                     │"
    echo "└─────────────────────────────────────────────────────┘"
    echo ""
    read -p "⏸️  完成後按 ENTER 繼續..." dummy

    # Verify table creation
    echo ""
    echo "🔍 驗證資料表創建..."
    VERIFY=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
      -H "Authorization: Bearer $API_KEY")

    if echo "$VERIFY" | grep -q "Could not find the table"; then
        echo "❌ 資料表創建失敗"
        echo ""
        echo "請檢查 Supabase SQL Editor 中是否出現錯誤訊息"
        exit 1
    fi

    echo "✅ 資料表創建成功！"
else
    echo "✅ 資料表已存在"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 步驟 2/2: 插入測試數據"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if data already exists
METRICS=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

TOTAL_REQUESTS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalRequests', 0))" 2>/dev/null || echo "0")

if [ "$TOTAL_REQUESTS" = "0" ]; then
    # Copy test data SQL
    cat scripts/insert-llm-test-data.sql | pbcopy
    echo "✅ [自動完成] 測試數據 SQL 已複製到剪貼板"
    echo ""
    echo "測試數據包含:"
    echo "  • 42 個 API 呼叫 (7 天)"
    echo "  • ~71,570 tokens, ~\$0.72 總成本"
    echo ""

    echo "┌─────────────────────────────────────────────────────┐"
    echo "│  👉 在同一個 SQL Editor 中:                        │"
    echo "│                                                     │"
    echo "│     1. 清空編輯器內容 (Cmd+A → Delete)             │"
    echo "│     2. 按 Cmd+V 貼上測試數據 SQL                   │"
    echo "│     3. 點擊 \"Run\" 按鈕                             │"
    echo "│     4. 看到 \"Success. X rows inserted\" 後回來     │"
    echo "│                                                     │"
    echo "└─────────────────────────────────────────────────────┘"
    echo ""
    read -p "⏸️  完成後按 ENTER 繼續..." dummy

    # Verify data insertion
    echo ""
    echo "🔍 驗證數據插入..."
    METRICS=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
      -H "Authorization: Bearer $API_KEY")

    TOTAL_REQUESTS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalRequests', 0))" 2>/dev/null || echo "0")

    if [ "$TOTAL_REQUESTS" = "0" ]; then
        echo "❌ 數據插入失敗"
        exit 1
    fi

    echo "✅ 測試數據插入成功！"
else
    echo "✅ 測試數據已存在 ($TOTAL_REQUESTS 個請求)"
fi

# Get final metrics
TOTAL_TOKENS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalTokens', 0))" 2>/dev/null || echo "0")
TOTAL_COST=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalCost', 0))" 2>/dev/null || echo "0")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 自動部署生產版本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ [自動完成] 準備部署檔案..."
# Backup current version
if [ -f public/index.html ]; then
    cp public/index.html public/index-backup-$(date +%Y%m%d-%H%M%S).html
fi

# Deploy real data version
cp index-unified.html public/index.html

echo "✅ [自動完成] 部署到 Vercel..."
DEPLOY_OUTPUT=$(npx vercel deploy public --prod --yes 2>&1)

# Extract deployment URL
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*' | tail -1)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 🎉 完成！真實數據版本已成功部署"
echo ""
echo "📊 LLM 使用統計:"
echo "   • Total Tokens: $TOTAL_TOKENS"
echo "   • Total Cost: \$$TOTAL_COST"
echo "   • Total Requests: $TOTAL_REQUESTS"
echo ""
if [ -n "$DEPLOY_URL" ]; then
    echo "🌐 部署 URL: $DEPLOY_URL"
    echo ""
    echo "✅ [自動完成] 正在打開部署網站..."
    sleep 1
    open "$DEPLOY_URL"
else
    echo "🌐 部署 URL: https://genesis-observability-dashboard-j3412nk3b.vercel.app"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
