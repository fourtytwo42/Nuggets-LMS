import { prisma } from '@/lib/prisma';
import { fileWatcherService } from './file-watcher';
import logger from '@/lib/logger';
import type { WatchedFolder, Prisma } from '@prisma/client';

export interface CreateWatchedFolderInput {
  organizationId: string;
  path: string;
  enabled?: boolean;
  fileTypes?: string[];
  recursive?: boolean;
  autoProcess?: boolean;
}

export interface UpdateWatchedFolderInput {
  path?: string;
  enabled?: boolean;
  fileTypes?: string[];
  recursive?: boolean;
  autoProcess?: boolean;
}

export class FolderService {
  /**
   * Create a new watched folder
   */
  async createFolder(input: CreateWatchedFolderInput): Promise<WatchedFolder> {
    const folder = await prisma.watchedFolder.create({
      data: {
        organizationId: input.organizationId,
        path: input.path,
        enabled: input.enabled ?? true,
        fileTypes: input.fileTypes ?? ['pdf', 'docx', 'txt'],
        recursive: input.recursive ?? true,
        autoProcess: input.autoProcess ?? true,
      },
    });

    // Start watching if enabled
    if (folder.enabled) {
      await fileWatcherService.watchFolder(folder.id, folder);
    }

    logger.info('Created watched folder', { folderId: folder.id, path: folder.path });
    return folder;
  }

  /**
   * Get all watched folders for an organization
   */
  async getFolders(organizationId: string): Promise<WatchedFolder[]> {
    return prisma.watchedFolder.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a watched folder by ID
   */
  async getFolderById(folderId: string, organizationId: string): Promise<WatchedFolder | null> {
    return prisma.watchedFolder.findFirst({
      where: {
        id: folderId,
        organizationId,
      },
    });
  }

  /**
   * Update a watched folder
   */
  async updateFolder(
    folderId: string,
    organizationId: string,
    input: UpdateWatchedFolderInput
  ): Promise<WatchedFolder> {
    const folder = await prisma.watchedFolder.findFirstOrThrow({
      where: {
        id: folderId,
        organizationId,
      },
    });

    const updated = await prisma.watchedFolder.update({
      where: { id: folderId },
      data: input,
    });

    // Restart watcher if enabled status or path changed
    if (input.enabled !== undefined || input.path !== undefined) {
      if (updated.enabled) {
        await fileWatcherService.watchFolder(updated.id, updated);
      } else {
        await fileWatcherService.stopWatching(updated.id);
      }
    }

    logger.info('Updated watched folder', { folderId, changes: Object.keys(input) });
    return updated;
  }

  /**
   * Delete a watched folder
   */
  async deleteFolder(folderId: string, organizationId: string): Promise<void> {
    // Stop watching first
    await fileWatcherService.stopWatching(folderId);

    await prisma.watchedFolder.delete({
      where: {
        id: folderId,
        organizationId,
      },
    });

    logger.info('Deleted watched folder', { folderId });
  }
}
