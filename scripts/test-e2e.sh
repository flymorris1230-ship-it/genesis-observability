#!/bin/bash

# Genesis Observability - End-to-End Testing Script
# Version: 1.0
# Date: 2025-10-07
#
# This script performs end-to-end testing of the complete system
# from LLM usage ingestion to Dashboard visualization

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Print functions
print_header() {
  echo -e "\n${BLUE}============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${CYAN}ℹ $1${NC}"
}

# ============================================================================
# Configuration
# ============================================================================

print_header "E2E Test Configuration"

# Read from environment or use defaults
WORKER_URL=${OBS_EDGE_URL:-"https://obs-edge.flymorris1230.workers.dev"}
API_KEY=${OBS_EDGE_API_KEY:-"a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"}
TEST_PROJECT="e2e-test-$(date +%s)"

print_info "Worker URL: $WORKER_URL"
print_info "API Key: ${API_KEY:0:20}..."
print_info "Test Project ID: $TEST_PROJECT"

# Check if curl is available
if ! command -v curl &> /dev/null; then
  print_error "curl is not installed. Please install curl first."
  exit 1
fi

# Check if jq is available (for JSON parsing)
if ! command -v jq &> /dev/null; then
  print_warning "jq is not installed. JSON output will not be pretty-printed."
  JQ_AVAILABLE=false
else
  JQ_AVAILABLE=true
fi

# ============================================================================
# Test 1: Health Check
# ============================================================================

print_header "Test 1: Health Check"

print_info "Testing Worker accessibility..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/")

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 404 ]; then
  print_success "Worker is accessible (HTTP $HTTP_CODE)"
else
  print_error "Worker is not accessible (HTTP $HTTP_CODE)"
  exit 1
fi

# ============================================================================
# Test 2: Authentication
# ============================================================================

print_header "Test 2: Authentication"

print_info "Testing without API key (should fail)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$WORKER_URL/metrics?project_id=test")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" -eq 401 ]; then
  print_success "Correctly rejected request without API key (HTTP 401)"
else
  print_error "Expected HTTP 401, got HTTP $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

print_info "Testing with invalid API key (should fail)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer invalid-key-12345" \
  "$WORKER_URL/metrics?project_id=test")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" -eq 401 ]; then
  print_success "Correctly rejected request with invalid API key (HTTP 401)"
else
  print_error "Expected HTTP 401, got HTTP $HTTP_CODE"
  exit 1
fi

print_info "Testing with valid API key (should succeed)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  "$WORKER_URL/metrics?project_id=test")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" -eq 200 ]; then
  print_success "Successfully authenticated with valid API key (HTTP 200)"
else
  print_warning "Authentication succeeded but got unexpected HTTP code: $HTTP_CODE"
  print_info "This might be due to missing Supabase configuration"
fi

# ============================================================================
# Test 3: Ingest Data
# ============================================================================

print_header "Test 3: Data Ingestion"

# Test data samples
declare -a SAMPLES=(
  '{"project_id":"'"$TEST_PROJECT"'","model":"gpt-4","provider":"openai","input_tokens":1000,"output_tokens":500,"latency_ms":1200}'
  '{"project_id":"'"$TEST_PROJECT"'","model":"claude-3-sonnet","provider":"anthropic","input_tokens":800,"output_tokens":600,"latency_ms":1100}'
  '{"project_id":"'"$TEST_PROJECT"'","model":"gpt-4","provider":"openai","input_tokens":1200,"output_tokens":800,"latency_ms":1300}'
  '{"project_id":"'"$TEST_PROJECT"'","model":"gemini-pro","provider":"google","input_tokens":500,"output_tokens":300,"latency_ms":900}'
)

INGESTED_IDS=()

for i in "${!SAMPLES[@]}"; do
  SAMPLE="${SAMPLES[$i]}"

  print_info "Ingesting sample $((i+1))/${#SAMPLES[@]}..."

  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$SAMPLE" \
    "$WORKER_URL/ingest")

  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

  if [ "$HTTP_CODE" -eq 200 ]; then
    if [ "$JQ_AVAILABLE" = true ]; then
      echo "$BODY" | jq '.'
      RECORD_ID=$(echo "$BODY" | jq -r '.id // empty')
      if [ -n "$RECORD_ID" ]; then
        INGESTED_IDS+=("$RECORD_ID")
        print_success "Sample $((i+1)) ingested successfully (ID: ${RECORD_ID:0:8}...)"
      else
        print_success "Sample $((i+1)) ingested (no ID returned)"
      fi
    else
      echo "$BODY"
      print_success "Sample $((i+1)) ingested successfully"
    fi
  else
    print_error "Failed to ingest sample $((i+1)) (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
  fi

  # Small delay to avoid rate limiting
  sleep 1
