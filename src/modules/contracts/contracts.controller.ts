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
import { ContractsService, CreateContractDto, UpdateContractDto, QueryContractDto } from './contracts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('contracts')
@UseGuards(AuthGuard('jwt'))
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createContract(@Body() createContractDto: CreateContractDto, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const contract = await this.contractsService.createContract(createContractDto, memberId, tenantId);
    return {
      code: 201,
      message: '创建合同成功',
      data: contract
    };
  }

  @Get()
  async findAllContracts(
    @Query() query: QueryContractDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.contractsService.findAllContracts(query, memberId, tenantId);
    return {
      code: 200,
      message: '获取合同列表成功',
      data: result
    };
  }

  @Get(':id')
  async findContractById(@Param('id') id: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const contract = await this.contractsService.findContractById(parseInt(id, 10), memberId, tenantId);
    return {
      code: 200,
      message: '获取合同详情成功',
      data: contract
    };
  }

  @Patch(':id')
  async updateContract(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const contract = await this.contractsService.updateContract(parseInt(id, 10), updateContractDto, memberId, tenantId);
    return {
      code: 200,
      message: '更新合同成功',
      data: contract
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteContract(@Param('id') id: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.contractsService.deleteContract(parseInt(id, 10), memberId, tenantId);
    return {
      code: 200,
      message: '删除合同成功'
    };
  }

  @Post('from-quote/:quoteId')
  @HttpCode(HttpStatus.CREATED)
  async createContractFromQuote(@Param('quoteId') quoteId: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const contract = await this.contractsService.createContractFromQuote(parseInt(quoteId, 10), memberId, tenantId);
    return {
      code: 201,
      message: '从报价单创建合同成功',
      data: contract
    };
  }
}

