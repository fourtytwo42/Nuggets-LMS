import { prisma } from '@/lib/prisma';
import { ingestionQueue } from '@/services/jobs/queues';
import logger from '@/lib/logger';
import type { MonitoredURL } from '@prisma/client';
import * as cheerio from 'cheerio';

/**
 * URL monitor service for automatic content ingestion from web pages
 */
export class URLMonitorService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start monitoring a URL
   */
  async startMonitoring(urlId: string, monitoredUrl: MonitoredURL): Promise<void> {
    // Stop existing monitor if any
    await this.stopMonitoring(urlId);

    if (!monitoredUrl.enabled) {
      logger.info('URL monitoring disabled', { urlId, url: monitoredUrl.url });
      return;
    }

    // Initial fetch
    await this.checkAndProcessURL(monitoredUrl);

    // Set up periodic checking
    const interval = setInterval(
      async () => {
        await this.checkAndProcessURL(monitoredUrl);
      },
      monitoredUrl.checkInterval * 1000 // Convert seconds to milliseconds
    );

    this.intervals.set(urlId, interval);
    logger.info('Started monitoring URL', { urlId, url: monitoredUrl.url });
  }

  /**
   * Stop monitoring a URL
   */
  async stopMonitoring(urlId: string): Promise<void> {
    const interval = this.intervals.get(urlId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(urlId);
      logger.info('Stopped monitoring URL', { urlId });
    }
  }

  /**
   * Check URL for changes and process if needed
   */
  private async checkAndProcessURL(monitoredUrl: MonitoredURL): Promise<void> {
    try {
      const response = await fetch(monitoredUrl.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NuggetsLMS/1.0)',
        },
      });

      if (!response.ok) {
        logger.warn('URL check failed', {
          urlId: monitoredUrl.id,
          url: monitoredUrl.url,
          status: response.status,
        });
        return;
      }

      const html = await response.text();
      const content = this.extractContent(html, monitoredUrl);

      // Check if content has changed (simple hash comparison)
      const contentHash = this.hashContent(content);

      if (monitoredUrl.lastContentHash && monitoredUrl.lastContentHash === contentHash) {
        logger.debug('URL content unchanged', { urlId: monitoredUrl.id });
        return;
      }

      // Update last content hash
      await prisma.monitoredURL.update({
        where: { id: monitoredUrl.id },
        data: {
          lastContentHash: contentHash,
          lastChecked: new Date(),
        },
      });

      // Queue for processing if auto-process is enabled
      if (monitoredUrl.autoProcess) {
        await this.queueURLForProcessing(monitoredUrl, content);
      }
    } catch (error) {
      logger.error('Error checking URL', {
        error: error instanceof Error ? error.message : String(error),
        urlId: monitoredUrl.id,
        url: monitoredUrl.url,
      });
    }
  }

  /**
   * Extract content from HTML based on selector
   */
  private extractContent(html: string, monitoredUrl: MonitoredURL): string {
    if (monitoredUrl.contentSelector) {
      const $ = cheerio.load(html);
      const selectedContent = $(monitoredUrl.contentSelector).text();
      return selectedContent.trim();
    }
    // If no selector, extract text from body
    const $ = cheerio.load(html);
    return $('body').text().trim();
  }

  /**
   * Simple hash function for content comparison
   */
  private hashContent(content: string): string {
    // Simple hash - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Queue URL content for processing
   */
  private async queueURLForProcessing(monitoredUrl: MonitoredURL, content: string): Promise<void> {
    try {
      await ingestionQueue.add(
        'process-url',
        {
          type: 'url',
          source: monitoredUrl.url,
          organizationId: monitoredUrl.organizationId,
          metadata: {
            urlId: monitoredUrl.id,
            content: content.substring(0, 1000), // Store first 1000 chars for reference
          },
        },
        {
          priority: 1,
        }
      );

      logger.info('Queued URL for processing', {
        urlId: monitoredUrl.id,
        url: monitoredUrl.url,
      });
    } catch (error) {
      logger.error('Failed to queue URL for processing', {
        error: error instanceof Error ? error.message : String(error),
        urlId: monitoredUrl.id,
      });
    }
  }

  /**
   * Initialize monitors for all enabled URLs
   */
  async initializeMonitors(): Promise<void> {
    const urls = await prisma.monitoredURL.findMany({
      where: { enabled: true },
    });

    for (const url of urls) {
      await this.startMonitoring(url.id, url);
    }

    logger.info('Initialized URL monitors', { count: urls.length });
  }

  /**
   * Stop all monitors
   */
  async stopAllMonitors(): Promise<void> {
    const urlIds = Array.from(this.intervals.keys());
    await Promise.all(urlIds.map((id) => this.stopMonitoring(id)));
  }
}

// Singleton instance
export const urlMonitorService = new URLMonitorService();
