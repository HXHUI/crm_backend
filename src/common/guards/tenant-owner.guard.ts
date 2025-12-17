import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../entities/tenant.entity';

@Injectable()
export class TenantOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // 详细的验证和日志
    console.log('TenantOwnerGuard: 开始验证', {
      hasUser: !!user,
      userId: user?.userId,
      tenantId: user?.tenantId,
      tenantIdType: typeof user?.tenantId
    });
    
    if (!user) {
      console.error('TenantOwnerGuard: user is null or undefined');
      throw new ForbiddenException('未获取到用户信息');
    }
    
    if (!user.userId) {
      console.error('TenantOwnerGuard: user.userId is null or undefined', user);
      throw new ForbiddenException('未获取到用户ID');
    }
    
    if (user.tenantId === null || user.tenantId === undefined) {
      console.error('TenantOwnerGuard: user.tenantId is null or undefined', {
        userId: user.userId,
        tenantId: user.tenantId,
        user: user
      });
      throw new ForbiddenException('未获取到租户信息');
    }

    // 安全地解析 userId
    let userId: number;
    if (typeof user.userId === 'string') {
      userId = parseInt(user.userId, 10);
      if (isNaN(userId)) {
        throw new ForbiddenException('用户ID格式错误');
      }
    } else if (typeof user.userId === 'number') {
      userId = user.userId;
    } else {
      throw new ForbiddenException('用户ID格式错误');
    }

    // 安全地解析 tenantId
    let tenantId: number;
    if (typeof user.tenantId === 'string') {
      if (user.tenantId.trim() === '' || user.tenantId.toLowerCase() === 'nan') {
        console.error('TenantOwnerGuard: tenantId is empty string or "NaN"', {
          userId: user.userId,
          tenantId: user.tenantId,
          type: typeof user.tenantId
        });
        throw new ForbiddenException('租户ID不能为空或无效');
      }
      tenantId = parseInt(user.tenantId, 10);
      if (isNaN(tenantId)) {
        console.error('TenantOwnerGuard: parsed tenantId is NaN', {
          userId: user.userId,
          originalTenantId: user.tenantId,
          parsedTenantId: tenantId
        });
        throw new ForbiddenException('租户ID格式错误');
      }
    } else if (typeof user.tenantId === 'number') {
      tenantId = user.tenantId;
      if (isNaN(tenantId)) {
        console.error('TenantOwnerGuard: tenantId is NaN number', {
          userId: user.userId,
          tenantId: user.tenantId,
          type: typeof user.tenantId
        });
        throw new ForbiddenException('租户ID格式错误');
      }
    } else {
      console.error('TenantOwnerGuard: tenantId has invalid type', {
        userId: user.userId,
        tenantId: user.tenantId,
        type: typeof user.tenantId
      });
      throw new ForbiddenException('租户ID格式错误');
    }
    
    // 最终验证 tenantId 是否为正整数
    if (tenantId <= 0 || !Number.isInteger(tenantId) || isNaN(tenantId) || !isFinite(tenantId)) {
      console.error('TenantOwnerGuard: tenantId is not a valid positive integer', {
        userId: user.userId,
        tenantId: tenantId,
        isNaN: isNaN(tenantId),
        isFinite: isFinite(tenantId),
        isInteger: Number.isInteger(tenantId)
      });
      throw new ForbiddenException('租户ID必须是有效的正整数');
    }

    // 再次验证 tenantId 的值（防止任何边缘情况）
    const finalTenantId = Number(tenantId);
    if (isNaN(finalTenantId) || !isFinite(finalTenantId) || finalTenantId <= 0 || !Number.isInteger(finalTenantId)) {
      console.error('TenantOwnerGuard: final validation failed', {
        userId: user.userId,
        originalTenantId: user.tenantId,
        parsedTenantId: tenantId,
        finalTenantId: finalTenantId
      });
      throw new ForbiddenException('租户ID验证失败');
    }

    console.log('TenantOwnerGuard: 准备查询租户', {
      userId: userId,
      tenantId: finalTenantId,
      tenantIdType: typeof finalTenantId,
      isNaN: isNaN(finalTenantId),
      isFinite: isFinite(finalTenantId),
      isInteger: Number.isInteger(finalTenantId)
    });

    // 最后一次验证，确保 tenantId 是有效的数字
    if (isNaN(finalTenantId) || !isFinite(finalTenantId) || finalTenantId <= 0 || !Number.isInteger(finalTenantId)) {
      console.error('TenantOwnerGuard: 查询前验证失败', {
        userId: userId,
        tenantId: finalTenantId,
        isNaN: isNaN(finalTenantId),
        isFinite: isFinite(finalTenantId),
        isInteger: Number.isInteger(finalTenantId)
      });
      throw new ForbiddenException('租户ID验证失败，无法查询租户');
    }

    // 查询租户信息 - 使用明确的数字类型
    const tenant = await this.tenantRepository.findOne({
      where: { id: Number(finalTenantId) },
    });

    if (!tenant) {
      throw new ForbiddenException('租户不存在');
    }

    // 检查是否为租户负责人
    if (tenant.ownerId !== userId) {
      throw new ForbiddenException('只有租户负责人可以执行此操作');
    }
    
    return true;
  }
}

