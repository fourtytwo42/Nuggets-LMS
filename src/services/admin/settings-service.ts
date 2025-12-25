import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

/**
 * Settings structure matching API spec
 */
export interface SystemSettings {
  voice: {
    ttsProvider: string;
    ttsModel: string | null;
    ttsVoice: string | null;
    sttProvider: string;
    sttModel: string | null;
    qualityTier: string;
  };
  aiModels: {
    contentGenerationModel: string;
    narrativePlanningModel: string;
    tutoringModel: string;
    metadataModel: string;
    embeddingModel: string;
    contentGenerationTemp: number | null;
    narrativePlanningTemp: number | null;
    tutoringTemp: number | null;
  };
  contentProcessing: {
    chunking: {
      maxTokens: number;
      overlapPercent: number;
    };
    imageGeneration: {
      model: string;
      size: string;
      quality: string;
    };
  };
}

/**
 * Partial settings for updates
 */
export type PartialSystemSettings = Partial<SystemSettings>;

/**
 * Validation schemas
 */
const voiceConfigSchema = z.object({
  ttsProvider: z.enum(['openai-standard', 'openai-hd', 'elevenlabs']).optional(),
  ttsModel: z.string().nullable().optional(),
  ttsVoice: z.string().nullable().optional(),
  sttProvider: z.enum(['openai-whisper', 'elevenlabs']).optional(),
  sttModel: z.string().nullable().optional(),
  qualityTier: z.enum(['low', 'mid', 'high']).optional(),
});

const aiModelsSchema = z.object({
  contentGenerationModel: z.string().optional(),
  narrativePlanningModel: z.string().optional(),
  tutoringModel: z.string().optional(),
  metadataModel: z.string().optional(),
  embeddingModel: z.string().optional(),
  contentGenerationTemp: z.number().min(0).max(2).nullable().optional(),
  narrativePlanningTemp: z.number().min(0).max(2).nullable().optional(),
  tutoringTemp: z.number().min(0).max(2).nullable().optional(),
});

const contentProcessingSchema = z.object({
  chunking: z
    .object({
      maxTokens: z.number().min(100).max(10000).optional(),
      overlapPercent: z.number().min(0).max(50).optional(),
    })
    .optional(),
  imageGeneration: z
    .object({
      model: z.enum(['dall-e-2', 'dall-e-3']).optional(),
      size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).optional(),
      quality: z.enum(['standard', 'hd']).optional(),
    })
    .optional(),
});

const settingsUpdateSchema = z.object({
  voice: voiceConfigSchema.optional(),
  aiModels: aiModelsSchema.optional(),
  contentProcessing: contentProcessingSchema.optional(),
});

/**
 * Settings service for managing system settings
 */
export class SettingsService {
  private readonly SYSTEM_SCOPE = 'system';

