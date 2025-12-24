import { URLMonitorService } from '@/services/content-ingestion/url-monitor';
import { prisma } from '@/lib/prisma';
import { ingestionQueue } from '@/services/jobs/queues';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    monitoredURL: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/services/jobs/queues', () => ({
  ingestionQueue: {
    add: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock cheerio
const createCheerioMock = () => {
  const mockText = jest.fn(() => 'Mocked content');
  const mockRemove = jest.fn().mockReturnThis();

  const cheerioInstance = jest.fn((selector: string) => {
    if (selector === 'script, style') {
      return { remove: mockRemove };
    }
    return { text: mockText };
  }) as any;

  cheerioInstance.text = mockText;
  cheerioInstance.remove = mockRemove;

  return cheerioInstance;
};

jest.mock('cheerio', () => ({
  load: jest.fn(() => createCheerioMock()),
}));

describe('URLMonitorService - Extended Coverage', () => {
  let service: URLMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new URLMonitorService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkAndProcessURL', () => {
    it('should process URL when content has changed', async () => {
      const mockURL = {
        id: 'url-id',
        organizationId: 'org-id',
        url: 'https://example.com',
        enabled: true,
        checkInterval: 60,
        contentSelector: null,
        autoProcess: true,
        lastContentHash: 'old-hash',
        lastChecked: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('<html><body>New content</body></html>'),
      });

      (prisma.monitoredURL.update as jest.Mock).mockResolvedValue(mockURL);

      // Mock hashContent to return different hash
      const hashSpy = jest.spyOn(URLMonitorService.prototype as any, 'hashContent');
      hashSpy.mockReturnValue('new-hash');

      await service['checkAndProcessURL'](mockURL as any);

      expect(prisma.monitoredURL.update).toHaveBeenCalled();
      expect(ingestionQueue.add).toHaveBeenCalled();

      hashSpy.mockRestore();
    });

    it('should not process URL when content unchanged', async () => {
      const mockURL = {
        id: 'url-id',
        organizationId: 'org-id',
        url: 'https://example.com',
        enabled: true,
        checkInterval: 60,
        contentSelector: null,
        autoProcess: true,
        lastContentHash: 'test-hash',
        lastChecked: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('test content'),
      });

      // Mock hashContent to return same hash by spying
      const hashSpy = jest.spyOn(URLMonitorService.prototype as any, 'hashContent');
      hashSpy.mockReturnValue('test-hash');

      await service['checkAndProcessURL'](mockURL as any);

      expect(ingestionQueue.add).not.toHaveBeenCalled();

      hashSpy.mockRestore();
    });

    it('should handle fetch errors gracefully', async () => {
      const mockURL = {
        id: 'url-id',
        organizationId: 'org-id',
        url: 'https://example.com',
        enabled: true,
        checkInterval: 60,
        contentSelector: null,
        autoProcess: true,
        lastContentHash: null,
        lastChecked: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service['checkAndProcessURL'](mockURL as any)).resolves.not.toThrow();
    });

    it('should handle non-OK responses', async () => {
      const mockURL = {
        id: 'url-id',
        organizationId: 'org-id',
        url: 'https://example.com',
        enabled: true,
        checkInterval: 60,
        contentSelector: null,
        autoProcess: true,
        lastContentHash: null,
        lastChecked: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await service['checkAndProcessURL'](mockURL as any);

      expect(prisma.monitoredURL.update).not.toHaveBeenCalled();
    });

    it('should extract content with CSS selector', async () => {
      const mockURL = {
        id: 'url-id',
        organizationId: 'org-id',
        url: 'https://example.com',
        enabled: true,
        checkInterval: 60,
        contentSelector: '.content',
        autoProcess: true,
        lastContentHash: null,
        lastChecked: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest
          .fn()
          .mockResolvedValue('<html><body><div class="content">Selected</div></body></html>'),
      });

      await service['checkAndProcessURL'](mockURL as any);

      const cheerio = require('cheerio');
      expect(cheerio.load).toHaveBeenCalled();
    });
  });

  describe('hashContent', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'Test content';
      const hash1 = service['hashContent'](content);
      const hash2 = service['hashContent'](content);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different content', () => {
      const hash1 = service['hashContent']('Content 1');
      const hash2 = service['hashContent']('Content 2');

      expect(hash1).not.toBe(hash2);
    });
  });
});
