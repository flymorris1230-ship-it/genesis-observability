#!/bin/bash

# Fully Automated Setup v2 (使用 event_time 欄位)
set -e

DB_URL="postgresql://postgres.ikfrzzysetuwijupefor:Morris1230@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

cd /Users/morrislin/Desktop/genesis-observability

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🚀 完全自動化設置 V2 (event_time)                        ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "🗑️  清理舊資料表..."
PGPASSWORD='Morris1230' psql "$DB_URL" <<EOF
DROP VIEW IF EXISTS llm_usage_daily CASCADE;
DROP VIEW IF EXISTS llm_cost_by_provider CASCADE;
DROP TABLE IF EXISTS llm_usage CASCADE;
EOF

if [ $? -eq 0 ]; then
    echo "✅ 舊資料已清理"
else
    echo "⚠️  清理失敗（可能不存在）"
fi

echo ""
echo "📋 步驟 1/3: 創建 llm_usage 資料表 (V2: event_time)..."
PGPASSWORD='Morris1230' psql "$DB_URL" -f supabase/migrations/20251007_create_llm_usage_v2.sql

if [ $? -eq 0 ]; then
    echo "✅ 資料表創建成功！"
else
    echo "❌ 資料表創建失敗"
    exit 1
fi

echo ""
echo "📊 步驟 2/3: 插入測試數據 (V2)..."
PGPASSWORD='Morris1230' psql "$DB_URL" -f scripts/insert-llm-test-data-v2.sql

if [ $? -eq 0 ]; then
    echo "✅ 測試數據插入成功！"
else
    echo "❌ 測試數據插入失敗"
    exit 1
fi

echo ""
echo "🔍 驗證數據..."
COUNT=$(PGPASSWORD='Morris1230' psql "$DB_URL" -t -c "SELECT COUNT(*) FROM llm_usage WHERE project_id = 'GAC_FactoryOS';" | xargs)
echo "   資料筆數: $COUNT"

TOTAL_TOKENS=$(PGPASSWORD='Morris1230' psql "$DB_URL" -t -c "SELECT SUM(total_tokens) FROM llm_usage WHERE project_id = 'GAC_FactoryOS';" | xargs)
echo "   總 Tokens: $TOTAL_TOKENS"

TOTAL_COST=$(PGPASSWORD='Morris1230' psql "$DB_URL" -t -c "SELECT ROUND(SUM(cost_usd)::numeric, 2) FROM llm_usage WHERE project_id = 'GAC_FactoryOS';" | xargs)
echo "   總成本: \$$TOTAL_COST"

echo ""
echo "🚀 步驟 3/3: 部署生產版本到 Vercel..."

# Backup current version
if [ -f public/index.html ]; then
    cp public/index.html public/index-backup-$(date +%Y%m%d-%H%M%S).html
    echo "✅ 已備份當前版本"
fi

# Deploy real data version
cp index-unified.html public/index.html
echo "✅ 已複製生產版本"

echo ""
echo "📦 部署到 Vercel..."
DEPLOY_OUTPUT=$(npx vercel deploy public --prod --yes 2>&1)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*' | tail -1)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 🎉 完全自動化設置成功！"
echo ""
echo "📊 LLM 使用統計:"
echo "   • Total Tokens: $TOTAL_TOKENS"
echo "   • Total Cost: \$$TOTAL_COST"
echo "   • Total Requests: $COUNT"
echo ""
if [ -n "$DEPLOY_URL" ]; then
    echo "🌐 部署 URL: $DEPLOY_URL"
    echo ""
    echo "✅ 正在打開部署網站..."
    sleep 1
    open "$DEPLOY_URL"
else
    echo "🌐 部署 URL: https://genesis-observability-dashboard-107bchjxg.vercel.app"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
