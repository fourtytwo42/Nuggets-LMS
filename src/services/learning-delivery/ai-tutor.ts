import { getGeminiClient } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { Session, Nugget, NarrativeNode } from '@prisma/client';

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * AI Tutor service using Gemini 3 Pro
 */
export class AITutorService {
  /**
   * Generate response from AI tutor
   */
  async generateResponse(
    session: Session,
    userMessage: string,
    conversationHistory: TutorMessage[] = []
  ): Promise<string> {
    try {
      logger.info('Generating AI tutor response', {
        sessionId: session.id,
        messageLength: userMessage.length,
      });

      const client = getGeminiClient();
      const model = client.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
      });

      // Build conversation context
      const context = await this.buildContext(session);
      const prompt = this.buildPrompt(context, userMessage, conversationHistory);

      const result = await model.generateContent(prompt);
      const response = result.response;

      // Tool calling would be implemented here when Gemini API supports it
      // For now, return the text response
      return response.text();
    } catch (error) {
      logger.error('Error generating AI tutor response', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: session.id,
      });
      throw error;
    }
  }

  /**
   * Get available tools for AI tutor
   */
  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'get_nugget',
        description: 'Get learning nugget content by ID',
        parameters: {
          type: 'object',
          properties: {
            nuggetId: { type: 'string', description: 'Nugget ID' },
          },
          required: ['nuggetId'],
        },
      },
      {
        name: 'update_progress',
        description: 'Update learner progress for a concept',
        parameters: {
          type: 'object',
          properties: {
            concept: { type: 'string', description: 'Concept name' },
            mastery: { type: 'number', description: 'Mastery level (0-100)' },
          },
          required: ['concept', 'mastery'],
        },
      },
      {
        name: 'navigate_narrative',
        description: 'Navigate to a different narrative node',
        parameters: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'Narrative node ID' },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'get_related_nuggets',
        description: 'Find related learning nuggets by topic',
        parameters: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'Topic to search for' },
            limit: { type: 'number', description: 'Maximum number of results' },
          },
          required: ['topic'],
        },
      },
    ];
  }

  /**
   * Build context for AI tutor
   */
  private async buildContext(session: Session): Promise<string> {
    const learner = await prisma.learner.findUnique({
      where: { id: session.learnerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!learner) {
      return 'Learner not found';
    }

    const currentNode = session.currentNodeId
      ? await prisma.narrativeNode.findUnique({
          where: { id: session.currentNodeId },
          include: { nugget: true },
        })
      : null;

    const masteryMap = (learner.masteryMap as any) || {};
    const knowledgeGaps = learner.knowledgeGaps || [];

    let context = `Learner: ${learner.user.name}\n`;
    context += `Current Learning Node: ${currentNode?.nugget.content.substring(0, 200) || 'None'}\n`;
    context += `Knowledge Gaps: ${knowledgeGaps.join(', ') || 'None'}\n`;
    context += `Mastery Levels: ${JSON.stringify(masteryMap)}\n`;

    return context;
  }

  /**
   * Build prompt for AI tutor
   */
  private buildPrompt(
    context: string,
    userMessage: string,
    conversationHistory: TutorMessage[]
  ): string {
    let prompt = `You are an expert AI tutor helping a learner through an adaptive microlearning experience.

Context:
${context}

Conversation History:
${conversationHistory
  .slice(-5)
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join('\n')}

User Message: ${userMessage}

Instructions:
1. Provide helpful, educational responses
2. Use tools when appropriate to access learning content or update progress
3. Guide the learner through the learning path
4. Adapt to their knowledge gaps and mastery levels
5. Be conversational and engaging

Respond naturally and helpfully.`;

    return prompt;
  }

  /**
   * Extract tool calls from response
   */
  private extractToolCalls(response: any): ToolCall[] {
    // Gemini API structure for tool calls
    const toolCalls: ToolCall[] = [];
    // Implementation depends on Gemini API response structure
    // This is a placeholder - actual implementation will depend on API
    return toolCalls;
  }

  /**
   * Execute tools
   */
  private async executeTools(toolCalls: ToolCall[], session: Session): Promise<string[]> {
    const results: string[] = [];

    for (const toolCall of toolCalls) {
      try {
        let result: any;

        switch (toolCall.name) {
          case 'get_nugget':
            result = await this.executeGetNugget(toolCall.parameters.nuggetId);
            break;
          case 'update_progress':
            result = await this.executeUpdateProgress(
              session.learnerId,
              toolCall.parameters.concept,
              toolCall.parameters.mastery
            );
            break;
          case 'navigate_narrative':
            result = await this.executeNavigateNarrative(session.id, toolCall.parameters.nodeId);
            break;
          case 'get_related_nuggets':
            result = await this.executeGetRelatedNuggets(
              session.organizationId,
              toolCall.parameters.topic,
              toolCall.parameters.limit || 5
            );
            break;
          default:
            result = { error: `Unknown tool: ${toolCall.name}` };
        }

        results.push(JSON.stringify(result));
      } catch (error) {
        logger.error('Error executing tool', {
          error: error instanceof Error ? error.message : String(error),
          toolName: toolCall.name,
        });
        results.push(JSON.stringify({ error: 'Tool execution failed' }));
      }
    }

    return results;
  }

  /**
   * Execute get_nugget tool
   */
  private async executeGetNugget(nuggetId: string): Promise<any> {
    const nugget = await prisma.nugget.findUnique({
      where: { id: nuggetId },
    });

    if (!nugget) {
      return { error: 'Nugget not found' };
    }

    return {
      success: true,
      nugget: {
        id: nugget.id,
        content: nugget.content,
        metadata: nugget.metadata,
      },
    };
  }

  /**
   * Execute update_progress tool
   */
  private async executeUpdateProgress(
    learnerId: string,
    concept: string,
    mastery: number
  ): Promise<any> {
    const learner = await prisma.learner.findUnique({
      where: { id: learnerId },
    });

    if (!learner) {
      return { error: 'Learner not found' };
    }

    const masteryMap = (learner.masteryMap as any) || {};
    masteryMap[concept] = Math.max(0, Math.min(100, mastery));

    await prisma.learner.update({
      where: { id: learnerId },
      data: { masteryMap: masteryMap as any },
    });

    return { success: true, concept, mastery };
  }

  /**
   * Execute navigate_narrative tool
   */
  private async executeNavigateNarrative(sessionId: string, nodeId: string): Promise<any> {
    const node = await prisma.narrativeNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      return { error: 'Node not found' };
    }

    // Update session current node (would use sessionService in real implementation)
    await prisma.session.update({
      where: { id: sessionId },
      data: { currentNodeId: nodeId, lastActivity: new Date() },
    });

    return { success: true, nodeId };
  }

  /**
   * Execute get_related_nuggets tool
   */
  private async executeGetRelatedNuggets(
    organizationId: string,
    topic: string,
    limit: number
  ): Promise<any> {
    const nuggets = await prisma.nugget.findMany({
      where: {
        organizationId,
        status: 'ready',
        metadata: {
          path: ['topics'],
          array_contains: [topic],
        } as any,
      },
      take: limit,
    });

    return {
      success: true,
      nuggets: nuggets.map((n) => ({
        id: n.id,
        content: n.content.substring(0, 200),
        metadata: n.metadata,
      })),
    };
  }

  /**
   * Generate response with tool results
   */
  private async generateResponseWithToolResults(
    model: any,
    userMessage: string,
    toolResults: string[]
  ): Promise<string> {
    // This would be implemented based on Gemini's tool calling API
    // For now, return a simple response
    return 'I have processed your request. How can I help you further?';
  }
}

// Singleton instance
export const aiTutorService = new AITutorService();
