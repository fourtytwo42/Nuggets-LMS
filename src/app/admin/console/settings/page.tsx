'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface SystemSettings {
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getToken();
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateVoiceSetting = (key: string, value: string | null) => {
    if (!settings) return;
    setSettings({
      ...settings,
      voice: {
        ...settings.voice,
        [key]: value,
      },
    });
  };

  const updateAIModelSetting = (key: string, value: string | number | null) => {
    if (!settings) return;
    setSettings({
      ...settings,
      aiModels: {
        ...settings.aiModels,
        [key]: value,
      },
    });
  };

  const updateContentProcessingSetting = (
    section: 'chunking' | 'imageGeneration',
    key: string,
    value: string | number
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      contentProcessing: {
        ...settings.contentProcessing,
        [section]: {
          ...settings.contentProcessing[section],
          [key]: value,
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!settings && !error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No settings found. Loading defaults...</p>
        </div>
      </div>
    );
  }

  if (!settings && error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 mb-2">Failed to load settings. Please try again.</p>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <Button onClick={fetchSettings}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 space-y-8">
        {/* Voice Configuration */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TTS Provider</label>
              <Select
                value={settings.voice.ttsProvider}
                onChange={(e) => updateVoiceSetting('ttsProvider', e.target.value)}
              >
                <option value="openai-standard">OpenAI Standard</option>
                <option value="openai-hd">OpenAI HD</option>
                <option value="elevenlabs">ElevenLabs</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TTS Model</label>
              <Input
                value={settings.voice.ttsModel || ''}
                onChange={(e) => updateVoiceSetting('ttsModel', e.target.value || null)}
                placeholder="e.g., tts-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TTS Voice</label>
              <Input
                value={settings.voice.ttsVoice || ''}
                onChange={(e) => updateVoiceSetting('ttsVoice', e.target.value || null)}
                placeholder="e.g., alloy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">STT Provider</label>
              <Select
                value={settings.voice.sttProvider}
                onChange={(e) => updateVoiceSetting('sttProvider', e.target.value)}
              >
                <option value="openai-whisper">OpenAI Whisper</option>
                <option value="elevenlabs">ElevenLabs</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">STT Model</label>
              <Input
                value={settings.voice.sttModel || ''}
                onChange={(e) => updateVoiceSetting('sttModel', e.target.value || null)}
                placeholder="e.g., whisper-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quality Tier</label>
              <Select
                value={settings.voice.qualityTier}
                onChange={(e) => updateVoiceSetting('qualityTier', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>
        </div>

        {/* AI Model Configuration */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Model Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Generation Model
              </label>
              <Input
                value={settings.aiModels.contentGenerationModel}
                onChange={(e) => updateAIModelSetting('contentGenerationModel', e.target.value)}
                placeholder="e.g., gemini-3.0-pro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Generation Temperature
              </label>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={settings.aiModels.contentGenerationTemp ?? 0.7}
                onChange={(e) =>
                  updateAIModelSetting('contentGenerationTemp', parseFloat(e.target.value) || null)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Narrative Planning Model
              </label>
              <Input
                value={settings.aiModels.narrativePlanningModel}
                onChange={(e) => updateAIModelSetting('narrativePlanningModel', e.target.value)}
                placeholder="e.g., gemini-3.0-pro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Narrative Planning Temperature
              </label>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={settings.aiModels.narrativePlanningTemp ?? 0.8}
                onChange={(e) =>
                  updateAIModelSetting('narrativePlanningTemp', parseFloat(e.target.value) || null)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tutoring Model</label>
              <Input
                value={settings.aiModels.tutoringModel}
                onChange={(e) => updateAIModelSetting('tutoringModel', e.target.value)}
                placeholder="e.g., gemini-3.0-pro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tutoring Temperature
              </label>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={settings.aiModels.tutoringTemp ?? 0.7}
                onChange={(e) =>
                  updateAIModelSetting('tutoringTemp', parseFloat(e.target.value) || null)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metadata Model</label>
              <Input
                value={settings.aiModels.metadataModel}
                onChange={(e) => updateAIModelSetting('metadataModel', e.target.value)}
                placeholder="e.g., gemini-3.0-flash"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Embedding Model
              </label>
              <Input
                value={settings.aiModels.embeddingModel}
                onChange={(e) => updateAIModelSetting('embeddingModel', e.target.value)}
                placeholder="e.g., text-embedding-004"
              />
            </div>
          </div>
        </div>

        {/* Content Processing Settings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Processing</h2>

          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3">Chunking Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                <Input
                  type="number"
                  min="100"
                  max="10000"
                  value={settings.contentProcessing.chunking.maxTokens}
                  onChange={(e) =>
                    updateContentProcessingSetting(
                      'chunking',
                      'maxTokens',
                      parseInt(e.target.value) || 2000
                    )
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overlap Percent
                </label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={settings.contentProcessing.chunking.overlapPercent}
                  onChange={(e) =>
                    updateContentProcessingSetting(
                      'chunking',
                      'overlapPercent',
                      parseInt(e.target.value) || 15
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-800 mb-3">Image Generation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <Select
                  value={settings.contentProcessing.imageGeneration.model}
                  onChange={(e) =>
                    updateContentProcessingSetting('imageGeneration', 'model', e.target.value)
                  }
                >
                  <option value="dall-e-2">DALL-E 2</option>
                  <option value="dall-e-3">DALL-E 3</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <Select
                  value={settings.contentProcessing.imageGeneration.size}
                  onChange={(e) =>
                    updateContentProcessingSetting('imageGeneration', 'size', e.target.value)
                  }
                >
                  <option value="256x256">256x256</option>
                  <option value="512x512">512x512</option>
                  <option value="1024x1024">1024x1024</option>
                  <option value="1792x1024">1792x1024</option>
                  <option value="1024x1792">1024x1792</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
                <Select
                  value={settings.contentProcessing.imageGeneration.quality}
                  onChange={(e) =>
                    updateContentProcessingSetting('imageGeneration', 'quality', e.target.value)
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD</option>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
