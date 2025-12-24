-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Note: Vector column and indexes will be created by Prisma migration
-- Additional vector index should be created after data is loaded for better performance

