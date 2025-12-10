import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService, CreateCustomerDto, UpdateCustomerDto, CreateContactDto, QueryCustomerDto } from './customers.service';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto, UpdateCreditInfoDto } from './dto/customer-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(AuthGuard('jwt'))
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCustomer(@Body() createCustomerDto: CreateCustomerDto, @CurrentUser() user: any) {
    const departmentId = user.currentDepartmentId 
      ? (typeof user.currentDepartmentId === 'string' ? parseInt(user.currentDepartmentId, 10) : user.currentDepartmentId)
      : undefined;
    const customer = await this.customersService.createCustomer(createCustomerDto, user.memberId, user.tenantId, departmentId);
    return {
      code: 201,
      message: '创建客户成功',
      data: customer
    };
  }

  @Get()
  async findAllCustomers(
    @Query() query: QueryCustomerDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.customersService.findAllCustomers(query, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '获取客户列表成功',
      data: result
    };
  }

  @Get('stats')
  async getCustomerStats(@CurrentUser() user: any) {
    return await this.customersService.getCustomerStats(user.memberId, user.tenantId);
  }

  // 获取公海客户列表（必须在 @Get(':id') 之前，避免路由冲突）
  @Get('public')
  async getPublicCustomers(@Query() query: QueryCustomerDto, @CurrentUser() user: any) {
    const result = await this.customersService.getPublicCustomers(query, user.tenantId);
    return {
      code: 200,
      message: '获取公海客户列表成功',
      data: result
    };
  }

  @Get(':id')
  async findCustomerById(@Param('id') id: string, @CurrentUser() user: any) {
    // 验证ID是否有效
    const customerId = parseInt(id, 10);
    if (isNaN(customerId) || customerId <= 0) {
      throw new BadRequestException('无效的客户ID');
    }
    const customer = await this.customersService.findCustomerById(customerId, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '获取客户详情成功',
      data: customer
    };
  }

  @Patch(':id/status')
  async updateCustomerStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
  ) {
    const customerId = parseInt(id, 10);
    if (isNaN(customerId) || customerId <= 0) {
      throw new BadRequestException('无效的客户ID');
    }
    const customer = await this.customersService.updateCustomerStatus(customerId, status, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '更新客户状态成功',
      data: customer
    };
  }

  @Patch(':id')
  async updateCustomer(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: any,
  ) {
    const customer = await this.customersService.updateCustomer(parseInt(id, 10), updateCustomerDto, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '更新客户成功',
      data: customer
    };
  }

  @Delete('batch')
  @HttpCode(HttpStatus.OK)
  async deleteBatchCustomers(@Body('ids') ids: string[], @CurrentUser() user: any) {
    await this.customersService.deleteBatchCustomers(ids.map(id => parseInt(id, 10)), user.memberId, user.tenantId);
    return {
      code: 200,
      message: '批量删除客户成功'
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteCustomer(@Param('id') id: string, @CurrentUser() user: any) {
    await this.customersService.deleteCustomer(parseInt(id, 10), user.memberId, user.tenantId);
    return {
      code: 200,
      message: '删除客户成功'
    };
  }

  // 认领客户（从公海转入私海）
  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  async claimCustomer(@Param('id') id: string, @CurrentUser() user: any) {
    await this.customersService.claimCustomer(parseInt(id, 10), user.memberId, user.tenantId);
    return {
      code: 200,
      message: '认领客户成功'
    };
  }

  // 回收客户（从私海转入公海）
  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  async releaseCustomer(@Param('id') id: string, @CurrentUser() user: any) {
    await this.customersService.releaseCustomer(parseInt(id, 10), user.memberId, user.tenantId);
    return {
      code: 200,
      message: '回收客户成功'
    };
  }

  @Post(':customerId/contacts')
  async createContact(
    @Param('customerId') customerId: string,
    @Body() createContactDto: CreateContactDto,
    @CurrentUser() user: any,
  ) {
    const departmentId = user.currentDepartmentId 
      ? (typeof user.currentDepartmentId === 'string' ? parseInt(user.currentDepartmentId, 10) : user.currentDepartmentId)
      : undefined;
    return await this.customersService.createContact(parseInt(customerId, 10), createContactDto, user.memberId, user.tenantId, departmentId);
  }

  @Patch('contacts/:contactId')
  async updateContact(
    @Param('contactId') contactId: string,
    @Body() updateContactDto: Partial<CreateContactDto>,
    @CurrentUser() user: any,
  ) {
    return await this.customersService.updateContact(parseInt(contactId, 10), updateContactDto, user.memberId, user.tenantId);
  }

  @Delete('contacts/:contactId')
  async deleteContact(@Param('contactId') contactId: string, @CurrentUser() user: any) {
    return await this.customersService.deleteContact(parseInt(contactId, 10), user.memberId, user.tenantId);
  }

  @Post('auto-return-to-pool')
  @HttpCode(HttpStatus.OK)
  async autoReturnCustomersToPool(
    @Query('days') days?: string,
    @CurrentUser() user?: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const autoReturnDays = days ? parseInt(days, 10) : undefined;
    const result = await this.customersService.autoReturnCustomersToPool(tenantId, autoReturnDays);
    return {
      code: 200,
      message: `成功将 ${result.count} 个客户自动回到公海`,
      data: result
    };
  }

  // ========== 客户合作习惯与信用信息相关接口 ==========

  @Get(':id/profile')
  async getCustomerProfile(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const customerId = parseInt(id, 10);
    if (isNaN(customerId) || customerId <= 0) {
      throw new BadRequestException('无效的客户ID');
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const profile = await this.customersService.getCustomerProfile(customerId, tenantId);
    return {
      code: 200,
      message: '获取客户合作与信用信息成功',
      data: profile,
    };
  }

  @Patch(':id/profile')
  @HttpCode(HttpStatus.OK)
  async updateCustomerProfile(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerProfileDto,
    @CurrentUser() user: any,
  ) {
    const customerId = parseInt(id, 10);
    if (isNaN(customerId) || customerId <= 0) {
      throw new BadRequestException('无效的客户ID');
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const profile = await this.customersService.createOrUpdateCustomerProfile(customerId, dto, tenantId);
    return {
      code: 200,
      message: '更新客户合作与信用信息成功',
      data: profile,
    };
  }

  @Patch(':id/profile/credit')
  @HttpCode(HttpStatus.OK)
  async updateCreditInfo(
    @Param('id') id: string,
    @Body() dto: UpdateCreditInfoDto,
    @CurrentUser() user: any,
  ) {
    const customerId = parseInt(id, 10);
    if (isNaN(customerId) || customerId <= 0) {
      throw new BadRequestException('无效的客户ID');
    }
    const changedBy = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    
    if (!dto.changeReason) {
      throw new BadRequestException('变更原因不能为空');
    }

    const result = await this.customersService.updateCreditInfo(customerId, dto, changedBy, tenantId);
    return {
      code: 200,
      message: '更新信用信息成功',
      data: result,
    };
  }

  @Get(':id/profile/credit-history')
  async getCreditHistory(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const customerId = parseInt(id, 10);
    if (isNaN(customerId) || customerId <= 0) {
      throw new BadRequestException('无效的客户ID');
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const history = await this.customersService.getCreditHistory(customerId, tenantId);
    return {
      code: 200,
      message: '获取信用变更历史成功',
      data: history,
    };
  }
}
