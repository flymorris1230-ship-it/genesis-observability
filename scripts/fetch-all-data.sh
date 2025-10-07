#!/bin/bash

API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
BASE_URL="https://obs-edge.flymorris1230.workers.dev"
PROJECT="GAC_FactoryOS"

echo "================================================"
echo "Genesis Observability - Complete Data Fetch"
echo "================================================"
echo ""

echo "=== 1. Project Overview ==="
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/progress/overview?project_id=$PROJECT" | python3 -m json.tool
echo ""

echo "=== 2. All Modules ==="
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/progress/modules?project_id=$PROJECT" | python3 -m json.tool
echo ""

echo "=== 3. Sprint Progress ==="
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/progress/sprint?project_id=$PROJECT" | python3 -m json.tool
echo ""

echo "=== 4. All Tasks Summary ==="
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/progress/tasks?project_id=$PROJECT" | python3 -m json.tool | head -50
echo ""

echo "=== 5. Agent Summary ==="
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/agents/summary?project_id=$PROJECT" | python3 -m json.tool
echo ""

echo "=== 6. System Health ==="
curl -s -H "Authorization: Bearer $API_KEY" "$BASE_URL/health/system?project_id=$PROJECT" | python3 -m json.tool
echo ""

echo "================================================"
echo "Data fetch complete!"
echo "================================================"
