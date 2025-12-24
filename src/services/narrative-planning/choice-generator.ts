import { getGeminiClient, trackGeminiCost } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { NarrativeNode } from '@prisma/client';

export interface Choice {
  id: string;
  text: string;
  nextNodeId: string;
  revealsGap: string[];
  confirmsMastery: string[];
}

/**
 * Choice generation and path adaptation service
 */
export class ChoiceGeneratorService {
  /**
   * Generate choices for a narrative node
   */
  async generateChoices(node: NarrativeNode, availableNodes: NarrativeNode[]): Promise<Choice[]> {
    try {
      logger.info('Generating choices for narrative node', { nodeId: node.id });

      // Get nugget content for context
      const nugget = await prisma.nugget.findUnique({
        where: { id: node.nuggetId },
      });

      if (!nugget) {
        throw new Error(`Nugget not found: ${node.nuggetId}`);
      }

      // Use AI to generate choices based on content and available paths
      const choices = await this.generateChoicesWithAI(node, nugget.content, availableNodes);

      // Update node with choices
      await prisma.narrativeNode.update({
        where: { id: node.id },
        data: {
          choices: choices as any,
        },
      });

      logger.info('Choices generated and saved', { nodeId: node.id, choiceCount: choices.length });
      return choices;
    } catch (error) {
      logger.error('Error generating choices', {
        error: error instanceof Error ? error.message : String(error),
        nodeId: node.id,
      });
      throw error;
    }
  }

  /**
   * Generate choices using AI
   */
  private async generateChoicesWithAI(
    node: NarrativeNode,
    content: string,
    availableNodes: NarrativeNode[]
  ): Promise<Choice[]> {
    try {
      const client = getGeminiClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = this.buildChoicePrompt(node, content, availableNodes);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Track costs
      const usageMetadata = (result.response as any).usageMetadata;
      await trackGeminiCost(
        'gemini-2.0-flash-exp',
        prompt,
        text,
        node.organizationId,
        undefined, // No learnerId for narrative planning
        usageMetadata
      );

      // Parse choices from response
      return this.parseChoicesFromResponse(text, availableNodes, node);
    } catch (error) {
      logger.warn('Error generating choices with AI, using fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.generateFallbackChoices(node, availableNodes);
    }
  }

  /**
   * Build prompt for choice generation
   */
  private buildChoicePrompt(
    node: NarrativeNode,
    content: string,
    availableNodes: NarrativeNode[]
  ): string {
    const adaptsTo = node.adaptsTo || [];
    const availablePaths = availableNodes
      .slice(0, 5)
      .map((n) => `- Node ${n.id}: addresses ${(n.adaptsTo || []).join(', ')}`)
      .join('\n');

    return `You are an expert learning path designer. Generate 2-4 choices for a learning node.

Current Node Content:
${content.substring(0, 500)}

Knowledge Gaps This Node Addresses: ${adaptsTo.join(', ') || 'General learning'}

Available Next Nodes:
${availablePaths || 'No specific nodes available'}

Requirements:
1. Create 2-4 meaningful choices that lead to different learning paths
2. Each choice should reveal different knowledge gaps or confirm mastery of concepts
3. Choices should be engaging and educational
4. Map choices to available next nodes when possible

Format your response as JSON:
{
  "choices": [
    {
      "id": "choice-1",
      "text": "Choice text here",
      "nextNodeId": "node-id",
      "revealsGap": ["gap1", "gap2"],
      "confirmsMastery": ["concept1"]
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.`;
  }

  /**
   * Parse choices from AI response
   */
  private parseChoicesFromResponse(
    responseText: string,
    availableNodes: NarrativeNode[],
    node: NarrativeNode
  ): Choice[] {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.choices && Array.isArray(parsed.choices)) {
          return parsed.choices.map((choice: any) => ({
            id: choice.id || `choice-${Math.random().toString(36).substr(2, 9)}`,
            text: choice.text || 'Continue',
            nextNodeId: choice.nextNodeId || availableNodes[0]?.id || '',
            revealsGap: choice.revealsGap || [],
            confirmsMastery: choice.confirmsMastery || [],
          }));
        }
      }
    } catch (error) {
      logger.warn('Error parsing choices from response', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return this.generateFallbackChoices(node, availableNodes);
  }

  /**
   * Generate fallback choices when AI generation fails
   */
  private generateFallbackChoices(node: NarrativeNode, availableNodes: NarrativeNode[]): Choice[] {
    const choices: Choice[] = [];

    // Create basic choices based on available nodes
    for (let i = 0; i < Math.min(3, availableNodes.length); i++) {
      choices.push({
        id: `choice-${i + 1}`,
        text: `Option ${i + 1}`,
        nextNodeId: availableNodes[i].id,
        revealsGap: [],
        confirmsMastery: [],
      });
    }

    // If no available nodes, create a default "continue" choice
    if (choices.length === 0) {
      choices.push({
        id: 'choice-continue',
        text: 'Continue Learning',
        nextNodeId: '',
        revealsGap: [],
        confirmsMastery: [],
      });
    }

    return choices;
  }

  /**
   * Select adaptive path based on learner's knowledge gaps
   */
  async selectAdaptivePath(
    currentNodeId: string,
    learnerGaps: string[],
    availableNodes: NarrativeNode[]
  ): Promise<string | null> {
    try {
      if (availableNodes.length === 0) {
        return null;
      }

      // Find nodes that address the learner's knowledge gaps
      const matchingNodes = availableNodes.filter((node) => {
        const adaptsTo = node.adaptsTo || [];
        return learnerGaps.some((gap) => adaptsTo.includes(gap));
      });

      if (matchingNodes.length > 0) {
        // Return the first matching node
        return matchingNodes[0].id;
      }

      // If no direct match, return the first available node
      return availableNodes[0].id;
    } catch (error) {
      logger.error('Error selecting adaptive path', {
        error: error instanceof Error ? error.message : String(error),
        currentNodeId,
      });
      return availableNodes[0]?.id || null;
    }
  }
}

// Singleton instance
export const choiceGeneratorService = new ChoiceGeneratorService();
