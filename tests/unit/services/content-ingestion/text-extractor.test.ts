// Mock dependencies BEFORE imports
jest.mock('fs/promises');
jest.mock('pdf-parse', () => {
  const mockPdfParse = jest.fn();
  return {
    __esModule: true,
    default: mockPdfParse,
  };
});
jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
}));

// Create a proper cheerio mock that returns a callable function
const createCheerioMock = () => {
  const mockText = jest.fn(() => 'Mocked text content');
  const mockRemove = jest.fn().mockReturnThis();

  // The cheerio instance is a function that can be called with selectors
  const cheerioInstance = jest.fn((selector: string) => {
    if (selector === 'script, style') {
      return { remove: mockRemove };
    }
    return { text: mockText };
  }) as any;

  // Also add methods directly to the instance
  cheerioInstance.text = mockText;
  cheerioInstance.remove = mockRemove;

  return cheerioInstance;
};

jest.mock('cheerio', () => ({
  load: jest.fn(() => createCheerioMock()),
}));

import { TextExtractorService } from '@/services/content-ingestion/text-extractor';
import fs from 'fs/promises';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

describe('TextExtractorService', () => {
  let service: TextExtractorService;
  let mockPdfParse: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = new TextExtractorService();

    // Get the mocked pdf-parse
    const pdfParseModule = await import('pdf-parse');
    mockPdfParse = pdfParseModule.default as jest.Mock;
  });

  describe('extractFromPDF', () => {
    it('should extract text from PDF', async () => {
      const mockBuffer = Buffer.from('mock pdf content');
      const mockPdfData = {
        text: 'Extracted PDF text',
        numpages: 5,
      };

      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await service['extractFromPDF']('/path/to/file.pdf', 'file.pdf');

      expect(result.text).toBe('Extracted PDF text');
      expect(result.metadata.fileType).toBe('pdf');
      expect(result.metadata.pageCount).toBe(5);
    });
  });

  describe('extractFromDOCX', () => {
    it('should extract text from DOCX', async () => {
      const mockBuffer = Buffer.from('mock docx content');
      const mockMammothResult = {
        value: 'Extracted DOCX text',
      };

      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
      (mammoth.extractRawText as jest.Mock).mockResolvedValue(mockMammothResult);

      const result = await service['extractFromDOCX']('/path/to/file.docx', 'file.docx');

      expect(result.text).toBe('Extracted DOCX text');
      expect(result.metadata.fileType).toBe('docx');
    });
  });

  describe('extractFromText', () => {
    it('should extract text from TXT file', async () => {
      const mockText = 'Plain text content';
      const mockStats = { size: 100 };

      (fs.readFile as jest.Mock).mockResolvedValue(mockText);
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);

      const result = await service['extractFromText']('/path/to/file.txt', 'file.txt');

      expect(result.text).toBe(mockText);
      expect(result.metadata.fileType).toBe('txt');
      expect(result.metadata.fileSize).toBe(100);
    });
  });

  describe('extractFromHTML', () => {
    it('should extract text from HTML file', async () => {
      const mockHtml = '<html><body><p>HTML content</p></body></html>';
      const mockStats = { size: 200 };

      (fs.readFile as jest.Mock).mockResolvedValue(mockHtml);
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);

      const result = await service['extractFromHTML']('/path/to/file.html', 'file.html');

      expect(result.metadata.fileType).toBe('html');
      expect(cheerio.load).toHaveBeenCalledWith(mockHtml);
    });
  });

  describe('extractFromFile', () => {
    it('should route to correct extractor based on extension', async () => {
      const mockBuffer = Buffer.from('mock pdf');
      const mockPdfData = { text: 'PDF text', numpages: 1 };

      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await service.extractFromFile('/path/to/file.pdf');

      expect(result.metadata.fileType).toBe('pdf');
    });

    it('should throw error for unsupported file type', async () => {
      await expect(service.extractFromFile('/path/to/file.xyz')).rejects.toThrow(
        'Unsupported file type'
      );
    });
  });

  describe('extractFromURLContent', () => {
    it('should extract text from HTML content', async () => {
      const mockHtml = '<html><body><p>URL content</p></body></html>';

      const result = await service.extractFromURLContent(mockHtml, 'https://example.com');

      expect(result.metadata.fileType).toBe('html');
      expect(cheerio.load).toHaveBeenCalledWith(mockHtml);
    });
  });

  describe('extractFromURLContentWithSelector', () => {
    it('should extract text using CSS selector', async () => {
      const mockHtml = '<html><body><div class="content">Selected content</div></body></html>';

      const result = await service.extractFromURLContentWithSelector(
        mockHtml,
        'https://example.com',
        '.content'
      );

      expect(result.metadata.fileType).toBe('html');
      expect(cheerio.load).toHaveBeenCalledWith(mockHtml);
    });
  });
});
