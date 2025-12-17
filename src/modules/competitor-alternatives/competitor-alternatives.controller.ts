import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { CompetitorAlternativesService } from './competitor-alternatives.service';
import { CompetitorAlternativeRelatedType } from '../../entities';

@Controller('competitor-alternatives')
export class CompetitorAlternativesController {
  constructor(private readonly service: CompetitorAlternativesService) {}

  @Get()
  async list(
    @Query('competitorId', ParseIntPipe) competitorId: number,
    @Query('relatedType') relatedType: CompetitorAlternativeRelatedType | string,
    @Query('relatedId') relatedId: string,
    @Request() req: any,
  ) {
    const tenantId =
      typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;

    const items = await this.service.findAll(
      {
        competitorId,
        relatedType,
        relatedId: relatedId ? Number(relatedId) : undefined,
      },
      tenantId,
    );

    return { code: 200, message: 'OK', data: items };
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const tenantId =
      typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;

    const created = await this.service.create(
      {
        competitorId: Number(body.competitorId),
        relatedType: body.relatedType as CompetitorAlternativeRelatedType,
        relatedId: body.relatedId ? Number(body.relatedId) : undefined,
        productId: body.productId ? Number(body.productId) : null,
        productName: body.productName,
        spec: body.spec,
        unit: body.unit,
        unitPrice: body.unitPrice !== undefined ? Number(body.unitPrice) : null,
        annualPotentialAmount:
          body.annualPotentialAmount !== undefined ? Number(body.annualPotentialAmount) : null,
        advantages: body.advantages,
        disadvantages: body.disadvantages,
        strategy: body.strategy,
        notes: body.notes,
      },
      tenantId,
    );

    return { code: 200, message: 'OK', data: created };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: any,
  ) {
    const tenantId =
      typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;

    const updated = await this.service.update(
      id,
      {
        competitorId: body.competitorId ? Number(body.competitorId) : undefined,
        relatedType: body.relatedType,
        relatedId: body.relatedId ? Number(body.relatedId) : undefined,
        productId: body.productId !== undefined ? Number(body.productId) : undefined,
        productName: body.productName,
        spec: body.spec,
        unit: body.unit,
        unitPrice: body.unitPrice !== undefined ? Number(body.unitPrice) : undefined,
        annualPotentialAmount:
          body.annualPotentialAmount !== undefined ? Number(body.annualPotentialAmount) : undefined,
        advantages: body.advantages,
        disadvantages: body.disadvantages,
        strategy: body.strategy,
        notes: body.notes,
      },
      tenantId,
    );

    return { code: 200, message: 'OK', data: updated };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const tenantId =
      typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    await this.service.remove(id, tenantId);
    return { code: 200, message: 'OK' };
  }
}


