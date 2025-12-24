/**
 * Job data types for different job queues
 */

export interface IngestionJobData {
  type: 'file' | 'url';
  source: string;
  organizationId: string;
  metadata?: {
    folderId?: string;
    urlId?: string;
    fileName?: string;
    fileSize?: number;
  };
}

export interface EmbeddingJobData {
  nuggetId: string;
  content: string;
  organizationId: string;
}

export interface SlideGenerationJobData {
  nuggetId: string;
  organizationId: string;
}

export interface AudioGenerationJobData {
  nuggetId: string;
  organizationId: string;
}

export interface NarrativePlanningJobData {
  organizationId: string;
  nuggetIds: string[];
}
