import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import logger from '@/lib/logger';

export interface ExtractionResult {
  text: string;
  metadata: {
    fileType: string;
    fileName: string;
    fileSize?: number;
    pageCount?: number;
    wordCount?: number;
  };
}

/**
 * Text extraction service for various file formats
 */
export class TextExtractorService {
  /**
   * Extract text from a file based on its extension
   */
  async extractFromFile(filePath: string): Promise<ExtractionResult> {
    const extension = path.extname(filePath).toLowerCase().slice(1);
    const fileName = path.basename(filePath);

    try {
      switch (extension) {
        case 'pdf':
          return await this.extractFromPDF(filePath, fileName);
        case 'docx':
          return await this.extractFromDOCX(filePath, fileName);
        case 'txt':
        case 'md':
          return await this.extractFromText(filePath, fileName);
        case 'html':
        case 'htm':
          return await this.extractFromHTML(filePath, fileName);
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      logger.error('Text extraction error', {
        error: error instanceof Error ? error.message : String(error),
        filePath,
        extension,
      });
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractFromPDF(filePath: string, fileName: string): Promise<ExtractionResult> {
    const buffer = await fs.readFile(filePath);
    // Dynamic import to handle ESM module
    // pdf-parse v2.4.5 exports PDFParse as a named export
    const pdfParseModule = await import('pdf-parse');
    const PDFParse = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;

    if (!PDFParse || typeof PDFParse !== 'function') {
      throw new Error('Could not find PDFParse function in pdf-parse module');
    }

    const data = await PDFParse(buffer);

    return {
      text: data.text,
      metadata: {
        fileType: 'pdf',
        fileName,
        fileSize: buffer.length,
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).filter((word: string) => word.length > 0).length,
      },
    };
  }

  /**
   * Extract text from DOCX file
   */
  private async extractFromDOCX(filePath: string, fileName: string): Promise<ExtractionResult> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value;
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;

    return {
      text,
      metadata: {
        fileType: 'docx',
        fileName,
        fileSize: buffer.length,
        wordCount,
      },
    };
  }

  /**
   * Extract text from plain text file
   */
  private async extractFromText(filePath: string, fileName: string): Promise<ExtractionResult> {
    const text = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;

    return {
      text,
      metadata: {
        fileType: 'txt',
        fileName,
        fileSize: stats.size,
        wordCount,
      },
    };
  }

  /**
   * Extract text from HTML file
   */
  private async extractFromHTML(filePath: string, fileName: string): Promise<ExtractionResult> {
    const html = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style').remove();

    // Extract text from body
    const text = $('body').text().trim() || $('html').text().trim();
    const stats = await fs.stat(filePath);
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;

    return {
      text,
      metadata: {
        fileType: 'html',
        fileName,
        fileSize: stats.size,
        wordCount,
      },
    };
  }

  /**
   * Extract text from URL content (HTML)
   */
  async extractFromURLContent(html: string, url: string): Promise<ExtractionResult> {
    const $ = cheerio.load(html);

    // Remove script and style elements
    const $doc = $;
    $doc('script, style').remove();

    // Extract text from body
    const text = $doc('body').text().trim() || $doc('html').text().trim();
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;

    return {
      text,
      metadata: {
        fileType: 'html',
        fileName: url,
        wordCount,
      },
    };
  }

  /**
   * Extract text from URL content with CSS selector
   */
  async extractFromURLContentWithSelector(
    html: string,
    url: string,
    selector: string
  ): Promise<ExtractionResult> {
    const $ = cheerio.load(html);

    // Remove script and style elements
    const $doc = $;
    $doc('script, style').remove();

    // Extract text from selected element
    const selectedText = $doc(selector).text().trim();
    const text = selectedText || $doc('body').text().trim();
    const wordCount = text.split(/\s+/).filter((word: string) => word.length > 0).length;

    return {
      text,
      metadata: {
        fileType: 'html',
        fileName: url,
        wordCount,
      },
    };
  }
}

// Singleton instance
export const textExtractorService = new TextExtractorService();
