import chokidar, { type FSWatcher } from 'chokidar';
import { prisma } from '@/lib/prisma';
import { ingestionQueue } from '@/services/jobs/queues';
import logger from '@/lib/logger';
import type { WatchedFolder } from '@prisma/client';

/**
 * File watcher service for automatic content ingestion
 */
export class FileWatcherService {
  private watchers: Map<string, FSWatcher> = new Map();

  /**
   * Start watching a folder
   */
  async watchFolder(folderId: string, folder: WatchedFolder): Promise<void> {
    // Stop existing watcher if any
    await this.stopWatching(folderId);

    const watchOptions: Parameters<typeof chokidar.watch>[1] = {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: false, // Process existing files
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    };

    // Chokidar watches recursively by default, use depth to limit
    if (!folder.recursive) {
      watchOptions.depth = 0;
    }

    const watcher = chokidar.watch(folder.path, watchOptions);

    watcher
      .on('add', async (filePath) => {
        await this.handleFileAdded(filePath, folder);
      })
      .on('change', async (filePath) => {
        await this.handleFileChanged(filePath, folder);
      })
      .on('unlink', async (filePath) => {
        await this.handleFileRemoved(filePath, folder);
      })
      .on('error', (error) => {
        logger.error('File watcher error', {
          error: error instanceof Error ? error.message : String(error),
          folderId,
          path: folder.path,
        });
      });

    this.watchers.set(folderId, watcher);
    logger.info('Started watching folder', { folderId, path: folder.path });
  }

  /**
   * Stop watching a folder
   */
  async stopWatching(folderId: string): Promise<void> {
    const watcher = this.watchers.get(folderId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(folderId);
      logger.info('Stopped watching folder', { folderId });
    }
  }

  /**
   * Handle file added event
   */
  private async handleFileAdded(filePath: string, folder: WatchedFolder): Promise<void> {
    if (!this.isValidFileType(filePath, folder.fileTypes)) {
      return;
    }

    if (!folder.autoProcess) {
      logger.info('File detected but auto-process disabled', { filePath, folderId: folder.id });
      return;
    }

    await this.queueFileForProcessing(filePath, folder);
  }

  /**
   * Handle file changed event
   */
  private async handleFileChanged(filePath: string, folder: WatchedFolder): Promise<void> {
    if (!this.isValidFileType(filePath, folder.fileTypes)) {
      return;
    }

    if (!folder.autoProcess) {
      return;
    }

    await this.queueFileForProcessing(filePath, folder);
  }

  /**
   * Handle file removed event
   */
  private async handleFileRemoved(filePath: string, folder: WatchedFolder): Promise<void> {
    logger.info('File removed from watched folder', { filePath, folderId: folder.id });
    // Could implement cleanup logic here if needed
  }

  /**
   * Check if file type is valid for this folder
   */
  private isValidFileType(filePath: string, allowedTypes: string[]): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (!extension) {
      return false;
    }
    return allowedTypes.includes(extension);
  }

  /**
   * Queue file for processing
   */
  private async queueFileForProcessing(filePath: string, folder: WatchedFolder): Promise<void> {
    try {
      await ingestionQueue.add(
        'process-file',
        {
          type: 'file',
          source: filePath,
          organizationId: folder.organizationId,
          metadata: {
            folderId: folder.id,
            fileName: filePath.split('/').pop(),
          },
        },
        {
          priority: 1,
        }
      );

      logger.info('Queued file for processing', { filePath, folderId: folder.id });
    } catch (error) {
      logger.error('Failed to queue file for processing', {
        error: error instanceof Error ? error.message : String(error),
        filePath,
        folderId: folder.id,
      });
    }
  }

  /**
   * Initialize watchers for all enabled folders
   */
  async initializeWatchers(): Promise<void> {
    const folders = await prisma.watchedFolder.findMany({
      where: { enabled: true },
    });

    for (const folder of folders) {
      await this.watchFolder(folder.id, folder);
    }

    logger.info('Initialized file watchers', { count: folders.length });
  }

  /**
   * Stop all watchers
   */
  async stopAllWatchers(): Promise<void> {
    const folderIds = Array.from(this.watchers.keys());
    await Promise.all(folderIds.map((id) => this.stopWatching(id)));
  }
}

// Singleton instance
export const fileWatcherService = new FileWatcherService();
