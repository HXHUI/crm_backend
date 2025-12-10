import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DictType, DictStatus } from '../../entities/dict-type.entity';
import { DictItem } from '../../entities/dict-item.entity';
import { CreateDictTypeDto } from './dto/create-dict-type.dto';
import { UpdateDictTypeDto } from './dto/update-dict-type.dto';
import { CreateDictItemDto } from './dto/create-dict-item.dto';
import { UpdateDictItemDto } from './dto/update-dict-item.dto';

@Injectable()
export class DictionaryService {
  constructor(
    @InjectRepository(DictType)
    private readonly dictTypeRepository: Repository<DictType>,
    @InjectRepository(DictItem)
    private readonly dictItemRepository: Repository<DictItem>,
  ) {}

  async findTypes(tenantId: number, query: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 50 } = query;

    const qb = this.dictTypeRepository
      .createQueryBuilder('type')
      .where('(type.tenantId IS NULL OR type.tenantId = :tenantId)', { tenantId });

    if (search) {
      qb.andWhere('(type.code LIKE :search OR type.name LIKE :search)', { search: `%${search}%` });
    }

    const [items, total] = await qb
      .orderBy('type.tenantId', 'ASC')
      .addOrderBy('type.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createType(tenantId: number, dto: CreateDictTypeDto) {
    const existing = await this.dictTypeRepository.findOne({
      where: [
        { tenantId: null, code: dto.code },
        { tenantId, code: dto.code },
      ],
    });

    if (existing) {
      throw new BadRequestException('字典类型编码已存在');
    }

    const type = this.dictTypeRepository.create({
      tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      status: (dto.status as DictStatus) || DictStatus.ACTIVE,
    });

    return await this.dictTypeRepository.save(type);
  }

  async updateType(tenantId: number, id: number, dto: UpdateDictTypeDto) {
    const type = await this.dictTypeRepository.findOne({ where: { id } });

    if (!type) {
      throw new NotFoundException('字典类型不存在');
    }

    // 系统级类型只允许修改部分字段
    if (type.tenantId === null || type.tenantId === undefined) {
      if (dto.code && dto.code !== type.code) {
        throw new ForbiddenException('系统级字典类型不允许修改编码');
      }
    } else {
      // 确保类型一致后比较
      const typeTenantId = typeof type.tenantId === 'string' ? parseInt(type.tenantId, 10) : type.tenantId;
      const currentTenantId = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
      if (typeTenantId !== currentTenantId) {
        throw new ForbiddenException('无权限修改其他租户的字典类型');
      }
    }

    if (dto.name !== undefined) {
      type.name = dto.name;
    }

    if (dto.description !== undefined) {
      type.description = dto.description;
    }

    if (dto.status !== undefined) {
      type.status = dto.status as DictStatus;
    }

    return await this.dictTypeRepository.save(type);
  }

  async deleteType(tenantId: number, id: number) {
    const type = await this.dictTypeRepository.findOne({ where: { id } });

    if (!type) {
      throw new NotFoundException('字典类型不存在');
    }

    // 系统级字典类型不允许删除
    if (type.tenantId === null || type.tenantId === undefined) {
      throw new ForbiddenException('系统级字典类型不允许删除');
    }

    // 确保类型一致后比较（处理可能的字符串/数字类型不一致问题）
    const typeTenantId = typeof type.tenantId === 'string' ? parseInt(type.tenantId, 10) : type.tenantId;
    const currentTenantId = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;

    if (typeTenantId !== currentTenantId) {
      throw new ForbiddenException('无权限删除其他租户的字典类型');
    }

    const itemCount = await this.dictItemRepository.count({
      where: { typeCode: type.code, tenantId },
    });

    if (itemCount > 0) {
      throw new BadRequestException('该字典类型下仍有字典项，不能删除');
    }

    await this.dictTypeRepository.delete(id);
  }

