#!/bin/bash

# ============================================
# Genesis Observability - Comprehensive API Test
# Tests all 11 API endpoints with real user scenarios
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
API_BASE_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
PROJECT_ID="GAC_FactoryOS"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

print_header() {
  echo -e "\n${BLUE}============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================${NC}\n"
}

print_test() {
  echo -e "${CYAN}🧪 Test $1: ${NC}$2"
}

print_success() {
  echo -e "${GREEN}✅ PASSED${NC} - $1"
  ((PASSED_TESTS++))
}

print_failure() {
  echo -e "${RED}❌ FAILED${NC} - $1"
  ((FAILED_TESTS++))
}

print_info() {
  echo -e "${PURPLE}ℹ️  ${NC}$1"
}

# Increment test counter
test_count() {
  ((TOTAL_TESTS++))
}

# Function to call API and check response
test_api() {
  local endpoint=$1
  local description=$2
  local expected_status=${3:-200}

  test_count
  print_test "$TOTAL_TESTS" "$description"

  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL$endpoint")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "$expected_status" ]; then
    print_success "Status code: $http_code"
    echo "$body" | python3 -m json.tool > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      print_info "Response: Valid JSON"
    else
      print_failure "Response: Invalid JSON"
      return 1
    fi
  else
    print_failure "Expected: $expected_status, Got: $http_code"
    return 1
  fi
}

# Test authentication
test_auth() {
  local endpoint=$1
  local description=$2

  test_count
  print_test "$TOTAL_TESTS" "$description"

  response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL$endpoint")
  http_code=$(echo "$response" | tail -n1)

  if [ "$http_code" = "401" ]; then
    print_success "Correctly rejected unauthorized request"
  else
    print_failure "Should return 401 for unauthorized, got: $http_code"
  fi
}

# Main test execution
print_header "Genesis Observability API Test Suite"
echo -e "${YELLOW}API Base URL:${NC} $API_BASE_URL"
echo -e "${YELLOW}Project ID:${NC} $PROJECT_ID"
echo -e "${YELLOW}Test Start Time:${NC} $(date '+%Y-%m-%d %H:%M:%S')"

# ============================================
# Section 1: Basic Health Check
# ============================================
print_header "Section 1: Basic Health Check"

test_api "/health" "Basic health check (no auth required)"

# ============================================
# Section 2: Authentication Tests
# ============================================
print_header "Section 2: Authentication Tests"

test_auth "/progress/modules?project_id=$PROJECT_ID" "Reject unauthorized access to /progress/modules"
test_auth "/health/system?project_id=$PROJECT_ID" "Reject unauthorized access to /health/system"
test_auth "/agents/summary?project_id=$PROJECT_ID" "Reject unauthorized access to /agents/summary"

# ============================================
# Section 3: Progress API Tests (4 endpoints)
# ============================================
print_header "Section 3: Progress Tracking API"

test_api "/progress/modules?project_id=$PROJECT_ID" "Get module progress (WMS, MES, QMS, R&D)"
test_api "/progress/sprint?project_id=$PROJECT_ID" "Get sprint progress"
test_api "/progress/tasks?project_id=$PROJECT_ID" "Get all tasks"
test_api "/progress/tasks?project_id=$PROJECT_ID&status=in_progress" "Filter tasks by status"
test_api "/progress/tasks?project_id=$PROJECT_ID&module=WMS" "Filter tasks by module"
test_api "/progress/tasks?project_id=$PROJECT_ID&priority=critical" "Filter tasks by priority"
test_api "/progress/overview?project_id=$PROJECT_ID" "Get complete project overview"

# ============================================
# Section 4: Health Monitoring API (4 endpoints)
# ============================================
print_header "Section 4: System Health Monitoring API"

test_api "/health/system?project_id=$PROJECT_ID" "Get overall system health"
test_api "/health/api?project_id=$PROJECT_ID" "Get API endpoint health"
test_api "/health/database?project_id=$PROJECT_ID" "Get database health"
test_api "/health/integrations?project_id=$PROJECT_ID" "Get integration health"

# ============================================
# Section 5: Agent Monitoring API (3 endpoints)
# ============================================
print_header "Section 5: AI Agent Monitoring API"

test_api "/agents/executions?project_id=$PROJECT_ID" "Get agent execution history"
test_api "/agents/executions?project_id=$PROJECT_ID&agent_name=Backend%20Developer" "Filter executions by agent"
test_api "/agents/performance?project_id=$PROJECT_ID&period=day" "Get agent performance (daily)"
test_api "/agents/summary?project_id=$PROJECT_ID" "Get agent summary stats"

