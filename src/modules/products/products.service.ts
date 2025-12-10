import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from '../../entities/product.entity';
import { TenantService, TenantProductConfig } from '../tenant/tenant.service';
import { DictionaryService } from '../dictionary/dictionary.service';

export interface CreateProductDto {
  name: string;
  code?: string;
  category?: string;
  specification?: string;
  unit?: string;
  auxiliaryUnits?: Array<{
    unit: string;
    conversionRate: number;
    purpose: 'sales' | 'purchase' | 'internal' | 'external';
    description?: string;
  }>;
  price?: number;
  costPrice?: number;
  status?: ProductStatus;
  mainImage?: string;
  detailImages?: string[];
  description?: string;
  // 动态分类字段（前端会根据租户配置动态添加）
  [key: string]: any;
}

export interface UpdateProductDto {
  name?: string;
  code?: string;
  category?: string;
  specification?: string;
  unit?: string;
  auxiliaryUnits?: Array<{
    unit: string;
    conversionRate: number;
    purpose: 'sales' | 'purchase' | 'internal' | 'external';
    description?: string;
  }>;
  price?: number;
  costPrice?: number;
  status?: ProductStatus;
  mainImage?: string;
  detailImages?: string[];
  description?: string;
  // 动态分类字段（前端会根据租户配置动态添加）
  [key: string]: any;
}

