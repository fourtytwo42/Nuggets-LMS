import { prisma } from '@/lib/prisma';
import type { Nugget } from '@prisma/client';

/**
 * Insert embedding into nugget
 * Note: Prisma doesn't support pgvector directly, so we use raw SQL
 */
export async function insertEmbedding(nuggetId: string, embedding: number[]): Promise<void> {
  await prisma.$executeRaw`
    UPDATE nuggets
    SET embedding = ${JSON.stringify(embedding)}::vector
    WHERE id = ${nuggetId}
  `;
}

/**
 * Find similar nuggets using vector similarity search
 */
export async function findSimilarNuggets(
  queryEmbedding: number[],
  organizationId: string,
  threshold: number = 0.7,
  limit: number = 20
): Promise<Nugget[]> {
  return await prisma.$queryRaw<Nugget[]>`
    SELECT n.*, 
           1 - (n.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM nuggets n
    WHERE n.organization_id = ${organizationId}
      AND n.status = 'ready'
      AND n.embedding IS NOT NULL
      AND 1 - (n.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;
}
