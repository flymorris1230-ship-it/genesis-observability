#!/bin/bash

# Genesis Observability - Verify Migration and Insert Test Data
# This script checks if llm_usage table exists and inserts test data

set -e

API_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Genesis Observability - LLM Usage Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check if migration has been executed
echo "🔍 Step 1: Checking if llm_usage table exists..."
RESPONSE=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$RESPONSE" | grep -q "Could not find the table"; then
  echo "❌ Table not found. Please execute the migration first:"
  echo ""
  echo "  1. The migration SQL is already in your clipboard"
  echo "  2. Paste it in Supabase SQL Editor (already opened)"
  echo "  3. Click 'Run' (or press Cmd+Enter)"
  echo "  4. Then run this script again: ./scripts/verify-and-insert-testdata.sh"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo "✅ Table exists!"
echo ""

# Step 2: Check if test data already exists
echo "🔍 Step 2: Checking for existing test data..."
if echo "$RESPONSE" | grep -q '"total_requests":0' || echo "$RESPONSE" | grep -q '"totalTokens":0'; then
  echo "📝 No data found. Preparing to insert test data..."
  echo ""

  # Step 3: Copy test data to clipboard
  echo "📋 Step 3: Copying test data SQL to clipboard..."
  cat "$(dirname "$0")/insert-llm-test-data.sql" | pbcopy
  echo "✅ Test data SQL copied to clipboard!"
  echo ""

  # Step 4: Instructions
  echo "📌 Step 4: Insert test data:"
  echo "  1. Go back to Supabase SQL Editor"
  echo "  2. Create a new query"
  echo "  3. Paste (test data is in clipboard)"
  echo "  4. Run the query"
  echo ""
  echo "⏳ This will insert 42 LLM API calls over 7 days (~$0.70 total cost)"
  echo ""

  read -p "Press ENTER when you've inserted the test data, or Ctrl+C to cancel..."
  echo ""
else
  echo "ℹ️  Data already exists, skipping test data insertion"
  echo ""
fi

# Step 5: Verify APIs work
echo "🔍 Step 5: Verifying /metrics API..."
METRICS=$(curl -s "$API_URL/metrics?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$METRICS" | grep -q "total_requests"; then
  echo "✅ /metrics API working!"
  echo "$METRICS" | python3 -m json.tool | head -20
  echo ""
else
  echo "❌ /metrics API returned an error:"
  echo "$METRICS"
  echo ""
  exit 1
fi

echo "🔍 Step 6: Verifying /costs API..."
COSTS=$(curl -s "$API_URL/costs?project_id=GAC_FactoryOS&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer $API_KEY")

if echo "$COSTS" | grep -q "total_cost"; then
  echo "✅ /costs API working!"
  echo "$COSTS" | python3 -m json.tool | head -20
  echo ""
else
  echo "❌ /costs API returned an error:"
  echo "$COSTS"
  echo ""
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Phase 1 Complete: LLM Monitoring Foundation Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo "  - Phase 2: Create unified dashboard (Factory OS + LLM)"
echo "  - Phase 3: Testing and optimization"
echo "  - Phase 4: Deployment"
echo ""
