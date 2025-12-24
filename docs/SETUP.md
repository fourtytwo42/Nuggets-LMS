# Setup Guide

Complete setup instructions for AI Microlearning LMS.

## Prerequisites

- Node.js 20+ LTS
- PostgreSQL 15+ (or 17+)
- Redis
- npm or yarn
- sudo access (for database setup)

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

Create a `.env` file in the project root. The file should contain:

```bash
# Database
DATABASE_URL=postgresql://lms_user:secure_password@localhost:5432/ai_microlearning_lms?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Services
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Authentication
JWT_SECRET=your-secure-random-jwt-secret
JWT_EXPIRES_IN=7d

# Storage
STORAGE_PATH=./storage
UPLOAD_MAX_SIZE=10485760

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

**Important:** Generate a secure JWT secret:

```bash
openssl rand -base64 32
```

### 4. Database Setup

#### Automated Setup (Recommended)

```bash
# Run the setup script (requires sudo password)
sudo ./scripts/setup-database.sh
```

The script will:

- Create the database `ai_microlearning_lms`
- Create user `lms_user` with password `secure_password`
- Grant necessary privileges
- Enable pgvector extension

**Note:** If pgvector extension installation fails, install it manually:

```bash
# For PostgreSQL 17
sudo apt-get install postgresql-17-pgvector

# For PostgreSQL 15
sudo apt-get install postgresql-15-pgvector
```

#### Manual Setup

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE ai_microlearning_lms;

# Create user
CREATE USER lms_user WITH PASSWORD 'secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_microlearning_lms TO lms_user;
ALTER USER lms_user CREATEDB;  # Required for Prisma migrations

# Enable pgvector extension
\c ai_microlearning_lms
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
\q
```

### 5. Run Database Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Apply migrations (creates all tables)
npx prisma db push

# Or use migrations (if shadow database is configured)
npm run db:migrate
```

**Note:** If `prisma migrate dev` fails due to shadow database permissions, use `prisma db push` instead, which applies the schema directly without a shadow database.

### 6. Seed Demo Accounts

```bash
# Create demo accounts for testing
npm run seed:demo
```

This creates:

- **Demo Organization**
- **Learner Account:** `learner@demo.com` / `demo123`
- **Admin Account:** `admin@demo.com` / `demo123`

### 7. Redis Setup

Ensure Redis is running:

```bash
# Check if Redis is running
redis-cli ping

# If not running, start Redis
sudo systemctl start redis
sudo systemctl enable redis  # Enable on boot
```

### 8. Build and Start Application

#### Development

```bash
# Start development server
npm run dev

# Start background workers (in separate terminal)
npm run worker:dev
```

#### Production with PM2

```bash
# Build the application
npm run build

# Start application with PM2
pm2 start npm --name "nuggets-lms" -- start

# Start workers with PM2
pm2 start npm --name "nuggets-lms-worker" -- run worker

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided
```

The application will be available at `http://localhost:3000`.

## Landing Page and Demo Access

### Landing Page

Visit the root URL (`http://localhost:3000`) to see the SaaS landing page with:

- Hero section describing the platform
- Features overview
- "Try Demo" button (links to `/login`)
- "Contact Sales" button (links to `https://studio42.dev/contact?source=nuggets-lms`)

### Demo Accounts

After running `npm run seed:demo`, you can log in with:

- **Learner Account:**
  - Email: `learner@demo.com`
  - Password: `demo123`
  - Access: Learner canvas, learning sessions

- **Admin Account:**
  - Email: `admin@demo.com`
  - Password: `demo123`
  - Access: Admin console, content ingestion, nugget management

The login page (`/login`) includes demo account buttons that auto-fill and submit credentials for easy testing.

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

# Test coverage (must be 90%+)
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

# View database schema
npx prisma studio
```

## Background Workers

Background workers process jobs from BullMQ queues (content ingestion, embedding generation, AI authoring, narrative planning).

```bash
# Development (with watch mode)
npm run worker:dev

# Production
npm run worker
```

**Important:** Workers require Redis with `maxRetriesPerRequest: null` for BullMQ compatibility. This is automatically configured in the code.

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

4. **Application:**
   - Visit `http://localhost:3000` - should show landing page
   - Visit `http://localhost:3000/login` - should show login page
   - Try demo account login

5. **PM2 Status:**
   ```bash
   pm2 status
   pm2 logs nuggets-lms
   pm2 logs nuggets-lms-worker
   ```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check connection string in `.env`
- Verify user permissions: `psql -U lms_user -d ai_microlearning_lms -c "SELECT 1;"`
- Check if pgvector is enabled: `psql -U lms_user -d ai_microlearning_lms -c "SELECT * FROM pg_extension WHERE extname = 'vector';"`

### Migration Issues

- If `prisma migrate dev` fails with shadow database errors, use `prisma db push` instead
- Ensure pgvector extension is enabled before running migrations
- Grant CREATEDB permission to lms_user: `ALTER USER lms_user CREATEDB;`

### Redis Connection Issues

- Verify Redis is running: `redis-cli ping`
- Check Redis host/port in `.env`
- Verify BullMQ workers are using correct Redis configuration (maxRetriesPerRequest: null)

### Build Errors

- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Regenerate Prisma Client: `npm run db:generate`

### PM2 Issues

- Check logs: `pm2 logs nuggets-lms`
- Restart processes: `pm2 restart all`
- Reload environment: `pm2 restart all --update-env`

## Next Steps

After setup is complete:

1. Visit the landing page at `http://localhost:3000`
2. Click "Try Demo" or go to `/login`
3. Use demo accounts to test the application
4. Configure API keys in `.env` for full functionality
5. See [Usage Guide](USAGE.md) for how to use the application
6. See [Development Guide](DEVELOPMENT.md) for development workflow
