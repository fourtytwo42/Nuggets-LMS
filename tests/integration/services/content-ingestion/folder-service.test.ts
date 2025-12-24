import { FolderService } from '@/services/content-ingestion/folder-service';
import { prisma } from '@/lib/prisma';
import { fileWatcherService } from '@/services/content-ingestion/file-watcher';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    watchedFolder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/services/content-ingestion/file-watcher', () => ({
  fileWatcherService: {
    watchFolder: jest.fn(),
    stopWatching: jest.fn(),
  },
}));

describe('FolderService', () => {
  let service: FolderService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FolderService();
  });

  describe('createFolder', () => {
    it('should create a watched folder', async () => {
      const input = {
        organizationId: 'org-id',
        path: '/test/path',
        enabled: true,
        fileTypes: ['pdf', 'docx'],
        recursive: true,
        autoProcess: true,
      };

      const mockFolder = {
        id: 'folder-id',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.watchedFolder.create as jest.Mock).mockResolvedValue(mockFolder);

      const result = await service.createFolder(input);

      expect(prisma.watchedFolder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: input.organizationId,
          path: input.path,
        }),
      });
      expect(result.id).toBe(mockFolder.id);
      expect(fileWatcherService.watchFolder).toHaveBeenCalledWith(mockFolder.id, mockFolder);
    });
  });

  describe('getFolders', () => {
    it('should get all folders for organization', async () => {
      const mockFolders = [
        { id: 'folder-1', organizationId: 'org-id', path: '/path/1' },
        { id: 'folder-2', organizationId: 'org-id', path: '/path/2' },
      ];

      (prisma.watchedFolder.findMany as jest.Mock).mockResolvedValue(mockFolders);

      const result = await service.getFolders('org-id');

      expect(prisma.watchedFolder.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-id' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockFolders);
    });
  });

  describe('updateFolder', () => {
    it('should update a folder', async () => {
      const mockFolder = {
        id: 'folder-id',
        organizationId: 'org-id',
        path: '/test/path',
        enabled: true,
      };

      const updatedFolder = {
        ...mockFolder,
        enabled: false,
      };

      (prisma.watchedFolder.findFirstOrThrow as jest.Mock).mockResolvedValue(mockFolder);
      (prisma.watchedFolder.update as jest.Mock).mockResolvedValue(updatedFolder);

      const result = await service.updateFolder('folder-id', 'org-id', { enabled: false });

      expect(prisma.watchedFolder.update).toHaveBeenCalled();
      expect(fileWatcherService.stopWatching).toHaveBeenCalledWith('folder-id');
    });
  });

  describe('deleteFolder', () => {
    it('should delete a folder', async () => {
      await service.deleteFolder('folder-id', 'org-id');

      expect(fileWatcherService.stopWatching).toHaveBeenCalledWith('folder-id');
      expect(prisma.watchedFolder.delete).toHaveBeenCalledWith({
        where: {
          id: 'folder-id',
          organizationId: 'org-id',
        },
      });
    });
  });
});
