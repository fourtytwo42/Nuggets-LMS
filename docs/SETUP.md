# Setup Guide

Complete setup instructions for AI Microlearning LMS.

## Prerequisites

- Node.js 20+ LTS
- PostgreSQL 15+
- Redis
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/fourtytwo42/Nuggets-LMS.git
cd nuggets-lms
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

- Database connection string
- Redis connection details
- API keys (Google Gemini, OpenAI, ElevenLabs)
- JWT secret
- Storage paths

### 4. Database Setup

See [Database Setup](#database-setup) section below.

### 5. Redis Setup

Ensure Redis is running:

```bash
redis-server
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Database Setup

### PostgreSQL Installation

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib
```

### Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE ai_microlearning_lms;

# Create user
CREATE USER lms_user WITH PASSWORD 'secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_microlearning_lms TO lms_user;

# Exit
\q
```

### Install pgvector Extension

```bash
# Install pgvector
sudo apt-get install postgresql-15-pgvector

# Connect to database
sudo -u postgres psql -d ai_microlearning_lms

# Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Run Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Create initial migration
npm run db:migrate

# The migration will:
# - Create all database tables
# - Set up indexes and constraints
# - Note: pgvector extension must be enabled before running migrations
```

### Automated Database Setup

A setup script is available to automate database creation:

```bash
# Run setup script (requires sudo)
./scripts/setup-database.sh

# Then update .env with your database connection string
# DATABASE_URL="postgresql://lms_user:secure_password@localhost:5432/ai_microlearning_lms?schema=public"
```

### pgvector Setup

The pgvector extension must be enabled before running migrations:

```bash
# Connect to database
sudo -u postgres psql -d ai_microlearning_lms

# Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
\q
```

## Development Tools

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format
```

### Testing

```bash
# Unit/Integration tests
npm test

# Test coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Database Management

```bash
# Prisma Studio (database GUI)
npm run db:studio

# Generate Prisma Client (after schema changes)
npm run db:generate
```

## Background Workers

Start background workers for job processing:

```bash
# Development (with watch mode)
npm run worker:dev

# Production
npm run worker
```

## Verification

After setup, verify everything is working:

1. **Database Connection:**

   ```bash
   npm run db:studio
   ```

2. **Build:**

   ```bash
   npm run build
   ```

3. **Tests:**

   ```bash
   npm test
   ```

4. **Development Server:**
   ```bash
   npm run dev
   ```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check connection string in `.env`
- Verify user permissions

### Redis Connection Issues

- Verify Redis is running: `redis-cli ping`
- Check Redis host/port in `.env`

### Build Errors

- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more help.
