import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusinessInfoService } from './business-info.service';

@Controller('business-info')
@UseGuards(AuthGuard('jwt'))
export class BusinessInfoController {
  constructor(private readonly businessInfoService: BusinessInfoService) {}

  /**
   * 搜索企业（用于创建线索）- 必须在 :customerId 之前定义
   */
  @Get('search')
  async searchCompany(@Query('keyword') keyword: string) {
    if (!keyword || keyword.trim().length === 0) {
      return { code: 200, data: [] };
    }
    const companies = await this.businessInfoService.searchCompany(keyword.trim());
    return { code: 200, data: companies };
  }

  /**
   * 通过公司名称获取工商信息（用于线索）
   * 必须在 :customerId 之前定义，避免路由冲突
   */
  @Get('by-company')
  async getBusinessInfoByCompanyName(
    @Request() req: any,
    @Query('companyName') companyName: string,
    @Query('tenantId') tenantId?: string,
  ) {
    console.log(`[BusinessInfoController] 收到通过公司名称获取工商信息请求，companyName: ${companyName}`);
    try {
      if (!companyName || !companyName.trim()) {
        console.warn(`[BusinessInfoController] 公司名称为空`);
        return { code: 200, data: null, expired: false };
      }

      const tenantIdNum = tenantId ? parseInt(tenantId, 10) : (typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId);
      const businessInfo = await this.businessInfoService.getBusinessInfoByCompanyName(
        companyName.trim(),
        tenantIdNum,
      );
      
      if (!businessInfo) {
        console.log(`[BusinessInfoController] 未找到工商信息，companyName: ${companyName}`);
        return { code: 200, data: null, expired: false };
      }

      const expired = businessInfo.expiresAt
        ? businessInfo.expiresAt < new Date()
        : false;

      console.log(`[BusinessInfoController] 返回工商信息，companyName: ${companyName}, expired: ${expired}`);
      return {
        code: 200,
        data: businessInfo,
        expired,
        lastSyncTime: businessInfo.lastSyncTime,
        expiresAt: businessInfo.expiresAt,
      };
    } catch (error: any) {
      console.error(`[BusinessInfoController] 获取工商信息失败，companyName: ${companyName}`, error);
      console.error(`[BusinessInfoController] 错误堆栈:`, error.stack);
      throw error;
    }
  }

  /**
   * 通过公司名称刷新工商信息（用于线索）
   * 必须在 :customerId/refresh 之前定义，避免路由冲突
   */
  @Post('by-company/refresh')
  async refreshBusinessInfoByCompanyName(
    @Body() body: { companyName: string },
    @Request() req: any,
  ) {
    const { companyName } = body;
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    console.log(`[BusinessInfoController] 收到通过公司名称刷新工商信息请求，companyName: ${companyName}`);
    try {
      if (!companyName || !companyName.trim()) {
        throw new Error('公司名称不能为空');
      }

      const businessInfo = await this.businessInfoService.refreshBusinessInfoByCompanyName(
        companyName.trim(),
        tenantId,
        true,
      );
      console.log(`[BusinessInfoController] 刷新工商信息成功，companyName: ${companyName}`);
      return {
        code: 200,
        data: businessInfo,
        lastSyncTime: businessInfo.lastSyncTime,
        expiresAt: businessInfo.expiresAt,
      };
    } catch (error: any) {
      console.error(`[BusinessInfoController] 刷新工商信息失败，companyName: ${companyName}`, error);
      console.error(`[BusinessInfoController] 错误堆栈:`, error.stack);
      throw error;
    }
  }

  /**
   * 获取工商信息（通过客户ID）
   */
  @Get(':customerId')
  async getBusinessInfo(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Request() req: any,
  ) {
    console.log(`[BusinessInfoController] 收到获取工商信息请求，customerId: ${customerId}`);
    try {
      const businessInfo = await this.businessInfoService.getBusinessInfo(customerId);
      
      if (!businessInfo) {
        console.log(`[BusinessInfoController] 未找到工商信息，customerId: ${customerId}`);
        return { code: 200, data: null, expired: false };
      }

      const expired = businessInfo.expiresAt
        ? businessInfo.expiresAt < new Date()
        : false;

      console.log(`[BusinessInfoController] 返回工商信息，customerId: ${customerId}, expired: ${expired}`);
      return {
        code: 200,
        data: businessInfo,
        expired,
        lastSyncTime: businessInfo.lastSyncTime,
        expiresAt: businessInfo.expiresAt,
      };
    } catch (error: any) {
      console.error(`[BusinessInfoController] 获取工商信息失败，customerId: ${customerId}`, error);
      console.error(`[BusinessInfoController] 错误堆栈:`, error.stack);
      throw error;
    }
  }

  /**
   * 刷新工商信息（通过客户ID）
   */
  @Post(':customerId/refresh')
  async refreshBusinessInfo(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Request() req: any,
  ) {
    console.log(`[BusinessInfoController] 收到刷新请求，customerId: ${customerId}`);
    try {
      const businessInfo = await this.businessInfoService.refreshBusinessInfo(
        customerId,
        true,
      );
      console.log(`[BusinessInfoController] 刷新成功，customerId: ${customerId}`);
      return {
        code: 200,
        data: businessInfo,
        lastSyncTime: businessInfo.lastSyncTime,
        expiresAt: businessInfo.expiresAt,
      };
    } catch (error: any) {
      console.error(`[BusinessInfoController] 刷新失败，customerId: ${customerId}`, error);
      console.error(`[BusinessInfoController] 错误堆栈:`, error.stack);
      throw error;
    }
  }
}

