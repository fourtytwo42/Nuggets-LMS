import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { Learner, Session, NarrativeNode } from '@prisma/client';

export interface CreateSessionInput {
  learnerId: string;
  organizationId: string;
  mode?: 'text' | 'voice';
  initialNodeId?: string;
}

/**
 * Session management service for learning delivery
 */
export class SessionService {
  /**
   * Create a new learning session
   */
  async createSession(input: CreateSessionInput): Promise<Session> {
    try {
      logger.info('Creating learning session', {
        learnerId: input.learnerId,
        organizationId: input.organizationId,
      });

      // Get learner to verify existence
      const learner = await prisma.learner.findUnique({
        where: { userId: input.learnerId },
      });

      if (!learner) {
        throw new Error(`Learner not found: ${input.learnerId}`);
      }

      // Determine starting node
      let currentNodeId: string | null = null;
      if (input.initialNodeId) {
        // Verify node exists and belongs to organization
        const node = await prisma.narrativeNode.findFirst({
          where: {
            id: input.initialNodeId,
            organizationId: input.organizationId,
          },
        });

        if (node) {
          currentNodeId = node.id;
        }
      }

      // If no initial node specified, find a starting node
      if (!currentNodeId) {
        const startingNode = await this.findStartingNode(input.organizationId, learner);
        currentNodeId = startingNode?.id || null;
      }

      // Create session
      const session = await prisma.session.create({
        data: {
          learnerId: learner.id,
          organizationId: input.organizationId,
          currentNodeId,
          mode: input.mode || 'text',
          pathHistory: [],
        },
      });

      // Create initial session node record
      if (currentNodeId) {
        await prisma.sessionNode.create({
          data: {
            sessionId: session.id,
            nodeId: currentNodeId,
            visitedAt: new Date(),
          },
        });
      }

      logger.info('Learning session created', { sessionId: session.id });
      return session;
    } catch (error) {
      logger.error('Error creating session', {
        error: error instanceof Error ? error.message : String(error),
        learnerId: input.learnerId,
      });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, organizationId: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: {
        id: sessionId,
        organizationId,
      },
      include: {
        currentNode: {
          include: {
            nugget: true,
          },
        },
        learner: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  /**
   * Update session's current node
   */
  async updateCurrentNode(sessionId: string, nodeId: string, choiceId?: string): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Update current node
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          currentNodeId: nodeId,
          pathHistory: {
            push: nodeId,
          } as any,
          lastActivity: new Date(),
        },
      });

      // Create session node record
      await prisma.sessionNode.create({
        data: {
          sessionId,
          nodeId,
          choiceId,
          visitedAt: new Date(),
        },
      });

      logger.info('Session node updated', { sessionId, nodeId });
    } catch (error) {
      logger.error('Error updating session node', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          completedAt: new Date(),
          lastActivity: new Date(),
        },
      });

      logger.info('Session completed', { sessionId });
    } catch (error) {
      logger.error('Error completing session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Find a starting node for a learner
   */
  private async findStartingNode(
    organizationId: string,
    learner: Learner
  ): Promise<NarrativeNode | null> {
    try {
      // Find nodes with no prerequisites or prerequisites that learner has mastered
      const masteryMap = (learner.masteryMap as any) || {};
      const masteredConcepts = Object.keys(masteryMap).filter(
        (concept) => masteryMap[concept] >= 70
      );

      // Find nodes with no prerequisites or prerequisites that are mastered
      const nodes = await prisma.narrativeNode.findMany({
        where: {
          organizationId,
          OR: [
            { prerequisites: { isEmpty: true } },
            {
              prerequisites: {
                hasEvery: masteredConcepts,
              },
            },
          ],
        },
        take: 1,
      });

      return nodes[0] || null;
    } catch (error) {
      logger.warn('Error finding starting node, using first available', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback: return first available node
      const nodes = await prisma.narrativeNode.findMany({
        where: { organizationId },
        take: 1,
      });

      return nodes[0] || null;
    }
  }

  /**
   * Get active sessions for a learner
   */
  async getActiveSessions(learnerId: string): Promise<Session[]> {
    const learner = await prisma.learner.findUnique({
      where: { userId: learnerId },
    });

    if (!learner) {
      return [];
    }

    return prisma.session.findMany({
      where: {
        learnerId: learner.id,
        completedAt: null,
      },
      orderBy: { lastActivity: 'desc' },
      include: {
        currentNode: {
          include: {
            nugget: true,
          },
        },
      },
    });
  }
}

// Singleton instance
export const sessionService = new SessionService();
