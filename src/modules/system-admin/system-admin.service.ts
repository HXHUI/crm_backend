import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../entities/user.entity';
import * as bcrypt from 'bcryptjs';

export interface CreateSystemAdminDto {
  username: string;
  email?: string;
  phone: string;
  password: string;
}

@Injectable()
export class SystemAdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 获取系统管理员列表
  async getSystemAdmins(page: number, limit: number, search?: string) {
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .where('user.isSystemAdmin = :isSystemAdmin', { isSystemAdmin: true });

    if (search) {
      queryBuilder.andWhere(
        '(user.username LIKE :search OR user.email LIKE :search OR user.phone LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    // 移除密码字段
    const usersWithoutPassword = users.map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      users: usersWithoutPassword,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // 创建系统管理员
  async createSystemAdmin(createDto: CreateSystemAdminDto, createdByUserId: number) {
    const { username, email, phone, password } = createDto;

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

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建系统管理员用户
    const user = this.userRepository.create({
      username,
      email: email || null,
      phone,
      passwordHash,
      status: UserStatus.ACTIVE,
      isSystemAdmin: true,
      createdBy: createdByUserId,
    });

    const savedUser = await this.userRepository.save(user);

    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  // 将现有用户设置为系统管理员
  async setUserAsSystemAdmin(userId: number, operatorId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.isSystemAdmin) {
      throw new ConflictException('用户已经是系统管理员');
    }

    user.isSystemAdmin = true;
    if (!user.createdBy) {
      user.createdBy = operatorId;
    }

    return await this.userRepository.save(user);
  }

  // 移除系统管理员权限
  async removeSystemAdmin(userId: number, operatorId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (!user.isSystemAdmin) {
      throw new ConflictException('用户不是系统管理员');
    }

    user.isSystemAdmin = false;
    return await this.userRepository.save(user);
  }

  // 恢复系统管理员权限
  async restoreSystemAdmin(userId: number, operatorId: number) {
    return this.setUserAsSystemAdmin(userId, operatorId);
  }
}

