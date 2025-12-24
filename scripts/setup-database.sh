#!/bin/bash
# Database setup script for AI Microlearning LMS

set -e

echo "Setting up database for AI Microlearning LMS..."

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo "PostgreSQL is not running. Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Create database
echo "Creating database..."
sudo -u postgres psql <<EOF
CREATE DATABASE ai_microlearning_lms;
EOF

# Create user (if not exists)
echo "Creating database user..."
sudo -u postgres psql <<EOF
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
sudo -u postgres psql -d ai_microlearning_lms <<EOF
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';
EOF

echo "Database setup complete!"
echo "Remember to update .env with your database connection string:"
echo "DATABASE_URL=\"postgresql://lms_user:secure_password@localhost:5432/ai_microlearning_lms?schema=public\""

