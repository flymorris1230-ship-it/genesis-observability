#!/bin/bash

# Genesis Observability - Automated Supabase Setup via PostgreSQL
# This script uses direct PostgreSQL connection to execute the schema

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

print_header "Genesis Observability - Auto Schema Setup (PostgreSQL)"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  print_warning "PostgreSQL client (psql) not found. Installing..."

  if command -v brew &> /dev/null; then
    print_info "Installing via Homebrew..."
    brew install postgresql
  else
    print_error "Please install PostgreSQL client manually"
    print_info "  macOS: brew install postgresql"
    print_info "  Ubuntu: sudo apt install postgresql-client"
    exit 1
  fi

  print_success "PostgreSQL client installed!"
fi

# Get database password
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  print_warning "Database password not set"
  echo ""
  print_info "You can find your database password in Supabase Dashboard:"
  print_info "  Settings → Database → Connection string → Password"
  echo ""
  read -sp "Enter your Supabase database password: " SUPABASE_DB_PASSWORD
  echo ""
fi

# Extract host from URL
if [ -z "$SUPABASE_URL" ]; then
  print_error "SUPABASE_URL not set"
  exit 1
fi

# Convert Supabase URL to database host
# https://xxx.supabase.co -> db.xxx.supabase.co
DB_HOST=$(echo $SUPABASE_URL | sed -E 's/https:\/\//db./' | sed 's/$//')

print_info "Database host: $DB_HOST"

# Build connection string
CONNECTION_STRING="postgresql://postgres:${SUPABASE_DB_PASSWORD}@${DB_HOST}:5432/postgres"

print_info "Testing connection..."
if psql "$CONNECTION_STRING" -c "SELECT 1;" &> /dev/null; then
  print_success "Connection successful!"
else
  print_error "Connection failed!"
  print_warning "Please check your credentials and try again"
  exit 1
fi

# Execute schema
print_info "Executing schema setup..."
psql "$CONNECTION_STRING" -f scripts/setup-supabase.sql

print_success "Schema deployed successfully!"

# Verify
print_info "Verifying deployment..."
TABLE_COUNT=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'llm_usage';")

if [ "$TABLE_COUNT" -eq 1 ]; then
  print_success "Table 'llm_usage' verified!"
else
  print_error "Table verification failed"
  exit 1
fi

print_header "🎉 Setup Complete!"

echo -e "${GREEN}Your Supabase schema is now deployed!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "  1. Run E2E tests: ${YELLOW}./scripts/test-e2e.sh${NC}"
echo -e "  2. Open Dashboard: ${YELLOW}open https://genesis-observability-obs-dashboard.vercel.app${NC}"
echo ""
