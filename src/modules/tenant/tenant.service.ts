import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../../entities/tenant.entity';
import { Member, MemberStatus } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';

export interface CreateTenantDto {
  name: string;
  description?: string;
  parentId?: number;
}

export interface UpdateTenantDto {
  name?: string;
  description?: string;
  logo?: string;
  status?: TenantStatus;
  config?: Record<string, any>;
  defaultTaxRate?: number;
}

// 价格组成项配置
export interface PriceComponentConfig {
  key: string;           // 字段key（如：factoryPrice）
  label: string;         // 显示名称（如：出厂价）
  required: boolean;     // 是否必填
  defaultValue: number;  // 默认值
  order: number;         // 排序
}

// 租户价格配置
export interface TenantPricingConfig {
  pricingMode: 'simple' | 'complex';
  priceComponents?: PriceComponentConfig[];
}

export interface TenantTaxConfig {
  defaultTaxRate: number; // 默认税率(%)，如 13 表示 13%
}

// 产品分类字段配置
export interface ProductCategoryFieldConfig {
  fieldKey: string;           // 字段标识，如 brand、series
  fieldName: string;          // 显示名称，如 品牌、系列
  level: number;              // 层级顺序
  codeLength?: number;        // 在编码中的长度
  required?: boolean;         // 是否必填
  isCascade?: boolean;        // 是否参与级联
  parentFieldKey?: string;    // 上级字段标识
  participateInCode?: boolean;// 是否参与编码
  dictTypeCode?: string;      // 关联的字典类型编码（如果设置，则从字典获取选项）
}

// 产品分类选项配置（级联值）
export interface ProductCategoryValueConfig {
  fieldKey: string;        // 字段标识
  valueId: string;         // 选项ID（前端可用作级联值）
  valueName: string;       // 显示名称
  valueCode: string;       // 在编码中的代码
  parentValueId?: string;  // 上级选项ID
}

// 产品编码规则片段类型
export type ProductCodeRuleSegmentType =
  | 'CONST' // 常量
  | 'FIELD' // 字段
  | 'DATE'  // 日期
  | 'SEQ'   // 流水号
  | 'SEP';  // 分隔符

// 产品编码规则片段
export interface ProductCodeRuleSegment {
  id?: string;                        // 片段ID（前端用）
  orderNo: number;                    // 顺序
  segmentType: ProductCodeRuleSegmentType;
  segmentValue: string;               // 根据类型含义不同：CONST=常量文本; FIELD=fieldKey; DATE=日期格式; SEQ=seqKey; SEP=分隔符
  length?: number;                    // 期望长度（SEQ/DATE/FIELD 时可用）
  padChar?: string;                   // 补齐字符
  padDirection?: 'LEFT' | 'RIGHT';    // 补齐方向
}

// 产品编码规则配置
export interface ProductCodeRuleConfig {
  segments: ProductCodeRuleSegment[];
}

// 产品名称规则片段类型（名称规则不需要日期和流水号）
export type ProductNameRuleSegmentType =
  | 'CONST' // 常量
  | 'FIELD' // 字段（显示名称）
  | 'SEP'   // 分隔符

// 产品名称规则片段
export interface ProductNameRuleSegment {
  id?: string             // 片段ID（前端用）
  orderNo: number         // 顺序
  segmentType: ProductNameRuleSegmentType
  segmentValue: string    // 根据类型含义不同
}

// 产品名称规则配置
export interface ProductNameRuleConfig {
  segments: ProductNameRuleSegment[];
}

