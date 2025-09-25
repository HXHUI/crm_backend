import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { CustomerTagsService } from './customer-tags.service';
import { CreateCustomerTagDto, UpdateCustomerTagDto, QueryCustomerTagDto } from './dto/customer-tag.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('customer-tags')
@UseGuards(JwtAuthGuard)
export class CustomerTagsController {
  constructor(private readonly customerTagsService: CustomerTagsService) {}

  @Post()
  async create(@Body() createDto: CreateCustomerTagDto, @Request() req) {
    const tenantId = req.user.tenantId;
    const tag = await this.customerTagsService.create(createDto, tenantId);
    
    return {
      code: 201,
      message: '标签创建成功',
      data: tag,
    };
  }

  @Get()
  async findAll(@Query() queryDto: QueryCustomerTagDto, @Request() req) {
    const tenantId = req.user.tenantId;
    const result = await this.customerTagsService.findAll(queryDto, tenantId);
    
    return {
      code: 200,
      message: '获取标签列表成功',
      data: result,
    };
  }

  @Get('stats')
  async getStats(@Request() req) {
    const tenantId = req.user.tenantId;
    const stats = await this.customerTagsService.getTagStats(tenantId);
    
    return {
      code: 200,
      message: '获取标签统计成功',
      data: stats,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    const tag = await this.customerTagsService.findOne(id, tenantId);
    
    return {
      code: 200,
      message: '获取标签详情成功',
      data: tag,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerTagDto,
    @Request() req
  ) {
    const tenantId = req.user.tenantId;
    const tag = await this.customerTagsService.update(id, updateDto, tenantId);
    
    return {
      code: 200,
      message: '标签更新成功',
      data: tag,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    await this.customerTagsService.remove(id, tenantId);
    
    return {
      code: 200,
      message: '标签删除成功',
    };
  }

  @Delete('batch')
  async batchRemove(@Body() body: { ids: string[] }, @Request() req) {
    const tenantId = req.user.tenantId;
    await this.customerTagsService.batchRemove(body.ids, tenantId);
    
    return {
      code: 200,
      message: '批量删除标签成功',
    };
  }
}
