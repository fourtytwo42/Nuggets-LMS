/**
 * Tool execution handlers for AI tutor
 */

import { prisma } from '@/lib/prisma';
import { progressTrackerService } from '../progress-tracker';
import { sessionService } from '../session-service';
import logger from '@/lib/logger';

export interface ToolContext {
  sessionId: string;
  learnerId: string;
  organizationId: string;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: {
    errorType: string;
    message: string;
    code?: string;
  };
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  args: any,
  context: ToolContext
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'deliver_nugget':
        return await deliverNugget(args, context);
      case 'ask_question':
        return await askQuestion(args, context);
      case 'update_mastery':
        return await updateMastery(args, context);
      case 'adapt_narrative':
        return await adaptNarrative(args, context);
      case 'show_media':
        return await showMedia(args, context);
      case 'search_nuggets':
        return await searchNuggets(args, context);
      case 'get_learner_progress':
        return await getLearnerProgress(args, context);
      case 'identify_gaps':
        return await identifyGaps(args, context);
      default:
        return {
          success: false,
          error: {
            errorType: 'validation_error',
            message: `Unknown tool: ${toolName}`,
            code: 'UNKNOWN_TOOL',
          },
        };
    }
  } catch (error) {
    logger.error('Tool execution error', {
      toolName,
      args,
      error: error instanceof Error ? error.message : String(error),
      context,
    });

    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Tool execution failed',
        code: 'TOOL_EXECUTION_ERROR',
      },
    };
  }
}

/**
 * deliver_nugget - Deliver learning nugget to learner
 */
async function deliverNugget(args: any, context: ToolContext): Promise<ToolResult> {
  try {
    const { nuggetId, format = 'multimedia' } = args;

    if (!nuggetId) {
      return {
        success: false,
        error: {
          errorType: 'validation_error',
          message: 'nuggetId is required',
        },
      };
    }

    const nugget = await prisma.nugget.findUnique({
      where: { id: nuggetId },
    });

    if (!nugget) {
      return {
        success: false,
        error: {
          errorType: 'resource_not_found',
          message: `Nugget not found: ${nuggetId}`,
        },
      };
    }

    // Check organization access
    if (nugget.organizationId !== context.organizationId) {
      return {
        success: false,
        error: {
          errorType: 'permission_denied',
          message: 'Nugget not accessible',
        },
      };
    }

    // Check nugget status
    if (nugget.status !== 'ready') {
      return {
        success: false,
        error: {
          errorType: 'validation_error',
          message: `Nugget not ready: ${nugget.status}`,
        },
      };
    }

    const response: any = {
      id: nugget.id,
      content: nugget.content,
      metadata: nugget.metadata,
      format,
    };

    if (format === 'multimedia' || format === 'audio') {
      if (nugget.audioUrl) {
        response.audioUrl = nugget.audioUrl;
      }
    }

    if (format === 'multimedia' || format === 'image') {
      if (nugget.imageUrl) {
        response.imageUrl = nugget.imageUrl;
      }
    }

    return { success: true, data: response };
  } catch (error) {
    logger.error('Error delivering nugget', { error, args, context });
    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Failed to deliver nugget',
      },
    };
  }
}

/**
 * ask_question - Ask learner a question for assessment
 */
async function askQuestion(args: any, context: ToolContext): Promise<ToolResult> {
  try {
    const { question, context: questionContext, expectedAnswer } = args;

    if (!question || !questionContext) {
      return {
        success: false,
        error: {
          errorType: 'validation_error',
          message: 'question and context are required',
        },
      };
    }

    // Track question asked (analytics would be stored here)
    logger.info('Question asked', {
      question,
      context: questionContext,
      sessionId: context.sessionId,
    });

    return {
      success: true,
      data: {
        question,
        context: questionContext,
        expectedAnswer,
      },
    };
  } catch (error) {
    logger.error('Error asking question', { error, args, context });
    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Failed to ask question',
      },
    };
  }
}

/**
 * update_mastery - Update learner mastery level
 */
async function updateMastery(args: any, context: ToolContext): Promise<ToolResult> {
  try {
    const { conceptId, masteryLevel, evidence } = args;

    if (!conceptId || masteryLevel === undefined || !evidence) {
      return {
        success: false,
        error: {
          errorType: 'validation_error',
          message: 'conceptId, masteryLevel, and evidence are required',
        },
      };
    }

    // Clamp mastery level
    const clampedMastery = Math.max(0, Math.min(100, masteryLevel));

    // Get current progress
    const currentProgress = await prisma.progress.findUnique({
      where: {
        learnerId_concept: {
          learnerId: context.learnerId,
          concept: conceptId,
        },
      },
    });

    const previousLevel = currentProgress?.masteryLevel || 0;

    // Update or create progress record
    await prisma.progress.upsert({
      where: {
        learnerId_concept: {
          learnerId: context.learnerId,
          concept: conceptId,
        },
      },
      create: {
        learnerId: context.learnerId,
        concept: conceptId,
        masteryLevel: clampedMastery,
        evidence,
      },
      update: {
        masteryLevel: clampedMastery,
        evidence,
      },
    });

    // Update learner mastery map
    const learner = await prisma.learner.findUnique({
      where: { id: context.learnerId },
    });

    if (learner) {
      const masteryMap = (learner.masteryMap as Record<string, number>) || {};
      masteryMap[conceptId] = clampedMastery;

      // Update knowledge gaps
      const knowledgeGaps = learner.knowledgeGaps || [];
      let updatedGaps = [...knowledgeGaps];

      if (clampedMastery < 30 && previousLevel >= 30) {
        // Mastery dropped, add to gaps
        if (!updatedGaps.includes(conceptId)) {
          updatedGaps.push(conceptId);
        }
      } else if (clampedMastery >= 70 && previousLevel < 70) {
        // Mastery improved, remove from gaps
        updatedGaps = updatedGaps.filter((gap) => gap !== conceptId);
      }

      await prisma.learner.update({
        where: { id: context.learnerId },
        data: {
          masteryMap: masteryMap as any,
          knowledgeGaps: updatedGaps,
        },
      });
    }

    return {
      success: true,
      data: {
        concept: conceptId,
        masteryLevel: clampedMastery,
        previousLevel,
        change: clampedMastery - previousLevel,
      },
    };
  } catch (error) {
    logger.error('Error updating mastery', { error, args, context });
    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Failed to update mastery',
      },
    };
  }
}

