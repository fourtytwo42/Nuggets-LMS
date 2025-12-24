# Database Setup Instructions

The application needs a PostgreSQL database to run. Follow these steps:

## Option 1: Using sudo (Recommended)

```bash
# Run the setup script with sudo
sudo ./scripts/setup-database.sh
```

## Option 2: Manual Setup (if you have PostgreSQL access)

1. **Create the database:**

   ```bash
   psql -U postgres -c "CREATE DATABASE ai_microlearning_lms;"
   ```

2. **Create the user:**

   ```bash
   psql -U postgres -c "CREATE USER lms_user WITH PASSWORD 'secure_password';"
   psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ai_microlearning_lms TO lms_user;"
   ```

3. **Enable pgvector extension:**

   ```bash
   psql -U postgres -d ai_microlearning_lms -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

4. **Run migrations:**

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Seed demo accounts:**
   ```bash
   npm run seed:demo
   ```

## Verify Setup

After setup, verify the database connection:

```bash
psql -U lms_user -d ai_microlearning_lms -c "SELECT 1;"
```

If successful, restart PM2:

```bash
pm2 restart nuggets-lms
pm2 restart nuggets-lms-worker
```

## Current .env Configuration

Your `.env` file is configured with:

- Database: `postgresql://lms_user:secure_password@localhost:5432/ai_microlearning_lms?schema=public`
- Redis: `localhost:6379`
- Google Gemini API Key: Set
- JWT Secret: Auto-generated

Make sure to update `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` if you plan to use those features.
