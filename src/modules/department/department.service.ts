import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { MemberDepartment } from '../../entities/member-department.entity';

export interface CreateDepartmentDto {
  name: string;
  parentId?: number;
  description?: string;
  managerId?: number;
}

export interface UpdateDepartmentDto {
  name?: string;
  parentId?: number;
  description?: string;
  managerId?: number;
}

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(MemberDepartment)
    private readonly memberDepartmentRepository: Repository<MemberDepartment>,
  ) {}

  async getDepartmentTree(tenantId: number, includeGroup: boolean = false) {
    // 获取租户信息
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['parent', 'children']
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 如果包含集团视图，需要找到根租户
    let rootTenant = tenant;
    if (includeGroup && tenant.parentId) {
      // 向上查找根租户
      let currentTenant = tenant;
      while (currentTenant.parentId) {
        const parent = await this.tenantRepository.findOne({
          where: { id: currentTenant.parentId }
        });
        if (!parent) break;
        currentTenant = parent;
      }
      rootTenant = currentTenant;
    }

    // 递归构建租户树（包含子租户）
    const buildTenantTree = async (currentTenant: Tenant): Promise<any> => {
      // 获取当前租户的所有部门
      const departments = await this.departmentRepository.find({
        where: { tenantId: currentTenant.id },
        relations: ['manager', 'parent'],
        order: { sort: 'ASC', createdAt: 'ASC' }
      });

      // 构建部门树形结构
      const departmentMap = new Map();
      const rootDepartments = [];

      // 创建部门映射
      departments.forEach(dept => {
        departmentMap.set(dept.id, {
          ...dept,
          type: 'department',
          children: [],
          memberCount: 0
        });
      });

      // 构建部门父子关系
      departments.forEach(dept => {
        const deptNode = departmentMap.get(dept.id);
        if (dept.parentId) {
          const parent = departmentMap.get(dept.parentId);
          if (parent) {
            parent.children.push(deptNode);
          }
        } else {
          rootDepartments.push(deptNode);
        }
      });

      // 计算租户总成员数
      const totalMemberCount = await this.memberRepository.count({
        where: { tenantId: currentTenant.id }
      });

      // 如果包含集团视图，递归获取子租户
      let tenantChildren: any[] = [];
      if (includeGroup) {
        const childTenants = await this.tenantRepository.find({
          where: { parentId: currentTenant.id },
          order: { createdAt: 'ASC' }
        });

        tenantChildren = await Promise.all(
          childTenants.map(childTenant => buildTenantTree(childTenant))
        );
      }

      // 创建租户节点
      return {
        id: currentTenant.id,
        name: currentTenant.name,
        type: 'company',
        memberCount: totalMemberCount,
        children: [...tenantChildren, ...rootDepartments], // 子租户在前，部门在后
        isTenant: true,
        tenantId: currentTenant.id,
        parentId: currentTenant.parentId
      };
    };

    const tenantRoot = await buildTenantTree(rootTenant);
    return [tenantRoot];
  }

  async getDepartments(tenantId: number, page: number, limit: number, search?: string) {
    const queryBuilder = this.departmentRepository.createQueryBuilder('department')
      .leftJoinAndSelect('department.manager', 'manager')
      .leftJoinAndSelect('department.parent', 'parent')
      .where('department.tenantId = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere('department.name LIKE :search', {
        search: `%${search}%`
      });
    }

    const [departments, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      departments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getDepartmentById(id: number, tenantId: number) {
    const department = await this.departmentRepository.findOne({
      where: { id, tenantId },
      relations: ['manager', 'parent', 'children']
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    return department;
  }

  async createDepartment(createDepartmentDto: CreateDepartmentDto, tenantId: number, memberId: number) {
    console.log('Creating department:', createDepartmentDto, 'tenantId:', tenantId);
    
    // 验证tenantId
    if (!tenantId) {
      throw new Error('tenantId is required');
    }
    
    try {
      let { name, parentId, description, managerId } = createDepartmentDto;

      // 处理 'root' 值或字符串 'null'，将其转换为 null（表示在租户根节点下创建）
      // 兼容前端可能发送的字符串 'root' 或 'null'
      if (parentId === null || parentId === undefined || 
          (typeof parentId === 'string' && (parentId === 'root' || parentId === 'null'))) {
        parentId = null;
      } else if (typeof parentId === 'string') {
        // 如果是字符串形式的数字，转换为数字
        const parsedId = parseInt(parentId, 10);
        if (!isNaN(parsedId)) {
          parentId = parsedId;
        } else {
          parentId = null;
        }
      }

      // 检查父部门是否存在
      if (parentId) {
        const parentDepartment = await this.departmentRepository.findOne({
          where: { id: parentId, tenantId }
        });

        if (!parentDepartment) {
          throw new NotFoundException('父部门不存在');
        }
      }

      // 检查部门是否已存在，如果存在则直接返回（适用于导入等场景）
      const existingDepartment = await this.departmentRepository.findOne({
        where: { name, tenantId, parentId: parentId || null }
      });

      if (existingDepartment) {
        // 部门已存在，直接返回已存在的部门，不抛出错误
        return existingDepartment;
      }

      // 检查负责人是否存在
      if (managerId) {
        const manager = await this.memberRepository.findOne({
          where: { id: managerId, tenantId }
        });

        if (!manager) {
          throw new NotFoundException('负责人不存在');
        }
      }

      // 创建部门
      const department = this.departmentRepository.create({
        name,
        parentId: parentId || null,
        description: description || null,
        managerId: managerId || null,
        tenantId,
        sort: 0,
        createdBy: memberId,
      });

      console.log('Department entity created:', department);
      
      const savedDepartment = await this.departmentRepository.save(department);
      console.log('Department saved successfully:', savedDepartment);
      return savedDepartment;
    } catch (error) {
      console.error('Error in createDepartment:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async updateDepartment(id: number, updateDepartmentDto: UpdateDepartmentDto, tenantId: number) {
    const department = await this.departmentRepository.findOne({
      where: { id, tenantId }
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    let { name, parentId, description, managerId } = updateDepartmentDto;

    // 处理 'root' 值或字符串 'null'，将其转换为 null（表示在租户根节点下）
    // 兼容前端可能发送的字符串 'root' 或 'null'
    if (parentId === null || parentId === undefined || 
        (typeof parentId === 'string' && (parentId === 'root' || parentId === 'null'))) {
      parentId = null;
    } else if (typeof parentId === 'string') {
      // 如果是字符串形式的数字，转换为数字
      const parsedId = parseInt(parentId, 10);
      if (!isNaN(parsedId)) {
        parentId = parsedId;
      } else {
        parentId = null;
      }
    }

    // 检查父部门是否存在且不能是自己
    if (parentId && parentId !== id) {
      const parentDepartment = await this.departmentRepository.findOne({
        where: { id: parentId, tenantId }
      });

      if (!parentDepartment) {
        throw new NotFoundException('父部门不存在');
      }

      // 检查是否会形成循环引用
      if (await this.wouldCreateCircularReference(id, parentId, tenantId)) {
        throw new ForbiddenException('不能将部门设置为其子部门的子部门');
      }
    }

    // 检查部门名称是否重复
    if (name && name !== department.name) {
      const existingDepartment = await this.departmentRepository.findOne({
        where: { 
          name, 
          tenantId, 
          parentId: parentId !== undefined ? parentId : department.parentId 
        }
      });

      if (existingDepartment && existingDepartment.id !== id) {
        throw new ForbiddenException('同级部门名称不能重复');
      }
    }

    // 检查负责人是否存在
    if (managerId) {
      const manager = await this.memberRepository.findOne({
        where: { id: managerId, tenantId }
      });

      if (!manager) {
        throw new NotFoundException('负责人不存在');
      }
    }

    Object.assign(department, updateDepartmentDto);
    return await this.departmentRepository.save(department);
  }


  async getDepartmentMembers(
    departmentId: number | 'root',
    tenantId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    // 如果是 'root'，直接返回所有成员
    if (departmentId === 'root') {
      const queryBuilder = this.memberRepository.createQueryBuilder('member')
        .leftJoinAndSelect('member.user', 'user')
        .leftJoinAndSelect('member.departments', 'department')
        .leftJoinAndSelect('member.memberRoles', 'memberRole')
        .leftJoinAndSelect('memberRole.role', 'role')
        .where('member.tenantId = :tenantId', { tenantId });

      if (search) {
        queryBuilder.andWhere(
          'user.username LIKE :search OR user.email LIKE :search OR user.phone LIKE :search',
          { search: `%${search}%` }
        );
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

    // 普通部门，先检查部门是否存在
    const targetDepartmentId =
      typeof departmentId === 'number' ? departmentId : parseInt(departmentId as string, 10);

    if (Number.isNaN(targetDepartmentId)) {
      throw new NotFoundException('部门不存在');
    }

    // 检查部门是否存在，避免将租户ID误判为部门ID
    const department = await this.departmentRepository.findOne({
      where: { id: targetDepartmentId, tenantId }
    });

    // 如果部门不存在，且 departmentId 等于 tenantId，则认为是租户根节点
    if (!department && targetDepartmentId === tenantId) {
      const queryBuilder = this.memberRepository.createQueryBuilder('member')
        .leftJoinAndSelect('member.user', 'user')
        .leftJoinAndSelect('member.departments', 'department')
        .leftJoinAndSelect('member.memberRoles', 'memberRole')
        .leftJoinAndSelect('memberRole.role', 'role')
        .where('member.tenantId = :tenantId', { tenantId });

      if (search) {
        queryBuilder.andWhere(
          'user.username LIKE :search OR user.email LIKE :search OR user.phone LIKE :search',
          { search: `%${search}%` }
        );
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

    // 如果部门不存在，抛出异常
    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 普通部门，获取部门成员
    const queryBuilder = this.memberRepository.createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.departments', 'department')
      .leftJoinAndSelect('member.memberRoles', 'memberRole')
      .leftJoinAndSelect('memberRole.role', 'role')
      .where('department.id = :departmentId', { departmentId: targetDepartmentId })
      .andWhere('member.tenantId = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        'user.username LIKE :search OR user.email LIKE :search OR user.phone LIKE :search',
        { search: `%${search}%` }
      );
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

  async addDepartmentMember(departmentId: number, memberId: number, position: string, isManager: boolean, tenantId: number) {
    // 检查部门是否存在
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId, tenantId }
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 检查成员是否存在
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenantId }
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 检查成员是否已经在部门中
    const existingRelation = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoin('member.departments', 'department')
      .where('member.id = :memberId', { memberId })
      .andWhere('department.id = :departmentId', { departmentId })
      .getOne();

    if (existingRelation) {
      throw new ForbiddenException('成员已在部门中');
    }

    // 添加成员到部门（注意：Member 实体没有 isManager 字段）
    member.departments = [...(member.departments || []), department];
    member.position = position || member.position;

    await this.memberRepository.save(member);

    // 如果指定为部门负责人，更新部门的managerId
    if (isManager) {
      department.managerId = memberId;
      await this.departmentRepository.save(department);
    }

    return member;
  }

  async batchAddDepartmentMembers(departmentId: number, memberIds: number[], position: string, isManager: boolean, tenantId: number) {
    // 检查部门是否存在
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId, tenantId }
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 批量获取成员
    const members = await this.memberRepository.find({
      where: memberIds.map(id => ({ id, tenantId })),
      relations: ['departments']
    });

    if (members.length === 0) {
      throw new NotFoundException('没有找到有效的成员');
    }

    // 检查哪些成员已经在部门中
    const existingMembers = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoin('member.departments', 'department')
      .where('member.id IN (:...memberIds)', { memberIds })
      .andWhere('department.id = :departmentId', { departmentId })
      .select('member.id', 'id')
      .getRawMany();

    const existingIds = new Set(existingMembers.map((m: any) => m.member_id || m.id));

    // 过滤出不在部门中的成员
    const membersToAdd = members.filter(m => !existingIds.has(m.id));

    if (membersToAdd.length === 0) {
      throw new ForbiddenException('所有成员都已在部门中');
    }

    // 批量添加成员到部门
    for (const member of membersToAdd) {
      member.departments = [...(member.departments || []), department];
      if (position) {
        member.position = position;
      }
    }

    await this.memberRepository.save(membersToAdd);

    return {
      success: membersToAdd.length,
      failed: members.length - membersToAdd.length,
      skipped: existingIds.size,
      members: membersToAdd
    };
  }

  async removeDepartmentMember(departmentId: number, memberId: number, tenantId: number) {
    // 检查部门是否存在
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId, tenantId }
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 检查成员是否存在
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenantId },
      relations: ['departments']
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 移除成员与部门的关系（注意：Member 实体没有 isManager 字段）
    member.departments = member.departments?.filter(dept => dept.id !== departmentId) || [];

    await this.memberRepository.save(member);
  }

  async deleteDepartment(id: number, tenantId: number) {
    // 查找部门
    const department = await this.departmentRepository.findOne({
      where: { id, tenantId },
      relations: ['children']
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 检查是否有子部门
    if (department.children && department.children.length > 0) {
      throw new ForbiddenException('该部门下还有子部门，请先删除子部门');
    }

    // 检查是否有成员
    const memberCount = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoin('member.departments', 'department')
      .where('department.id = :departmentId', { departmentId: id })
      .andWhere('member.tenantId = :tenantId', { tenantId })
      .getCount();

    if (memberCount > 0) {
      throw new ForbiddenException('该部门下还有成员，请先移除所有成员');
    }

    // 删除部门
    await this.departmentRepository.remove(department);
  }

  private async wouldCreateCircularReference(departmentId: number, newParentId: number, tenantId: number): Promise<boolean> {
    let currentParentId: number | undefined = newParentId;
    const visited = new Set<number>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        return true; // 检测到循环
      }

      if (currentParentId === departmentId) {
        return true; // 检测到循环
      }

      visited.add(currentParentId);

      const parent = await this.departmentRepository.findOne({
        where: { id: currentParentId, tenantId }
      });

      currentParentId = parent?.parentId;
    }

    return false;
  }

  /**
   * 获取成员的部门列表
   * @param memberId 成员ID
   * @param tenantId 租户ID（用于验证）
   */
  async getMemberDepartments(memberId: number, tenantId: number): Promise<Department[]> {
    // 验证成员是否存在且属于该租户
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenantId }
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 通过 MemberDepartment 关联表查询成员的部门
    const memberDepartments = await this.memberDepartmentRepository.find({
      where: { memberId },
      relations: ['department'],
    });

    // 提取部门信息并过滤掉已删除的部门
    const departments = memberDepartments
      .map(md => md.department)
      .filter(dept => dept && dept.tenantId === tenantId && !dept.deletedAt);

    return departments;
  }
}
