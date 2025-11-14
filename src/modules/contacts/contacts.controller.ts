import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto, QueryContactDto } from './dto/contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async create(@Body() createDto: CreateContactDto, @Request() req) {
    const tenantId = req.user.tenantId;
    const contact = await this.contactsService.create(createDto, tenantId);
    
    return {
      code: 201,
      message: '联系人创建成功',
      data: contact,
    };
  }

  @Get()
  async findAll(@Query() queryDto: QueryContactDto, @Request() req) {
    const tenantId = req.user.tenantId;
    const result = await this.contactsService.findAll(queryDto, tenantId);
    
    return {
      code: 200,
      message: '获取联系人列表成功',
      data: result,
    };
  }

  @Get('stats')
  async getStats(@Request() req) {
    const tenantId = req.user.tenantId;
    const stats = await this.contactsService.getContactStats(tenantId);
    
    return {
      code: 200,
      message: '获取联系人统计成功',
      data: stats,
    };
  }

  @Get('customer/:customerId')
  async getContactsByCustomer(@Param('customerId') customerId: string, @Request() req) {
    const tenantId = req.user.tenantId;
    const contacts = await this.contactsService.getContactsByCustomer(parseInt(customerId, 10), tenantId);
    
    return {
      code: 200,
      message: '获取客户联系人成功',
      data: contacts,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    const contact = await this.contactsService.findOne(parseInt(id, 10), tenantId);
    
    return {
      code: 200,
      message: '获取联系人详情成功',
      data: contact,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateContactDto,
    @Request() req
  ) {
    const tenantId = req.user.tenantId;
    const contact = await this.contactsService.update(parseInt(id, 10), updateDto, tenantId);
    
    return {
      code: 200,
      message: '联系人更新成功',
      data: contact,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    await this.contactsService.remove(parseInt(id, 10), tenantId);
    
    return {
      code: 200,
      message: '联系人删除成功',
    };
  }

  @Delete('batch')
  async batchRemove(@Body() body: { ids: string[] }, @Request() req) {
    const tenantId = req.user.tenantId;
    await this.contactsService.batchRemove(body.ids.map(id => parseInt(id, 10)), tenantId);
    
    return {
      code: 200,
      message: '批量删除联系人成功',
    };
  }
}
