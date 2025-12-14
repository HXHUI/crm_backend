import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomFieldConfig, CustomFieldType, EntityType, FieldOptions, ValidationRules } from '../../entities/custom-field-config.entity';
import { CreateCustomFieldConfigDto } from './dto/create-custom-field-config.dto';
import { UpdateCustomFieldConfigDto } from './dto/update-custom-field-config.dto';
import { QueryCustomFieldConfigDto } from './dto/query-custom-field-config.dto';

@Injectable()
export class CustomFieldConfigsService {
  constructor(
    @InjectRepository(CustomFieldConfig)
    private readonly configRepository: Repository<CustomFieldConfig>,
  ) {}

  /**
   * 获取租户的所有字段配置
   */
  async findAll(tenantId: number, query: QueryCustomFieldConfigDto) {
    const { entityType, groupName, page = 1, pageSize = 10, keyword } = query;

    const qb = this.configRepository
      .createQueryBuilder('config')
      .where('config.tenantId = :tenantId', { tenantId })
      .andWhere('config.deletedAt IS NULL');

    if (entityType) {
      qb.andWhere('config.entityType = :entityType', { entityType });
    }

    if (groupName) {
      qb.andWhere('config.groupName = :groupName', { groupName });
    }

    if (keyword) {
      qb.andWhere(
        '(config.fieldName LIKE :keyword OR config.fieldCode LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    const [items, total] = await qb
      .orderBy('config.displayOrder', 'ASC')
      .addOrderBy('config.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据ID获取字段配置
   */
  async findOne(id: number, tenantId: number): Promise<CustomFieldConfig> {
    const config = await this.configRepository.findOne({
      where: { id, tenantId },
    });

    if (!config) {
      throw new NotFoundException('字段配置不存在');
    }

    return config;
  }

  /**
   * 根据实体类型获取字段配置（仅返回启用的）
   */
  async getFieldConfigsByEntityType(tenantId: number, entityType: EntityType): Promise<CustomFieldConfig[]> {
    return await this.configRepository.find({
      where: {
        tenantId,
        entityType,
        isActive: true,
      },
      order: {
        displayOrder: 'ASC',
        id: 'ASC',
      },
    });
  }

  /**
   * 创建字段配置
   */
  async create(dto: CreateCustomFieldConfigDto, tenantId: number, createdBy?: number): Promise<CustomFieldConfig> {
    // 检查field_code是否已存在
    const existing = await this.configRepository.findOne({
      where: {
        tenantId,
        entityType: dto.entityType,
        fieldCode: dto.fieldCode,
      },
    });

    if (existing) {
      throw new BadRequestException(`字段编码 ${dto.fieldCode} 已存在`);
    }

    const config = this.configRepository.create({
      ...dto,
      tenantId,
      createdBy,
      isRequired: dto.isRequired ?? false,
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return await this.configRepository.save(config);
  }

  /**
   * 更新字段配置
   */
  async update(id: number, dto: UpdateCustomFieldConfigDto, tenantId: number): Promise<CustomFieldConfig> {
    const config = await this.findOne(id, tenantId);

    // 如果更新了field_code，检查新编码是否已存在
    if (dto.fieldCode && dto.fieldCode !== config.fieldCode) {
      const existing = await this.configRepository.findOne({
        where: {
          tenantId,
          entityType: config.entityType,
          fieldCode: dto.fieldCode,
        },
      });

      if (existing) {
        throw new BadRequestException(`字段编码 ${dto.fieldCode} 已存在`);
      }
    }

    Object.assign(config, dto);
    return await this.configRepository.save(config);
  }

  /**
   * 删除字段配置（软删除）
   */
  async delete(id: number, tenantId: number): Promise<void> {
    const config = await this.findOne(id, tenantId);
    await this.configRepository.softDelete(id);
  }

  /**
   * 根据配置验证字段值
   */
  validateFieldValue(config: CustomFieldConfig, value: any): { valid: boolean; message?: string } {
    // 必填验证
    if (config.isRequired && (value === null || value === undefined || value === '')) {
      return {
        valid: false,
        message: `${config.fieldName} 是必填项`,
      };
    }

    // 如果值为空且不是必填，直接通过
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }

    const rules = config.validationRules;
    if (!rules) {
      return { valid: true };
    }

    // 根据字段类型进行验证
    switch (config.fieldType) {
      case CustomFieldType.TEXT:
      case CustomFieldType.TEXTAREA:
        if (typeof value !== 'string') {
          return { valid: false, message: `${config.fieldName} 必须是字符串类型` };
        }
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          return {
            valid: false,
            message: rules.message || `${config.fieldName} 长度不能少于 ${rules.minLength} 个字符`,
          };
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          return {
            valid: false,
            message: rules.message || `${config.fieldName} 长度不能超过 ${rules.maxLength} 个字符`,
          };
        }
        if (rules.pattern) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            return {
              valid: false,
              message: rules.message || `${config.fieldName} 格式不正确`,
            };
          }
        }
        break;

      case CustomFieldType.NUMBER:
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) {
          return { valid: false, message: `${config.fieldName} 必须是数字类型` };
        }
        if (rules.min !== undefined && numValue < rules.min) {
          return {
            valid: false,
            message: rules.message || `${config.fieldName} 不能小于 ${rules.min}`,
          };
        }
        if (rules.max !== undefined && numValue > rules.max) {
          return {
            valid: false,
            message: rules.message || `${config.fieldName} 不能大于 ${rules.max}`,
          };
        }
        break;

      case CustomFieldType.SELECT:
        if (config.fieldOptions?.sourceType === 'manual' && config.fieldOptions?.options) {
          const validValues = config.fieldOptions.options.map(opt => opt.value);
          if (!validValues.includes(value)) {
            return {
              valid: false,
              message: `${config.fieldName} 的值不在允许的选项中`,
            };
          }
        }
        break;

      case CustomFieldType.MULTISELECT:
        if (!Array.isArray(value)) {
          return { valid: false, message: `${config.fieldName} 必须是数组类型` };
        }
        if (config.fieldOptions?.sourceType === 'manual' && config.fieldOptions?.options) {
          const validValues = config.fieldOptions.options.map(opt => opt.value);
          const invalidValues = value.filter(v => !validValues.includes(v));
          if (invalidValues.length > 0) {
            return {
              valid: false,
              message: `${config.fieldName} 包含无效的选项值`,
            };
          }
        }
        break;

      case CustomFieldType.BOOLEAN:
        if (typeof value !== 'boolean') {
          return { valid: false, message: `${config.fieldName} 必须是布尔类型` };
        }
        break;

      case CustomFieldType.DATE:
      case CustomFieldType.DATETIME:
        // 日期验证可以在这里扩展
        break;
    }

    return { valid: true };
  }

  /**
   * 批量验证扩展字段值
   */
  async validateCustomFields(
    tenantId: number,
    entityType: EntityType,
    customFields: Record<string, any>
  ): Promise<{ valid: boolean; errors: Array<{ field: string; message: string }> }> {
    const configs = await this.getFieldConfigsByEntityType(tenantId, entityType);
    const errors: Array<{ field: string; message: string }> = [];

    for (const config of configs) {
      const value = customFields[config.fieldCode];
      const result = this.validateFieldValue(config, value);
      if (!result.valid) {
        errors.push({
          field: config.fieldCode,
          message: result.message || '验证失败',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

