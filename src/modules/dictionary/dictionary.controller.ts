import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DictionaryService } from './dictionary.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateDictTypeDto } from './dto/create-dict-type.dto';
import { UpdateDictTypeDto } from './dto/update-dict-type.dto';
import { CreateDictItemDto } from './dto/create-dict-item.dto';
import { UpdateDictItemDto } from './dto/update-dict-item.dto';

@Controller('dictionaries')
@UseGuards(AuthGuard('jwt'))
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get('types')
  async getTypes(
    @Query('search') search: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.dictionaryService.findTypes(tenantId, {
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      code: 200,
      message: '获取字典类型列表成功',
      data: result,
    };
  }

  @Post('types')
  @HttpCode(HttpStatus.CREATED)
  async createType(
    @Body() dto: CreateDictTypeDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.dictionaryService.createType(tenantId, dto);
    return {
      code: 201,
      message: '创建字典类型成功',
      data: result,
    };
  }

  @Put('types/:id')
  async updateType(
    @Param('id') id: string,
    @Body() dto: UpdateDictTypeDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.dictionaryService.updateType(tenantId, parseInt(id, 10), dto);
    return {
      code: 200,
      message: '更新字典类型成功',
      data: result,
    };
  }

  @Delete('types/:id')
  async deleteType(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.dictionaryService.deleteType(tenantId, parseInt(id, 10));
    return {
      code: 200,
      message: '删除字典类型成功',
    };
  }

  @Get('items/tree')
  async getItemsTree(
    @Query('typeCode') typeCode: string | undefined,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.dictionaryService.findItemsTree(tenantId, typeCode || '');
    return {
      code: 200,
      message: '获取字典项树成功',
      data: result,
    };
  }

  @Get('items')
  async getItems(
    @Query('typeCode') typeCode: string | undefined,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.dictionaryService.findItems(tenantId, typeCode || '');
    return {
      code: 200,
      message: '获取字典项列表成功',
      data: result,
    };
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async createItem(
    @Body() dto: CreateDictItemDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.dictionaryService.createItem(tenantId, dto);
    return {
      code: 201,
      message: '创建字典项成功',
      data: result,
    };
  }

  @Put('items/:id')
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateDictItemDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.dictionaryService.updateItem(tenantId, parseInt(id, 10), dto);
    return {
      code: 200,
      message: '更新字典项成功',
      data: result,
    };
  }

  @Delete('items/:id')
  async deleteItem(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.dictionaryService.deleteItem(tenantId, parseInt(id, 10));
    return {
      code: 200,
      message: '删除字典项成功',
    };
  }
}


