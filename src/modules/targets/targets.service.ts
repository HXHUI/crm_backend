import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Target } from '../../entities/target.entity';
import { Department } from '../../entities/department.entity';
import { Member } from '../../entities/member.entity';
import { Tenant } from '../../entities/tenant.entity';
import { MemberDepartment } from '../../entities/member-department.entity';

@Injectable()
export class TargetsService {
  constructor(
    @InjectRepository(Target) private repo: Repository<Target>,
    @InjectRepository(Department) private deptRepo: Repository<Department>,
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(MemberDepartment) private memberDeptRepo: Repository<MemberDepartment>,
  ) {}

  async list(params: any) {
    const { year, ownerType, targetType, targetTypes } = params;
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const qb = this.repo.createQueryBuilder('t')
      .where('t.targetMonth BETWEEN :start AND :end', { start, end });
    if (ownerType && Array.isArray(ownerType) && ownerType.length > 0) {
      qb.andWhere('t.ownerType IN (:...ownerTypes)', { ownerTypes: ownerType });
    }
    let typeFilters: string[] = [];
    if (Array.isArray(targetTypes)) {
      typeFilters = targetTypes;
    } else if (typeof targetTypes === 'string' && targetTypes.length > 0) {
      typeFilters = targetTypes.split(',').filter((x) => x);
    } else if (targetType) {
      typeFilters = [targetType];
    }
    if (typeFilters.length > 0) {
      qb.andWhere('t.targetType IN (:...targetTypes)', { targetTypes: typeFilters });
    }
    const rows = await qb.getMany();

    const map: Record<string, any> = {};
    rows.forEach(r => {
      const key = `${r.ownerType}:${r.ownerId}:${r.targetType}`;
      if (!map[key]) map[key] = { ownerType: r.ownerType, ownerId: r.ownerId, ownerName: `${r.ownerType}#${r.ownerId}`, typeName: r.targetType, monthValues: Array(12).fill(0), total: 0 };
      const monthIdx = new Date(r.targetMonth).getMonth();
      const val = Number(r.targetValue);
      map[key].monthValues[monthIdx] = val;
      map[key].total += val;
    });
    const result = Object.values(map);

    const tenantIds = Array.from(new Set(result.filter((r: any) => r.ownerType === 'tenant').map((r: any) => r.ownerId)));
    const deptIds = Array.from(new Set(result.filter((r: any) => r.ownerType === 'department').map((r: any) => r.ownerId)));
    const memberIds = Array.from(new Set(result.filter((r: any) => r.ownerType === 'member').map((r: any) => r.ownerId)));
    const tenantMap: Record<string, string> = {};
    const deptMap: Record<string, string> = {};
    const memberMap: Record<string, string> = {};
    if (tenantIds.length) {
      const tenants = await this.tenantRepo.findBy({ id: In(tenantIds as any) });
      tenants.forEach(t => (tenantMap[t.id as any] = t.name as any));
    }
    if (deptIds.length) {
      const depts = await this.deptRepo.findBy({ id: In(deptIds as any) });
      depts.forEach(d => (deptMap[d.id as any] = d.name as any));
    }
    if (memberIds.length) {
      const members = await this.memberRepo.find({ where: { id: In(memberIds as any) } as any, relations: ['user'], select: { id: true, nickname: true, user: { username: true } } as any });
      members.forEach((m: any) => (memberMap[m.id] = m.nickname || m.user?.username || m.id));
    }
    result.forEach((r: any) => {
      if (r.ownerType === 'tenant') r.ownerName = tenantMap[r.ownerId] || r.ownerName;
      if (r.ownerType === 'department') r.ownerName = deptMap[r.ownerId] || r.ownerName;
      if (r.ownerType === 'member') r.ownerName = memberMap[r.ownerId] || r.ownerName;
    });
    return result;
  }

