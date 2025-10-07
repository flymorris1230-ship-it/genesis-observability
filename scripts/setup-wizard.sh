#!/bin/bash

# Genesis Observability - Interactive Setup Wizard
# This script guides you through the deployment process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${CYAN}ℹ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Welcome
clear
print_header "Genesis Observability - 部署精靈"

echo -e "${GREEN}歡迎使用 Genesis Observability 自動部署精靈！${NC}"
echo ""
echo "這個精靈將引導您完成以下步驟:"
echo "  1. 設置 Supabase 專案"
echo "  2. 配置 Worker secrets"
echo "  3. 部署 Dashboard"
echo "  4. 執行測試"
echo ""
echo -e "${YELLOW}預估時間: 15 分鐘${NC}"
echo ""
read -p "按 Enter 開始..."

# Step 1: Supabase Setup
print_header "步驟 1/4: Supabase 設置"

echo "正在打開 Supabase 網站..."
open https://app.supabase.com 2>/dev/null || echo "請手動前往: https://app.supabase.com"

echo ""
echo "請在 Supabase 完成以下操作:"
echo ""
echo "  1. 點擊 'New Project'"
echo "  2. Project Name: ${GREEN}genesis-observability${NC}"
echo "  3. Database Password: 選擇一個強密碼"
echo "  4. Region: ${GREEN}Northeast Asia (Tokyo)${NC} 或 ${GREEN}Southeast Asia (Singapore)${NC}"
echo "  5. 點擊 'Create new project'"
echo "  6. 等待 2-3 分鐘讓專案初始化"
echo ""
read -p "專案建立完成後，按 Enter 繼續..."

# Step 1.5: Database Schema
print_header "步驟 1.5/4: 設置資料庫 Schema"

echo "現在需要執行資料庫 schema..."
echo ""
echo "請在 Supabase Dashboard 完成:"
echo ""
echo "  1. 左側選單點擊 ${GREEN}'SQL Editor'${NC}"
echo "  2. 點擊 ${GREEN}'New Query'${NC}"
echo "  3. 打開檔案: ${CYAN}scripts/setup-supabase.sql${NC}"
echo "  4. 複製整個檔案內容並貼到 SQL Editor"
echo "  5. 點擊右下角 ${GREEN}'Run'${NC} 按鈕"
echo "  6. 確認執行成功 (應該會看到 'Setup Complete!' 訊息)"
echo ""

# Offer to open the file
echo -e "${YELLOW}是否在文字編輯器中打開 setup-supabase.sql?${NC}"
read -p "(y/n): " open_sql
if [ "$open_sql" = "y" ]; then
  open scripts/setup-supabase.sql || cat scripts/setup-supabase.sql
fi

echo ""
read -p "Schema 執行完成後，按 Enter 繼續..."

# Step 2: Get Supabase Credentials
print_header "步驟 2/4: 取得 Supabase Credentials"

echo "現在需要取得 Supabase 的 URL 和 Service Key..."
echo ""
echo "請在 Supabase Dashboard 完成:"
echo ""
echo "  1. 前往 ${GREEN}'Settings → API'${NC}"
echo "  2. 找到 ${CYAN}'Project URL'${NC}"
echo "  3. 找到 ${CYAN}'service_role key'${NC} (在 'Project API keys' 區塊)"
echo ""

read -p "按 Enter 後輸入 Supabase URL: "
read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL

if [ -z "$SUPABASE_URL" ]; then
  print_error "URL 不能為空！"
  exit 1
fi

print_success "URL: $SUPABASE_URL"

echo ""
read -p "Supabase Service Key (eyJ...): " SUPABASE_SERVICE_KEY

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  print_error "Service Key 不能為空！"
  exit 1
fi

print_success "Service Key: ${SUPABASE_SERVICE_KEY:0:20}..."

# Step 3: Set Worker Secrets
print_header "步驟 3/4: 配置 Worker Secrets"

cd apps/obs-edge

print_info "正在設置 SUPABASE_URL..."
echo "$SUPABASE_URL" | npx wrangler secret put SUPABASE_URL

print_info "正在設置 SUPABASE_SERVICE_KEY..."
echo "$SUPABASE_SERVICE_KEY" | npx wrangler secret put SUPABASE_SERVICE_KEY

print_success "Worker secrets 設置完成！"

# Verify secrets
echo ""
print_info "驗證 secrets..."
npx wrangler secret list

cd ../..

# Step 4: Deploy Dashboard
print_header "步驟 4/4: 部署 Dashboard"

cd apps/obs-dashboard

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
  print_info "創建 .env.production..."
  cat > .env.production << 'EOL'
NEXT_PUBLIC_OBS_EDGE_URL=https://obs-edge.flymorris1230.workers.dev
NEXT_PUBLIC_OBS_EDGE_API_KEY=a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e
EOL
  print_success ".env.production 已創建"
fi

echo ""
print_info "正在部署 Dashboard 到 Vercel..."
echo ""
echo -e "${YELLOW}Vercel 可能會詢問一些問題，請按照提示回答${NC}"
echo ""

npx vercel deploy --prod

if [ $? -eq 0 ]; then
  print_success "Dashboard 部署成功！"
else
  print_error "Dashboard 部署失敗"
  print_info "請手動執行: cd apps/obs-dashboard && npx vercel deploy --prod"
  exit 1
fi

cd ../..

# Step 5: Test
print_header "測試部署"

echo "正在測試 Worker API..."
echo ""

TEST_RESPONSE=$(curl -s -X POST "https://obs-edge.flymorris1230.workers.dev/ingest" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "deployment-test",
    "model": "gpt-4",
    "provider": "openai",
    "input_tokens": 1000,
    "output_tokens": 500,
    "latency_ms": 1200
  }')

echo "Response: $TEST_RESPONSE"

if echo "$TEST_RESPONSE" | grep -q "success"; then
  print_success "Worker API 測試通過！"
else
  print_warning "Worker API 可能有問題，請檢查回應"
fi

# Final Summary
print_header "🎉 部署完成！"

echo -e "${GREEN}恭喜！Genesis Observability 已成功部署！${NC}"
echo ""
echo "📊 系統 URLs:"
echo "  • Worker API: ${CYAN}https://obs-edge.flymorris1230.workers.dev${NC}"
echo "  • Dashboard: ${CYAN}(檢查上方 Vercel 輸出的 URL)${NC}"
echo "  • Supabase: ${CYAN}$SUPABASE_URL${NC}"
echo ""
echo "🧪 下一步:"
echo "  1. 執行完整測試: ${YELLOW}./scripts/test-e2e.sh${NC}"
echo "  2. 打開 Dashboard 並查看資料"
echo "  3. 整合到你的 LLM 應用程式"
echo ""
echo "📚 文檔:"
echo "  • Quick Start: ${CYAN}QUICK_START.md${NC}"
echo "  • Architecture: ${CYAN}DEPLOYMENT_ARCHITECTURE.md${NC}"
echo "  • Deployment Guide: ${CYAN}DEPLOYMENT_GUIDE.md${NC}"
echo ""
print_success "部署完成！"
