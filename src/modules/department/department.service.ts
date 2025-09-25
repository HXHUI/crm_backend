import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';

export interface CreateDepartmentDto {
  name: string;
  parentId?: string;
  description?: string;
  managerId?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  parentId?: string;
  description?: string;
  managerId?: string;
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
  ) {}

  async getDepartmentTree(tenantId: string) {
    // 获取租户信息
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 获取所有部门
    const departments = await this.departmentRepository.find({
      where: { tenantId },
      relations: ['manager', 'parent'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    // 构建树形结构
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

    // 构建父子关系
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

    // 暂时不计算成员数量，避免复杂的关联查询
    for (const dept of departments) {
      const deptNode = departmentMap.get(dept.id);
      deptNode.memberCount = 0;
    }

    // 计算租户总成员数
    const totalMemberCount = await this.memberRepository.count({
      where: { tenantId }
    });

    // 创建租户根节点
    const tenantRoot = {
      id: tenant.id,
      name: tenant.name,
      type: 'company',
      memberCount: totalMemberCount,
      children: rootDepartments,
      isTenant: true
    };

    return [tenantRoot];
  }

  async getDepartments(tenantId: string, page: number, limit: number, search?: string) {
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

  async getDepartmentById(id: string, tenantId: string) {
    const department = await this.departmentRepository.findOne({
      where: { id, tenantId },
      relations: ['manager', 'parent', 'children']
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    return department;
  }

  async createDepartment(createDepartmentDto: CreateDepartmentDto, tenantId: string) {
    console.log('Creating department:', createDepartmentDto, 'tenantId:', tenantId);
    
    // 验证tenantId
    if (!tenantId) {
      throw new Error('tenantId is required');
    }
    
    try {
      const { name, parentId, description, managerId } = createDepartmentDto;

      // 检查父部门是否存在
      if (parentId && parentId !== 'root') {
        const parentDepartment = await this.departmentRepository.findOne({
          where: { id: parentId, tenantId }
        });

        if (!parentDepartment) {
          throw new NotFoundException('父部门不存在');
        }
      }

      // 检查部门名称是否重复
      const existingDepartment = await this.departmentRepository.findOne({
        where: { name, tenantId, parentId: parentId || null }
      });

      if (existingDepartment) {
        throw new ForbiddenException('同级部门名称不能重复');
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
        parentId: parentId === 'root' ? null : (parentId || null),
        description: description || null,
        managerId: managerId || null,
        tenantId,
        sortOrder: 0
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

  async updateDepartment(id: string, updateDepartmentDto: UpdateDepartmentDto, tenantId: string) {
    const department = await this.departmentRepository.findOne({
      where: { id, tenantId }
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    const { name, parentId, description, managerId } = updateDepartmentDto;

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


  async getDepartmentMembers(departmentId: string, tenantId: string, page: number, limit: number, search?: string) {
    // 如果是租户ID，获取所有成员
    if (departmentId === tenantId) {
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

    // 普通部门，获取部门成员
    const queryBuilder = this.memberRepository.createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.departments', 'department')
      .leftJoinAndSelect('member.memberRoles', 'memberRole')
      .leftJoinAndSelect('memberRole.role', 'role')
      .where('department.id = :departmentId', { departmentId })
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

  async addDepartmentMember(departmentId: string, memberId: string, position: string, isManager: boolean, tenantId: string) {
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

    // 添加成员到部门
    member.departments = [...(member.departments || []), department];
    member.position = position || member.position;
    member.isManager = isManager || member.isManager;

    return await this.memberRepository.save(member);
  }

  async removeDepartmentMember(departmentId: string, memberId: string, tenantId: string) {
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

    // 移除成员与部门的关系
    member.departments = member.departments?.filter(dept => dept.id !== departmentId) || [];
    member.isManager = false; // 移除部门关系时取消负责人身份

    await this.memberRepository.save(member);
  }

  async deleteDepartment(id: string, tenantId: string) {
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

  private async wouldCreateCircularReference(departmentId: string, newParentId: string, tenantId: string): Promise<boolean> {
    let currentParentId = newParentId;
    const visited = new Set<string>();

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
}