# ============================================
# Section 6: Data Validation Tests
# ============================================
print_header "Section 6: Data Validation"

print_test "$((++TOTAL_TESTS))" "Validate module progress data structure"
response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/modules?project_id=$PROJECT_ID")
module_count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['summary']['total_modules'])")
if [ "$module_count" = "4" ]; then
  print_success "Found 4 modules (WMS, MES, QMS, R&D)"
else
  print_failure "Expected 4 modules, got: $module_count"
fi

print_test "$((++TOTAL_TESTS))" "Validate task count matches expectations"
response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/tasks?project_id=$PROJECT_ID")
task_count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['summary']['total_tasks'])")
if [ "$task_count" -ge "15" ]; then
  print_success "Found $task_count tasks (≥15 expected)"
else
  print_failure "Expected ≥15 tasks, got: $task_count"
fi

print_test "$((++TOTAL_TESTS))" "Validate integration health data"
response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/health/integrations?project_id=$PROJECT_ID")
integration_count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['summary']['total_integrations'])")
if [ "$integration_count" -ge "2" ]; then
  print_success "Found $integration_count integrations"
else
  print_failure "Expected ≥2 integrations, got: $integration_count"
fi

print_test "$((++TOTAL_TESTS))" "Validate agent execution data"
response=$(curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/agents/executions?project_id=$PROJECT_ID")
execution_count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['summary']['total_executions'])")
if [ "$execution_count" -ge "8" ]; then
  print_success "Found $execution_count agent executions"
else
  print_failure "Expected ≥8 executions, got: $execution_count"
fi

# ============================================
# Section 7: Error Handling Tests
# ============================================
print_header "Section 7: Error Handling & Edge Cases"

test_count
print_test "$TOTAL_TESTS" "Handle invalid project_id"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/modules?project_id=INVALID_PROJECT")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ]; then
  body=$(echo "$response" | head -n-1)
  module_count=$(echo "$body" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['summary']['total_modules'])")
  if [ "$module_count" = "0" ]; then
    print_success "Returns empty data for invalid project"
  else
    print_failure "Should return empty data"
  fi
else
  print_failure "Expected 200, got: $http_code"
fi

test_api "/progress/tasks?project_id=$PROJECT_ID&status=invalid_status" "Handle invalid status filter" 200

test_count
print_test "$TOTAL_TESTS" "Handle missing Authorization header"
response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL/progress/modules?project_id=$PROJECT_ID")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
  print_success "Correctly returns 401 Unauthorized"
else
  print_failure "Expected 401, got: $http_code"
fi

test_count
print_test "$TOTAL_TESTS" "Handle invalid API key"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer invalid_key" "$API_BASE_URL/progress/modules?project_id=$PROJECT_ID")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
  print_success "Correctly rejects invalid API key"
else
  print_failure "Expected 401, got: $http_code"
fi

# ============================================
# Section 8: Performance Tests
# ============================================
print_header "Section 8: Performance Tests"

test_count
print_test "$TOTAL_TESTS" "Measure /progress/overview response time"
start_time=$(date +%s%3N)
curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/overview?project_id=$PROJECT_ID" > /dev/null
end_time=$(date +%s%3N)
duration=$((end_time - start_time))
if [ "$duration" -lt "2000" ]; then
  print_success "Response time: ${duration}ms (<2000ms threshold)"
else
  print_failure "Response time: ${duration}ms (>=2000ms)"
fi

test_count
print_test "$TOTAL_TESTS" "Measure /health/system response time"
start_time=$(date +%s%3N)
curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/health/system?project_id=$PROJECT_ID" > /dev/null
end_time=$(date +%s%3N)
duration=$((end_time - start_time))
if [ "$duration" -lt "2000" ]; then
  print_success "Response time: ${duration}ms (<2000ms threshold)"
else
  print_failure "Response time: ${duration}ms (>=2000ms)"
fi

# ============================================
# Test Summary
# ============================================
print_header "Test Summary"

echo -e "${YELLOW}Test End Time:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${YELLOW}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"

success_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
echo -e "${YELLOW}Success Rate:${NC} ${success_rate}%"

if [ "$FAILED_TESTS" -eq "0" ]; then
  echo -e "\n${GREEN}🎉 All tests passed! System is production-ready.${NC}\n"
  exit 0
else
  echo -e "\n${RED}⚠️  Some tests failed. Please review the results above.${NC}\n"
  exit 1
fi
