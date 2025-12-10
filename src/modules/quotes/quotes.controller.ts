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
import { QuotesService, CreateQuoteDto, UpdateQuoteDto, QueryQuoteDto } from './quotes.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('quotes')
@UseGuards(AuthGuard('jwt'))
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createQuote(@Body() createQuoteDto: CreateQuoteDto, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const departmentId = user.currentDepartmentId 
      ? (typeof user.currentDepartmentId === 'string' ? parseInt(user.currentDepartmentId, 10) : user.currentDepartmentId)
      : undefined;
    const quote = await this.quotesService.createQuote(createQuoteDto, memberId, tenantId, departmentId);
    return {
      code: 201,
      message: '创建报价成功',
      data: quote
    };
  }

  @Get()
  async findAllQuotes(
    @Query() query: QueryQuoteDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.quotesService.findAllQuotes(query, memberId, tenantId);
    return {
      code: 200,
      message: '获取报价列表成功',
      data: result
    };
  }

  @Get(':id')
  async findQuoteById(@Param('id') id: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const quote = await this.quotesService.findQuoteById(parseInt(id, 10), memberId, tenantId);
    return {
      code: 200,
      message: '获取报价详情成功',
      data: quote
    };
  }

  @Patch(':id')
  async updateQuote(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const quote = await this.quotesService.updateQuote(parseInt(id, 10), updateQuoteDto, memberId, tenantId);
    return {
      code: 200,
      message: '更新报价成功',
      data: quote
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteQuote(@Param('id') id: string, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.quotesService.deleteQuote(parseInt(id, 10), memberId, tenantId);
    return {
      code: 200,
      message: '删除报价成功'
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
    const instance = await this.quotesService.submitApproval(
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
    const instance = await this.quotesService.getApprovalInstance(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '获取审批实例成功',
      data: instance,
    };
  }
}

