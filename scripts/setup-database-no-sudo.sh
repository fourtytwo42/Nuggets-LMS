#!/bin/bash
# Database setup script for AI Microlearning LMS (without sudo)
# This script assumes you have PostgreSQL access without sudo

set -e

echo "Setting up database for AI Microlearning LMS..."

# Check if PostgreSQL is accessible
if ! psql --version > /dev/null 2>&1; then
    echo "Error: psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Try to connect to PostgreSQL (will fail if not accessible)
if ! psql -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Warning: Cannot connect to PostgreSQL as postgres user."
    echo "You may need to:"
    echo "  1. Set up PostgreSQL authentication (pg_hba.conf)"
    echo "  2. Or run this script with sudo: sudo -u postgres ./scripts/setup-database.sh"
    echo ""
    echo "Attempting to create database with current user..."
fi

# Create database (will fail gracefully if exists)
echo "Creating database..."
psql -U postgres <<EOF 2>&1 || echo "Database may already exist or connection failed"
CREATE DATABASE ai_microlearning_lms;
EOF

# Create user (if not exists)
echo "Creating database user..."
psql -U postgres <<EOF 2>&1 || echo "User may already exist"
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'lms_user') THEN
        CREATE USER lms_user WITH PASSWORD 'secure_password';
    END IF;
END
\$\$;

GRANT ALL PRIVILEGES ON DATABASE ai_microlearning_lms TO lms_user;
EOF

# Enable pgvector extension
echo "Enabling pgvector extension..."
psql -U postgres -d ai_microlearning_lms <<EOF 2>&1 || echo "pgvector may already be enabled or not installed"
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';
EOF

echo ""
echo "Database setup complete!"
echo "Update your .env file with:"
echo "DATABASE_URL=\"postgresql://lms_user:secure_password@localhost:5432/ai_microlearning_lms?schema=public\""

