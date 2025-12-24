import { getGeminiClient, trackGeminiCost } from '@/lib/ai/gemini';
import logger from '@/lib/logger';
import type { Nugget } from '@prisma/client';

export interface Slide {
  title: string;
  content: string;
  order: number;
}

export interface SlideDeck {
  slides: Slide[];
  metadata: {
    totalSlides: number;
    estimatedTime: number; // minutes
  };
}

/**
 * Slide generation service using Gemini 3 Pro
 */
export class SlideGeneratorService {
  /**
   * Generate slides for a nugget
   */
  async generateSlides(nugget: Nugget): Promise<SlideDeck> {
    try {
      logger.info('Generating slides for nugget', { nuggetId: nugget.id });

      const client = getGeminiClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = this.buildSlidePrompt(nugget);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Track costs
      const usageMetadata = (result.response as any).usageMetadata;
      await trackGeminiCost(
        'gemini-2.0-flash-exp',
        prompt,
        text,
        nugget.organizationId,
        undefined, // No learnerId for content generation
        usageMetadata
      );

      // Parse slides from response
      const slides = this.parseSlidesFromResponse(text, nugget.content);

      const slideDeck: SlideDeck = {
        slides,
        metadata: {
          totalSlides: slides.length,
          estimatedTime: Math.ceil(slides.length * 1.5), // 1.5 minutes per slide
        },
      };

      logger.info('Slides generated', {
        nuggetId: nugget.id,
        slideCount: slides.length,
      });

      return slideDeck;
    } catch (error) {
      logger.error('Error generating slides', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId: nugget.id,
      });
      throw error;
    }
  }

  /**
   * Build prompt for slide generation
   */
  private buildSlidePrompt(nugget: Nugget): string {
    const metadata = nugget.metadata as any;
    const topics = metadata?.topics || [];
    const difficulty = metadata?.difficulty || 5;

    return `You are an expert educational content creator. Generate a slide deck for the following learning content.

Content:
${nugget.content}

Topics: ${topics.join(', ') || 'General'}
Difficulty Level: ${difficulty}/10

Requirements:
1. Create 3-7 slides that break down the content into digestible chunks
2. Each slide should have a clear title and concise content
3. Use bullet points or short paragraphs
4. Make it engaging and educational
5. Progress logically from introduction to conclusion

Format your response as JSON with this structure:
{
  "slides": [
    {
      "title": "Slide Title",
      "content": "Slide content here...",
      "order": 1
    }
  ]
}

Return ONLY valid JSON, no markdown formatting or code blocks.`;
  }

  /**
   * Parse slides from Gemini response
   */
  private parseSlidesFromResponse(responseText: string, fallbackContent: string): Slide[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.slides && Array.isArray(parsed.slides)) {
          return parsed.slides.map((slide: any, index: number) => ({
            title: slide.title || `Slide ${index + 1}`,
            content: slide.content || '',
            order: slide.order || index + 1,
          }));
        }
      }

      // Fallback: Split response into slides by headings or sections
      return this.fallbackSlideParsing(responseText, fallbackContent);
    } catch (error) {
      logger.warn('Error parsing slides from response, using fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackSlideParsing(responseText, fallbackContent);
    }
  }

  /**
   * Fallback slide parsing when JSON parsing fails
   */
  private fallbackSlideParsing(text: string, fallbackContent: string): Slide[] {
    // Split by common slide markers
    const slideMarkers = [
      /^#+\s+(.+)$/gm, // Markdown headers
      /^Slide\s+\d+[:\-]\s*(.+)$/gim, // "Slide 1: Title"
      /^\d+\.\s+(.+)$/gm, // Numbered list
    ];

    const slides: Slide[] = [];
    let currentSlide: { title: string; content: string[] } | null = null;

    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if line is a slide title
      let isTitle = false;
      for (const marker of slideMarkers) {
        if (marker.test(line)) {
          isTitle = true;
          break;
        }
      }

      if (isTitle || (line.length > 0 && line.length < 100 && !line.includes('.'))) {
        // Save previous slide
        if (currentSlide) {
          slides.push({
            title: currentSlide.title,
            content: currentSlide.content.join('\n'),
            order: slides.length + 1,
          });
        }

        // Start new slide
        currentSlide = {
          title: line
            .replace(/^#+\s+/, '')
            .replace(/^Slide\s+\d+[:\-]\s*/, '')
            .replace(/^\d+\.\s+/, ''),
          content: [],
        };
      } else if (currentSlide && line.length > 0) {
        currentSlide.content.push(line);
      }
    }

    // Add last slide
    if (currentSlide) {
      slides.push({
        title: currentSlide.title,
        content: currentSlide.content.join('\n'),
        order: slides.length + 1,
      });
    }

    // If no slides found, create a single slide from content
    if (slides.length === 0) {
      slides.push({
        title: 'Learning Content',
        content: fallbackContent.substring(0, 500),
        order: 1,
      });
    }

    return slides;
  }
}

// Singleton instance
export const slideGeneratorService = new SlideGeneratorService();
