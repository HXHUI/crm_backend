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
    const departmentId = user.currentDepartmentId 
      ? (typeof user.currentDepartmentId === 'string' ? parseInt(user.currentDepartmentId, 10) : user.currentDepartmentId)
      : undefined;
    const contract = await this.contractsService.createContract(createContractDto, memberId, tenantId, departmentId);
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

  @Get('expiring')
  async getExpiringContracts(
    @Query('days') days?: string,
    @CurrentUser() user?: any,
  ) {
    if (!user || !user.tenantId) {
      return {
        code: 400,
        message: '用户信息不存在',
        data: []
      };
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      return {
        code: 400,
        message: '租户ID无效',
        data: []
      };
    }
    const reminderDays = days ? parseInt(days, 10) : undefined;
    const contracts = await this.contractsService.getExpiringContracts(tenantId, reminderDays);
    return {
      code: 200,
      message: '获取即将到期合同成功',
      data: contracts
    };
  }

  @Get(':id')
  async findContractById(@Param('id') id: string, @CurrentUser() user: any) {
    if (!id || isNaN(parseInt(id, 10))) {
      return {
        code: 400,
        message: '合同ID无效',
        data: null
      };
    }
    if (!user || !user.tenantId) {
      return {
        code: 400,
        message: '用户信息不存在',
        data: null
      };
    }
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      return {
        code: 400,
        message: '租户ID无效',
        data: null
      };
    }
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
    if (!id || isNaN(parseInt(id, 10))) {
      return {
        code: 400,
        message: '合同ID无效',
        data: null
      };
    }
    if (!user || !user.tenantId) {
      return {
        code: 400,
        message: '用户信息不存在',
        data: null
      };
    }
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      return {
        code: 400,
        message: '租户ID无效',
        data: null
      };
    }
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
    if (!quoteId || isNaN(parseInt(quoteId, 10))) {
      return {
        code: 400,
        message: '报价ID无效',
        data: null
      };
    }
    if (!user || !user.tenantId) {
      return {
        code: 400,
        message: '用户信息不存在',
        data: null
      };
    }
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      return {
        code: 400,
        message: '租户ID无效',
        data: null
      };
    }
    const departmentId = user.currentDepartmentId 
      ? (typeof user.currentDepartmentId === 'string' ? parseInt(user.currentDepartmentId, 10) : user.currentDepartmentId)
      : undefined;
    const contract = await this.contractsService.createContractFromQuote(parseInt(quoteId, 10), memberId, tenantId, departmentId);
    return {
      code: 201,
      message: '从报价单创建合同成功',
      data: contract
    };
  }

  @Post(':id/submit-approval')
  @HttpCode(HttpStatus.OK)
  async submitApproval(
    @Param('id') id: string,
    @Body() body: { templateId: number; submitComment?: string },
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const instance = await this.contractsService.submitApproval(
      parseInt(id, 10),
      body.templateId,
      body.submitComment || '',
      memberId,
      tenantId,
    );
    return {
      code: 200,
      message: '提交审批成功',
      data: instance,
    };
  }

  @Get(':id/approval-instance')
  async getApprovalInstance(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const instance = await this.contractsService.getApprovalInstance(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '获取审批实例成功',
      data: instance,
    };
  }
}

