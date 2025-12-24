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
  },
}));

describe('URLService', () => {
  let service: URLService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new URLService();
  });

  describe('createURL', () => {
    it('should create a monitored URL', async () => {
      const input = {
        organizationId: 'org-id',
        url: 'https://example.com',
        enabled: true,
        checkInterval: 3600,
        autoProcess: true,
      };

      const mockURL = {
        id: 'url-id',
        ...input,
        contentSelector: null,
        lastContentHash: null,
        lastCheckedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.monitoredURL.create as jest.Mock).mockResolvedValue(mockURL);

      const result = await service.createURL(input);

      expect(prisma.monitoredURL.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: input.organizationId,
          url: input.url,
        }),
      });
      expect(result.id).toBe(mockURL.id);
      expect(urlMonitorService.startMonitoring).toHaveBeenCalledWith(mockURL.id, mockURL);
    });
  });

  describe('getURLs', () => {
    it('should get all URLs for organization', async () => {
      const mockURLs = [
        { id: 'url-1', organizationId: 'org-id', url: 'https://example.com/1' },
        { id: 'url-2', organizationId: 'org-id', url: 'https://example.com/2' },
      ];

      (prisma.monitoredURL.findMany as jest.Mock).mockResolvedValue(mockURLs);

      const result = await service.getURLs('org-id');

      expect(prisma.monitoredURL.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-id' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockURLs);
    });
  });

  describe('updateURL', () => {
    it('should update a URL', async () => {
      const mockURL = {
        id: 'url-id',
        organizationId: 'org-id',
        url: 'https://example.com',
        enabled: true,
      };

      const updatedURL = {
        ...mockURL,
        enabled: false,
      };

      (prisma.monitoredURL.findFirstOrThrow as jest.Mock).mockResolvedValue(mockURL);
      (prisma.monitoredURL.update as jest.Mock).mockResolvedValue(updatedURL);

      const result = await service.updateURL('url-id', 'org-id', { enabled: false });

      expect(prisma.monitoredURL.update).toHaveBeenCalled();
      expect(urlMonitorService.stopMonitoring).toHaveBeenCalledWith('url-id');
    });
  });

  describe('deleteURL', () => {
    it('should delete a URL', async () => {
      await service.deleteURL('url-id', 'org-id');

      expect(urlMonitorService.stopMonitoring).toHaveBeenCalledWith('url-id');
      expect(prisma.monitoredURL.delete).toHaveBeenCalledWith({
        where: {
          id: 'url-id',
          organizationId: 'org-id',
        },
      });
    });
  });
});
