#!/bin/bash

# Genesis Observability - Apply Project Tracking Migration
# This script applies the project tracking tables to Supabase

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

print_info() {
  echo -e "${CYAN}ℹ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_header "Genesis Observability - Project Tracking Migration"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  print_warning "PostgreSQL client (psql) not found"
  print_info "Please choose an option:"
  echo ""
  echo "  Option 1: Install psql and run this script"
  echo "    macOS: brew install postgresql"
  echo "    Ubuntu: sudo apt install postgresql-client"
  echo ""
  echo "  Option 2: Manual setup via Supabase Dashboard"
  echo "    1. Open https://app.supabase.com"
  echo "    2. Go to SQL Editor"
  echo "    3. Copy contents of: supabase/migrations/20251007_add_project_tracking.sql"
  echo "    4. Paste and run"
  echo ""
  exit 1
fi

# Check for required environment variables
if [ -z "$SUPABASE_URL" ]; then
  print_error "SUPABASE_URL not set"
  print_info "Export it: export SUPABASE_URL=https://your-project.supabase.co"
  exit 1
fi

# Get database password
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  print_warning "Database password not set"
  echo ""
  print_info "Find your password in Supabase Dashboard:"
  print_info "  Settings → Database → Connection string → Password"
  echo ""
  read -sp "Enter your Supabase database password: " SUPABASE_DB_PASSWORD
  echo ""
fi

# Convert Supabase URL to database host
# https://xxx.supabase.co -> db.xxx.supabase.co
DB_HOST=$(echo $SUPABASE_URL | sed -E 's/https:\/\//db./' | sed 's/$//')

print_info "Database host: $DB_HOST"

# Build connection string
CONNECTION_STRING="postgresql://postgres:${SUPABASE_DB_PASSWORD}@${DB_HOST}:5432/postgres"

# Test connection
print_info "Testing connection..."
if psql "$CONNECTION_STRING" -c "SELECT 1;" &> /dev/null; then
  print_success "Connection successful!"
else
  print_error "Connection failed!"
  print_warning "Please check your credentials and try again"
  exit 1
fi

# Execute migration
print_info "Applying project tracking migration..."
if psql "$CONNECTION_STRING" -f supabase/migrations/20251007_add_project_tracking.sql; then
  print_success "Migration applied successfully!"
else
  print_error "Migration failed!"
  exit 1
fi

# Verify tables
print_info "Verifying tables..."
TABLES=(
  "module_progress"
  "sprint_progress"
  "task_progress"
  "api_health"
  "database_health"
  "integration_health"
  "agent_executions"
  "agent_performance"
)

ALL_VERIFIED=true
for TABLE in "${TABLES[@]}"; do
  TABLE_EXISTS=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$TABLE';")
  if [ "$TABLE_EXISTS" -eq 1 ]; then
    print_success "Table '$TABLE' verified"
  else
    print_error "Table '$TABLE' not found"
    ALL_VERIFIED=false
  fi
done

if [ "$ALL_VERIFIED" = true ]; then
  print_header "🎉 Migration Complete!"
  echo -e "${GREEN}All 8 project tracking tables have been created!${NC}"
  echo ""
  echo -e "${CYAN}Tables created:${NC}"
  echo "  • module_progress"
  echo "  • sprint_progress"
  echo "  • task_progress"
  echo "  • api_health"
  echo "  • database_health"
  echo "  • integration_health"
  echo "  • agent_executions"
  echo "  • agent_performance"
  echo ""
  echo -e "${CYAN}Sample data:${NC}"
  echo "  • 4 GAC_FactoryOS modules (WMS 80%, MES 40%, QMS 10%, R&D 0%)"
  echo ""
  echo -e "${CYAN}Next steps:${NC}"
  echo "  1. Implement progress API endpoints in obs-edge Worker"
  echo "  2. Create Dashboard UI components"
  echo "  3. Test project tracking functionality"
else
  print_error "Some tables are missing"
  exit 1
fi
