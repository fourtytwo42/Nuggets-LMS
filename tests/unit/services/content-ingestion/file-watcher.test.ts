import { FileWatcherService } from '@/services/content-ingestion/file-watcher';
import { prisma } from '@/lib/prisma';
import { ingestionQueue } from '@/services/jobs/queues';

// Mock chokidar before importing
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
    mockWatch, // Export for test assertions
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

describe('FileWatcherService', () => {
  let service: FileWatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    chokidar.default.watch.mockReturnValue(mockWatcher);
    service = new FileWatcherService();
  });

  afterEach(async () => {
    await service.stopAllWatchers();
  });

  describe('watchFolder', () => {
    const mockFolder = {
      id: 'folder-id',
      organizationId: 'org-id',
      path: '/test/path',
      enabled: true,
      fileTypes: ['pdf', 'docx'],
      recursive: true,
      autoProcess: true,
    };

    it('should start watching a folder', async () => {
      await service.watchFolder(mockFolder.id, mockFolder as any);

      expect(chokidar.default.watch).toHaveBeenCalledWith(
        mockFolder.path,
        expect.objectContaining({
          awaitWriteFinish: expect.any(Object),
        })
      );
    });

    it('should set up event handlers', async () => {
      await service.watchFolder(mockFolder.id, mockFolder as any);

      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('stopWatching', () => {
    it('should stop watching a folder', async () => {
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
      await service.stopWatching(mockFolder.id);

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('initializeWatchers', () => {
    it('should initialize watchers for all enabled folders', async () => {
      const mockFolders = [
        {
          id: 'folder-1',
          organizationId: 'org-id',
          path: '/path/1',
          enabled: true,
          fileTypes: ['pdf'],
          recursive: true,
          autoProcess: true,
        },
        {
          id: 'folder-2',
          organizationId: 'org-id',
          path: '/path/2',
          enabled: true,
          fileTypes: ['docx'],
          recursive: false,
          autoProcess: true,
        },
      ];

      (prisma.watchedFolder.findMany as jest.Mock).mockResolvedValue(mockFolders);

      await service.initializeWatchers();

      expect(chokidar.default.watch).toHaveBeenCalledTimes(2);
    });
  });
});
