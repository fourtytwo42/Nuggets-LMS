import { getGeminiClient } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { Nugget } from '@prisma/client';

export interface NarrativeNodeData {
  nuggetId: string;
  organizationId: string;
  prerequisites: string[];
  adaptsTo: string[];
  position?: { x: number; y: number };
}

/**
 * Narrative node generation service
 * Generates narrative nodes from nuggets for learning paths
 */
export class NarrativeNodeGeneratorService {
  /**
   * Generate narrative node from a nugget
   */
  async generateNode(nugget: Nugget): Promise<NarrativeNodeData> {
    try {
      logger.info('Generating narrative node for nugget', { nuggetId: nugget.id });

      // Extract prerequisites and knowledge gaps from metadata
      const metadata = nugget.metadata as any;
      const prerequisites = metadata?.prerequisites || [];
      const relatedConcepts = metadata?.relatedConcepts || [];

      // Use AI to determine what knowledge gaps this nugget addresses
      const adaptsTo = await this.determineKnowledgeGaps(nugget, relatedConcepts);

      // Generate position for visualization (can be enhanced with graph layout algorithm)
      const position = this.generatePosition(nugget.id);

      return {
        nuggetId: nugget.id,
        organizationId: nugget.organizationId,
        prerequisites,
        adaptsTo,
        position,
      };
    } catch (error) {
      logger.error('Error generating narrative node', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId: nugget.id,
      });
      throw error;
    }
  }

  /**
   * Generate narrative nodes for multiple nuggets
   */
  async generateNodes(nuggets: Nugget[]): Promise<NarrativeNodeData[]> {
    try {
      logger.info('Generating narrative nodes batch', { count: nuggets.length });

      const nodes = await Promise.all(nuggets.map((nugget) => this.generateNode(nugget)));

      logger.info('Narrative nodes generated', { count: nodes.length });
      return nodes;
    } catch (error) {
      logger.error('Error generating narrative nodes batch', {
        error: error instanceof Error ? error.message : String(error),
        count: nuggets.length,
      });
      throw error;
    }
  }

  /**
   * Create narrative node in database
   */
  async createNode(nodeData: NarrativeNodeData): Promise<any> {
    try {
      const node = await prisma.narrativeNode.create({
        data: {
          nuggetId: nodeData.nuggetId,
          organizationId: nodeData.organizationId,
          prerequisites: nodeData.prerequisites,
          adaptsTo: nodeData.adaptsTo,
          position: nodeData.position as any,
          choices: [],
        },
      });

      logger.info('Narrative node created', { nodeId: node.id, nuggetId: nodeData.nuggetId });
      return node;
    } catch (error) {
      logger.error('Error creating narrative node', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId: nodeData.nuggetId,
      });
      throw error;
    }
  }

  /**
   * Determine what knowledge gaps this nugget addresses
   */
  private async determineKnowledgeGaps(
    nugget: Nugget,
    relatedConcepts: string[]
  ): Promise<string[]> {
    try {
      // For now, use related concepts as knowledge gaps
      // Can be enhanced with AI analysis
      return relatedConcepts.slice(0, 5);
    } catch (error) {
      logger.warn('Error determining knowledge gaps, using fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Generate position for node visualization
   */
  private generatePosition(nuggetId: string): { x: number; y: number } {
    // Simple hash-based positioning for consistent layout
    // Can be enhanced with proper graph layout algorithm
    const hash = this.simpleHash(nuggetId);
    return {
      x: (hash % 1000) / 10, // 0-100 range
      y: (Math.floor(hash / 1000) % 1000) / 10, // 0-100 range
    };
  }

  /**
   * Simple hash function for consistent positioning
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Singleton instance
export const narrativeNodeGeneratorService = new NarrativeNodeGeneratorService();
