import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from '../../entities/user.entity';
import { Member, MemberStatus } from '../../entities/member.entity';
import { Tenant, TenantStatus } from '../../entities/tenant.entity';
import { RedisService } from '../../common/redis/redis.service';

export interface LoginDto {
  username: string;
  password: string;
  tenantId?: string;
}

export interface RegisterDto {
  username: string;
  phone: string;
  email?: string;
  password: string;
  tenantName: string;
}

export interface CreateTenantDto {
  name: string;
  description?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async validateUser(username: string, password: string, tenantId?: string): Promise<any> {
    // 支持用户名或手机号码登录
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.members', 'members')
      .leftJoinAndSelect('members.tenant', 'tenant')
      .where('user.username = :username OR user.phone = :username', { username })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('用户已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    // 如果指定了租户，检查用户是否属于该租户
    if (tenantId) {
      const tenant = user.members?.find(
        (member) => member.tenantId === tenantId && member.status === 'active',
      );
      if (!tenant) {
        throw new UnauthorizedException('用户不属于该租户');
      }
      return {
        userId: user.id,
        memberId: tenant.id,
        tenantId: tenant.tenantId,
      };
    }

    // 如果没有指定租户，使用第一个活跃成员的信息
    const activeMember = user.members?.find(member => member.status === 'active');
    
    return {
      userId: user.id,
      user,
      ...(activeMember && { 
        memberId: activeMember.id, 
        tenantId: activeMember.tenantId 
      }),
    };
  }

  async login(loginDto: LoginDto) {
    const { username, password, tenantId } = loginDto;
    const userData = await this.validateUser(username, password, tenantId);

    const payload = {
      sub: userData.userId,
      username,
      ...(userData.memberId && { memberId: userData.memberId }),
      ...(userData.tenantId && { tenantId: userData.tenantId }),
      
    };

    const token = this.jwtService.sign(payload);

    // 将token存储到Redis中（如果Redis可用）
    try {
      await this.redisService.set(`token:${userData.userId}`, token, 7 * 24 * 60 * 60); // 7天
    } catch (redisError) {
      console.warn('Redis连接失败，跳过token存储:', redisError.message);
      // Redis连接失败不影响登录流程
    }

    // 获取成员和租户信息
    const member = await this.memberRepository.findOne({
      where: { userId: userData.userId },
      relations: ['tenant']
    });

      return {
        access_token: token,
        user: userData.user,
        member: member,
        tenant: member?.tenant || null,
      };
  }

  async register(registerDto: RegisterDto) {
    const { username, phone, email, password, tenantName } = registerDto;

    // 分别检查用户名和手机号码是否已存在
    const existingUserByUsername = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('用户名已存在');
    }

    const existingUserByPhone = await this.userRepository.findOne({
      where: { phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('手机号码已存在');
    }

    // 生成租户域名
    // 不再使用slug，取消域名检查

    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    try {
      // 1. 创建用户
      const user = this.userRepository.create({
        username,
        email: email || null, // 将空字符串转换为null
        passwordHash,
        phone,
        status: UserStatus.ACTIVE,
      });

      const savedUser = await this.userRepository.save(user);

      // 2. 创建租户
      const tenant = this.tenantRepository.create({
        name: tenantName,
        ownerId: savedUser.id,
        status: TenantStatus.ACTIVE,
      });

      const savedTenant = await this.tenantRepository.save(tenant);

      // 3. 创建成员记录（用户作为租户成员）
      const member = this.memberRepository.create({
        userId: savedUser.id,
        tenantId: savedTenant.id,
        status: MemberStatus.ACTIVE,
      });

      const savedMember = await this.memberRepository.save(member);

      // 4. 生成 JWT token
      const payload = {
        sub: savedUser.id,
        username: savedUser.username,
        memberId: savedMember.id,
        tenantId: savedTenant.id,
        
      };

      const token = this.jwtService.sign(payload);

      // 5. 将token存储到Redis中（如果Redis可用）
      try {
        await this.redisService.set(`token:${savedUser.id}`, token, 7 * 24 * 60 * 60);
      } catch (redisError) {
        console.warn('Redis连接失败，跳过token存储:', redisError.message);
        // Redis连接失败不影响注册流程
      }

      return {
        access_token: token,
        user: {
          id: savedUser.id,
          username: savedUser.username,
          email: savedUser.email,
          phone: savedUser.phone,
          status: savedUser.status,
          createdAt: savedUser.createdAt,
          updatedAt: savedUser.updatedAt,
        },
        member: {
          id: savedMember.id,
          userId: savedMember.userId,
          tenantId: savedMember.tenantId,
          status: savedMember.status,
          createdAt: savedMember.createdAt,
          updatedAt: savedMember.updatedAt,
        },
        tenant: {
          id: savedTenant.id,
          name: savedTenant.name,
          status: savedTenant.status,
          createdAt: savedTenant.createdAt,
          updatedAt: savedTenant.updatedAt,
        },
      };
    } catch (error) {
      // 处理数据库约束错误
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage.includes('username')) {
          throw new ConflictException('用户名已存在');
        } else if (error.sqlMessage.includes('phone')) {
          throw new ConflictException('手机号码已存在');
        } else if (error.sqlMessage.includes('slug')) {
          throw new ConflictException('租户域名已存在，请尝试其他公司名称');
        }
        throw new ConflictException('数据已存在，请检查用户名、手机号码或公司名称');
      }
      
      // 处理锁等待超时
      if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
        throw new ConflictException('系统繁忙，请稍后重试');
      }
      
      throw error;
    }
  }

  // 生成租户域名的辅助方法
  private generateTenantSlug(tenantName: string): string {
    // 先移除中文字符，再移除特殊字符
    let slug = tenantName
      .toLowerCase()
      .replace(/[\u4e00-\u9fa5]/g, '') // 移除中文字符
      .replace(/[^a-z0-9]/g, '') // 移除特殊字符，只保留字母和数字
      .substring(0, 20);
    
    // 如果slug为空，使用时间戳
    if (!slug) {
      slug = 'tenant' + Date.now() + Math.random().toString(36).substr(2, 5);
    }
    
    return slug;
  }

  async createTenant(createTenantDto: CreateTenantDto, ownerId: string) {
    const { name, description } = createTenantDto;

    // 创建租户（无slug）
    const tenant = this.tenantRepository.create({
      name,
      description,
      ownerId,
      status: TenantStatus.ACTIVE,
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // 创建租户所有者成员记录
    const member = this.memberRepository.create({
      userId: ownerId,
      tenantId: savedTenant.id,
      status: MemberStatus.ACTIVE,
    });

    await this.memberRepository.save(member);

    return savedTenant;
  }

  async logout(userId: string) {
    // 从Redis中删除token（如果Redis可用）
    try {
      await this.redisService.del(`token:${userId}`);
    } catch (redisError) {
      console.warn('Redis连接失败，跳过token删除:', redisError.message);
      // Redis连接失败不影响登出流程
    }
    return { message: '退出成功' };
  }

  async refreshToken(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['members', 'members.tenant'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    const payload = {
      sub: user.id,
      username: user.username,
    };

    const token = this.jwtService.sign(payload);

    // 更新Redis中的token（如果Redis可用）
    try {
      await this.redisService.set(`token:${userId}`, token, 7 * 24 * 60 * 60);
    } catch (redisError) {
      console.warn('Redis连接失败，跳过token更新:', redisError.message);
      // Redis连接失败不影响刷新token流程
    }

    return {
      access_token: token,
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('原密码错误');
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });

    return { message: '密码修改成功' };
  }

  async checkPhoneExists(phone: string) {
    const user = await this.userRepository.findOne({
      where: { phone },
    });

    return {
      exists: !!user,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['members', 'members.tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 找到用户当前活跃的成员记录
    const activeMember = user.members?.find(member => member.status === 'active');
    
    if (!activeMember) {
      throw new UnauthorizedException('用户没有活跃的租户成员记录');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      member: {
        id: activeMember.id,
        userId: activeMember.userId,
        tenantId: activeMember.tenantId,
        status: activeMember.status,
        nickname: activeMember.nickname,
        position: activeMember.position,
        createdAt: activeMember.createdAt,
        updatedAt: activeMember.updatedAt,
      },
      tenant: {
        id: activeMember.tenant.id,
        name: activeMember.tenant.name,
        status: activeMember.tenant.status,
        ownerId: activeMember.tenant.ownerId,
        createdAt: activeMember.tenant.createdAt,
        updatedAt: activeMember.tenant.updatedAt,
      },
    };
  }
}
