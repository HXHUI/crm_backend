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
  Request,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  CustomerCompetitorsService,
  CreateCompetitorDto,
  UpdateCompetitorDto,
} from './customer-competitors.service'
import { RelatedType } from '../../entities/customer-competitor.entity'

@Controller('customer-competitors')
@UseGuards(AuthGuard('jwt'))
export class CustomerCompetitorsController {
  constructor(private readonly competitorsService: CustomerCompetitorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCompetitorDto, @Request() req: any) {
    const tenantId =
      typeof req.user?.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user?.tenantId
    const data = await this.competitorsService.create(dto, tenantId)
    return { code: 201, message: '创建竞品成功', data }
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('relatedType') relatedType?: RelatedType,
    @Query('relatedId') relatedId?: string,
  ) {
    const tenantId =
      typeof req.user?.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user?.tenantId
    const data = await this.competitorsService.findAll({
      tenantId,
      relatedType: relatedType as RelatedType | undefined,
      relatedId: relatedId ? parseInt(relatedId, 10) : undefined,
    })
    return { code: 200, message: 'OK', data }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId =
      typeof req.user?.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user?.tenantId
    const data = await this.competitorsService.findOne(parseInt(id, 10), tenantId)
    return { code: 200, message: 'OK', data }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCompetitorDto, @Request() req: any) {
    const tenantId =
      typeof req.user?.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user?.tenantId
    const data = await this.competitorsService.update(parseInt(id, 10), dto, tenantId)
    return { code: 200, message: '更新竞品成功', data }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Request() req: any) {
    const tenantId =
      typeof req.user?.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user?.tenantId
    const data = await this.competitorsService.remove(parseInt(id, 10), tenantId)
    return { code: 200, message: '删除竞品成功', data }
  }
}

