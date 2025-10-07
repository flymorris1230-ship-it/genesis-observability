#!/bin/bash

# Execute SQL via Supabase REST API using service role key

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║      自動執行 SQL - 通過 Supabase REST API                  ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Get Supabase credentials from Worker secrets
echo "🔍 正在獲取 Supabase 連接信息..."

cd /Users/morrislin/Desktop/genesis-observability/apps/obs-edge

# Get secrets
SUPABASE_URL=$(npx wrangler secret list 2>/dev/null | grep "SUPABASE_URL" | awk '{print $1}')
SUPABASE_SERVICE_KEY=$(npx wrangler secret list 2>/dev/null | grep "SUPABASE_SERVICE_KEY" | awk '{print $1}')

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ 無法獲取 Supabase 憑證"
    echo ""
    echo "請手動設置："
    echo "  export SUPABASE_URL='https://ikfrzzysetuwijupefor.supabase.co'"
    echo "  export SUPABASE_SERVICE_KEY='your-service-role-key'"
    echo ""
    echo "然後運行: ./scripts/setup-real-data.sh"
    echo ""
    exit 1
fi

echo "✅ 憑證已獲取"
echo ""

echo "📊 執行 SQL..."

# Since we can't execute DDL directly via REST API,
# we'll output instructions
echo ""
echo "⚠️  Supabase REST API 不支持直接執行 DDL 語句"
echo ""
echo "請使用以下任一方法："
echo ""
echo "方法 1: Supabase Dashboard (推薦)"
echo "  • SQL 已在剪貼板"
echo "  • 打開 https://app.supabase.com"
echo "  • SQL Editor → New Query → 貼上 → Run"
echo ""
echo "方法 2: psql 命令行"
echo "  • 獲取數據庫密碼（Supabase Dashboard → Settings → Database）"
echo "  • 執行:"
echo "    psql 'postgresql://postgres.ikfrzzysetuwijupefor:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres' \\"
echo "      -f supabase/migrations/20251007_create_llm_usage.sql"
echo ""
echo "方法 3: 使用引導式腳本"
echo "  • ./scripts/setup-real-data.sh"
echo ""
