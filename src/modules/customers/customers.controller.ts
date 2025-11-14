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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService, CreateCustomerDto, UpdateCustomerDto, CreateContactDto, QueryCustomerDto } from './customers.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(AuthGuard('jwt'))
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCustomer(@Body() createCustomerDto: CreateCustomerDto, @CurrentUser() user: any) {
    const customer = await this.customersService.createCustomer(createCustomerDto, user.memberId, user.tenantId);
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

  @Get(':id')
  async findCustomerById(@Param('id') id: string, @CurrentUser() user: any) {
    const customer = await this.customersService.findCustomerById(parseInt(id, 10), user.memberId, user.tenantId);
    return {
      code: 200,
      message: '获取客户详情成功',
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

  // 获取公海客户列表
  @Get('public')
  async getPublicCustomers(@Query() query: QueryCustomerDto, @CurrentUser() user: any) {
    const result = await this.customersService.getPublicCustomers(query, user.tenantId);
    return {
      code: 200,
      message: '获取公海客户列表成功',
      data: result
    };
  }

  @Post(':customerId/contacts')
  async createContact(
    @Param('customerId') customerId: string,
    @Body() createContactDto: CreateContactDto,
    @CurrentUser() user: any,
  ) {
    return await this.customersService.createContact(parseInt(customerId, 10), createContactDto, user.memberId, user.tenantId);
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
}
