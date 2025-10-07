#!/bin/bash

# Non-Interactive Automated Setup
# Executes all possible steps automatically

set -e

PROJECT_ID="ikfrzzysetuwijupefor"
API_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

cd /Users/morrislin/Desktop/genesis-observability

clear

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🚀 Genesis Observability - 自動執行設置                   ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check current status
echo "🔍 檢查當前狀態..."
RESPONSE=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

TABLE_EXISTS="false"
if ! echo "$RESPONSE" | grep -q "Could not find the table"; then
    TABLE_EXISTS="true"
fi

if [ "$TABLE_EXISTS" = "false" ]; then
    echo "❌ 資料表尚未創建"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 執行中: 創建資料表"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Automatically copy V2 SQL (renamed timestamp -> event_time)
    cat supabase/migrations/20251007_create_llm_usage_v2.sql | pbcopy
    echo "✅ 資料表 SQL 已自動複製到剪貼板 (V2: timestamp 欄位已重新命名為 event_time)"

    # Automatically open browser
    open "https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
    echo "✅ Supabase SQL Editor 已自動打開"
    echo ""
    echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
    echo "┃                                                   ┃"
    echo "┃  ⚡ 在瀏覽器中只需 3 秒:                          ┃"
    echo "┃                                                   ┃"
    echo "┃      1. Cmd+V (貼上 SQL)                         ┃"
    echo "┃      2. 點擊 \"Run\" 按鈕                          ┃"
    echo "┃      3. 完成！                                    ┃"
    echo "┃                                                   ┃"
    echo "┃  完成後，關閉瀏覽器並回到這個終端               ┃"
    echo "┃  腳本會自動檢測完成狀態並繼續                   ┃"
    echo "┃                                                   ┃"
    echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
    echo ""
    echo "⏳ 等待資料表創建完成 (每 5 秒自動檢查)..."
    echo ""

    # Auto-detect completion
    for i in {1..60}; do
        sleep 5
        VERIFY=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
          -H "Authorization: Bearer $API_KEY")

        if ! echo "$VERIFY" | grep -q "Could not find the table"; then
            echo "✅ 資料表創建完成！(檢測到第 $i 次)"
            TABLE_EXISTS="true"
            break
        fi

        echo "   檢查 $i/60: 尚未完成，繼續等待..."
    done

    if [ "$TABLE_EXISTS" = "false" ]; then
        echo ""
        echo "⏱️  等待超時 (5 分鐘)"
        echo ""
        echo "可能原因:"
        echo "  • SQL 尚未在 Supabase 中執行"
        echo "  • SQL 執行出現錯誤"
        echo ""
        echo "請在 Supabase SQL Editor 中執行 SQL 後重新運行此腳本"
        exit 1
    fi
else
    echo "✅ 資料表已存在"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 執行中: 插入測試數據"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if data exists
METRICS=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

TOTAL_REQUESTS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalRequests', 0))" 2>/dev/null || echo "0")

if [ "$TOTAL_REQUESTS" = "0" ]; then
    # Copy test data V2
    cat scripts/insert-llm-test-data-v2.sql | pbcopy
    echo "✅ 測試數據 SQL 已自動複製到剪貼板 (V2: 使用 event_time 欄位)"
    echo ""
    echo "測試數據: 42 個 API 呼叫, ~71,570 tokens, ~\$0.72"
    echo ""
    echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
    echo "┃                                                   ┃"
    echo "┃  ⚡ 在同一個 SQL Editor 中:                      ┃"
    echo "┃                                                   ┃"
    echo "┃      1. 清空編輯器 (Cmd+A → Delete)              ┃"
    echo "┃      2. Cmd+V (貼上測試數據)                     ┃"
    echo "┃      3. 點擊 \"Run\"                               ┃"
    echo "┃                                                   ┃"
    echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
    echo ""
    echo "⏳ 等待數據插入完成 (每 5 秒自動檢查)..."
    echo ""

    # Auto-detect completion
    for i in {1..60}; do
        sleep 5
        METRICS=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
          -H "Authorization: Bearer $API_KEY")

        TOTAL_REQUESTS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalRequests', 0))" 2>/dev/null || echo "0")

        if [ "$TOTAL_REQUESTS" != "0" ]; then
            echo "✅ 測試數據插入完成！(檢測到 $TOTAL_REQUESTS 個請求)"
            break
        fi

        echo "   檢查 $i/60: 尚未完成，繼續等待..."
    done

    if [ "$TOTAL_REQUESTS" = "0" ]; then
        echo ""
        echo "⏱️  等待超時"
        echo "請確保 SQL 在 Supabase 中成功執行後重新運行此腳本"
        exit 1
    fi
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

# Backup and deploy
if [ -f public/index.html ]; then
    cp public/index.html public/index-backup-$(date +%Y%m%d-%H%M%S).html
    echo "✅ 已備份當前版本"
fi

cp index-unified.html public/index.html
echo "✅ 已複製生產版本"
echo ""

echo "📦 部署到 Vercel..."
DEPLOY_OUTPUT=$(npx vercel deploy public --prod --yes 2>&1)

# Extract URL
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
    echo "✅ 自動打開部署網站..."
    sleep 1
    open "$DEPLOY_URL"
else
    echo "🌐 部署 URL: https://genesis-observability-dashboard-j3412nk3b.vercel.app"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
