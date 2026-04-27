import { Injectable, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

@Injectable()
export class DocumentParserService {
  async extractText(file: Express.Multer.File): Promise<string> {
    let text: string;

    switch (file.mimetype) {
      case 'application/pdf':
        const pdfData = await pdfParse(file.buffer);
        text = pdfData.text;
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

    text = this.sanitizeText(text);

    // Limit to 15000 characters
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '\n\n... [nội dung đã được cắt bớt]';
    }

    return text;
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
