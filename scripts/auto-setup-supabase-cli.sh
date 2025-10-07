#!/bin/bash

# Genesis Observability - Automated Supabase Setup via CLI
# This script uses Supabase CLI to automatically deploy the schema

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

print_header "Genesis Observability - Auto Schema Setup"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  print_warning "Supabase CLI not found. Installing..."

  if command -v brew &> /dev/null; then
    print_info "Installing via Homebrew..."
    brew install supabase/tap/supabase
  else
    print_info "Installing via npm..."
    npm install -g supabase
  fi

  print_success "Supabase CLI installed!"
fi

print_info "Supabase CLI version: $(supabase --version)"

# Check for credentials
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  print_error "Missing Supabase credentials"
  echo ""
  print_warning "Please set environment variables:"
  print_info '  export SUPABASE_URL="https://xxx.supabase.co"'
  print_info '  export SUPABASE_SERVICE_KEY="eyJ..."'
  echo ""
  print_warning "Or run with inline variables:"
  print_info '  SUPABASE_URL="..." SUPABASE_SERVICE_KEY="..." ./scripts/auto-setup-supabase-cli.sh'
  echo ""
  exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')
print_info "Project Ref: $PROJECT_REF"

# Initialize Supabase project (if not already)
if [ ! -d "supabase" ]; then
  print_info "Initializing Supabase project..."
  supabase init
  print_success "Supabase project initialized"
fi

# Link to remote project
print_info "Linking to remote Supabase project..."
echo "$SUPABASE_SERVICE_KEY" | supabase link --project-ref "$PROJECT_REF" || {
  print_warning "Link might already exist or failed, continuing..."
}

# Create migration file
print_info "Creating migration file..."
MIGRATION_FILE="supabase/migrations/$(date +%Y%m%d%H%M%S)_genesis_observability_schema.sql"
cp scripts/setup-supabase.sql "$MIGRATION_FILE"
print_success "Migration file created: $MIGRATION_FILE"

# Push migration to remote
print_info "Pushing migration to remote database..."
supabase db push

print_success "Schema deployed successfully!"

# Verify
print_info "Verifying deployment..."
echo "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_name = 'llm_usage';" | supabase db execute

print_header "🎉 Setup Complete!"

echo -e "${GREEN}Your Supabase schema is now deployed!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "  1. Run E2E tests: ${YELLOW}./scripts/test-e2e.sh${NC}"
echo -e "  2. Open Dashboard: ${YELLOW}open https://genesis-observability-obs-dashboard.vercel.app${NC}"
echo ""