/**
 * adapt_narrative - Adapt narrative path
 */
async function adaptNarrative(args: any, context: ToolContext): Promise<ToolResult> {
  try {
    const { reason, newPath = [] } = args;

    if (!reason) {
      return {
        success: false,
        error: {
          errorType: 'validation_error',
          message: 'reason is required',
        },
      };
    }

    const session = await prisma.session.findUnique({
      where: { id: context.sessionId },
      include: { learner: true },
    });

    if (!session) {
      return {
        success: false,
        error: {
          errorType: 'resource_not_found',
          message: 'Session not found',
        },
      };
    }

    // Update path history
    const pathHistory = (session.pathHistory as string[]) || [];
    if (newPath.length > 0) {
      pathHistory.push(...newPath);
    }

    await prisma.session.update({
      where: { id: context.sessionId },
      data: { pathHistory: pathHistory as any },
    });

    // If new path provided, find first node
    let nextNode = null;
    if (newPath.length > 0) {
      const firstNuggetId = newPath[0];
      const node = await prisma.narrativeNode.findFirst({
        where: {
          nuggetId: firstNuggetId,
          organizationId: context.organizationId,
        },
        include: {
          nugget: true,
        },
      });

      if (node) {
        nextNode = {
          id: node.id,
          nugget: {
            id: node.nugget.id,
            content: node.nugget.content,
            imageUrl: node.nugget.imageUrl,
            audioUrl: node.nugget.audioUrl,
          },
          choices: node.choices,
        };

        // Update session current node
        await sessionService.updateCurrentNode(context.sessionId, node.id);
      }
    }

    return {
      success: true,
      data: {
        reason,
        newPath,
        nextNode,
      },
    };
  } catch (error) {
    logger.error('Error adapting narrative', { error, args, context });
    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Failed to adapt narrative',
      },
    };
  }
}

/**
 * show_media - Display media widget
 */
async function showMedia(args: any, context: ToolContext): Promise<ToolResult> {
  try {
    const { type, url, caption } = args;

    if (!type || !url) {
      return {
        success: false,
        error: {
          errorType: 'validation_error',
          message: 'type and url are required',
        },
      };
    }

    if (!['image', 'video'].includes(type)) {
      return {
        success: false,
        error: {
          errorType: 'validation_error',
          message: 'type must be "image" or "video"',
        },
      };
    }

    return {
      success: true,
      data: {
        type,
        url,
        caption,
      },
    };
  } catch (error) {
    logger.error('Error showing media', { error, args, context });
    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Failed to show media',
      },
    };
  }
}

/**
 * search_nuggets - Search for relevant nuggets
 */
async function searchNuggets(args: any, context: ToolContext): Promise<ToolResult> {
  try {
    const { query, limit = 10 } = args;

    if (!query) {
      return {
        success: false,
        error: {
          errorType: 'validation_error',
          message: 'query is required',
        },
      };
    }

    // Simple text search for now (could use vector search later)
    const nuggets = await prisma.nugget.findMany({
      where: {
        organizationId: context.organizationId,
        status: 'ready',
        content: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      select: {
        id: true,
        content: true,
        metadata: true,
      },
    });

    return {
      success: true,
      data: {
        nuggets: nuggets.map((n) => ({
          id: n.id,
          content: n.content.substring(0, 200),
          metadata: n.metadata,
        })),
      },
    };
  } catch (error) {
    logger.error('Error searching nuggets', { error, args, context });
    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Failed to search nuggets',
      },
    };
  }
}

/**
 * get_learner_progress - Get learner progress
 */
async function getLearnerProgress(args: any, context: ToolContext): Promise<ToolResult> {
  try {
    const progress = await progressTrackerService.getProgress(context.learnerId);

    return {
      success: true,
      data: progress,
    };
  } catch (error) {
    logger.error('Error getting learner progress', { error, args, context });
    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Failed to get progress',
      },
    };
  }
}

/**
 * identify_gaps - Identify knowledge gaps
 */
async function identifyGaps(args: any, context: ToolContext): Promise<ToolResult> {
  try {
    const gaps = await progressTrackerService.identifyKnowledgeGaps(context.learnerId);

    return {
      success: true,
      data: {
        knowledgeGaps: gaps,
      },
    };
  } catch (error) {
    logger.error('Error identifying gaps', { error, args, context });
    return {
      success: false,
      error: {
        errorType: 'system_error',
        message: error instanceof Error ? error.message : 'Failed to identify gaps',
      },
    };
  }
}
