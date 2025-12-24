import { URLService } from '@/services/content-ingestion/url-service';
import { prisma } from '@/lib/prisma';
import { urlMonitorService } from '@/services/content-ingestion/url-monitor';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    monitoredURL: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/services/content-ingestion/url-monitor', () => ({
  urlMonitorService: {
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    checkAndProcessURL: jest.fn(),
  },
}));

describe('URLService - Extended Coverage', () => {
  let service: URLService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new URLService();
  });

  describe('triggerCheck', () => {
    it('should trigger manual URL check', async () => {
      const mockURL = {
        id: 'url-id',
        organizationId: 'org-id',
        url: 'https://example.com',
        enabled: true,
        checkInterval: 60,
        contentSelector: null,
        autoProcess: true,
        lastContentHash: 'existing-hash',
        lastChecked: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.monitoredURL.findFirstOrThrow as jest.Mock).mockResolvedValue(mockURL);

      await service.triggerCheck('url-id', 'org-id');

      expect(prisma.monitoredURL.findFirstOrThrow).toHaveBeenCalledWith({
        where: {
          id: 'url-id',
          organizationId: 'org-id',
        },
      });
      expect(urlMonitorService['checkAndProcessURL']).toHaveBeenCalled();
    });
  });

  describe('getURLById', () => {
    it('should return URL when found', async () => {
      const mockURL = {
        id: 'url-id',
        organizationId: 'org-id',
        url: 'https://example.com',
      };

      (prisma.monitoredURL.findFirst as jest.Mock).mockResolvedValue(mockURL);

      const result = await service.getURLById('url-id', 'org-id');

      expect(result).toEqual(mockURL);
    });

    it('should return null when not found', async () => {
      (prisma.monitoredURL.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getURLById('url-id', 'org-id');

      expect(result).toBeNull();
    });
  });
});
