import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../entities/user.entity';
import { Member } from '../../entities/member.entity';
import { Tenant } from '../../entities/tenant.entity';
import { MemberRole } from '../../entities/member-role.entity';
import { Role } from '../../entities/role.entity';
import { Department } from '../../entities/department.entity';
import * as bcrypt from 'bcrypt';

export interface UpdateUserDto {
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface UpdateUserProfileDto {
  avatar?: string;
  phone?: string;
  email?: string;
}

export interface CreateUserDto {
  username: string;
  email?: string;
  phone: string;
  password?: string;
  avatar?: string;
  tenantId: string | number;
  departmentId?: string | number;
  roleIds?: (string | number)[];
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(MemberRole)
    private readonly memberRoleRepository: Repository<MemberRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const { username, email, phone, password = '88888888', avatar, tenantId, departmentId, roleIds = [] } = createUserDto;

    // 检查用户名是否已存在
    const existingUserByUsername = await this.userRepository.findOne({
      where: { username }
    });
    if (existingUserByUsername) {
      throw new ConflictException('用户名已存在');
    }

    // 检查手机号是否已存在
    const existingUserByPhone = await this.userRepository.findOne({
      where: { phone }
    });
    if (existingUserByPhone) {
      throw new ConflictException('手机号已存在');
    }

    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email) {
      const existingUserByEmail = await this.userRepository.findOne({
        where: { email }
      });
      if (existingUserByEmail) {
        throw new ConflictException('邮箱已存在');
      }
    }

    // 验证租户是否存在
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantIdNum }
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 验证角色是否存在（如果提供了角色）
    if (roleIds.length > 0) {
      const roleIdsNum = roleIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      const roles = await this.roleRepository.find({
        where: roleIdsNum.map(id => ({ id, tenantId: tenantIdNum }))
      });
      if (roles.length !== roleIdsNum.length) {
        throw new NotFoundException('部分角色不存在');
      }
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = this.userRepository.create({
      username,
      email: email || null,
      phone,
      passwordHash,
      avatar,
      status: UserStatus.ACTIVE
    });

    const savedUser = await this.userRepository.save(user);

    // 创建租户成员记录（注意：Member 实体没有 isManager 字段）
    const member = this.memberRepository.create({
      userId: savedUser.id,
      tenantId: tenantIdNum
    });

    const savedMember = await this.memberRepository.save(member);

    // 如果指定了部门，创建成员部门关联
    if (departmentId) {
      const departmentIdNum = typeof departmentId === 'string' ? parseInt(departmentId, 10) : departmentId;
      const department = await this.memberRepository.manager.findOne(Department, {
        where: { id: departmentIdNum }
      });
      if (department) {
        // 使用 TypeORM 的多对多关系管理
        await this.memberRepository
          .createQueryBuilder()
          .relation(Member, 'departments')
          .of(savedMember.id)
          .add(department.id);
      }
    }

    // 创建成员角色关联（如果提供了角色）
    if (roleIds.length > 0) {
      const roleIdsNum = roleIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      const memberRoles = roleIdsNum.map(roleId => 
        this.memberRoleRepository.create({
          memberId: savedMember.id,
          roleId
        })
      );
      await this.memberRoleRepository.save(memberRoles);
    }

    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = savedUser;
    return {
      ...userWithoutPassword,
      member: savedMember
    };
  }

  async getUsers(page: number, limit: number, search?: string) {
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.members', 'members')
      .leftJoinAndSelect('members.tenant', 'tenant');

    if (search) {
      queryBuilder.where(
        'user.username LIKE :search OR user.email LIKE :search OR user.phone LIKE :search',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getUserById(id: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const user = await this.userRepository.findOne({
      where: { id: idNum },
      relations: ['members', 'members.tenant']
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async updateUser(id: string | number, updateUserDto: UpdateUserDto, operatorId: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const operatorIdNum = typeof operatorId === 'string' ? parseInt(operatorId, 10) : operatorId;
    const user = await this.userRepository.findOne({
      where: { id: idNum },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查操作者权限（只有用户本人或管理员可以修改）
    if (user.id !== operatorIdNum) {
      // 这里可以添加管理员权限检查
      throw new ForbiddenException('没有权限修改此用户信息');
    }

    // 检查用户名和手机号码唯一性
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });

      if (existingUser) {
        throw new ForbiddenException('用户名已存在');
      }
    }

    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateUserDto.phone },
      });

      if (existingUser) {
        throw new ForbiddenException('手机号码已存在');
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ForbiddenException('邮箱已存在');
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async updateUserProfile(id: string | number, updateProfileDto: UpdateUserProfileDto, operatorId: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const operatorIdNum = typeof operatorId === 'string' ? parseInt(operatorId, 10) : operatorId;
    const user = await this.userRepository.findOne({
      where: { id: idNum },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 只有用户本人可以修改个人资料
    if (user.id !== operatorIdNum) {
      throw new ForbiddenException('没有权限修改此用户资料');
    }

    // 检查手机号码和邮箱唯一性
    if (updateProfileDto.phone && updateProfileDto.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateProfileDto.phone },
      });

      if (existingUser) {
        throw new ForbiddenException('手机号码已存在');
      }
    }

    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new ForbiddenException('邮箱已存在');
      }
    }

    Object.assign(user, updateProfileDto);
    return await this.userRepository.save(user);
  }

  async updateUserStatus(id: string | number, status: UserStatus, operatorId: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const operatorIdNum = typeof operatorId === 'string' ? parseInt(operatorId, 10) : operatorId;
    const user = await this.userRepository.findOne({
      where: { id: idNum },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查操作者权限（只有管理员可以修改用户状态）
    // 这里可以添加管理员权限检查
    if (user.id === operatorIdNum) {
      throw new ForbiddenException('不能修改自己的状态');
    }

    user.status = status;
    return await this.userRepository.save(user);
  }

  async getUserMembers(userId: string | number) {
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const members = await this.memberRepository.find({
      where: { userId: userIdNum },
      relations: ['tenant', 'memberRoles', 'memberRoles.role']
    });

    return members;
  }
}