  async findItems(tenantId: number, typeCode: string) {
    if (!typeCode) {
      throw new BadRequestException('必须提供字典类型编码');
    }

    const items = await this.dictItemRepository.find({
      where: [
        { typeCode, tenantId: null },
        { typeCode, tenantId },
      ],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return items;
  }

  async findItemsTree(tenantId: number, typeCode: string) {
    if (!typeCode) {
      throw new BadRequestException('必须提供字典类型编码');
    }

    const items = await this.dictItemRepository.find({
      where: [
        { typeCode, tenantId: null },
        { typeCode, tenantId },
      ],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    const nodeMap = new Map<number, any>();
    const roots: any[] = [];

    items.forEach((item) => {
      // 确保 ID 和 parentId 都是数字类型
      const itemId = typeof item.id === 'string' ? parseInt(item.id, 10) : Number(item.id);
      const parentId = item.parentId 
        ? (typeof item.parentId === 'string' ? parseInt(item.parentId, 10) : Number(item.parentId))
        : null;
      
      nodeMap.set(itemId, {
        id: itemId,
        tenantId: item.tenantId,
        typeCode: item.typeCode,
        value: item.value,
        label: item.label,
        parentId: parentId,
        sortOrder: item.sortOrder,
        status: item.status,
        children: [],
      });
    });

    nodeMap.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async createItem(tenantId: number, dto: CreateDictItemDto) {
    if (!dto.typeCode) {
      throw new BadRequestException('必须提供字典类型编码');
    }

    const type = await this.dictTypeRepository.findOne({
      where: [
        { code: dto.typeCode, tenantId: null },
        { code: dto.typeCode, tenantId },
      ],
    });

    if (!type) {
      throw new NotFoundException('字典类型不存在');
    }

    const existing = await this.dictItemRepository.findOne({
      where: [
        { typeCode: dto.typeCode, tenantId: null, value: dto.value },
        { typeCode: dto.typeCode, tenantId, value: dto.value },
      ],
    });

    if (existing) {
      throw new BadRequestException('同一字典类型下编码值已存在');
    }

    // 确保 parentId 是数字类型
    let parentId: number | null = null;
    if (dto.parentId !== undefined && dto.parentId !== null) {
      parentId = typeof dto.parentId === 'string' ? parseInt(dto.parentId, 10) : Number(dto.parentId);
      if (isNaN(parentId)) {
        throw new BadRequestException('父级字典项ID格式错误');
      }
      
      const parent = await this.dictItemRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException('父级字典项不存在');
      }
      if (parent.typeCode !== dto.typeCode) {
        throw new BadRequestException('父级字典项与当前类型不匹配');
      }
    }

    const item = this.dictItemRepository.create({
      tenantId,
      typeCode: dto.typeCode,
      value: dto.value,
      label: dto.label,
      parentId: parentId,
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status ?? 'active',
    });

    return await this.dictItemRepository.save(item);
  }

  async updateItem(tenantId: number, id: number, dto: UpdateDictItemDto) {
    const item = await this.dictItemRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('字典项不存在');
    }

    // 系统级字典项只能修改部分字段
    if (item.tenantId === null || item.tenantId === undefined) {
      if (dto.typeCode && dto.typeCode !== item.typeCode) {
        throw new ForbiddenException('系统级字典项不允许修改类型编码');
      }
      if (dto.value && dto.value !== item.value) {
        throw new ForbiddenException('系统级字典项不允许修改编码值');
      }
    } else {
      // 确保类型一致后比较
      const itemTenantId = typeof item.tenantId === 'string' ? parseInt(item.tenantId, 10) : item.tenantId;
      const currentTenantId = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
      if (itemTenantId !== currentTenantId) {
        throw new ForbiddenException('无权限修改其他租户的字典项');
      }
    }

    if (dto.label !== undefined) {
      item.label = dto.label;
    }

    if (dto.sortOrder !== undefined) {
      item.sortOrder = dto.sortOrder;
    }

    if (dto.status !== undefined) {
      item.status = dto.status;
    }

    if (dto.parentId !== undefined) {
      // 确保 parentId 是数字类型
      let parentId: number | null = null;
      if (dto.parentId !== null) {
        parentId = typeof dto.parentId === 'string' ? parseInt(dto.parentId, 10) : Number(dto.parentId);
        if (isNaN(parentId)) {
          throw new BadRequestException('父级字典项ID格式错误');
        }
        
        if (parentId === item.id) {
          throw new BadRequestException('不能将父级设置为自己');
        }
        
        const parent = await this.dictItemRepository.findOne({ where: { id: parentId } });
        if (!parent) {
          throw new NotFoundException('父级字典项不存在');
        }
        if (parent.typeCode !== item.typeCode) {
          throw new BadRequestException('父级字典项与当前类型不匹配');
        }
      }
      item.parentId = parentId;
    }

    return await this.dictItemRepository.save(item);
  }

  async deleteItem(tenantId: number, id: number) {
    const item = await this.dictItemRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('字典项不存在');
    }

    // 系统级字典项不允许删除
    if (item.tenantId === null || item.tenantId === undefined) {
      throw new ForbiddenException('系统级字典项不允许删除');
    }

    // 确保类型一致后比较
    const itemTenantId = typeof item.tenantId === 'string' ? parseInt(item.tenantId, 10) : item.tenantId;
    const currentTenantId = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;

    if (itemTenantId !== currentTenantId) {
      throw new ForbiddenException('无权限删除其他租户的字典项');
    }

    const childCount = await this.dictItemRepository.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException('该字典项存在子项，不能删除');
    }

    await this.dictItemRepository.delete(id);
  }
}


