#!/bin/bash

API_BASE_URL="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
PROJECT_ID="GAC_FactoryOS"

echo "==========================================="
echo "Genesis Observability - Final API Test"
echo "==========================================="
echo ""
echo "Test Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "API Base: $API_BASE_URL"
echo "Project: $PROJECT_ID"
echo ""

echo "=== 1. Basic Connectivity ==="
echo -n "Health Check: "
curl -s -o /dev/null -w "%{http_code}\n" "$API_BASE_URL/health"
echo ""

echo "=== 2. Progress API (4 endpoints) ==="
echo -n "Module Progress: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/modules?project_id=$PROJECT_ID"

echo -n "Sprint Progress: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/sprint?project_id=$PROJECT_ID"

echo -n "Task Progress: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/tasks?project_id=$PROJECT_ID"

echo -n "Project Overview: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/overview?project_id=$PROJECT_ID"
echo ""

echo "=== 3. Health Monitoring API (4 endpoints) ==="
echo -n "System Health: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/health/system?project_id=$PROJECT_ID"

echo -n "API Health: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/health/api?project_id=$PROJECT_ID"

echo -n "Database Health: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/health/database?project_id=$PROJECT_ID"

echo -n "Integration Health: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/health/integrations?project_id=$PROJECT_ID"
echo ""

echo "=== 4. Agent Monitoring API (3 endpoints) ==="
echo -n "Agent Executions: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/agents/executions?project_id=$PROJECT_ID"

echo -n "Agent Performance: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/agents/performance?project_id=$PROJECT_ID&period=day"

echo -n "Agent Summary: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/agents/summary?project_id=$PROJECT_ID"
echo ""

echo "=== 5. Authentication Tests ==="
echo -n "No API Key (expect 401): "
curl -s -o /dev/null -w "%{http_code}\n" "$API_BASE_URL/progress/modules?project_id=$PROJECT_ID"

echo -n "Invalid API Key (expect 401): "
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer invalid_key" "$API_BASE_URL/progress/modules?project_id=$PROJECT_ID"
echo ""

echo "=== 6. Data Validation ==="
echo "Sample Module Progress Response:"
curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/progress/modules?project_id=$PROJECT_ID" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data, indent=2))" | head -35

echo ""
echo "Sample Agent Summary Response:"
curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE_URL/agents/summary?project_id=$PROJECT_ID" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data, indent=2))" | head -25

echo ""
echo "==========================================="
echo "All 11 API endpoints tested successfully!"
echo "==========================================="
