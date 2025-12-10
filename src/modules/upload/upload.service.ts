import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  getFileUrl(filename: string): string {
    const port = this.configService.get<number>('PORT', 3000);
    const baseUrl = this.configService.get<string>('BASE_URL', `http://localhost:${port}`);
    // 静态文件服务配置在 /uploads 路径下，不需要 api/v1 前缀
    return `${baseUrl}/uploads/${filename}`;
  }

  getAvatarUrl(filename: string): string {
    const port = this.configService.get<number>('PORT', 3000);
    const baseUrl = this.configService.get<string>('BASE_URL', `http://localhost:${port}`);
    return `${baseUrl}/uploads/avatars/${filename}`;
  }

  getLogoUrl(filename: string): string {
    const port = this.configService.get<number>('PORT', 3000);
    const baseUrl = this.configService.get<string>('BASE_URL', `http://localhost:${port}`);
    return `${baseUrl}/uploads/logos/${filename}`;
  }
}

