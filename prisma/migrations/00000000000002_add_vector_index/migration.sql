-- Add embedding column to nuggets (if not exists)
-- Note: This will be created by Prisma migration, but we add it here for reference
-- The actual column creation is handled by Prisma

-- Create index for vector similarity search
-- Note: ivfflat index requires at least some data to be effective
-- Consider creating index after initial data load for better performance
CREATE INDEX IF NOT EXISTS nuggets_embedding_idx 
ON nuggets 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative: Use HNSW index (better performance, more storage)
-- CREATE INDEX IF NOT EXISTS nuggets_embedding_hnsw_idx 
-- ON nuggets 
-- USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