  async saveYear(body: any, userId: number) {
    const { ownerType, ownerIds, targetType, unit, year, months, tenantId } = body;
    const targetOwnerIds: number[] = Array.isArray(ownerIds) && ownerIds.length ? ownerIds.map((id: any) => typeof id === 'string' ? parseInt(id, 10) : id) : [];
    if (!targetOwnerIds.length) return { success: false, message: 'ownerIds is empty' };

    for (const oid of targetOwnerIds) {
      const toSave: Target[] = [];
      for (let i = 0; i < 12; i++) {
        const month = i + 1;
        const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const entity = this.repo.create({
          tenantId,
          ownerType,
          ownerId: oid,
          targetType,
          unit,
          targetMonth: monthStr,
          targetValue: String(months[i] || 0),
          createdBy: userId,
        });
        toSave.push(entity);
      }
      await this.repo.createQueryBuilder()
        .delete()
        .where('tenant_id = :tenantId AND owner_type = :ownerType AND owner_id = :ownerId AND target_type = :targetType AND target_month BETWEEN :s AND :e', {
          tenantId,
          ownerType,
          ownerId: oid,
          targetType,
          s: `${year}-01-01`,
          e: `${year}-12-31`,
        }).execute();
      await this.repo.save(toSave);
    }
    return { success: true };
  }

  async ownerOptions(ownerType: 'tenant'|'department'|'member', tenantId?: number) {
    if (ownerType === 'tenant') {
      const where = tenantId ? { id: tenantId } as any : {};
      const tenants = await this.tenantRepo.find({ where, select: { id: true, name: true } as any });
      return tenants.map(t => ({ id: t.id, name: t.name }));
    }
    if (ownerType === 'member') {
      const list = await this.memberRepo.find({
        where: tenantId ? ({ tenantId } as any) : ({} as any),
        relations: ['user'],
        select: { id: true, nickname: true, user: { username: true } } as any,
      });
      return list.map((m: any) => ({ id: m.id, name: m.nickname || m.user?.username || m.id }));
    }
    const depts = await this.deptRepo.find({ where: tenantId ? { tenantId } as any : {}, select: { id: true, name: true } as any });
    return depts.map(d => ({ id: d.id, name: d.name }));
  }

  private async getDepartmentMemberIds(departmentId: number, tenantId: number): Promise<number[]> {
    const getAllSubDepartmentIds = async (parentIds: number[]): Promise<number[]> => {
      if (parentIds.length === 0) return [];
      const subDepartments = await this.deptRepo.find({
        where: { parentId: In(parentIds), tenantId } as any,
      });
      if (subDepartments.length === 0) return [];
      const subDepartmentIds = subDepartments.map(d => d.id);
      const deeperSubIds = await getAllSubDepartmentIds(subDepartmentIds);
      return [...subDepartmentIds, ...deeperSubIds];
    };
    const allDepartmentIds = [departmentId];
    const subDepartmentIds = await getAllSubDepartmentIds([departmentId]);
    allDepartmentIds.push(...subDepartmentIds);
    const memberDepartments = await this.memberDeptRepo.find({
      where: { departmentId: In(allDepartmentIds) } as any,
    });
    return [...new Set(memberDepartments.map(md => md.memberId))];
  }

