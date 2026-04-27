import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: { message?: string };
}

@Injectable()
export class UploadsService {
  constructor(private config: ConfigService) {}

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported');
    }

    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL');
    if (!cloudinaryUrl) {
      throw new InternalServerErrorException('CLOUDINARY_URL is not configured');
    }

    const credentials = this.parseCloudinaryUrl(cloudinaryUrl);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = this.config.get<string>('CLOUDINARY_FOLDER') || 'examflow';
    const signature = this.sign({ folder, timestamp }, credentials.apiSecret);
    const imageBytes = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength,
    ) as ArrayBuffer;

    const formData = new FormData();
    formData.append('file', new Blob([imageBytes], { type: file.mimetype }), file.originalname);
    formData.append('api_key', credentials.apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
      { method: 'POST', body: formData },
    );
    const payload = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok || !payload.secure_url || !payload.public_id) {
      throw new BadRequestException(
        payload.error?.message ?? 'Could not upload image to Cloudinary',
      );
    }

    return {
      url: payload.secure_url,
      secureUrl: payload.secure_url,
      publicId: payload.public_id,
      width: payload.width,
      height: payload.height,
      format: payload.format,
      bytes: payload.bytes,
    };
  }

  private parseCloudinaryUrl(raw: string) {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'cloudinary:') {
      throw new InternalServerErrorException('Invalid CLOUDINARY_URL');
    }

    return {
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
      cloudName: parsed.hostname,
    };
  }

  private sign(params: Record<string, string>, apiSecret: string) {
    const payload = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
  }
}