  /**
   * Get all system settings
   */
  async getSettings(): Promise<SystemSettings> {
    try {
      // Get voice config - use findFirst for system scope since scopeId is null
      const voiceConfig = await prisma.voiceConfig.findFirst({
        where: {
          scope: this.SYSTEM_SCOPE,
          scopeId: null,
        },
      });

      // Get AI model config - use findFirst for system scope since scopeId is null
      const aiModelConfig = await prisma.aIModelConfig.findFirst({
        where: {
          scope: this.SYSTEM_SCOPE,
          scopeId: null,
        },
      });

      // Get content processing settings from SystemSetting
      const contentProcessingSetting = await prisma.systemSetting.findUnique({
        where: { key: 'contentProcessing' },
      });

      // Default content processing settings
      const defaultContentProcessing = {
        chunking: {
          maxTokens: 2000,
          overlapPercent: 15,
        },
        imageGeneration: {
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
        },
      };

      const contentProcessing = contentProcessingSetting
        ? (contentProcessingSetting.value as SystemSettings['contentProcessing'])
        : defaultContentProcessing;

      // Build response
      return {
        voice: {
          ttsProvider: voiceConfig?.ttsProvider || 'openai-standard',
          ttsModel: voiceConfig?.ttsModel || null,
          ttsVoice: voiceConfig?.ttsVoice || null,
          sttProvider: voiceConfig?.sttProvider || 'openai-whisper',
          sttModel: voiceConfig?.sttModel || null,
          qualityTier: voiceConfig?.qualityTier || 'low',
        },
        aiModels: {
          contentGenerationModel: aiModelConfig?.contentGenerationModel || 'gemini-3.0-pro',
          narrativePlanningModel: aiModelConfig?.narrativePlanningModel || 'gemini-3.0-pro',
          tutoringModel: aiModelConfig?.tutoringModel || 'gemini-3.0-pro',
          metadataModel: aiModelConfig?.metadataModel || 'gemini-3.0-flash',
          embeddingModel: aiModelConfig?.embeddingModel || 'text-embedding-004',
          contentGenerationTemp: aiModelConfig?.contentGenerationTemp ?? 0.7,
          narrativePlanningTemp: aiModelConfig?.narrativePlanningTemp ?? 0.8,
          tutoringTemp: aiModelConfig?.tutoringTemp ?? 0.7,
        },
        contentProcessing,
      };
    } catch (error) {
      logger.error('Error getting settings', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update system settings
   */
  async updateSettings(partialSettings: PartialSystemSettings): Promise<SystemSettings> {
    try {
      // Validate input
      const validated = settingsUpdateSchema.parse(partialSettings);

      // Update voice config if provided
      if (validated.voice) {
        const existingVoiceConfig = await prisma.voiceConfig.findFirst({
          where: {
            scope: this.SYSTEM_SCOPE,
            scopeId: null,
          },
        });

        if (existingVoiceConfig) {
          await prisma.voiceConfig.update({
            where: { id: existingVoiceConfig.id },
            data: {
              ...(validated.voice.ttsProvider && { ttsProvider: validated.voice.ttsProvider }),
              ...(validated.voice.ttsModel !== undefined && { ttsModel: validated.voice.ttsModel }),
              ...(validated.voice.ttsVoice !== undefined && { ttsVoice: validated.voice.ttsVoice }),
              ...(validated.voice.sttProvider && { sttProvider: validated.voice.sttProvider }),
              ...(validated.voice.sttModel !== undefined && { sttModel: validated.voice.sttModel }),
              ...(validated.voice.qualityTier && { qualityTier: validated.voice.qualityTier }),
            },
          });
        } else {
          await prisma.voiceConfig.create({
            data: {
              scope: this.SYSTEM_SCOPE,
              scopeId: null,
              ttsProvider: validated.voice.ttsProvider || 'openai-standard',
              ttsModel: validated.voice.ttsModel ?? null,
              ttsVoice: validated.voice.ttsVoice ?? null,
              sttProvider: validated.voice.sttProvider || 'openai-whisper',
              sttModel: validated.voice.sttModel ?? null,
              qualityTier: validated.voice.qualityTier || 'low',
            },
          });
        }
      }

      // Update AI model config if provided
      if (validated.aiModels) {
        const existingAIModelConfig = await prisma.aIModelConfig.findFirst({
          where: {
            scope: this.SYSTEM_SCOPE,
            scopeId: null,
          },
        });

        if (existingAIModelConfig) {
          await prisma.aIModelConfig.update({
            where: { id: existingAIModelConfig.id },
            data: {
              ...(validated.aiModels.contentGenerationModel && {
                contentGenerationModel: validated.aiModels.contentGenerationModel,
              }),
              ...(validated.aiModels.narrativePlanningModel && {
                narrativePlanningModel: validated.aiModels.narrativePlanningModel,
              }),
              ...(validated.aiModels.tutoringModel && {
                tutoringModel: validated.aiModels.tutoringModel,
              }),
              ...(validated.aiModels.metadataModel && {
                metadataModel: validated.aiModels.metadataModel,
              }),
              ...(validated.aiModels.embeddingModel && {
                embeddingModel: validated.aiModels.embeddingModel,
              }),
              ...(validated.aiModels.contentGenerationTemp !== undefined && {
                contentGenerationTemp: validated.aiModels.contentGenerationTemp,
              }),
              ...(validated.aiModels.narrativePlanningTemp !== undefined && {
                narrativePlanningTemp: validated.aiModels.narrativePlanningTemp,
              }),
              ...(validated.aiModels.tutoringTemp !== undefined && {
                tutoringTemp: validated.aiModels.tutoringTemp,
              }),
            },
          });
        } else {
          await prisma.aIModelConfig.create({
            data: {
              scope: this.SYSTEM_SCOPE,
              scopeId: null,
              contentGenerationModel: validated.aiModels.contentGenerationModel || 'gemini-3.0-pro',
              narrativePlanningModel: validated.aiModels.narrativePlanningModel || 'gemini-3.0-pro',
              tutoringModel: validated.aiModels.tutoringModel || 'gemini-3.0-pro',
              metadataModel: validated.aiModels.metadataModel || 'gemini-3.0-flash',
              embeddingModel: validated.aiModels.embeddingModel || 'text-embedding-004',
              contentGenerationTemp: validated.aiModels.contentGenerationTemp ?? 0.7,
              narrativePlanningTemp: validated.aiModels.narrativePlanningTemp ?? 0.8,
              tutoringTemp: validated.aiModels.tutoringTemp ?? 0.7,
            },
          });
        }
      }

      // Update content processing settings if provided
      if (validated.contentProcessing) {
        const currentSettings = await this.getSettings();
        const updatedContentProcessing = {
          ...currentSettings.contentProcessing,
          ...(validated.contentProcessing.chunking && {
            chunking: {
              ...currentSettings.contentProcessing.chunking,
              ...validated.contentProcessing.chunking,
            },
          }),
          ...(validated.contentProcessing.imageGeneration && {
            imageGeneration: {
              ...currentSettings.contentProcessing.imageGeneration,
              ...validated.contentProcessing.imageGeneration,
            },
          }),
        };

        const existingContentProcessing = await prisma.systemSetting.findUnique({
          where: { key: 'contentProcessing' },
        });

        if (existingContentProcessing) {
          await prisma.systemSetting.update({
            where: { key: 'contentProcessing' },
            data: {
              value: updatedContentProcessing as any,
            },
          });
        } else {
          await prisma.systemSetting.create({
            data: {
              key: 'contentProcessing',
              value: updatedContentProcessing as any,
              scope: this.SYSTEM_SCOPE,
              scopeId: null,
            },
          });
        }
      }

      // Return updated settings
      return await this.getSettings();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Settings validation error', { errors: error.issues });
        throw new Error(`Invalid settings: ${error.issues.map((e) => e.message).join(', ')}`);
      }
      logger.error('Error updating settings', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
