#!/bin/bash

# Genesis Observability - Complete Dashboard Testing Script
# Tests all 3 dashboard versions for functionality and accessibility

set -e

echo "============================================"
echo "Genesis Observability - Dashboard Test Suite"
echo "Testing all 3 dashboard versions"
echo "============================================"
echo ""

PROJECT_ROOT="/Users/morrislin/Desktop/genesis-observability"
API_BASE="https://obs-edge.flymorris1230.workers.dev"
API_KEY="a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test result
print_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to test API endpoints
test_api() {
    echo -e "${BLUE}Testing API Endpoints...${NC}"

    # Test health endpoint
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/health")
    if [ "$response" = "200" ]; then
        print_result 0 "API Health endpoint"
    else
        print_result 1 "API Health endpoint (Got $response)"
    fi

    # Test progress overview
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$API_BASE/progress/overview?project_id=GAC_FactoryOS")
    if [ "$response" = "200" ]; then
        print_result 0 "Progress Overview endpoint"
    else
        print_result 1 "Progress Overview endpoint (Got $response)"
    fi

    # Test modules endpoint
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$API_BASE/progress/modules?project_id=GAC_FactoryOS")
    if [ "$response" = "200" ]; then
        print_result 0 "Modules endpoint"
    else
        print_result 1 "Modules endpoint (Got $response)"
    fi

    # Test tasks endpoint
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$API_BASE/tasks?project_id=GAC_FactoryOS")
    if [ "$response" = "200" ]; then
        print_result 0 "Tasks endpoint"
    else
        print_result 1 "Tasks endpoint (Got $response)"
    fi

    # Test agents endpoint
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$API_BASE/agents?project_id=GAC_FactoryOS")
    if [ "$response" = "200" ]; then
        print_result 0 "Agents endpoint"
    else
        print_result 1 "Agents endpoint (Got $response)"
    fi

    echo ""
}

# Function to test dashboard files
test_dashboard_files() {
    echo -e "${BLUE}Testing Dashboard Files...${NC}"

    # Test Original Dashboard
    if [ -f "$PROJECT_ROOT/index.html" ]; then
        file_size=$(wc -c < "$PROJECT_ROOT/index.html")
        if [ $file_size -gt 10000 ]; then
            print_result 0 "Original Dashboard exists (${file_size} bytes)"
        else
            print_result 1 "Original Dashboard too small (${file_size} bytes)"
        fi
    else
        print_result 1 "Original Dashboard missing"
    fi

    # Test Phase 1 Dashboard
    if [ -f "$PROJECT_ROOT/index-optimized.html" ]; then
        file_size=$(wc -c < "$PROJECT_ROOT/index-optimized.html")
        if [ $file_size -gt 20000 ]; then
            print_result 0 "Phase 1 Dashboard exists (${file_size} bytes)"
        else
            print_result 1 "Phase 1 Dashboard too small (${file_size} bytes)"
        fi
    else
        print_result 1 "Phase 1 Dashboard missing"
    fi

    # Test Phase 2 Dashboard
    if [ -f "$PROJECT_ROOT/index-phase2.html" ]; then
        file_size=$(wc -c < "$PROJECT_ROOT/index-phase2.html")
        if [ $file_size -gt 30000 ]; then
            print_result 0 "Phase 2 Dashboard exists (${file_size} bytes)"
        else
            print_result 1 "Phase 2 Dashboard too small (${file_size} bytes)"
        fi
    else
        print_result 1 "Phase 2 Dashboard missing"
    fi

    echo ""
}

