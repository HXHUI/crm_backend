import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { MemberRole } from '../../entities/member-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(MemberRole)
    private readonly memberRoleRepository: Repository<MemberRole>,
  ) {}

  /**
   * 创建角色
   */
  async create(createRoleDto: CreateRoleDto, tenantId: number, memberId: number): Promise<Role> {
    const { name, description, isActive = true } = createRoleDto;

    // 检查角色名称是否重复
    const existingRole = await this.roleRepository.findOne({
      where: { name, tenantId },
    });

    if (existingRole) {
      throw new ConflictException('角色名称已存在');
    }

    const role = this.roleRepository.create({
      name,
      description,
      isActive,
      tenantId,
      createdBy: memberId,
    });

    return await this.roleRepository.save(role);
  }

  /**
   * 查询角色列表
   */
  async findAll(queryDto: QueryRoleDto, tenantId: number) {
    const { search, isActive, page = 1, limit = 50 } = queryDto;

    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .where('role.tenantId = :tenantId', { tenantId });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(role.name LIKE :search OR role.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // 状态过滤
    if (isActive !== undefined) {
      queryBuilder.andWhere('role.isActive = :isActive', { isActive });
    }

    // 排序
    queryBuilder.orderBy('role.createdAt', 'DESC');

    // 分页
    const [roles, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      roles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 根据ID查询角色
   */
  async findOne(id: number, tenantId: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id, tenantId },
      relations: ['memberRoles', 'memberRoles.member', 'rolePermissions'],
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    return role;
  }

  /**
   * 更新角色
   */
  async update(id: number, updateRoleDto: UpdateRoleDto, tenantId: number): Promise<Role> {
    const role = await this.findOne(id, tenantId);

    // 如果更新名称，检查是否重复
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name, tenantId },
      });

      if (existingRole) {
        throw new ConflictException('角色名称已存在');
      }
    }

    Object.assign(role, updateRoleDto);
    return await this.roleRepository.save(role);
  }

  /**
   * 删除角色
   */
  async remove(id: number, tenantId: number): Promise<void> {
    const role = await this.findOne(id, tenantId);

    // 检查是否有成员使用此角色
    const memberCount = await this.memberRoleRepository
      .createQueryBuilder('memberRole')
      .where('memberRole.roleId = :roleId', { roleId: id })
      .getCount();

    if (memberCount > 0) {
      throw new ConflictException('该角色正在被使用，无法删除');
    }

    await this.roleRepository.remove(role);
  }

  /**
   * 批量删除角色
   */
  async removeBatch(ids: number[], tenantId: number): Promise<void> {
    for (const id of ids) {
      await this.remove(id, tenantId);
    }
  }

  /**
   * 更新角色状态
   */
  async updateStatus(id: number, isActive: boolean, tenantId: number): Promise<Role> {
    const role = await this.findOne(id, tenantId);
    role.isActive = isActive;
    return await this.roleRepository.save(role);
  }

  /**
   * 获取租户的所有角色（用于下拉选择）
   */
  async getRoleOptions(tenantId: number): Promise<{ id: number; name: string }[]> {
    const roles = await this.roleRepository.find({
      where: { tenantId, isActive: true },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
    }));
  }
}
