#!/bin/bash

# Deploy Production Version (Real Data) to Vercel

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║      部署生產版本 (真實數據) 到 Vercel                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd /Users/morrislin/Desktop/genesis-observability

# 驗證數據庫是否已設置
echo "🔍 驗證數據庫狀態..."
API_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

RESPONSE=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$RESPONSE" | grep -q "Could not find the table"; then
    echo "❌ 數據庫尚未設置！"
    echo ""
    echo "請先完成數據庫設置："
    echo "  1. 執行 ./scripts/quick-setup.sh"
    echo "  或"
    echo "  2. 手動在 Supabase 中執行 SQL"
    echo ""
    echo "完成後再運行此腳本。"
    echo ""
    exit 1
fi

if ! echo "$RESPONSE" | grep -q "totalTokens"; then
    echo "⚠️  數據庫已創建但沒有數據"
    echo ""
    echo "請插入測試數據："
    echo "  cat scripts/insert-llm-test-data.sql | pbcopy"
    echo "  然後在 Supabase SQL Editor 中貼上並執行"
    echo ""
    read -p "已插入測試數據？(y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "取消部署"
        exit 1
    fi
fi

echo "✅ 數據庫驗證通過"
echo ""

echo "📋 步驟 1: 備份當前 public/index.html..."
if [ -f public/index.html ]; then
    cp public/index.html public/index-backup-$(date +%Y%m%d-%H%M%S).html
    echo "✅ 已備份"
else
    echo "⚠️  沒有現有文件需要備份"
fi

echo ""
echo "📋 步驟 2: 複製生產版本到 public/..."
cp index-unified.html public/index.html
echo "✅ 已複製 index-unified.html → public/index.html"

echo ""
echo "📋 步驟 3: 部署到 Vercel..."
npx vercel deploy public --prod --yes

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 生產版本部署完成！"
echo ""
echo "📊 特性:"
echo "   • 連接真實數據庫"
echo "   • 顯示實際 LLM 使用數據"
echo "   • 每 30 秒自動刷新"
echo ""
echo "🔍 驗證:"
echo "   訪問部署 URL，確認 LLM 統計卡顯示真實數據"
echo ""
