#!/bin/bash

# ============================================================================
# Apply Agent Tables Migration to Supabase
# ============================================================================

set -e

echo "================================================"
echo "Applying Agent Tables Migration"
echo "================================================"
echo ""

# Get Supabase credentials from wrangler secrets (for obs-edge worker)
echo "📋 Step 1: Getting Supabase credentials..."
echo ""
echo "Please provide your Supabase credentials:"
read -p "Supabase URL (e.g., https://xxx.supabase.co): " SUPABASE_URL
read -sp "Supabase Service Role Key: " SUPABASE_SERVICE_KEY
echo ""
echo ""

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: Supabase URL and Service Key are required"
    exit 1
fi

# Extract project reference from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed -n 's/.*\/\/\([^.]*\).*/\1/p')
echo "✅ Project reference: $PROJECT_REF"
echo ""

# SQL file
SQL_FILE="$(dirname "$0")/../supabase/migrations/20251013_create_agent_tables.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: Migration file not found: $SQL_FILE"
    exit 1
fi

echo "📋 Step 2: Applying migration..."
echo "   File: $SQL_FILE"
echo ""

# Apply migration using Supabase REST API
RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(cat "$SQL_FILE" | jq -Rs .)}" \
    2>&1)

# Alternative: Use psql if available
if command -v psql &> /dev/null; then
    echo "📋 Using psql to apply migration..."
    echo ""
    
    # Build connection string
    DB_PASSWORD=$SUPABASE_SERVICE_KEY
    DB_HOST="${PROJECT_REF}.db.supabase.co"
    DB_PORT="5432"
    DB_NAME="postgres"
    DB_USER="postgres"
    
    # Set password in environment
    export PGPASSWORD="$DB_PASSWORD"
    
    # Execute SQL
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration applied successfully!"
        echo ""
        echo "================================================"
        echo "Next Steps:"
        echo "================================================"
        echo "1. Update obs-edge Worker agents handler to use new tables"
        echo "2. Verify at: ${SUPABASE_URL}/project/${PROJECT_REF}/editor"
        echo "3. Check agent_registry table for 13 GAC agents"
        echo ""
    else
        echo ""
        echo "❌ Migration failed. Please check the error messages above."
        exit 1
    fi
else
    echo "⚠️  psql not found. Please install PostgreSQL client or use Supabase SQL Editor."
    echo ""
    echo "Manual Steps:"
    echo "1. Go to: ${SUPABASE_URL}/project/${PROJECT_REF}/sql/new"
    echo "2. Copy contents of: $SQL_FILE"
    echo "3. Paste and run in SQL Editor"
    echo ""
fi
