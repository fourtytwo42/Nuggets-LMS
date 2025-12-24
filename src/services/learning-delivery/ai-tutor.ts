import { getGeminiClient, trackGeminiCost } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { Session, Nugget, NarrativeNode } from '@prisma/client';
import { executeTool, type ToolContext } from './tools';

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * AI Tutor service using Gemini 3 Pro with function calling
 */
export class AITutorService {
  /**
   * Generate response from AI tutor with tool support
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

      // Use Gemini 3 Pro for complex reasoning and tool execution
      const model = client.getGenerativeModel({
        model: 'gemini-2.0-flash-exp', // Using available model, update to gemini-3-pro when available
      });

      // Build conversation context
      const context = await this.buildContext(session);
      const systemPrompt = this.buildSystemPrompt(context);

      // Get tool definitions
      const tools = this.getToolDefinitions();

      // Build conversation messages
      const messages = this.buildMessages(systemPrompt, userMessage, conversationHistory);

      // Generate content with tools
      // Note: Gemini SDK function calling format may vary by version
      // This is a simplified implementation - may need adjustment based on actual SDK
      const generationConfig = {
        temperature: 0.7,
      };

      let result;
      if (tools.length > 0) {
        // Try with tools (function calling)
        result = await model.generateContent({
          contents: messages,
          tools: [{ functionDeclarations: tools }],
          generationConfig,
        });
      } else {
        result = await model.generateContent({
          contents: messages,
          generationConfig,
        });
      }

      const response = result.response;
      const text = response.text();

      // Track costs for initial generation
      const usageMetadata = (result.response as any).usageMetadata;
      const promptText = messages
        .map((m: any) => {
          if (m.parts && Array.isArray(m.parts)) {
            return m.parts.map((p: any) => p.text || '').join(' ');
          }
          return '';
        })
        .join(' ');
      await trackGeminiCost(
        'gemini-2.0-flash-exp',
        promptText,
        text,
        session.organizationId,
        session.learnerId,
        usageMetadata
      );

      // Check for function calls in response
      // Note: Actual API may differ - this is a placeholder implementation
      let functionCalls: any[] = [];
      try {
        // Try to get function calls (method name may vary)
        if (typeof (response as any).functionCalls === 'function') {
          functionCalls = (response as any).functionCalls() || [];
        } else if ((response as any).functionCalls) {
          functionCalls = (response as any).functionCalls || [];
        }
      } catch (error) {
        // Function calling not available or different format
        logger.debug('Function calls not available in response', { error });
      }

      if (functionCalls && functionCalls.length > 0) {
        // Execute tools and get results
        const toolResults = await this.executeToolCalls(functionCalls, session);

        // Generate final response with tool results
        // Build function response parts
        const functionResponseParts = toolResults.map((result) => ({
          functionResponse: {
            name: result.name,
            response: result.result,
          },
        }));

        const finalMessages = [
          ...messages,
          {
            role: 'model' as const,
            parts: [{ text }],
          },
          {
            role: 'user' as const,
            parts: functionResponseParts,
          },
        ];

        // Get final response after tool execution
        const finalResult = await model.generateContent({
          contents: finalMessages,
          generationConfig,
        });

        const finalText = finalResult.response.text();

        // Track costs for final generation
        const finalUsageMetadata = (finalResult.response as any).usageMetadata;
        const finalPromptText = finalMessages
          .map((m: any) => {
            if (m.parts && Array.isArray(m.parts)) {
              return m.parts.map((p: any) => p.text || '').join(' ');
            }
            return '';
          })
          .join(' ');
        await trackGeminiCost(
          'gemini-2.0-flash-exp',
          finalPromptText,
          finalText,
          session.organizationId,
          session.learnerId,
          finalUsageMetadata
        );

        return finalText;
      }

      return text;
    } catch (error) {
      logger.error('Error generating AI tutor response', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: session.id,
      });
      throw error;
    }
  }

  /**
   * Get tool definitions for Gemini 3
   */
  private getToolDefinitions(): any[] {
    return [
      {
        name: 'deliver_nugget',
        description:
          'Deliver a learning nugget to the learner. Use this when you want to present new content, explain a concept, or show educational material.',
        parameters: {
          type: 'object',
          properties: {
            nuggetId: {
              type: 'string',
              description:
                "ID of the nugget to deliver. Use semantic search to find relevant nuggets if you don't have a specific ID.",
            },
            format: {
              type: 'string',
              enum: ['text', 'audio', 'multimedia'],
              description:
                'How to deliver the nugget. text = text only, audio = audio narration, multimedia = text + image + audio',
              default: 'multimedia',
            },
          },
          required: ['nuggetId'],
        },
      },
      {
        name: 'ask_question',
        description:
          'Ask learner an organic question to assess understanding. Use this naturally in conversation, not as a formal quiz.',
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description:
                'The question to ask the learner. Should be natural and conversational, not formal or test-like.',
            },
            context: {
              type: 'string',
              description:
                'What concept or topic this question tests. Used for tracking and mastery updates.',
            },
            expectedAnswer: {
              type: 'string',
              description:
                'Expected answer or key points for evaluation. Optional, but helps with assessment accuracy.',
            },
          },
          required: ['question', 'context'],
        },
      },
      {
        name: 'update_mastery',
        description:
          'Update learner mastery level for a concept based on their responses, demonstrated understanding, or performance.',
        parameters: {
          type: 'object',
          properties: {
            conceptId: {
              type: 'string',
              description:
                'Concept identifier (e.g., machine-learning-basics, neural-networks). Use consistent identifiers.',
            },
            masteryLevel: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description:
                'New mastery level (0-100). 0 = no knowledge, 50 = partial understanding, 100 = complete mastery.',
            },
            evidence: {
              type: 'string',
              description:
                'Why this assessment (e.g., Correctly explained supervised learning, Struggled with neural network concepts). Required for audit trail.',
            },
          },
          required: ['conceptId', 'masteryLevel', 'evidence'],
        },
      },
      {
        name: 'adapt_narrative',
        description:
          'Change narrative path based on learner needs. Use this when the learner needs different content, difficulty level, or learning approach.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description:
                'Why the path needs to change (e.g., Learner struggling with current difficulty, Learner wants to explore different topic, Knowledge gap identified).',
            },
            newPath: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Array of nugget IDs for new path. Can be empty array to let system auto-generate path based on reason.',
            },
          },
          required: ['reason'],
        },
      },
      {
        name: 'show_media',
        description:
          'Display image or video widget in the learner interface. Use this to show illustrations, diagrams, or video content that enhances learning.',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['image', 'video'],
              description: 'Type of media to display',
            },
            url: {
              type: 'string',
              description:
                'URL or path to media file. Can be nugget image/audio URL or external URL.',
            },
            caption: {
              type: 'string',
              description:
                'Caption or description for the media. Helps with accessibility and context.',
            },
          },
          required: ['type', 'url'],
        },
      },
      {
        name: 'search_nuggets',
        description:
          'Search for relevant learning nuggets by topic or query. Use this to find content that matches learner interests or knowledge gaps.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query or topic to find relevant nuggets',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_learner_progress',
        description:
          'Get current learner progress including mastery levels and knowledge gaps. Use this to understand what the learner knows and what they need to learn.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'identify_gaps',
        description:
          'Identify knowledge gaps from low mastery concepts. Use this to find areas where the learner needs more support.',
        parameters: {
          type: 'object',
          properties: {},
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
   * Build system prompt for AI tutor
   */
  private buildSystemPrompt(context: string): string {
    return `You are an expert AI tutor helping a learner through an adaptive microlearning experience.

Context:
${context}

Instructions:
1. Provide helpful, educational responses that are conversational and engaging
2. Use tools when appropriate to access learning content, assess understanding, or update progress
3. Guide the learner through the learning path naturally
4. Adapt to their knowledge gaps and mastery levels
5. Ask questions organically in conversation (not as formal tests)
6. Update mastery levels based on learner responses and demonstrated understanding
7. Use deliver_nugget to present learning content
8. Use ask_question to assess understanding naturally
9. Use update_mastery to track progress
10. Use adapt_narrative to change learning paths when needed
11. Be conversational, supportive, and encouraging

Remember: Assessment happens organically through dialogue, not through formal tests or quizzes.`;
  }

  /**
   * Build messages for Gemini API
   */
  private buildMessages(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: TutorMessage[]
  ): any[] {
    const messages: any[] = [];

    // Add system prompt as first user message
    messages.push({
      role: 'user',
      parts: [{ text: systemPrompt }],
    });

    // Add conversation history
    conversationHistory.slice(-10).forEach((msg) => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    });

    // Add current user message
    messages.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    return messages;
  }

  /**
   * Execute tool calls from Gemini response
   */
  private async executeToolCalls(
    functionCalls: any[],
    session: Session
  ): Promise<Array<{ name: string; result: string }>> {
    const toolContext: ToolContext = {
      sessionId: session.id,
      learnerId: session.learnerId,
      organizationId: session.organizationId,
    };

    // Execute tools in parallel
    const toolPromises = functionCalls.map(async (call) => {
      try {
        // Handle different function call formats
        let toolName: string;
        let args: any;

        if (call.function) {
          // Format: { function: { name: "...", args: {...} } }
          toolName = call.function.name;
          args = call.function.args || {};
        } else if (call.name) {
          // Format: { name: "...", args: {...} }
          toolName = call.name;
          args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args || {};
        } else {
          throw new Error('Invalid function call format');
        }

        logger.info('Executing tool', { toolName, args, sessionId: session.id });

        const toolResult = await executeTool(toolName, args, toolContext);

        // Return result as JSON string (Gemini expects JSON strings for function responses)
        const resultString = JSON.stringify(toolResult.success ? toolResult.data : toolResult);

        return {
          name: toolName,
          result: resultString,
        };
      } catch (error) {
        logger.error('Error executing tool call', {
          error: error instanceof Error ? error.message : String(error),
          toolCall: call,
          sessionId: session.id,
        });

        const toolName = call.function?.name || call.name || 'unknown';
        return {
          name: toolName,
          result: JSON.stringify({
            success: false,
            error: {
              errorType: 'system_error',
              message: error instanceof Error ? error.message : 'Tool execution failed',
            },
          }),
        };
      }
    });

    const toolResults = await Promise.all(toolPromises);
    return toolResults;
  }
}

// Singleton instance
export const aiTutorService = new AITutorService();
