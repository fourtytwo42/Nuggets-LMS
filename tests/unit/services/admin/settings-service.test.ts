import { SettingsService } from '@/services/admin/settings-service';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    voiceConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    aIModelConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = new SettingsService();
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return default settings when none exist', async () => {
      (prisma.voiceConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.aIModelConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue(null);

      const settings = await service.getSettings();

      expect(settings).toHaveProperty('voice');
      expect(settings).toHaveProperty('aiModels');
      expect(settings).toHaveProperty('contentProcessing');
      expect(settings.voice.ttsProvider).toBe('openai-standard');
      expect(settings.aiModels.contentGenerationModel).toBe('gemini-3.0-pro');
    });

    it('should return existing settings when they exist', async () => {
      const mockVoiceConfig = {
        ttsProvider: 'elevenlabs',
        ttsModel: 'tts-1',
        ttsVoice: 'alloy',
        sttProvider: 'openai-whisper',
        sttModel: 'whisper-1',
        qualityTier: 'high',
      };

      const mockAIModelConfig = {
        contentGenerationModel: 'gemini-3.0-flash',
        narrativePlanningModel: 'gemini-3.0-pro',
        tutoringModel: 'gemini-3.0-pro',
        metadataModel: 'gemini-3.0-flash',
        embeddingModel: 'text-embedding-004',
        contentGenerationTemp: 0.8,
        narrativePlanningTemp: 0.9,
        tutoringTemp: 0.8,
      };

      (prisma.voiceConfig.findUnique as jest.Mock).mockResolvedValue(mockVoiceConfig);
      (prisma.aIModelConfig.findUnique as jest.Mock).mockResolvedValue(mockAIModelConfig);
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue(null);

      const settings = await service.getSettings();

      expect(settings.voice.ttsProvider).toBe('elevenlabs');
      expect(settings.voice.qualityTier).toBe('high');
      expect(settings.aiModels.contentGenerationModel).toBe('gemini-3.0-flash');
    });
  });

  describe('updateSettings', () => {
    it('should update voice settings', async () => {
      (prisma.voiceConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.aIModelConfig.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.voiceConfig.upsert as jest.Mock).mockResolvedValue({});
      (prisma.aIModelConfig.upsert as jest.Mock).mockResolvedValue({});
      (prisma.systemSetting.upsert as jest.Mock).mockResolvedValue({});

      const updated = await service.updateSettings({
        voice: {
          ttsProvider: 'openai-hd',
          qualityTier: 'mid',
        },
      });

      expect(prisma.voiceConfig.upsert).toHaveBeenCalled();
      expect(updated.voice.ttsProvider).toBe('openai-hd');
    });

    it('should validate temperature range', async () => {
      await expect(
        service.updateSettings({
          aiModels: {
            tutoringTemp: 3.0, // Invalid: > 2.0
          },
        })
      ).rejects.toThrow();
    });

    it('should validate voice provider', async () => {
      await expect(
        service.updateSettings({
          voice: {
            ttsProvider: 'invalid-provider' as any,
          },
        })
      ).rejects.toThrow();
    });
  });
});
