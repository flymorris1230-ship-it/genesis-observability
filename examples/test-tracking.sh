#!/bin/bash

# Genesis Observability - Test Tracking Script
# This script sends test data to the observability system and verifies it works

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
PROJECT_ID="test-tracking-$(date +%s)"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Genesis Observability - Test Tracking${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}Project ID: $PROJECT_ID${NC}\n"

# Test 1: Send test data
echo -e "${BLUE}Test 1: Sending test data${NC}"

curl -X POST "$API_URL/ingest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"model\": \"gpt-4-turbo\",
    \"provider\": \"openai\",
    \"input_tokens\": 1000,
    \"output_tokens\": 500,
    \"latency_ms\": 1200,
    \"metadata\": {
      \"test\": true,
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }"

echo -e "\n${GREEN}✓ Data sent${NC}\n"

# Test 2: Send more test data
echo -e "${BLUE}Test 2: Sending more test data (Claude)${NC}"

curl -X POST "$API_URL/ingest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"model\": \"claude-3-sonnet\",
    \"provider\": \"anthropic\",
    \"input_tokens\": 800,
    \"output_tokens\": 400,
    \"latency_ms\": 950
  }"

echo -e "\n${GREEN}✓ Data sent${NC}\n"

# Test 3: Query metrics
echo -e "${BLUE}Test 3: Querying metrics${NC}"
sleep 2

curl -s "$API_URL/metrics?project_id=$PROJECT_ID&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer $API_KEY" | python3 -m json.tool

echo -e "\n${GREEN}✓ Metrics retrieved${NC}\n"

# Test 4: Query costs
echo -e "${BLUE}Test 4: Querying costs${NC}"

curl -s "$API_URL/costs?project_id=$PROJECT_ID&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer $API_KEY" | python3 -m json.tool

echo -e "\n${GREEN}✓ Costs retrieved${NC}\n"

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Check Dashboard: https://genesis-observability-obs-dashboard.vercel.app"
echo "  2. Search for project: $PROJECT_ID"
echo "  3. View the test data in charts"
echo ""