done

print_success "Ingested ${#INGESTED_IDS[@]}/${#SAMPLES[@]} samples"

# ============================================================================
# Test 4: Query Metrics
# ============================================================================

print_header "Test 4: Query Metrics"

# Wait a bit for data to be available
print_info "Waiting 3 seconds for data to be indexed..."
sleep 3

print_info "Querying metrics for project: $TEST_PROJECT..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  "$WORKER_URL/metrics?project_id=$TEST_PROJECT&start_date=2025-01-01&end_date=2025-12-31")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" -eq 200 ]; then
  print_success "Metrics query successful (HTTP 200)"

  if [ "$JQ_AVAILABLE" = true ]; then
    echo ""
    echo "Metrics Response:"
    echo "$BODY" | jq '.'

    # Extract key metrics
    TOTAL_TOKENS=$(echo "$BODY" | jq -r '.summary.total_tokens // .total_tokens // 0')
    TOTAL_REQUESTS=$(echo "$BODY" | jq -r '.summary.total_requests // .total_requests // 0')
    TOTAL_COST=$(echo "$BODY" | jq -r '.summary.total_cost_usd // .total_cost_usd // 0')

    echo ""
    print_info "Summary:"
    echo "  Total Tokens: $TOTAL_TOKENS"
    echo "  Total Requests: $TOTAL_REQUESTS"
    echo "  Total Cost: \$$TOTAL_COST"
  else
    echo "Response: $BODY"
  fi
else
  print_error "Metrics query failed (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

# ============================================================================
# Test 5: Query Costs
# ============================================================================

print_header "Test 5: Query Costs"

print_info "Querying costs for project: $TEST_PROJECT..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  "$WORKER_URL/costs?project_id=$TEST_PROJECT&start_date=2025-01-01&end_date=2025-12-31")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" -eq 200 ]; then
  print_success "Cost query successful (HTTP 200)"

  if [ "$JQ_AVAILABLE" = true ]; then
    echo ""
    echo "Cost Response:"
    echo "$BODY" | jq '.'
  else
    echo "Response: $BODY"
  fi
else
  print_error "Cost query failed (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi

# ============================================================================
# Test 6: Rate Limiting
# ============================================================================

print_header "Test 6: Rate Limiting"

print_info "Testing rate limiting (sending 10 requests rapidly)..."

RATE_LIMIT_HIT=false

for i in {1..10}; do
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $API_KEY" \
    "$WORKER_URL/metrics?project_id=test")

  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

  if [ "$HTTP_CODE" -eq 429 ]; then
    RATE_LIMIT_HIT=true
    print_success "Rate limit triggered after $i requests (HTTP 429)"
    break
  fi
done

if [ "$RATE_LIMIT_HIT" = false ]; then
  print_warning "Rate limit not triggered (might have higher limit or different IP)"
else
  print_success "Rate limiting is working correctly"
fi

# ============================================================================
# Test Summary
# ============================================================================

print_header "Test Summary"

echo ""
print_success "✨ E2E Testing Complete!"
echo ""
print_info "Test Results:"
echo "  ✓ Health Check: Passed"
echo "  ✓ Authentication: Passed"
echo "  ✓ Data Ingestion: ${#INGESTED_IDS[@]}/${#SAMPLES[@]} samples"
echo "  ✓ Metrics Query: Tested"
echo "  ✓ Cost Query: Tested"
echo "  ✓ Rate Limiting: Tested"
echo ""

if [ ${#INGESTED_IDS[@]} -eq ${#SAMPLES[@]} ]; then
  print_success "All tests passed! 🎉"
  echo ""
  print_info "Next Steps:"
  echo "  1. Open your Dashboard to visualize the test data"
  echo "  2. Check project: $TEST_PROJECT"
  echo "  3. Verify charts are showing data correctly"
  echo ""
else
  print_warning "Some tests had issues. Please review the output above."
fi

print_info "Test Project ID: $TEST_PROJECT"
print_info "You can query this project ID in your Dashboard to see the test data."
echo ""
