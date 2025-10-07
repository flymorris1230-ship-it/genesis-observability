#!/bin/bash
# Quick API Test - Simplified version

set -e

API_BASE_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
PROJECT_ID="GAC_FactoryOS"

PASSED=0
FAILED=0

echo "================================================"
echo "Genesis Observability API - Quick Test"
echo "================================================"
echo ""

test_endpoint() {
  local name="$1"
  local url="$2"
  local auth="$3"

  echo -n "Testing $name... "

  if [ "$auth" = "yes" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$url")
  else
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  fi

  if [ "$response" = "200" ]; then
    echo "✅ PASS ($response)"
    ((PASSED++))
  else
    echo "❌ FAIL ($response)"
    ((FAILED++))
  fi
}

# Test all endpoints
echo "=== Basic Health ==="
test_endpoint "Health Check" "$API_BASE_URL/health" "no"
echo ""

echo "=== Progress API ==="
test_endpoint "Module Progress" "$API_BASE_URL/progress/modules?project_id=$PROJECT_ID" "yes"
test_endpoint "Sprint Progress" "$API_BASE_URL/progress/sprint?project_id=$PROJECT_ID" "yes"
test_endpoint "Task Progress" "$API_BASE_URL/progress/tasks?project_id=$PROJECT_ID" "yes"
test_endpoint "Project Overview" "$API_BASE_URL/progress/overview?project_id=$PROJECT_ID" "yes"
echo ""

echo "=== Health Monitoring API ==="
test_endpoint "System Health" "$API_BASE_URL/health/system?project_id=$PROJECT_ID" "yes"
test_endpoint "API Health" "$API_BASE_URL/health/api?project_id=$PROJECT_ID" "yes"
test_endpoint "Database Health" "$API_BASE_URL/health/database?project_id=$PROJECT_ID" "yes"
test_endpoint "Integration Health" "$API_BASE_URL/health/integrations?project_id=$PROJECT_ID" "yes"
echo ""

echo "=== Agent Monitoring API ==="
test_endpoint "Agent Executions" "$API_BASE_URL/agents/executions?project_id=$PROJECT_ID" "yes"
test_endpoint "Agent Performance" "$API_BASE_URL/agents/performance?project_id=$PROJECT_ID&period=day" "yes"
test_endpoint "Agent Summary" "$API_BASE_URL/agents/summary?project_id=$PROJECT_ID" "yes"
echo ""

echo "================================================"
echo "Test Results"
echo "================================================"
TOTAL=$((PASSED + FAILED))
echo "Total:  $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed"
  exit 1
fi
