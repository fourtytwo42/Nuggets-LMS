import { Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { narrativeNodeGeneratorService } from '@/services/narrative-planning/node-generator';
import { choiceGeneratorService } from '@/services/narrative-planning/choice-generator';
import logger from '@/lib/logger';

export interface NarrativePlanningJobData {
  nuggetIds: string[];
  organizationId: string;
}

/**
 * Process narrative planning job
 * Generates narrative nodes and choices for nuggets
 */
export async function processNarrativePlanningJob(
  job: Job<NarrativePlanningJobData>
): Promise<{ success: boolean; nodeCount: number }> {
  const { nuggetIds, organizationId } = job.data;

  try {
    logger.info('Processing narrative planning job', {
      jobId: job.id,
      nuggetCount: nuggetIds.length,
      organizationId,
    });

    // Get nuggets
    const nuggets = await prisma.nugget.findMany({
      where: {
        id: { in: nuggetIds },
        organizationId,
      },
    });

    if (nuggets.length === 0) {
      throw new Error('No nuggets found for narrative planning');
    }

    // Generate nodes for each nugget
    const nodes = [];
    for (const nugget of nuggets) {
      // Check if node already exists
      const existingNode = await prisma.narrativeNode.findFirst({
        where: {
          nuggetId: nugget.id,
          organizationId,
        },
      });

      if (existingNode) {
        logger.info('Narrative node already exists', {
          nuggetId: nugget.id,
          nodeId: existingNode.id,
        });
        nodes.push(existingNode);
        continue;
      }

      // Generate node data
      const nodeData = await narrativeNodeGeneratorService.generateNode(nugget);

      // Create node in database
      const node = await narrativeNodeGeneratorService.createNode(nodeData);
      nodes.push(node);
    }

    // Generate choices for each node
    for (const node of nodes) {
      // Get all available nodes (excluding current node)
      const availableNodes = await prisma.narrativeNode.findMany({
        where: {
          organizationId,
          id: { not: node.id },
        },
      });

      // Generate choices
      await choiceGeneratorService.generateChoices(node, availableNodes);
    }

    logger.info('Narrative planning job completed', {
      jobId: job.id,
      nodeCount: nodes.length,
    });

    return {
      success: true,
      nodeCount: nodes.length,
    };
  } catch (error) {
    logger.error('Narrative planning job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
      organizationId,
    });
    throw error;
  }
}
