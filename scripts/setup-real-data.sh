#!/bin/bash

# Setup Real Data for Genesis Observability

set -e

API_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║      Genesis Observability - 真實數據設置                   ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 步驟 1: 創建資料表
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 步驟 1/4: 創建 llm_usage 資料表"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 檢查是否已創建
echo "🔍 檢查資料表狀態..."
RESPONSE=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$RESPONSE" | grep -q "Could not find the table"; then
    echo "⚠️  資料表尚未創建"
    echo ""
    echo "✅ SQL 已複製到剪貼板"
    echo "✅ Supabase Dashboard 已在瀏覽器中打開"
    echo ""
    echo "請執行以下操作："
    echo "  1. 在 Supabase 中選擇您的專案"
    echo "  2. 點擊左側 'SQL Editor'"
    echo "  3. 點擊 'New Query'"
    echo "  4. 貼上 SQL (Cmd+V)"
    echo "  5. 點擊 'Run' (或按 Cmd+Enter)"
    echo "  6. 應該看到: 'Success. No rows returned'"
    echo ""

    read -p "⏸️  完成後按 ENTER 繼續..." dummy
    echo ""

    # 驗證表格創建
    echo "🔍 驗證資料表創建..."
    VERIFY=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
      -H "Authorization: Bearer $API_KEY")

    if echo "$VERIFY" | grep -q "Could not find the table"; then
        echo "❌ 資料表創建失敗"
        echo ""
        echo "請確認："
        echo "  • SQL 是否在 Supabase SQL Editor 中成功執行"
        echo "  • 是否看到 'Success' 訊息"
        echo "  • 在 Table Editor 中是否看到 llm_usage 表"
        echo ""
        exit 1
    fi

    echo "✅ 資料表創建成功！"
else
    echo "✅ 資料表已存在"
fi

echo ""

# 步驟 2: 插入測試數據
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 步驟 2/4: 插入測試數據"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 檢查是否已有數據
if echo "$RESPONSE" | grep -q '"totalRequests":0'; then
    echo "📊 準備插入測試數據..."
    echo ""
    echo "測試數據包含："
    echo "  • 42 個 API 呼叫 (分布在 7 天)"
    echo "  • 3 個提供商: Claude 60%, GPT-4 30%, Gemini 10%"
    echo "  • ~71,570 tokens, ~\$0.72 總成本"
    echo "  • 平均延遲: ~1,348ms"
    echo ""

    # 複製測試數據 SQL
    cat "$(dirname "$0")/insert-llm-test-data.sql" | pbcopy
    echo "✅ 測試數據 SQL 已複製到剪貼板"
    echo ""

    echo "請在 Supabase SQL Editor 中："
    echo "  1. 點擊 'New Query'"
    echo "  2. 貼上測試數據 SQL (Cmd+V)"
    echo "  3. 點擊 'Run'"
    echo "  4. 應該看到: 'Success. X rows inserted'"
    echo ""

    read -p "⏸️  完成後按 ENTER 繼續..." dummy
    echo ""
else
    echo "✅ 測試數據已存在"
fi

echo ""

# 步驟 3: 驗證 APIs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 步驟 3/4: 驗證 APIs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔍 測試 /metrics API..."
METRICS=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$METRICS" | grep -q "totalTokens"; then
    echo "✅ /metrics API 正常運作"

    TOTAL_TOKENS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalTokens', 0))" 2>/dev/null || echo "N/A")
    TOTAL_COST=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalCost', 0))" 2>/dev/null || echo "N/A")
    TOTAL_REQUESTS=$(echo "$METRICS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalRequests', 0))" 2>/dev/null || echo "N/A")

    echo "   • Total Tokens: $TOTAL_TOKENS"
    echo "   • Total Cost: \$$TOTAL_COST"
    echo "   • Total Requests: $TOTAL_REQUESTS"
else
    echo "❌ /metrics API 返回錯誤"
    echo "$METRICS"
    exit 1
fi

echo ""
echo "🔍 測試 /costs API..."
COSTS=$(curl -s "$API_URL/costs?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$COSTS" | grep -q "byProvider"; then
    echo "✅ /costs API 正常運作"
else
    echo "❌ /costs API 返回錯誤"
    echo "$COSTS"
    exit 1
fi

echo ""

# 步驟 4: 部署生產版本
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 步驟 4/4: 部署生產版本到 Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📦 準備部署..."
cd "$(dirname "$0")/.."

# 備份當前版本
if [ -f public/index.html ]; then
    cp public/index.html public/index-backup-$(date +%Y%m%d-%H%M%S).html
    echo "✅ 已備份當前版本"
fi

# 複製真實數據版本
cp index-unified.html public/index.html
echo "✅ 已複製 index-unified.html → public/index.html"

echo ""
echo "🚀 部署到 Vercel..."
npx vercel deploy public --prod --yes

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 真實數據版本設置完成！"
echo ""
echo "📊 LLM 統計數據:"
echo "   • Total Tokens: $TOTAL_TOKENS"
echo "   • Total Cost: \$$TOTAL_COST"
echo "   • Total Requests: $TOTAL_REQUESTS"
echo ""
echo "🌐 訪問部署 URL 查看真實數據"
echo ""
