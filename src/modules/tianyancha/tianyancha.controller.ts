import { Controller, Get, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TianyanchaService } from './tianyancha.service';

@Controller('tianyancha')
@UseGuards(AuthGuard('jwt'))
export class TianyanchaController {
  constructor(private readonly tianyanchaService: TianyanchaService) {}

  /**
   * 搜索企业
   * @param keyword 搜索关键词（公司名称或统一社会信用代码）
   */
  @Get('search')
  async searchCompany(@Query('keyword') keyword: string) {
    if (!keyword || keyword.trim() === '') {
      throw new HttpException('搜索关键词不能为空', HttpStatus.BAD_REQUEST);
    }

    try {
      const results = await this.tianyanchaService.searchCompany(keyword.trim());
      return {
        code: 200,
        message: '搜索成功',
        data: results,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || '搜索企业失败',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

