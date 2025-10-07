#!/bin/bash

# Genesis Observability - Quick Database Setup
# 一鍵式數據庫設置腳本

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║  Genesis Observability - 快速數據庫設置                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 檢查是否已經設置
echo "🔍 正在檢查數據庫狀態..."
API_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

RESPONSE=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$RESPONSE" | grep -q "totalTokens"; then
    echo "✅ 數據庫已設置完成!"
    echo ""
    echo "📊 當前 LLM 使用數據:"
    echo "$RESPONSE" | python3 -m json.tool | grep -E '"totalTokens"|"totalCost"|"totalRequests"' | head -3
    echo ""
    echo "🎯 直接開啟儀表板:"
    echo "   open index-unified.html"
    echo ""
    exit 0
fi

if echo "$RESPONSE" | grep -q "Could not find the table"; then
    echo "⚠️  資料表尚未創建"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 步驟 1/3: 創建資料表"
    echo ""
    echo "   1. 正在打開 Supabase Dashboard..."
    open "https://app.supabase.com"
    sleep 2

    echo "   2. 請在 Supabase 中:"
    echo "      • 選擇你的 Genesis Observability 專案"
    echo "      • 點擊左側 'SQL Editor'"
    echo "      • 點擊 'New Query'"
    echo ""

    echo "   3. 複製 SQL 到剪貼板..."
    cat "$(dirname "$0")/../supabase/migrations/20251007_create_llm_usage.sql" | pbcopy
    echo "      ✅ SQL 已複製到剪貼板!"
    echo ""

    echo "   4. 在 SQL Editor 中:"
    echo "      • 貼上 SQL (Cmd+V)"
    echo "      • 點擊 'Run' (或按 Cmd+Enter)"
    echo "      • 應該會看到: 'Success. No rows returned'"
    echo ""

    read -p "   ⏸️  完成後按 ENTER 繼續..." dummy
    echo ""

    # 驗證表格創建
    echo "🔍 驗證資料表創建..."
    VERIFY=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
      -H "Authorization: Bearer $API_KEY")

    if echo "$VERIFY" | grep -q "Could not find the table"; then
        echo "❌ 資料表尚未創建成功"
        echo ""
        echo "請確認:"
        echo "  1. SQL 是否在 Supabase SQL Editor 中成功執行"
        echo "  2. 是否看到 'Success' 訊息"
        echo "  3. 在 Table Editor 中是否看到 llm_usage 表格"
        echo ""
        echo "如需幫助，查看: scripts/setup-database-guide.md"
        exit 1
    fi

    echo "✅ 資料表創建成功!"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 步驟 2/3: 插入測試數據"
echo ""

# 檢查是否已有數據
if echo "$RESPONSE" | grep -q '"totalRequests":0'; then
    echo "   1. 複製測試數據 SQL 到剪貼板..."
    cat "$(dirname "$0")/insert-llm-test-data.sql" | pbcopy
    echo "      ✅ 測試數據 SQL 已複製到剪貼板!"
    echo ""

    echo "   2. 在 Supabase SQL Editor 中:"
    echo "      • 點擊 'New Query'"
    echo "      • 貼上 SQL (Cmd+V)"
    echo "      • 點擊 'Run'"
    echo "      • 應該會看到: 'Success. X rows inserted'"
    echo ""

    echo "   測試數據包含:"
    echo "      • 42 個 API 呼叫 (7 天)"
    echo "      • 3 個提供商 (Claude 60%, GPT-4 30%, Gemini 10%)"
    echo "      • ~71,570 tokens, ~$0.72 總成本"
    echo ""

    read -p "   ⏸️  完成後按 ENTER 繼續..." dummy
    echo ""
else
    echo "   ✅ 測試數據已存在，跳過插入"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 步驟 3/3: 驗證 APIs"
echo ""

echo "🔍 測試 /metrics API..."
METRICS=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$METRICS" | grep -q "totalTokens"; then
    echo "✅ /metrics API 正常運作!"
    TOTAL_TOKENS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalTokens', 0))")
    TOTAL_COST=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalCost', 0))")
    TOTAL_REQUESTS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalRequests', 0))")

    echo "   • Total Tokens: $TOTAL_TOKENS"
    echo "   • Total Cost: \$$TOTAL_COST"
    echo "   • Total Requests: $TOTAL_REQUESTS"
    echo ""
else
    echo "❌ /metrics API 返回錯誤:"
    echo "$METRICS"
    echo ""
fi

echo "🔍 測試 /costs API..."
COSTS=$(curl -s "$API_URL/costs?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$COSTS" | grep -q "byProvider"; then
    echo "✅ /costs API 正常運作!"
    echo ""
else
    echo "❌ /costs API 返回錯誤"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 設置完成!"
echo ""
echo "🚀 下一步:"
echo ""
echo "   1. 開啟統一儀表板:"
echo "      open index-unified.html"
echo ""
echo "   2. 部署到 Vercel:"
echo "      cp index-unified.html public/index.html"
echo "      npx vercel deploy public --prod --yes"
echo ""
echo "   3. 查看完整文檔:"
echo "      open UNIFIED_DASHBOARD_SUMMARY.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
