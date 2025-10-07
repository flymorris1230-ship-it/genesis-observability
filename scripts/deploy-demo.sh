#!/bin/bash

# Deploy Demo Version (Mock Data) to Vercel

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║      部署演示版本 (模擬數據) 到 Vercel                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd /Users/morrislin/Desktop/genesis-observability

echo "📋 步驟 1: 備份當前 public/index.html..."
if [ -f public/index.html ]; then
    cp public/index.html public/index-backup-$(date +%Y%m%d-%H%M%S).html
    echo "✅ 已備份"
else
    echo "⚠️  沒有現有文件需要備份"
fi

echo ""
echo "📋 步驟 2: 複製演示版本到 public/..."
cp index-unified-demo.html public/index.html
echo "✅ 已複製 index-unified-demo.html → public/index.html"

echo ""
echo "📋 步驟 3: 部署到 Vercel..."
npx vercel deploy public --prod --yes

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 演示版本部署完成！"
echo ""
echo "🧪 特性:"
echo "   • 使用模擬數據展示完整功能"
echo "   • LLM 統計: 71,570 tokens, \$0.72, 42 requests"
echo "   • 不需要數據庫連接"
echo ""
echo "💡 提示:"
echo "   完成數據庫設置後，執行 ./scripts/deploy-production.sh"
echo "   切換到真實數據版本"
echo ""