  private async getSubordinateMemberIds(memberId: number, tenantId: number): Promise<number[]> {
    const memberIds: number[] = [memberId];
    const managedDepartments = await this.deptRepo.find({
      where: { managerId: memberId, tenantId } as any,
    });
    if (managedDepartments.length > 0) {
      const getAllSubDepartmentIds = async (parentIds: number[]): Promise<number[]> => {
        if (parentIds.length === 0) return [];
        const subDepartments = await this.deptRepo.find({
          where: { parentId: In(parentIds), tenantId } as any,
        });
        if (subDepartments.length === 0) return [];
        const subDepartmentIds = subDepartments.map(d => d.id);
        const deeperSubIds = await getAllSubDepartmentIds(subDepartmentIds);
        return [...subDepartmentIds, ...deeperSubIds];
      };
      const allDepartmentIds = new Set<number>();
      managedDepartments.forEach(dept => allDepartmentIds.add(dept.id));
      const departmentIdsArray = Array.from(allDepartmentIds);
      const subDepartmentIds = await getAllSubDepartmentIds(departmentIdsArray);
      departmentIdsArray.forEach(id => allDepartmentIds.add(id));
      subDepartmentIds.forEach(id => allDepartmentIds.add(id));
      if (allDepartmentIds.size > 0) {
        const subordinateMembers = await this.memberDeptRepo.find({
          where: { departmentId: In(Array.from(allDepartmentIds)) } as any,
        });
        subordinateMembers.forEach(sm => {
          if (!memberIds.includes(sm.memberId)) {
            memberIds.push(sm.memberId);
          }
        });
      }
    }
    return memberIds;
  }

  /**
   * 获取同级部门ID列表
   */
  private async getSiblingDepartmentIds(departmentId: number, tenantId: number): Promise<number[]> {
    const department = await this.deptRepo.findOne({
      where: { id: departmentId, tenantId } as any,
    });
    if (!department) {
      return [];
    }
    // 获取同一父部门下的所有部门（同级部门）
    const siblingDepartments = await this.deptRepo.find({
      where: { parentId: department.parentId, tenantId } as any,
    });
    return siblingDepartments.map(d => d.id);
  }

  /**
   * 获取同部门同级用户ID列表
   */
  private async getSiblingMemberIds(memberId: number, tenantId: number): Promise<number[]> {
    // 获取成员所属的部门
    const memberDepartments = await this.memberDeptRepo.find({
      where: { memberId } as any,
    });
    if (memberDepartments.length === 0) {
      return [memberId]; // 如果没有部门，只返回自己
    }
    // 获取所有部门下的成员（同部门成员）
    const departmentIds = memberDepartments.map(md => md.departmentId);
    const allMembers = await this.memberDeptRepo.find({
      where: { departmentId: In(departmentIds) } as any,
    });
    return [...new Set(allMembers.map(md => md.memberId))];
  }

