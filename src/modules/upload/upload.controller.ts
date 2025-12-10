import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Express } from 'express';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          // 图片
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          // 文档
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          // 文本
          'text/plain',
          'text/csv',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('不支持的文件类型，仅支持图片、PDF、Word、Excel、PowerPoint等格式'), false);
        }
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('文件上传失败：未接收到文件');
    }

    try {
      const fileUrl = await this.uploadService.getFileUrl(file.filename);
      
      return {
        code: 200,
        message: '文件上传成功',
        data: {
          url: fileUrl,
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
      };
    } catch (error) {
      throw new BadRequestException(`文件上传失败：${error.message}`);
    }
  }

  // 头像上传接口
  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'avatars'),
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          // 将错误信息存储到request对象中，以便后续处理
          (req as any).fileFilterError = '不支持的文件类型，仅支持 JPG、PNG、GIF、WebP 格式的图片';
          cb(null, false);
        }
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: any) {
    // 检查是否有文件过滤错误
    if ((req as any).fileFilterError) {
      throw new BadRequestException((req as any).fileFilterError);
    }

    if (!file) {
      throw new BadRequestException('头像上传失败：未接收到文件或文件类型不支持');
    }

    try {
      const fileUrl = await this.uploadService.getAvatarUrl(file.filename);
      
      return {
        code: 200,
        message: '头像上传成功',
        data: {
          url: fileUrl,
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
      };
    } catch (error) {
      throw new BadRequestException(`头像上传失败：${error.message}`);
    }
  }

  // Logo上传接口
  @Post('logo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'logos'),
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          // 将错误信息存储到request对象中，以便后续处理
          (req as any).fileFilterError = '不支持的文件类型，仅支持 JPG、PNG、GIF、WebP 格式的图片';
          cb(null, false);
        }
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: any) {
    // 检查是否有文件过滤错误
    if ((req as any).fileFilterError) {
      throw new BadRequestException((req as any).fileFilterError);
    }

    if (!file) {
      throw new BadRequestException('Logo上传失败：未接收到文件或文件类型不支持');
    }

    try {
      const fileUrl = await this.uploadService.getLogoUrl(file.filename);
      
      return {
        code: 200,
        message: 'Logo上传成功',
        data: {
          url: fileUrl,
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Logo上传失败：${error.message}`);
    }
  }
}

