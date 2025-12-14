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
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomFieldConfigsService } from './custom-field-configs.service';
import { CreateCustomFieldConfigDto } from './dto/create-custom-field-config.dto';
import { UpdateCustomFieldConfigDto } from './dto/update-custom-field-config.dto';
import { QueryCustomFieldConfigDto } from './dto/query-custom-field-config.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EntityType } from '../../entities/custom-field-config.entity';

@Controller('custom-field-configs')
@UseGuards(AuthGuard('jwt'))
export class CustomFieldConfigsController {
  constructor(private readonly customFieldConfigsService: CustomFieldConfigsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateCustomFieldConfigDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const createdBy = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    
    const config = await this.customFieldConfigsService.create(createDto, tenantId, createdBy);
    return {
      code: 201,
      message: '创建字段配置成功',
      data: config,
    };
  }

  @Get()
  async findAll(
    @Query() query: QueryCustomFieldConfigDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.customFieldConfigsService.findAll(tenantId, query);
    return {
      code: 200,
      message: '获取字段配置列表成功',
      data: result,
    };
  }

  @Get('entity/:entityType')
  async findByEntityType(
    @Param('entityType') entityType: EntityType,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const configs = await this.customFieldConfigsService.getFieldConfigsByEntityType(tenantId, entityType);
    return {
      code: 200,
      message: '获取字段配置成功',
      data: configs,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const configId = parseInt(id, 10);
    if (isNaN(configId) || configId <= 0) {
      throw new BadRequestException('无效的配置ID');
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const config = await this.customFieldConfigsService.findOne(configId, tenantId);
    return {
      code: 200,
      message: '获取字段配置成功',
      data: config,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomFieldConfigDto,
    @CurrentUser() user: any,
  ) {
    const configId = parseInt(id, 10);
    if (isNaN(configId) || configId <= 0) {
      throw new BadRequestException('无效的配置ID');
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const config = await this.customFieldConfigsService.update(configId, updateDto, tenantId);
    return {
      code: 200,
      message: '更新字段配置成功',
      data: config,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const configId = parseInt(id, 10);
    if (isNaN(configId) || configId <= 0) {
      throw new BadRequestException('无效的配置ID');
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.customFieldConfigsService.delete(configId, tenantId);
    return {
      code: 200,
      message: '删除字段配置成功',
    };
  }
}

