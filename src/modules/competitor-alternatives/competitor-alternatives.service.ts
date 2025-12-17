import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  CompetitorAlternative,
  CompetitorAlternativeRelatedType,
  CustomerCompetitor,
} from '../../entities';

interface QueryAlternativesDto {
  competitorId: number;
  relatedType?: CompetitorAlternativeRelatedType | string;
  relatedId?: number;
}

interface CreateAlternativeDto {
  competitorId: number;
  relatedType?: CompetitorAlternativeRelatedType | string;
  relatedId?: number;
  productId?: number | null;
  productName: string;
  spec?: string | null;
  unit?: string | null;
  unitPrice?: number | null;
  annualPotentialAmount?: number | null;
  advantages?: string | null;
  disadvantages?: string | null;
  strategy?: string | null;
  notes?: string | null;
}

interface UpdateAlternativeDto extends Partial<CreateAlternativeDto> {}

@Injectable()
export class CompetitorAlternativesService {
  constructor(
    @InjectRepository(CompetitorAlternative)
    private readonly alternativeRepo: Repository<CompetitorAlternative>,
    @InjectRepository(CustomerCompetitor)
    private readonly competitorRepo: Repository<CustomerCompetitor>,
  ) {}

  async ensureCompetitorExists(competitorId: number, tenantId: number): Promise<CustomerCompetitor> {
    const competitor = await this.competitorRepo.findOne({
      where: { id: competitorId, tenantId },
    });
    if (!competitor) {
      throw new NotFoundException('意向竞品不存在');
    }
    return competitor;
  }

  async findAll(query: QueryAlternativesDto, tenantId: number): Promise<CompetitorAlternative[]> {
    const where: FindOptionsWhere<CompetitorAlternative> = {
      tenantId,
      competitorId: query.competitorId,
    };

    if (query.relatedType) {
      where.relatedType = query.relatedType as CompetitorAlternativeRelatedType;
    }
    if (query.relatedId) {
      where.relatedId = query.relatedId;
    }

    return this.alternativeRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateAlternativeDto, tenantId: number): Promise<CompetitorAlternative> {
    await this.ensureCompetitorExists(dto.competitorId, tenantId);

    const entity = this.alternativeRepo.create({
      tenantId,
      competitorId: dto.competitorId,
      relatedType: dto.relatedType as CompetitorAlternativeRelatedType,
      relatedId: dto.relatedId,
      productId: dto.productId ?? null,
      productName: dto.productName,
      spec: dto.spec ?? null,
      unit: dto.unit ?? null,
      unitPrice: dto.unitPrice ?? null,
      annualPotentialAmount: dto.annualPotentialAmount ?? null,
      advantages: dto.advantages ?? null,
      disadvantages: dto.disadvantages ?? null,
      strategy: dto.strategy ?? null,
      notes: dto.notes ?? null,
    });

    return this.alternativeRepo.save(entity);
  }

  async findOne(id: number, tenantId: number): Promise<CompetitorAlternative> {
    const entity = await this.alternativeRepo.findOne({
      where: { id, tenantId },
    });
    if (!entity) {
      throw new NotFoundException('可替代产品不存在');
    }
    return entity;
  }

  async update(
    id: number,
    dto: UpdateAlternativeDto,
    tenantId: number,
  ): Promise<CompetitorAlternative> {
    const entity = await this.findOne(id, tenantId);

    if (dto.competitorId && dto.competitorId !== entity.competitorId) {
      await this.ensureCompetitorExists(dto.competitorId, tenantId);
      entity.competitorId = dto.competitorId;
    }

    if (dto.relatedType !== undefined) {
      entity.relatedType = dto.relatedType as CompetitorAlternativeRelatedType;
    }
    if (dto.relatedId !== undefined) {
      entity.relatedId = dto.relatedId;
    }

    if (dto.productId !== undefined) entity.productId = dto.productId;
    if (dto.productName !== undefined) entity.productName = dto.productName;
    if (dto.spec !== undefined) entity.spec = dto.spec;
    if (dto.unit !== undefined) entity.unit = dto.unit;
    if (dto.unitPrice !== undefined) entity.unitPrice = dto.unitPrice;
    if (dto.annualPotentialAmount !== undefined) {
      entity.annualPotentialAmount = dto.annualPotentialAmount;
    }
    if (dto.advantages !== undefined) entity.advantages = dto.advantages;
    if (dto.disadvantages !== undefined) entity.disadvantages = dto.disadvantages;
    if (dto.strategy !== undefined) entity.strategy = dto.strategy;
    if (dto.notes !== undefined) entity.notes = dto.notes;

    return this.alternativeRepo.save(entity);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const entity = await this.findOne(id, tenantId);
    await this.alternativeRepo.softRemove(entity);
  }
}