# Function to check dashboard features
test_dashboard_features() {
    echo -e "${BLUE}Testing Dashboard Features...${NC}"

    # Test Original Dashboard features
    if grep -q "Chart.js" "$PROJECT_ROOT/index.html"; then
        print_result 0 "Original: Chart.js included"
    else
        print_result 1 "Original: Chart.js missing"
    fi

    # Test Phase 1 features
    if grep -q "skeleton" "$PROJECT_ROOT/index-optimized.html"; then
        print_result 0 "Phase 1: Loading skeletons"
    else
        print_result 1 "Phase 1: Loading skeletons missing"
    fi

    if grep -q "showToast" "$PROJECT_ROOT/index-optimized.html"; then
        print_result 0 "Phase 1: Toast notifications"
    else
        print_result 1 "Phase 1: Toast notifications missing"
    fi

    if grep -q "aria-label" "$PROJECT_ROOT/index-optimized.html"; then
        print_result 0 "Phase 1: ARIA labels"
    else
        print_result 1 "Phase 1: ARIA labels missing"
    fi

    # Test Phase 2 features
    if grep -q "responsive-table" "$PROJECT_ROOT/index-phase2.html"; then
        print_result 0 "Phase 2: Responsive tables"
    else
        print_result 1 "Phase 2: Responsive tables missing"
    fi

    if grep -q "mobile-card-view" "$PROJECT_ROOT/index-phase2.html"; then
        print_result 0 "Phase 2: Mobile card views"
    else
        print_result 1 "Phase 2: Mobile card views missing"
    fi

    if grep -q "@media (max-width: 640px)" "$PROJECT_ROOT/index-phase2.html"; then
        print_result 0 "Phase 2: Mobile breakpoints"
    else
        print_result 1 "Phase 2: Mobile breakpoints missing"
    fi

    if grep -q "color-primary" "$PROJECT_ROOT/index-phase2.html"; then
        print_result 0 "Phase 2: CSS variables (WCAG AAA)"
    else
        print_result 1 "Phase 2: CSS variables missing"
    fi

    if grep -q "window.addEventListener('resize'" "$PROJECT_ROOT/index-phase2.html"; then
        print_result 0 "Phase 2: Chart resize handler"
    else
        print_result 1 "Phase 2: Chart resize handler missing"
    fi

    echo ""
}

# Function to test documentation
test_documentation() {
    echo -e "${BLUE}Testing Documentation...${NC}"

    if [ -f "$PROJECT_ROOT/UI_OPTIMIZATION_SUMMARY.md" ]; then
        print_result 0 "Phase 1 documentation exists"
    else
        print_result 1 "Phase 1 documentation missing"
    fi

    if [ -f "$PROJECT_ROOT/PHASE2_OPTIMIZATION_SUMMARY.md" ]; then
        print_result 0 "Phase 2 documentation exists"
    else
        print_result 1 "Phase 2 documentation missing"
    fi

    if [ -f "$PROJECT_ROOT/DEPLOYMENT.md" ]; then
        print_result 0 "Deployment guide exists"
    else
        print_result 1 "Deployment guide missing"
    fi

    # Check if README mentions all 3 versions
    if grep -q "Phase 2 Dashboard" "$PROJECT_ROOT/README.md"; then
        print_result 0 "README includes Phase 2"
    else
        print_result 1 "README missing Phase 2"
    fi

    echo ""
}

# Function to test accessibility features
test_accessibility() {
    echo -e "${BLUE}Testing Accessibility Features...${NC}"

    # Phase 1 accessibility
    if grep -q "focus-visible" "$PROJECT_ROOT/index-optimized.html"; then
        print_result 0 "Phase 1: Focus indicators"
    else
        print_result 1 "Phase 1: Focus indicators missing"
    fi

    if grep -q "sr-only" "$PROJECT_ROOT/index-optimized.html"; then
        print_result 0 "Phase 1: Screen reader utilities"
    else
        print_result 1 "Phase 1: Screen reader utilities missing"
    fi

    # Phase 2 accessibility enhancements
    if grep -q "outline: 3px" "$PROJECT_ROOT/index-phase2.html"; then
        print_result 0 "Phase 2: Enhanced focus (3px)"
    else
        print_result 1 "Phase 2: Enhanced focus missing"
    fi

    if grep -q "WCAG AAA" "$PROJECT_ROOT/index-phase2.html"; then
        print_result 0 "Phase 2: WCAG AAA mentioned"
    else
        print_result 1 "Phase 2: WCAG AAA not mentioned"
    fi

    echo ""
}