export interface QueryProductDto {
  search?: string;
  category?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly tenantService: TenantService,
    private readonly dictionaryService: DictionaryService,
  ) {}

  /**
   * 根据租户产品配置为产品生成编码（如果未手工填写）
   */
  private async generateProductCodeIfNeeded(
    createProductDto: CreateProductDto,
    tenantId: number,
  ): Promise<string | undefined> {
    // 如果用户已手动填写编码，则不自动生成
    if (createProductDto.code && createProductDto.code.trim()) {
      return createProductDto.code.trim();
    }

    // 读取租户产品配置
    let productConfig: TenantProductConfig;
    try {
      productConfig = await this.tenantService.getProductConfig(tenantId);
    } catch {
      // 没有配置则不生成
      return undefined;
    }

    const rule = productConfig.codeRule;
    if (!rule || !rule.segments || rule.segments.length === 0) {
      return undefined;
    }

    // 从 createProductDto 中提取所有分类字段的值
    const fieldCodes: Record<string, string> = {};
    if (productConfig.categoryFields && productConfig.categoryFields.length > 0) {
      for (const field of productConfig.categoryFields) {
        const value = createProductDto[field.fieldKey];
        if (value !== undefined && value !== null && value !== '') {
          fieldCodes[field.fieldKey] = String(value);
        }
      }
    }
    // 兼容旧版本：如果只有一个 category 字段，也使用它
    if (createProductDto.category && Object.keys(fieldCodes).length === 0) {
      if (productConfig.categoryFields.length > 0) {
        const firstField = productConfig.categoryFields[0];
        fieldCodes[firstField.fieldKey] = createProductDto.category;
      }
    }

    // 获取当前已存在的产品数量，用于生成简单流水号（每个租户内全局递增）
    const existingCount = await this.productRepository.count({
      where: { tenantId },
    });
    const nextSeq = existingCount + 1;

    const now = new Date();

    const formatDate = (date: Date, format: string): string => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      return format
        .replace(/YYYY/g, year.toString())
        .replace(/YY/g, year.toString().slice(-2))
        .replace(/MM/g, pad(month))
        .replace(/DD/g, pad(day));
    };

    const applyPadding = (value: string, length?: number, padChar?: string, direction?: 'LEFT' | 'RIGHT') => {
      if (!length || value.length >= length) return value;
      const char = padChar && padChar.length > 0 ? padChar : '0';
      const diff = length - value.length;
      const padStr = char.repeat(diff);
      if (direction === 'RIGHT') {
        return value + padStr;
      }
      return padStr + value;
    };

    const parts: string[] = [];

    for (const segment of rule.segments) {
      const { segmentType, segmentValue, length, padChar, padDirection } = segment;

      switch (segmentType) {
        case 'CONST': {
          parts.push(segmentValue || '');
          break;
        }
        case 'SEP': {
          parts.push(segmentValue || '');
          break;
        }
        case 'FIELD': {
          const code = fieldCodes[segmentValue] || '';
          parts.push(applyPadding(code, length, padChar, padDirection));
          break;
        }
        case 'DATE': {
          const fmt = segmentValue || 'YYYYMMDD';
          const dateStr = formatDate(now, fmt);
          parts.push(applyPadding(dateStr, length, padChar, padDirection));
          break;
        }
        case 'SEQ': {
          const seqStr = nextSeq.toString();
          const padded = applyPadding(seqStr, length || 4, padChar, padDirection || 'LEFT');
          parts.push(padded);
          break;
        }
        default:
          break;
      }
    }

    const code = parts.join('');
    return code || undefined;
  }

  /**
   * 根据租户产品配置为产品生成名称（如果未手工填写）
   */
  private async generateProductNameIfNeeded(
    createProductDto: CreateProductDto,
    tenantId: number,
  ): Promise<string | undefined> {
    // 如果用户已手动填写名称，则不自动生成
    if (createProductDto.name && createProductDto.name.trim()) {
      return createProductDto.name.trim();
    }

    // 读取租户产品配置
    let productConfig: TenantProductConfig;
    try {
      productConfig = await this.tenantService.getProductConfig(tenantId);
    } catch {
      // 没有配置则不生成
      return undefined;
    }

    const rule = productConfig.nameRule;
    if (!rule || !rule.segments || rule.segments.length === 0) {
      return undefined;
    }

    // 从 createProductDto 中提取所有分类字段的值
    const fieldValues: Record<string, string> = {};
    if (productConfig.categoryFields && productConfig.categoryFields.length > 0) {
      for (const field of productConfig.categoryFields) {
        const value = createProductDto[field.fieldKey];
        if (value !== undefined && value !== null && value !== '') {
          fieldValues[field.fieldKey] = String(value);
        }
      }
    }

    // 获取字段的显示名称（从字典或categoryValues中查找）
    const getFieldDisplayName = async (fieldKey: string, fieldValue: string): Promise<string> => {
      const field = productConfig.categoryFields.find((f) => f.fieldKey === fieldKey);
      if (!field) return fieldValue;

      // 如果字段关联了字典类型，从字典中查找显示名称
      if (field.dictTypeCode) {
        try {
          const items = await this.dictionaryService.findItemsTree(tenantId, field.dictTypeCode);
          
          const findItem = (nodes: any[]): any => {
            for (const node of nodes) {
              const nodeValue = node.value || String(node.id);
              if (nodeValue === fieldValue) {
                return node;
              }
              if (node.children && node.children.length > 0) {
                const found = findItem(node.children);
                if (found) return found;
              }
            }
            return null;
          };
          
          const item = findItem(items);
          if (item) {
            return item.label || fieldValue;
          }
        } catch {
          // 如果查找失败，继续使用其他方式
        }
      }

      // 从 categoryValues 中查找
      if (productConfig.categoryValues) {
        const value = productConfig.categoryValues.find(
          (v) => v.fieldKey === fieldKey && (v.valueCode === fieldValue || v.valueId === fieldValue),
        );
        if (value) {
          return value.valueName || fieldValue;
        }
      }

      return fieldValue;
    };

    const parts: string[] = [];

    for (const segment of rule.segments) {
      const { segmentType, segmentValue } = segment;

      switch (segmentType) {
        case 'CONST': {
          parts.push(segmentValue || '');
          break;
        }
        case 'SEP': {
          parts.push(segmentValue || '');
          break;
        }
        case 'FIELD': {
          const fieldValue = fieldValues[segmentValue] || '';
          if (fieldValue) {
            const displayName = await getFieldDisplayName(segmentValue, fieldValue);
            parts.push(displayName);
          }
          break;
        }
        default:
          break;
      }
    }

    const name = parts.join('');
    return name || undefined;
  }

  async createProduct(createProductDto: CreateProductDto, tenantId: number, memberId: number) {
    // 验证详情图数量不超过9张
    if (createProductDto.detailImages && createProductDto.detailImages.length > 9) {
      throw new BadRequestException('详情图最多只能上传9张');
    }

    // 根据配置自动生成产品名称（如果未填写）
    const autoName = await this.generateProductNameIfNeeded(createProductDto, tenantId);
    
    // 根据配置自动生成产品编码（如果未填写）
    const autoCode = await this.generateProductCodeIfNeeded(createProductDto, tenantId);

    // 获取租户产品配置，提取动态分类字段
    let categoryFields: Record<string, string> | undefined;
    try {
      const productConfig = await this.tenantService.getProductConfig(tenantId);
      if (productConfig.categoryFields && productConfig.categoryFields.length > 0) {
        categoryFields = {};
        for (const field of productConfig.categoryFields) {
          const value = createProductDto[field.fieldKey];
          if (value !== undefined && value !== null && value !== '') {
            categoryFields[field.fieldKey] = String(value);
          }
        }
      }
    } catch {
      // 没有配置则忽略
    }

    // 提取标准字段
    const {
      name,
      code,
      category,
      specification,
      unit,
      auxiliaryUnits,
      price,
      costPrice,
      status,
      mainImage,
      detailImages,
      description,
    } = createProductDto;

    const product = this.productRepository.create({
      name: autoName ?? name,
      code: autoCode ?? code,
      category,
      specification,
      unit,
      auxiliaryUnits,
      price,
      costPrice,
      status,
      mainImage,
      detailImages,
      description,
      categoryFields: Object.keys(categoryFields || {}).length > 0 ? categoryFields : undefined,
      tenantId,
      createdBy: memberId,
    });

    return await this.productRepository.save(product);
  }

  async findAllProducts(query: QueryProductDto, tenantId: number) {
    const { search, category, status, page = 1, limit = 50, ...restQuery } = query;

    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.code LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // 分类筛选（兼容旧版本）
    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }

    // 动态分类字段筛选（从 categoryFields JSON 字段中查询）
    // 获取租户产品配置，确定哪些是分类字段
    try {
      const productConfig = await this.tenantService.getProductConfig(tenantId);
      if (productConfig.categoryFields && productConfig.categoryFields.length > 0) {
        for (const field of productConfig.categoryFields) {
          const fieldValue = restQuery[field.fieldKey];
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
            // 使用 JSON_EXTRACT 或 JSON_CONTAINS 查询 JSON 字段
            // MySQL 5.7+ 支持 JSON_EXTRACT
            queryBuilder.andWhere(
              `JSON_EXTRACT(product.categoryFields, :${field.fieldKey}Path) = :${field.fieldKey}Value`,
              {
                [`${field.fieldKey}Path`]: `$.${field.fieldKey}`,
                [`${field.fieldKey}Value`]: String(fieldValue),
              }
            );
          }
        }
      }
    } catch {
      // 如果获取配置失败，忽略动态字段过滤
    }

    // 排序和分页
    queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    // 将 categoryFields 中的值展开到产品对象上，方便前端访问
    const productsWithFields = products.map((product) => {
      const productObj = product as any;
      if (product.categoryFields && typeof product.categoryFields === 'object') {
        Object.assign(productObj, product.categoryFields);
      }
      return productObj;
    });

    return {
      products: productsWithFields,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findProductById(id: number, tenantId: number) {
    const product = await this.productRepository.findOne({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    // 将 categoryFields 中的值展开到产品对象上，方便前端访问
    const productObj = product as any;
    if (product.categoryFields && typeof product.categoryFields === 'object') {
      Object.assign(productObj, product.categoryFields);
    }

    return productObj;
  }

  async updateProduct(id: number, updateProductDto: UpdateProductDto, tenantId: number) {
    const product = await this.findProductById(id, tenantId);

    // 验证详情图数量不超过9张
    if (updateProductDto.detailImages && updateProductDto.detailImages.length > 9) {
      throw new BadRequestException('详情图最多只能上传9张');
    }

    // 获取租户产品配置，提取动态分类字段
    let categoryFields: Record<string, string> | undefined;
    try {
      const productConfig = await this.tenantService.getProductConfig(tenantId);
      if (productConfig.categoryFields && productConfig.categoryFields.length > 0) {
        // 先保留现有的分类字段
        categoryFields = product.categoryFields ? { ...product.categoryFields } : {};
        for (const field of productConfig.categoryFields) {
          const value = updateProductDto[field.fieldKey];
          if (value !== undefined && value !== null) {
            if (value === '') {
              // 如果值为空字符串，删除该字段
              delete categoryFields[field.fieldKey];
            } else {
              categoryFields[field.fieldKey] = String(value);
            }
          }
        }
        // 如果所有字段都被清空，设置为 undefined
        if (Object.keys(categoryFields).length === 0) {
          categoryFields = undefined;
        }
      }
    } catch {
      // 没有配置则忽略
    }

    // 提取标准字段
    const {
      name,
      code,
      category,
      specification,
      unit,
      auxiliaryUnits,
      price,
      costPrice,
      status,
      mainImage,
      detailImages,
      description,
    } = updateProductDto;

    // 更新产品字段
    if (name !== undefined) product.name = name;
    if (code !== undefined) product.code = code;
    if (category !== undefined) product.category = category;
    if (specification !== undefined) product.specification = specification;
    if (unit !== undefined) product.unit = unit;
    if (auxiliaryUnits !== undefined) product.auxiliaryUnits = auxiliaryUnits;
    if (price !== undefined) product.price = price;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (status !== undefined) product.status = status;
    if (mainImage !== undefined) product.mainImage = mainImage;
    if (detailImages !== undefined) product.detailImages = detailImages;
    if (description !== undefined) product.description = description;
    if (categoryFields !== undefined) product.categoryFields = categoryFields;

    return await this.productRepository.save(product);
  }

  async deleteProduct(id: number, tenantId: number) {
    const product = await this.findProductById(id, tenantId);
    await this.productRepository.softDelete(id);
  }

  async deleteBatchProducts(ids: number[], tenantId: number) {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids })
      .andWhere('product.tenantId = :tenantId', { tenantId })
      .getMany();

    if (products.length !== ids.length) {
      throw new NotFoundException('部分产品不存在或无权限删除');
    }

    await this.productRepository.softDelete(ids);
  }
}

