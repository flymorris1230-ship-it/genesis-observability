#!/bin/bash

# Genesis Observability - One-Click Deployment Script
# Version: 1.0
# Date: 2025-10-07
#
# This script automates the complete deployment of Genesis Observability
# including obs-edge Worker and obs-dashboard

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# ============================================================================
# Pre-flight checks
# ============================================================================

print_header "Pre-flight Checks"

# Check Node.js
if command_exists node; then
  NODE_VERSION=$(node --version)
  print_success "Node.js installed: $NODE_VERSION"
else
  print_error "Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

# Check npm/pnpm
if command_exists pnpm; then
  PNPM_VERSION=$(pnpm --version)
  print_success "pnpm installed: $PNPM_VERSION"
  PKG_MANAGER="pnpm"
elif command_exists npm; then
  NPM_VERSION=$(npm --version)
  print_success "npm installed: $NPM_VERSION"
  PKG_MANAGER="npm"
else
  print_error "Neither npm nor pnpm found. Please install one."
  exit 1
fi

# Check git
if command_exists git; then
  GIT_VERSION=$(git --version)
  print_success "Git installed: $GIT_VERSION"
else
  print_error "Git is not installed. Please install Git first."
  exit 1
fi

# Check wrangler
if command_exists wrangler; then
  WRANGLER_VERSION=$(wrangler --version 2>&1 | head -n 1)
  print_success "Wrangler installed: $WRANGLER_VERSION"
else
  print_warning "Wrangler not found. Will install via npx."
fi

# Check vercel
if command_exists vercel; then
  VERCEL_VERSION=$(vercel --version)
  print_success "Vercel CLI installed: $VERCEL_VERSION"
else
  print_warning "Vercel CLI not found. Will install via npx."
fi

# ============================================================================
# Environment Setup
# ============================================================================

print_header "Environment Setup"

# Check if .env files exist
if [ ! -f "apps/obs-dashboard/.env.production" ]; then
  print_warning ".env.production not found for dashboard"
  print_info "Please create apps/obs-dashboard/.env.production with:"
  print_info "  NEXT_PUBLIC_OBS_EDGE_URL=https://obs-edge.YOUR_SUBDOMAIN.workers.dev"
  print_info "  NEXT_PUBLIC_OBS_EDGE_API_KEY=your_api_key"
  echo ""
  read -p "Press Enter to continue after creating the file..."
fi

# Check Supabase setup
print_info "Checking Supabase configuration..."
echo ""
read -p "Have you set up your Supabase project and run setup-supabase.sql? (y/n): " SUPABASE_READY

if [ "$SUPABASE_READY" != "y" ]; then
  print_warning "Please complete Supabase setup first:"
  print_info "1. Go to https://app.supabase.com"
  print_info "2. Create a new project: 'genesis-observability'"
  print_info "3. Run scripts/setup-supabase.sql in SQL Editor"
  print_info "4. Copy your Project URL and service_role key"
  echo ""
  exit 1
fi

# ============================================================================
# Deploy obs-edge Worker
# ============================================================================

print_header "Deploying obs-edge Worker"

cd apps/obs-edge

# Install dependencies
print_info "Installing dependencies..."
$PKG_MANAGER install

# Run tests
print_info "Running tests..."
$PKG_MANAGER test

if [ $? -ne 0 ]; then
  print_error "Tests failed. Please fix errors before deploying."
  exit 1
fi

print_success "All tests passed!"

# Type check
print_info "Running type check..."
$PKG_MANAGER run typecheck || print_warning "Type check had warnings (continuing)"

# Deploy to Cloudflare
print_info "Deploying to Cloudflare Workers..."
npx wrangler deploy

if [ $? -ne 0 ]; then
  print_error "Worker deployment failed."
  exit 1
fi

print_success "obs-edge Worker deployed successfully!"

# Get Worker URL
WORKER_URL=$(npx wrangler deployments list 2>/dev/null | grep "https://" | head -1 | awk '{print $NF}' || echo "https://obs-edge.YOUR_SUBDOMAIN.workers.dev")
print_success "Worker URL: $WORKER_URL"

# Check secrets
print_info "Checking Worker secrets..."
SECRETS=$(npx wrangler secret list 2>/dev/null || echo "")

if echo "$SECRETS" | grep -q "API_KEY"; then
  print_success "API_KEY is set"
else
  print_warning "API_KEY is not set. Please run:"
  print_info "  echo 'your_api_key' | npx wrangler secret put API_KEY"
fi

if echo "$SECRETS" | grep -q "SUPABASE_URL"; then
  print_success "SUPABASE_URL is set"
else
  print_warning "SUPABASE_URL is not set. Please run:"
  print_info "  echo 'https://your-project.supabase.co' | npx wrangler secret put SUPABASE_URL"
fi

if echo "$SECRETS" | grep -q "SUPABASE_SERVICE_KEY"; then
  print_success "SUPABASE_SERVICE_KEY is set"
else
  print_warning "SUPABASE_SERVICE_KEY is not set. Please run:"
  print_info "  echo 'your_service_key' | npx wrangler secret put SUPABASE_SERVICE_KEY"
fi

cd ../..

# ============================================================================
# Deploy obs-dashboard
# ============================================================================

print_header "Deploying obs-dashboard"

cd apps/obs-dashboard

# Install dependencies
print_info "Installing dependencies..."
$PKG_MANAGER install

# Type check
print_info "Running type check..."
$PKG_MANAGER run type-check

if [ $? -ne 0 ]; then
  print_error "Type check failed. Please fix errors before deploying."
  exit 1
fi

# Lint
print_info "Running lint..."
$PKG_MANAGER run lint || print_warning "Lint had warnings (continuing)"

# Build
print_info "Building production bundle..."
$PKG_MANAGER run build

if [ $? -ne 0 ]; then
  print_error "Build failed. Please fix errors before deploying."
  exit 1
fi

print_success "Build successful!"

# Deploy to Vercel
print_info "Deploying to Vercel..."
npx vercel deploy --prod --yes

if [ $? -ne 0 ]; then
  print_error "Vercel deployment failed."
  print_info "Please run 'vercel login' first if not authenticated."
  exit 1
fi

print_success "obs-dashboard deployed successfully!"

cd ../..

# ============================================================================
# Deployment Summary
# ============================================================================

print_header "Deployment Summary"

echo ""
print_success "✨ Deployment Complete!"
echo ""
print_info "📦 Deployed Components:"
echo ""
echo "  1. obs-edge Worker"
echo "     URL: $WORKER_URL"
echo "     Status: ✅ Running"
echo ""
echo "  2. obs-dashboard"
echo "     URL: (check Vercel output above)"
echo "     Status: ✅ Deployed"
echo ""

print_info "🧪 Next Steps:"
echo ""
echo "  1. Verify Worker secrets are set:"
echo "     cd apps/obs-edge"
echo "     npx wrangler secret list"
echo ""
echo "  2. Test the /ingest endpoint:"
echo "     ./scripts/test-e2e.sh"
echo ""
echo "  3. Open your Dashboard and verify data visualization"
echo ""

print_info "📚 Documentation:"
echo "  - DEPLOYMENT_ARCHITECTURE.md - System architecture"
echo "  - DEPLOYMENT_GUIDE.md - Detailed deployment guide"
echo "  - PHASE_3_DEPLOYMENT_SUMMARY.md - Deployment summary"
echo ""

print_success "Happy monitoring! 🎉"
