import { Injectable, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');

@Injectable()
export class DocumentParserService {
  async extractText(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    let text: string;

    try {
      switch (file.mimetype) {
        case 'application/pdf':
          text = await this.extractPdfText(file.buffer);
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          const docResult = await mammoth.extractRawText({ buffer: file.buffer });
          text = docResult.value;
          break;

        case 'text/plain':
          text = file.buffer.toString('utf-8');
          break;

        default:
          throw new BadRequestException(
            `Unsupported file type: ${file.mimetype}. Supported: PDF, DOCX, TXT`,
          );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Could not extract text from ${file.originalname}. The file may be scanned, encrypted, or corrupted.`,
      );
    }

    text = this.sanitizeText(text);

    if (text.length < 50) {
      throw new BadRequestException(
        'Could not find enough selectable text in this file. Scanned image-only PDFs are not supported yet.',
      );
    }

    // Limit to 15000 characters
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '\n\n... [nội dung đã được cắt bớt]';
    }

    return text;
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  sanitizeText(text: string): string {
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except newline/tab
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .replace(/ {3,}/g, '  ') // Collapse excessive spaces
      .replace(/\n{4,}/g, '\n\n\n') // Collapse excessive newlines
      .trim();
  }
}