  async getTargetTrendForTenants(
    tenantIds: number[],
    targetType: string,
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
  ) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const qb = this.repo.createQueryBuilder('t')
      .where('t.targetMonth BETWEEN :start AND :end', { start, end })
      .andWhere('t.targetType = :targetType', { targetType })
      .andWhere('t.tenantId IN (:...tenantIds)', { tenantIds });
    if (scopeType === 'department' && departmentId) {
      qb.andWhere('t.ownerType = :ownerType', { ownerType: 'department' })
        .andWhere('t.ownerId = :ownerId', { ownerId: departmentId });
    } else if (scopeType === 'member' && memberId) {
      qb.andWhere('t.ownerType = :ownerType', { ownerType: 'member' })
        .andWhere('t.ownerId = :ownerId', { ownerId: memberId });
    } else if (scopeType === 'me_and_subordinates' && memberId) {
      const memberIds = await this.getSubordinateMemberIds(memberId, tenantIds[0]);
      qb.andWhere('t.ownerType = :ownerType', { ownerType: 'member' })
        .andWhere('t.ownerId IN (:...memberIds)', { memberIds });
    }
    const rows = await qb.getMany();
    const monthTargets = Array(12).fill(0);
    rows.forEach(r => {
      const monthIdx = new Date(r.targetMonth).getMonth();
      monthTargets[monthIdx] = Number(r.targetValue);
    });
    return {
      months: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
      targets: monthTargets,
    };
  }

  async getTargetRankingForTenants(
    tenantIds: number[],
    targetType: string,
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
  ) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    
    // 根据范围类型决定查询哪些部门或成员
    let targetOwnerIds: number[] = [];
    let ownerTypeFilter: 'department' | 'member' | undefined;
    
    if (scopeType === 'department' && departmentId) {
      // 如果选择部门，比对同级部门
      ownerTypeFilter = 'department';
      targetOwnerIds = await this.getSiblingDepartmentIds(departmentId, tenantIds[0]);
    } else if (scopeType === 'member' && memberId) {
      // 如果选择用户，比对同部门同级用户
      ownerTypeFilter = 'member';
      targetOwnerIds = await this.getSiblingMemberIds(memberId, tenantIds[0]);
      // 确保包含当前用户
      if (!targetOwnerIds.includes(memberId)) {
        targetOwnerIds.push(memberId);
      }
    } else {
      // 其他情况，查询所有
      if (scopeType === 'department') {
        ownerTypeFilter = 'department';
      } else if (scopeType === 'member') {
        ownerTypeFilter = 'member';
      }
    }

    const qb = this.repo.createQueryBuilder('t')
      .where('t.targetMonth BETWEEN :start AND :end', { start, end })
      .andWhere('t.targetType = :targetType', { targetType })
      .andWhere('t.tenantId IN (:...tenantIds)', { tenantIds });
    
    if (ownerTypeFilter) {
      qb.andWhere('t.ownerType = :ownerType', { ownerType: ownerTypeFilter });
    }
    
    // 如果指定了目标所有者ID列表，进行过滤
    if (targetOwnerIds.length > 0) {
      qb.andWhere('t.ownerId IN (:...ownerIds)', { ownerIds: targetOwnerIds });
    } else if (targetOwnerIds.length === 0 && (scopeType === 'department' || scopeType === 'member')) {
      // 如果没有找到同级部门/用户，返回空结果
      return [];
    }
    
    const rows = await qb.getMany();
    const map: Record<string, { ownerType: string; ownerId: number; totalTarget: number }> = {};
    rows.forEach(r => {
      const key = `${r.ownerType}:${r.ownerId}`;
      if (!map[key]) {
        map[key] = {
          ownerType: r.ownerType,
          ownerId: r.ownerId,
          totalTarget: 0,
        };
      }
      map[key].totalTarget += Number(r.targetValue);
    });
    const result = Object.values(map);
    const deptIds = result.filter(r => r.ownerType === 'department').map(r => r.ownerId);
    const memberIds = result.filter(r => r.ownerType === 'member').map(r => r.ownerId);
    const deptMap: Record<number, string> = {};
    const memberMap: Record<number, string> = {};
    if (deptIds.length > 0) {
      const depts = await this.deptRepo.findBy({ id: In(deptIds) });
      depts.forEach(d => (deptMap[d.id as any] = d.name as any));
    }
    if (memberIds.length > 0) {
      const members = await this.memberRepo.find({
        where: { id: In(memberIds) } as any,
        relations: ['user'],
        select: { id: true, nickname: true, user: { username: true } } as any,
      });
      members.forEach((m: any) => (memberMap[m.id] = m.nickname || m.user?.username || String(m.id)));
    }
    return result.map(r => ({
      ownerType: r.ownerType,
      ownerId: r.ownerId,
      ownerName: r.ownerType === 'department' 
        ? (deptMap[r.ownerId] || `部门#${r.ownerId}`)
        : (memberMap[r.ownerId] || `成员#${r.ownerId}`),
      totalTarget: r.totalTarget,
    }));
  }

  /**
   * 删除目标（删除整年数据）
   * @param tenantId 租户ID
   * @param ownerType 所有者类型
   * @param ownerId 所有者ID
   * @param targetType 目标类型
   * @param year 年份
   */
  async delete(tenantId: number, ownerType: string, ownerId: number, targetType: string, year: number) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    await this.repo.createQueryBuilder()
      .delete()
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('owner_type = :ownerType', { ownerType })
      .andWhere('owner_id = :ownerId', { ownerId })
      .andWhere('target_type = :targetType', { targetType })
      .andWhere('target_month BETWEEN :start AND :end', { start, end })
      .execute();
  }
}
