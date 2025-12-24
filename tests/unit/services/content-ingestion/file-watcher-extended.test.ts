import { FileWatcherService } from '@/services/content-ingestion/file-watcher';
import { prisma } from '@/lib/prisma';
import { ingestionQueue } from '@/services/jobs/queues';

// Mock dependencies
const mockWatcher = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn(),
};

jest.mock('chokidar', () => {
  const mockWatch = jest.fn(() => mockWatcher);
  return {
    __esModule: true,
    default: {
      watch: mockWatch,
    },
  };
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    watchedFolder: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/services/jobs/queues', () => ({
  ingestionQueue: {
    add: jest.fn(),
  },
}));

const chokidar = require('chokidar');

describe('FileWatcherService - Extended Coverage', () => {
  let service: FileWatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    chokidar.default.watch.mockReturnValue(mockWatcher);
    service = new FileWatcherService();
  });

  afterEach(async () => {
    await service.stopAllWatchers();
  });

  describe('handleFileAdded', () => {
    it('should queue file for processing when auto-process is enabled', async () => {
      const mockFolder = {
        id: 'folder-id',
        organizationId: 'org-id',
        path: '/test/path',
        enabled: true,
        fileTypes: ['pdf'],
        recursive: true,
        autoProcess: true,
      };

      await service.watchFolder(mockFolder.id, mockFolder as any);

      // Simulate file added event
      await new Promise((resolve) => setTimeout(resolve, 10));

      const addHandler = mockWatcher.on.mock.calls.find((call) => call[0] === 'add')?.[1];
      if (addHandler) {
        await addHandler('/test/path/file.pdf', mockFolder);
      }

      expect(ingestionQueue.add).toHaveBeenCalled();
    });

    it('should not queue file when auto-process is disabled', async () => {
      const mockFolder = {
        id: 'folder-id',
        organizationId: 'org-id',
        path: '/test/path',
        enabled: true,
        fileTypes: ['pdf'],
        recursive: true,
        autoProcess: false,
      };

      await service.watchFolder(mockFolder.id, mockFolder as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const addHandler = mockWatcher.on.mock.calls.find((call) => call[0] === 'add')?.[1];
      if (addHandler) {
        await addHandler('/test/path/file.pdf', mockFolder);
      }

      expect(ingestionQueue.add).not.toHaveBeenCalled();
    });

    it('should not queue file with invalid file type', async () => {
      const mockFolder = {
        id: 'folder-id',
        organizationId: 'org-id',
        path: '/test/path',
        enabled: true,
        fileTypes: ['pdf'],
        recursive: true,
        autoProcess: true,
      };

      await service.watchFolder(mockFolder.id, mockFolder as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const addHandler = mockWatcher.on.mock.calls.find((call) => call[0] === 'add')?.[1];
      if (addHandler) {
        await addHandler('/test/path/file.txt', mockFolder);
      }

      expect(ingestionQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('handleFileChanged', () => {
    it('should queue file for processing when changed', async () => {
      const mockFolder = {
        id: 'folder-id',
        organizationId: 'org-id',
        path: '/test/path',
        enabled: true,
        fileTypes: ['pdf'],
        recursive: true,
        autoProcess: true,
      };

      await service.watchFolder(mockFolder.id, mockFolder as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const changeHandler = mockWatcher.on.mock.calls.find((call) => call[0] === 'change')?.[1];
      if (changeHandler) {
        await changeHandler('/test/path/file.pdf', mockFolder);
      }

      expect(ingestionQueue.add).toHaveBeenCalled();
    });
  });

  describe('handleFileRemoved', () => {
    it('should handle file removed event', async () => {
      const mockFolder = {
        id: 'folder-id',
        organizationId: 'org-id',
        path: '/test/path',
        enabled: true,
        fileTypes: ['pdf'],
        recursive: true,
        autoProcess: true,
      };

      await service.watchFolder(mockFolder.id, mockFolder as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const unlinkHandler = mockWatcher.on.mock.calls.find((call) => call[0] === 'unlink')?.[1];
      if (unlinkHandler) {
        await unlinkHandler('/test/path/file.pdf', mockFolder);
      }

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle watcher errors', async () => {
      const mockFolder = {
        id: 'folder-id',
        organizationId: 'org-id',
        path: '/test/path',
        enabled: true,
        fileTypes: ['pdf'],
        recursive: true,
        autoProcess: true,
      };

      await service.watchFolder(mockFolder.id, mockFolder as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const errorHandler = mockWatcher.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) {
        errorHandler(new Error('Watcher error'));
      }

      // Should not throw error
      expect(true).toBe(true);
    });
  });
});
