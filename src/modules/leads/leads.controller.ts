import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService, CreateLeadDto } from './leads.service';
import { SOURCE_OPTIONS } from '../../common/constants/source';

@Controller('leads')
@UseGuards(AuthGuard('jwt'))
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLeadDto, @Request() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const data = await this.leadsService.create(dto, tenantId, memberId);
    return { code: 201, message: '创建线索成功', data };
  }

  @Get()
  async list(@Query('page') page = 1, @Query('limit') limit = 10, @Request() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const data = await this.leadsService.findAll(tenantId, Number(page), Number(limit));
    return { code: 200, message: '获取线索列表成功', data };
  }

  @Get('sources')
  async getSources() {
    return { code: 200, message: 'OK', data: SOURCE_OPTIONS };
  }

  @Post(':id/convert')
  async convert(
    @Param('id') id: string,
    @Body() body: { amount?: number; expectedCloseDate?: string; assignToMemberId?: string },
    @Request() req: any,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const data = await this.leadsService.convert(parseInt(id, 10), tenantId, memberId, { ...body, assignToMemberId: body.assignToMemberId ? parseInt(body.assignToMemberId, 10) : undefined });
    return { code: 200, message: '线索转化成功', data };
  }
}