// 租户产品配置整体
export interface TenantProductConfig {
  categoryFields: ProductCategoryFieldConfig[];
  categoryValues: ProductCategoryValueConfig[];
  codeRule?: ProductCodeRuleConfig;
  nameRule?: ProductNameRuleConfig;
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getTenants(page: number, limit: number, search?: string) {
    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant')
      .leftJoinAndSelect('tenant.owner', 'owner')
      .leftJoinAndSelect('tenant.members', 'members')
      .leftJoinAndSelect('members.user', 'user');

    if (search) {
      queryBuilder.where('tenant.name LIKE :search', {
        search: `%${search}%`
      });
    }

    const [tenants, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getTenantById(id: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const tenant = await this.tenantRepository.findOne({
      where: { id: idNum },
      relations: ['owner', 'members', 'members.user']
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return tenant;
  }

  async createTenant(createTenantDto: CreateTenantDto, ownerId: string | number) {
    const { name, description, parentId } = createTenantDto;
    const ownerIdNum = typeof ownerId === 'string' ? parseInt(ownerId, 10) : ownerId;

    // 如果指定了父租户，验证父租户是否存在
    let parentTenant = null;
    let level = 0;
    if (parentId) {
      parentTenant = await this.tenantRepository.findOne({
        where: { id: parentId },
      });
      if (!parentTenant) {
        throw new NotFoundException('父租户不存在');
      }
      level = (parentTenant.level || 0) + 1;
    }

    // 创建租户（无slug）
    const tenant = this.tenantRepository.create({
      name,
      description,
      ownerId: ownerIdNum,
      parentId: parentId || null,
      level,
      status: TenantStatus.ACTIVE,
      createdBy: ownerIdNum, // 租户的创建者就是所有者
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // 创建租户所有者成员记录
    const member = this.memberRepository.create({
      userId: ownerIdNum,
      tenantId: savedTenant.id,
      status: MemberStatus.ACTIVE,
    });

    await this.memberRepository.save(member);

    return savedTenant;
  }

  async updateTenant(id: string | number, updateTenantDto: UpdateTenantDto, userId: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const tenant = await this.tenantRepository.findOne({
      where: { id: idNum },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查是否为租户所有者
    if (tenant.ownerId !== userIdNum) {
      throw new ForbiddenException('只有租户所有者才能修改租户信息');
    }

    // 移除对slug的更新逻辑

    Object.assign(tenant, updateTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  /**
   * 获取租户默认税率
   * @param tenantId 租户ID
   * @returns 默认税率（百分比，如 13 表示 13%）
   */
  async getDefaultTaxRate(tenantId: number): Promise<number> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'defaultTaxRate'],
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return tenant.defaultTaxRate || 0;
  }

  /**
   * 获取租户默认税率配置（已废弃，使用 getDefaultTaxRate）
   */
  async getTaxConfig(tenantId: number): Promise<TenantTaxConfig> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }
    return {
      defaultTaxRate: tenant.defaultTaxRate ?? 0,
    };
  }

  /**
   * 更新租户默认税率配置
   */
  async updateTaxConfig(tenantId: number, config: TenantTaxConfig): Promise<TenantTaxConfig> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }
    tenant.defaultTaxRate = config.defaultTaxRate ?? 0;
    await this.tenantRepository.save(tenant);
    return {
      defaultTaxRate: tenant.defaultTaxRate,
    };
  }

  async deleteTenant(id: string | number, userId: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const tenant = await this.tenantRepository.findOne({
      where: { id: idNum },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查是否为租户所有者
    if (tenant.ownerId !== userIdNum) {
      throw new ForbiddenException('只有租户所有者才能删除租户');
    }

    // 删除相关成员记录
    await this.memberRepository.delete({ tenantId: idNum });
    
    // 删除租户
    await this.tenantRepository.delete(idNum);
  }

  async getTenantMembers(tenantId: string | number, page: number, limit: number, search?: string) {
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
    const queryBuilder = this.memberRepository.createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoin('user.creator', 'creator')
      .addSelect(['creator.id', 'creator.username'])
      .leftJoinAndSelect('member.tenant', 'tenant')
      .leftJoinAndSelect('member.departments', 'departments')
      .leftJoinAndSelect('member.memberRoles', 'memberRoles')
      .leftJoinAndSelect('memberRoles.role', 'role')
      .where('member.tenantId = :tenantId', { tenantId: tenantIdNum });

    if (search) {
      queryBuilder.andWhere('user.username LIKE :search OR user.email LIKE :search OR user.phone LIKE :search', {
        search: `%${search}%`
      });
    }

    const [members, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async addTenantMember(tenantId: string | number, userId: string | number, role: string, operatorId: string | number) {
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const operatorIdNum = typeof operatorId === 'string' ? parseInt(operatorId, 10) : operatorId;
    // 检查租户是否存在
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantIdNum },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查操作者是否为租户所有者
    if (tenant.ownerId !== operatorIdNum) {
      throw new ForbiddenException('只有租户所有者才能添加成员');
    }

    // 检查用户是否存在
    const user = await this.userRepository.findOne({
      where: { id: userIdNum },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查用户是否已经是租户成员
    const existingMember = await this.memberRepository.findOne({
      where: { tenantId: tenantIdNum, userId: userIdNum },
    });

    if (existingMember) {
      throw new ForbiddenException('用户已经是租户成员');
    }

    // 创建成员记录
    const member = this.memberRepository.create({
      userId: userIdNum,
      tenantId: tenantIdNum,
      status: MemberStatus.ACTIVE,
    });

    return await this.memberRepository.save(member);
  }

  async removeTenantMember(tenantId: string | number, memberId: string | number, operatorId: string | number) {
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
    const memberIdNum = typeof memberId === 'string' ? parseInt(memberId, 10) : memberId;
    const operatorIdNum = typeof operatorId === 'string' ? parseInt(operatorId, 10) : operatorId;
    // 检查租户是否存在
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantIdNum },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查操作者是否为租户所有者
    if (tenant.ownerId !== operatorIdNum) {
      throw new ForbiddenException('只有租户所有者才能移除成员');
    }

    // 检查成员是否存在
    const member = await this.memberRepository.findOne({
      where: { id: memberIdNum, tenantId: tenantIdNum },
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 不能移除租户所有者
    if (member.userId === tenant.ownerId) {
      throw new ForbiddenException('不能移除租户所有者');
    }

    await this.memberRepository.delete(memberIdNum);
  }

  /**
   * 递归获取所有子租户ID列表（支持多级层级）
   * @param tenantId 租户ID
   * @returns 所有子租户ID数组（包括孙公司等）
   */
  async getAllChildTenantIds(tenantId: number): Promise<number[]> {
    const childIds: number[] = [];
    
    // 获取直接子租户
    const directChildren = await this.tenantRepository.find({
      where: { parentId: tenantId },
      select: ['id'],
    });

    for (const child of directChildren) {
      childIds.push(child.id);
      // 递归获取子租户的子租户
      const grandChildren = await this.getAllChildTenantIds(child.id);
      childIds.push(...grandChildren);
    }

    return childIds;
  }

  /**
   * 判断是否有子租户
   * @param tenantId 租户ID
   * @returns 是否有子租户
   */
  async hasChildren(tenantId: number): Promise<boolean> {
    const count = await this.tenantRepository.count({
      where: { parentId: tenantId },
    });
    return count > 0;
  }

  /**
   * 获取完整的租户层级树
   * @param tenantId 租户ID
   * @returns 租户层级树结构
   */
  async getTenantHierarchy(tenantId: number): Promise<any> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['children'],
    });

    if (!tenant) {
      return null;
    }

    const hierarchy: any = {
      id: tenant.id,
      name: tenant.name,
      level: tenant.level,
      children: [],
    };

    if (tenant.children && tenant.children.length > 0) {
      for (const child of tenant.children) {
        hierarchy.children.push(await this.getTenantHierarchy(child.id));
      }
    }

    return hierarchy;
  }

  /**
   * 检查用户是否可以访问目标租户的数据
   * @param userTenantId 用户所属租户ID
   * @param targetTenantId 目标租户ID
   * @returns 是否可以访问
   */
  async canAccessTenantData(userTenantId: number, targetTenantId: number): Promise<boolean> {
    // 如果是自己的租户，可以访问
    if (userTenantId === targetTenantId) {
      return true;
    }

    // 获取用户租户的所有子租户ID
    const childTenantIds = await this.getAllChildTenantIds(userTenantId);
    
    // 如果目标租户是用户租户的子租户，可以访问
    return childTenantIds.includes(targetTenantId);
  }

  /**
   * 获取用户可访问的租户ID列表（包括自己和所有子租户）
   * @param tenantId 租户ID
   * @param memberId 成员ID（可选，用于判断是否为管理员）
   * @returns 可访问的租户ID数组
   */
  async getAccessibleTenantIds(tenantId: number, memberId?: number): Promise<number[]> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'ownerId'],
    });

    if (!tenant) {
      return [];
    }

    const accessibleIds: number[] = [tenantId];

    // 如果是租户所有者，可以访问所有子租户
    if (memberId) {
      const member = await this.memberRepository.findOne({
        where: { id: memberId, tenantId },
        select: ['userId'],
      });

      // 如果是租户所有者，可以访问所有子租户
      if (member && member.userId === tenant.ownerId) {
        const childIds = await this.getAllChildTenantIds(tenantId);
        accessibleIds.push(...childIds);
      }
    }

    return accessibleIds;
  }

  /**
   * 判断是否为租户管理员（可以管理子租户）
   * @param tenantId 租户ID
   * @param memberId 成员ID
   * @returns 是否为租户管理员
   */
  async isGroupAdmin(tenantId: number, memberId?: number): Promise<boolean> {
    if (!memberId) {
      return false;
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'ownerId'],
    });

    if (!tenant) {
      return false;
    }

    // 检查是否为租户所有者
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenantId },
      select: ['userId'],
    });

    if (!member) {
      return false;
    }

    // 如果是租户所有者，则可以管理子租户
    return member.userId === tenant.ownerId;
  }

  /**
   * 获取租户的直接子租户列表
   * @param tenantId 租户ID
   * @returns 子租户列表
   */
  async getChildTenants(tenantId: number) {
    const children = await this.tenantRepository.find({
      where: { parentId: tenantId },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    return children;
  }

  /**
   * 获取租户的价格配置
   * @param tenantId 租户ID
   * @returns 价格配置
   */
  async getPricingConfig(tenantId: number): Promise<TenantPricingConfig> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'config'],
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const config = tenant.config || {};
    const pricingConfig: TenantPricingConfig = {
      pricingMode: config.pricingMode || 'simple',
      priceComponents: config.priceComponents || [],
    };

    return pricingConfig;
  }

  /**
   * 更新租户的价格配置
   * @param tenantId 租户ID
   * @param pricingConfig 价格配置
   * @param userId 用户ID（用于权限验证）
   * @returns 更新后的租户
   */
  async updatePricingConfig(
    tenantId: number,
    pricingConfig: TenantPricingConfig,
    userId: number,
  ): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查是否为租户所有者
    if (tenant.ownerId !== userId) {
      throw new ForbiddenException('只有租户所有者才能修改价格配置');
    }

    // 更新配置
    const config = tenant.config || {};
    config.pricingMode = pricingConfig.pricingMode;
    config.priceComponents = pricingConfig.priceComponents || [];

    tenant.config = config;
    return await this.tenantRepository.save(tenant);
  }

  /**
   * 获取租户产品配置（分类字段、分类选项、编码规则）
   */
  async getProductConfig(tenantId: number): Promise<TenantProductConfig> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'config'],
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const config = tenant.config || {};
    
    // 调试日志：查看原始config数据
    console.log('getProductConfig - tenant.config:', JSON.stringify(config, null, 2));
    console.log('getProductConfig - config.productNameRule:', JSON.stringify(config.productNameRule, null, 2));
    
    const productConfig: TenantProductConfig = {
      categoryFields: (config.productCategoryFields || []) as ProductCategoryFieldConfig[],
      categoryValues: (config.productCategoryValues || []) as ProductCategoryValueConfig[],
      codeRule: (config.productCodeRule || { segments: [] }) as ProductCodeRuleConfig,
      nameRule: (config.productNameRule || { segments: [] }) as ProductNameRuleConfig,
    };

    // 确保结构存在
    if (!productConfig.codeRule) {
      productConfig.codeRule = { segments: [] };
    }
    if (!productConfig.nameRule) {
      productConfig.nameRule = { segments: [] };
    }

    // 调试日志：查看最终返回的数据
    console.log('getProductConfig - productConfig.nameRule:', JSON.stringify(productConfig.nameRule, null, 2));
    console.log('getProductConfig - productConfig.nameRule.segments length:', productConfig.nameRule?.segments?.length);

    return productConfig;
  }

  /**
   * 更新租户产品配置
   */
  async updateProductConfig(
    tenantId: number,
    productConfig: TenantProductConfig,
    userId: number,
  ): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 权限：只有租户所有者可以修改
    if (tenant.ownerId !== userId) {
      throw new ForbiddenException('只有租户所有者才能修改产品配置');
    }

    const config = tenant.config || {};

    // 保存所有配置，确保即使为空也保存
    config.productCategoryFields = productConfig.categoryFields || [];
    config.productCategoryValues = productConfig.categoryValues || [];
    config.productCodeRule = productConfig.codeRule || { segments: [] };
    // 重要：直接使用 productConfig.nameRule，不要用 || 操作符，因为空数组也是有效值
    if (productConfig.nameRule !== undefined && productConfig.nameRule !== null) {
      config.productNameRule = productConfig.nameRule;
    } else {
      config.productNameRule = { segments: [] };
    }

    // 调试日志
    console.log('updateProductConfig - productConfig.nameRule:', JSON.stringify(productConfig.nameRule, null, 2));
    console.log('updateProductConfig - config.productNameRule:', JSON.stringify(config.productNameRule, null, 2));
    console.log('updateProductConfig - config完整内容:', JSON.stringify(config, null, 2));

    tenant.config = config;
    const savedTenant = await this.tenantRepository.save(tenant);
    
    // 重新查询以验证保存结果
    const verifyTenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'config'],
    });
    console.log('updateProductConfig - verifyTenant.config完整内容:', JSON.stringify(verifyTenant?.config, null, 2));
    console.log('updateProductConfig - verifyTenant.config.productNameRule:', JSON.stringify(verifyTenant?.config?.productNameRule, null, 2));
    
    return savedTenant;
  }

  /**
   * 根据当前配置和分类选择预览产品编码
   * @param tenantId 租户ID
   * @param payload 预览输入（分类字段取值、可选日期）
   */
  async previewProductCode(
    tenantId: number,
    payload: {
      // 字段编码值映射，例如 { brand: 'NK', series: 'RS' }
      fieldCodes?: Record<string, string>;
      // 可选日期（不传则取当天）
      date?: Date | string;
    },
  ): Promise<{ code: string }> {
    const productConfig = await this.getProductConfig(tenantId);
    const rule = productConfig.codeRule;

    if (!rule || !rule.segments || rule.segments.length === 0) {
      throw new BadRequestException('尚未配置产品编码规则');
    }

    const fieldCodes = payload.fieldCodes || {};
    const now = payload.date ? new Date(payload.date) : new Date();

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

    // 这里只是预览，不生成真实流水号，SEQ 用示例值代替
    let seqPreviewCounter = 1;

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
          const seqStr = seqPreviewCounter.toString();
          const padded = applyPadding(seqStr, length || 4, padChar, padDirection || 'LEFT');
          parts.push(padded);
          seqPreviewCounter += 1;
          break;
        }
        default:
          break;
      }
    }

    const code = parts.join('');
    return { code };
  }
}
