import { prisma } from '@/lib/prisma';
import { urlMonitorService } from './url-monitor';
import logger from '@/lib/logger';
import type { MonitoredURL, Prisma } from '@prisma/client';

export interface CreateMonitoredURLInput {
  organizationId: string;
  url: string;
  enabled?: boolean;
  checkInterval?: number;
  contentSelector?: string;
  autoProcess?: boolean;
}

export interface UpdateMonitoredURLInput {
  url?: string;
  enabled?: boolean;
  checkInterval?: number;
  contentSelector?: string;
  autoProcess?: boolean;
}

export class URLService {
  /**
   * Create a new monitored URL
   */
  async createURL(input: CreateMonitoredURLInput): Promise<MonitoredURL> {
    const url = await prisma.monitoredURL.create({
      data: {
        organizationId: input.organizationId,
        url: input.url,
        enabled: input.enabled ?? true,
        checkInterval: input.checkInterval ?? 3600, // Default 1 hour
        contentSelector: input.contentSelector,
        autoProcess: input.autoProcess ?? true,
      },
    });

    // Start monitoring if enabled
    if (url.enabled) {
      await urlMonitorService.startMonitoring(url.id, url);
    }

    logger.info('Created monitored URL', { urlId: url.id, url: url.url });
    return url;
  }

  /**
   * Get all monitored URLs for an organization
   */
  async getURLs(organizationId: string): Promise<MonitoredURL[]> {
    return prisma.monitoredURL.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a monitored URL by ID
   */
  async getURLById(urlId: string, organizationId: string): Promise<MonitoredURL | null> {
    return prisma.monitoredURL.findFirst({
      where: {
        id: urlId,
        organizationId,
      },
    });
  }

  /**
   * Update a monitored URL
   */
  async updateURL(
    urlId: string,
    organizationId: string,
    input: UpdateMonitoredURLInput
  ): Promise<MonitoredURL> {
    const url = await prisma.monitoredURL.findFirstOrThrow({
      where: {
        id: urlId,
        organizationId,
      },
    });

    const updated = await prisma.monitoredURL.update({
      where: { id: urlId },
      data: input,
    });

    // Restart monitor if enabled status or URL changed
    if (input.enabled !== undefined || input.url !== undefined) {
      if (updated.enabled) {
        await urlMonitorService.startMonitoring(updated.id, updated);
      } else {
        await urlMonitorService.stopMonitoring(updated.id);
      }
    }

    logger.info('Updated monitored URL', { urlId, changes: Object.keys(input) });
    return updated;
  }

  /**
   * Delete a monitored URL
   */
  async deleteURL(urlId: string, organizationId: string): Promise<void> {
    // Stop monitoring first
    await urlMonitorService.stopMonitoring(urlId);

    await prisma.monitoredURL.delete({
      where: {
        id: urlId,
        organizationId,
      },
    });

    logger.info('Deleted monitored URL', { urlId });
  }

  /**
   * Manually trigger URL check and processing
   */
  async triggerCheck(urlId: string, organizationId: string): Promise<void> {
    const url = await prisma.monitoredURL.findFirstOrThrow({
      where: {
        id: urlId,
        organizationId,
      },
    });

    // Force check by temporarily clearing lastContentHash
    const urlWithClearedHash = {
      ...url,
      lastContentHash: null,
    };

    await urlMonitorService['checkAndProcessURL'](urlWithClearedHash);
    logger.info('Manually triggered URL check', { urlId });
  }
}
