import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { Session, Learner } from '@prisma/client';

export interface ProgressUpdate {
  concept: string;
  mastery: number; // 0-100
  timestamp: Date;
}

/**
 * Progress tracking service
 */
export class ProgressTrackerService {
  /**
   * Update progress for a concept
   */
  async updateProgress(learnerId: string, concept: string, mastery: number): Promise<void> {
    try {
      logger.info('Updating progress', { learnerId, concept, mastery });

      const learner = await prisma.learner.findUnique({
        where: { id: learnerId },
      });

      if (!learner) {
        throw new Error(`Learner not found: ${learnerId}`);
      }

      // Clamp mastery to 0-100
      const clampedMastery = Math.max(0, Math.min(100, mastery));

      // Update mastery map
      const masteryMap = (learner.masteryMap as any) || {};
      masteryMap[concept] = clampedMastery;

      await prisma.learner.update({
        where: { id: learnerId },
        data: { masteryMap: masteryMap as any },
      });

      // Create progress record
      await prisma.progress.create({
        data: {
          learnerId,
          concept,
          masteryLevel: clampedMastery,
          evidence: `Updated via progress tracker`,
        },
      });

      // Update knowledge gaps if mastery is high enough
      if (clampedMastery >= 70) {
        await this.removeKnowledgeGap(learnerId, concept);
      }

      logger.info('Progress updated', { learnerId, concept, mastery: clampedMastery });
    } catch (error) {
      logger.error('Error updating progress', {
        error: error instanceof Error ? error.message : String(error),
        learnerId,
        concept,
      });
      throw error;
    }
  }

  /**
   * Update progress from session activity
   */
  async updateProgressFromSession(
    sessionId: string,
    concept: string,
    mastery: number
  ): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { learner: true },
      });

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      await this.updateProgress(session.learnerId, concept, mastery);
    } catch (error) {
      logger.error('Error updating progress from session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Get progress for a learner
   */
  async getProgress(learnerId: string): Promise<{
    masteryMap: Record<string, number>;
    knowledgeGaps: string[];
    recentProgress: ProgressUpdate[];
  }> {
    try {
      const learner = await prisma.learner.findUnique({
        where: { id: learnerId },
      });

      if (!learner) {
        throw new Error(`Learner not found: ${learnerId}`);
      }

      // Get recent progress records
      const recentProgressRecords = await prisma.progress.findMany({
        where: { learnerId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });

      const recentProgress: ProgressUpdate[] = recentProgressRecords.map((record) => ({
        concept: record.concept,
        mastery: record.masteryLevel,
        timestamp: record.updatedAt,
      }));

      return {
        masteryMap: (learner.masteryMap as any) || {},
        knowledgeGaps: learner.knowledgeGaps || [],
        recentProgress,
      };
    } catch (error) {
      logger.error('Error getting progress', {
        error: error instanceof Error ? error.message : String(error),
        learnerId,
      });
      throw error;
    }
  }

  /**
   * Identify knowledge gaps from low mastery concepts
   */
  async identifyKnowledgeGaps(learnerId: string): Promise<string[]> {
    try {
      const learner = await prisma.learner.findUnique({
        where: { id: learnerId },
      });

      if (!learner) {
        return [];
      }

      const masteryMap = (learner.masteryMap as any) || {};
      const gaps: string[] = [];

      for (const [concept, mastery] of Object.entries(masteryMap)) {
        if ((mastery as number) < 50) {
          gaps.push(concept);
        }
      }

      // Update learner's knowledge gaps
      await prisma.learner.update({
        where: { id: learnerId },
        data: { knowledgeGaps: gaps },
      });

      return gaps;
    } catch (error) {
      logger.error('Error identifying knowledge gaps', {
        error: error instanceof Error ? error.message : String(error),
        learnerId,
      });
      return [];
    }
  }

  /**
   * Remove knowledge gap when mastery is achieved
   */
  private async removeKnowledgeGap(learnerId: string, concept: string): Promise<void> {
    try {
      const learner = await prisma.learner.findUnique({
        where: { id: learnerId },
      });

      if (!learner) {
        return;
      }

      const knowledgeGaps = learner.knowledgeGaps || [];
      const updatedGaps = knowledgeGaps.filter((gap) => gap !== concept);

      if (updatedGaps.length !== knowledgeGaps.length) {
        await prisma.learner.update({
          where: { id: learnerId },
          data: { knowledgeGaps: updatedGaps },
        });
      }
    } catch (error) {
      logger.warn('Error removing knowledge gap', {
        error: error instanceof Error ? error.message : String(error),
        learnerId,
        concept,
      });
    }
  }
}

// Singleton instance
export const progressTrackerService = new ProgressTrackerService();
