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
import { OrdersService, CreateOrderDto, UpdateOrderDto, QueryOrderDto } from './orders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const order = await this.ordersService.createOrder(createOrderDto, memberId, tenantId);
    return {
      code: 201,
      message: '创建订单成功',
      data: order
    };
  }

  @Post('from-quote/:quoteId')
  @HttpCode(HttpStatus.CREATED)
  async createOrderFromQuote(@Param('quoteId') quoteId: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const order = await this.ordersService.createOrderFromQuote(parseInt(quoteId, 10), memberId, tenantId);
    return {
      code: 201,
      message: '从报价创建订单成功',
      data: order
    };
  }

  @Post('from-contract/:contractId')
  @HttpCode(HttpStatus.CREATED)
  async createOrderFromContract(@Param('contractId') contractId: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const order = await this.ordersService.createOrderFromContract(parseInt(contractId, 10), memberId, tenantId);
    return {
      code: 201,
      message: '从合同创建订单成功',
      data: order
    };
  }

  @Get()
  async findAllOrders(
    @Query() query: QueryOrderDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.ordersService.findAllOrders(query, memberId, tenantId);
    return {
      code: 200,
      message: '获取订单列表成功',
      data: result
    };
  }

  @Get(':id')
  async findOrderById(@Param('id') id: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const order = await this.ordersService.findOrderById(parseInt(id, 10), memberId, tenantId);
    return {
      code: 200,
      message: '获取订单详情成功',
      data: order
    };
  }

  @Patch(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const order = await this.ordersService.updateOrder(parseInt(id, 10), updateOrderDto, memberId, tenantId);
    return {
      code: 200,
      message: '更新订单成功',
      data: order
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteOrder(@Param('id') id: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.ordersService.deleteOrder(parseInt(id, 10), memberId, tenantId);
    return {
      code: 200,
      message: '删除订单成功'
    };
  }
}

