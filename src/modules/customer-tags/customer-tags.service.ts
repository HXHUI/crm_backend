import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CustomerTag } from '../../entities/customer-tag.entity';
import { CreateCustomerTagDto, UpdateCustomerTagDto, QueryCustomerTagDto } from './dto/customer-tag.dto';

@Injectable()
export class CustomerTagsService {
  constructor(
    @InjectRepository(CustomerTag)
    private customerTagRepository: Repository<CustomerTag>,
  ) {}

  async create(createDto: CreateCustomerTagDto, tenantId: number): Promise<CustomerTag> {
    // 检查标签名称是否已存在
    const existingTag = await this.customerTagRepository.findOne({
      where: { name: createDto.name, tenantId, deletedAt: null }
    });

    if (existingTag) {
      throw new ConflictException('标签名称已存在');
    }

    const tag = this.customerTagRepository.create({
      ...createDto,
      tenantId,
    });

    return await this.customerTagRepository.save(tag);
  }

  async findAll(queryDto: QueryCustomerTagDto, tenantId: number) {
    try {
      const { name, color, page = 1, limit = 50 } = queryDto;
      const skip = (page - 1) * limit;

      const queryBuilder = this.customerTagRepository
        .createQueryBuilder('tag')
        .where('tag.tenantId = :tenantId', { tenantId })
        .andWhere('tag.deletedAt IS NULL');

      if (name) {
        queryBuilder.andWhere('tag.name LIKE :name', { name: `%${name}%` });
      }

      if (color) {
        queryBuilder.andWhere('tag.color = :color', { color });
      }

      const [tags, total] = await queryBuilder
        .orderBy('tag.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        tags,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('findAll error:', error);
      throw error;
    }
  }

  async findOne(id: number, tenantId: number): Promise<CustomerTag> {
    const tag = await this.customerTagRepository.findOne({
      where: { id, tenantId, deletedAt: null }
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    return tag;
  }

  async update(id: number, updateDto: UpdateCustomerTagDto, tenantId: number): Promise<CustomerTag> {
    const tag = await this.findOne(id, tenantId);

    // 如果更新名称，检查是否与其他标签重名
    if (updateDto.name && updateDto.name !== tag.name) {
      const existingTag = await this.customerTagRepository.findOne({
        where: { name: updateDto.name, tenantId, deletedAt: null }
      });

      if (existingTag) {
        throw new ConflictException('标签名称已存在');
      }
    }

    Object.assign(tag, updateDto);
    return await this.customerTagRepository.save(tag);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const tag = await this.findOne(id, tenantId);
    
    // 软删除
    await this.customerTagRepository.softDelete(id);
  }

  async batchRemove(ids: number[], tenantId: number): Promise<void> {
    // 检查所有标签是否存在
    const tags = await this.customerTagRepository
      .createQueryBuilder('tag')
      .where('tag.id IN (:...ids)', { ids })
      .andWhere('tag.tenantId = :tenantId', { tenantId })
      .andWhere('tag.deletedAt IS NULL')
      .getMany();

    if (tags.length !== ids.length) {
      throw new NotFoundException('部分标签不存在');
    }

    // 批量软删除
    await this.customerTagRepository.softDelete(ids);
  }

  async getTagStats(tenantId: number) {
    const total = await this.customerTagRepository.count({
      where: { tenantId, deletedAt: null }
    });

    const colorStats = await this.customerTagRepository
      .createQueryBuilder('tag')
      .select('tag.color', 'color')
      .addSelect('COUNT(*)', 'count')
      .where('tag.tenantId = :tenantId', { tenantId })
      .andWhere('tag.deletedAt IS NULL')
      .groupBy('tag.color')
      .getRawMany();

    return {
      total,
      colorStats,
    };
  }
}
