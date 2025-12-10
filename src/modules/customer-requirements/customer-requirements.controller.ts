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
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  CustomerRequirementsService,
  CreateRequirementDto,
  UpdateRequirementDto,
  QueryRequirementDto,
} from './customer-requirements.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customer-requirements')
@UseGuards(AuthGuard('jwt'))
export class CustomerRequirementsController {
  constructor(private readonly requirementsService: CustomerRequirementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRequirement(@Body() createRequirementDto: CreateRequirementDto, @CurrentUser() user: any) {
    const requirement = await this.requirementsService.createRequirement(
      createRequirementDto,
      user.memberId,
      user.tenantId,
    );
    return {
      code: 201,
      message: '创建需求成功',
      data: requirement,
    };
  }

  @Get()
  async findAllRequirements(@Query() query: QueryRequirementDto, @CurrentUser() user: any) {
    const result = await this.requirementsService.findAllRequirements(query, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '获取需求列表成功',
      data: result,
    };
  }

  @Get('customer/:customerId')
  async getRequirementsByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentUser() user: any,
  ) {
    const requirements = await this.requirementsService.getRequirementsByCustomer(
      customerId,
      user.memberId,
      user.tenantId,
    );
    return {
      code: 200,
      message: '获取客户需求成功',
      data: requirements,
    };
  }

  @Get(':id')
  async findOneRequirement(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    const requirement = await this.requirementsService.findOneRequirement(id, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '获取需求详情成功',
      data: requirement,
    };
  }

  @Patch(':id')
  async updateRequirement(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRequirementDto: UpdateRequirementDto,
    @CurrentUser() user: any,
  ) {
    const requirement = await this.requirementsService.updateRequirement(
      id,
      updateRequirementDto,
      user.memberId,
      user.tenantId,
    );
    return {
      code: 200,
      message: '更新需求成功',
      data: requirement,
    };
  }

  @Delete(':id')
  async deleteRequirement(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    await this.requirementsService.deleteRequirement(id, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '删除需求成功',
    };
  }
}