# Function to compare dashboard versions
compare_versions() {
    echo -e "${BLUE}Dashboard Version Comparison${NC}"
    echo ""

    original_size=$(wc -c < "$PROJECT_ROOT/index.html" 2>/dev/null || echo "0")
    phase1_size=$(wc -c < "$PROJECT_ROOT/index-optimized.html" 2>/dev/null || echo "0")
    phase2_size=$(wc -c < "$PROJECT_ROOT/index-phase2.html" 2>/dev/null || echo "0")

    echo "File Sizes:"
    echo "  Original:     $(printf "%'d" $original_size) bytes"
    echo "  Phase 1:      $(printf "%'d" $phase1_size) bytes (+$(printf "%'d" $((phase1_size - original_size))))"
    echo "  Phase 2:      $(printf "%'d" $phase2_size) bytes (+$(printf "%'d" $((phase2_size - phase1_size))) from Phase 1)"
    echo ""

    echo "Feature Comparison:"
    echo "┌─────────────────────────┬──────────┬──────────┬──────────┐"
    echo "│ Feature                 │ Original │ Phase 1  │ Phase 2  │"
    echo "├─────────────────────────┼──────────┼──────────┼──────────┤"

    # Check features
    check_feature() {
        local file=$1
        local pattern=$2
        if grep -q "$pattern" "$file" 2>/dev/null; then
            echo "    ✓    "
        else
            echo "    ✗    "
        fi
    }

    echo -n "│ Loading Skeletons       │"
    check_feature "$PROJECT_ROOT/index.html" "skeleton" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-optimized.html" "skeleton" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-phase2.html" "skeleton" | tr -d '\n'
    echo "│"

    echo -n "│ Toast Notifications     │"
    check_feature "$PROJECT_ROOT/index.html" "showToast" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-optimized.html" "showToast" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-phase2.html" "showToast" | tr -d '\n'
    echo "│"

    echo -n "│ ARIA Labels             │"
    check_feature "$PROJECT_ROOT/index.html" "aria-label" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-optimized.html" "aria-label" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-phase2.html" "aria-label" | tr -d '\n'
    echo "│"

    echo -n "│ Responsive Tables       │"
    check_feature "$PROJECT_ROOT/index.html" "responsive-table" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-optimized.html" "responsive-table" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-phase2.html" "responsive-table" | tr -d '\n'
    echo "│"

    echo -n "│ Mobile Card View        │"
    check_feature "$PROJECT_ROOT/index.html" "mobile-card-view" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-optimized.html" "mobile-card-view" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-phase2.html" "mobile-card-view" | tr -d '\n'
    echo "│"

    echo -n "│ Chart Auto-resize       │"
    check_feature "$PROJECT_ROOT/index.html" "window.addEventListener('resize'" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-optimized.html" "window.addEventListener('resize'" | tr -d '\n'
    echo -n "│"
    check_feature "$PROJECT_ROOT/index-phase2.html" "window.addEventListener('resize'" | tr -d '\n'
    echo "│"

    echo "└─────────────────────────┴──────────┴──────────┴──────────┘"
    echo ""
}

# Main test execution
echo -e "${YELLOW}Starting Test Suite...${NC}"
echo ""

test_api
test_dashboard_files
test_dashboard_features
test_accessibility
test_documentation
compare_versions

# Print summary
echo "============================================"
echo -e "${YELLOW}Test Summary${NC}"
echo "============================================"
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Recommendations:"
    echo "  1. Open all 3 dashboards in browser for visual testing"
    echo "  2. Test keyboard navigation (Tab key)"
    echo "  3. Test mobile responsive design (resize browser)"
    echo "  4. Deploy Phase 2 to production (Cloudflare Pages)"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "Please review the errors above and fix before deployment."
    exit 1
fi
