import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { Member } from '../../../entities/member.entity';
import { RedisService } from '../../../common/redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // 允许在 validate 中访问 request 对象
    });
  }

  async validate(req: any, payload: any) {
    const { sub: userId, memberId, tenantId } = payload;

    // 暂时禁用Redis检查，避免Redis连接问题
    // const tokenExists = await this.redisService.exists(`token:${userId}`);
    // if (!tokenExists) {
    //   throw new UnauthorizedException('Token已失效');
    // }

    // 获取用户信息
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['members', 'members.tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 如果指定了成员ID，获取成员信息
    let member = null;
    let actualTenantId = tenantId;
    
    if (memberId) {
      member = await this.memberRepository.findOne({
        where: { id: memberId },
        relations: ['tenant', 'memberRoles', 'memberRoles.role'],
      });

      if (!member) {
        throw new UnauthorizedException('成员不存在');
      }
      
      // 从成员信息中获取tenantId
      actualTenantId = member.tenantId;
      console.log('JWT validate - 从成员获取 tenantId:', {
        memberId: memberId,
        memberTenantId: member.tenantId,
        memberTenantIdType: typeof member.tenantId
      });
    } else if (user.members && user.members.length > 0) {
      // 如果没有指定memberId，使用第一个成员的tenantId
      actualTenantId = user.members[0].tenantId;
      console.log('JWT validate - 从用户成员获取 tenantId:', {
        firstMemberTenantId: user.members[0].tenantId,
        firstMemberTenantIdType: typeof user.members[0].tenantId
      });
    }

    // 验证 tenantId 是否有效
    if (actualTenantId === null || actualTenantId === undefined) {
      console.error('JWT validate - tenantId is null or undefined:', {
        userId: userId,
        memberId: memberId,
        tenantId: actualTenantId,
        payloadTenantId: tenantId
      });
      throw new UnauthorizedException('无法确定租户信息，请重新登录');
    }

    // 验证 tenantId 是否为有效的数字
    if (typeof actualTenantId === 'number') {
      if (isNaN(actualTenantId) || !isFinite(actualTenantId)) {
        console.error('JWT validate - tenantId is NaN or not finite:', {
          userId: userId,
          memberId: memberId,
          tenantId: actualTenantId,
          isNaN: isNaN(actualTenantId),
          isFinite: isFinite(actualTenantId)
        });
        throw new UnauthorizedException('租户ID无效，请重新登录');
      }
      if (actualTenantId <= 0 || !Number.isInteger(actualTenantId)) {
        console.error('JWT validate - tenantId is not a positive integer:', {
          userId: userId,
          memberId: memberId,
          tenantId: actualTenantId
        });
        throw new UnauthorizedException('租户ID无效，请重新登录');
      }
    } else if (typeof actualTenantId === 'string') {
      // 如果是字符串，尝试转换为数字
      if (actualTenantId.trim() === '' || actualTenantId.toLowerCase() === 'nan' || actualTenantId.toLowerCase() === 'null') {
        console.error('JWT validate - tenantId is invalid string:', {
          userId: userId,
          memberId: memberId,
          tenantId: actualTenantId
        });
        throw new UnauthorizedException('租户ID无效，请重新登录');
      }
      const parsedTenantId = parseInt(actualTenantId, 10);
      if (isNaN(parsedTenantId) || !isFinite(parsedTenantId) || parsedTenantId <= 0) {
        console.error('JWT validate - parsed tenantId is invalid:', {
          userId: userId,
          memberId: memberId,
          originalTenantId: actualTenantId,
          parsedTenantId: parsedTenantId
        });
        throw new UnauthorizedException('租户ID格式错误，请重新登录');
      }
      actualTenantId = parsedTenantId;
    } else {
      console.error('JWT validate - tenantId has invalid type:', {
        userId: userId,
        memberId: memberId,
        tenantId: actualTenantId,
        tenantIdType: typeof actualTenantId
      });
      throw new UnauthorizedException('租户ID类型错误，请重新登录');
    }

    console.log('JWT validate - 最终结果:', {
      userId: userId,
      tenantId: actualTenantId,
      tenantIdType: typeof actualTenantId,
      memberId: memberId
    });

    // 从请求头获取当前部门ID
    const departmentIdHeader = req?.headers?.['x-current-department-id'];
    const currentDepartmentId = departmentIdHeader 
      ? (typeof departmentIdHeader === 'string' ? parseInt(departmentIdHeader, 10) : departmentIdHeader)
      : undefined;

    return {
      userId,
      user,
      member,
      memberId,
      tenantId: actualTenantId,
      currentDepartmentId,
      isSystemAdmin: user.isSystemAdmin || false, // 添加系统管理员标识
    };
  }
}
