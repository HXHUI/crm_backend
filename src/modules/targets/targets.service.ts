import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Target } from '../../entities/target.entity'
import { Department } from '../../entities/department.entity'
import { Member } from '../../entities/member.entity'

@Injectable()
export class TargetsService {
  constructor(
    @InjectRepository(Target) private repo: Repository<Target>,
    @InjectRepository(Department) private deptRepo: Repository<Department>,
    @InjectRepository(Member) private memberRepo: Repository<Member>,
  ) {}

  async list(params: any) {
    const { year, ownerType } = params
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    const qb = this.repo.createQueryBuilder('t')
      .where('t.targetMonth BETWEEN :start AND :end', { start, end })
    if (ownerType) qb.andWhere('t.ownerType = :ownerType', { ownerType })
    const rows = await qb.getMany()

    // 聚合为前端展示结构
    const map: Record<string, any> = {}
    rows.forEach(r => {
      const key = `${r.ownerType}:${r.ownerId}:${r.targetType}`
      if (!map[key]) map[key] = { ownerType: r.ownerType, ownerId: r.ownerId, ownerName: `${r.ownerType}#${r.ownerId}`, typeName: r.targetType, monthValues: Array(12).fill(0), total: 0 }
      const monthIdx = new Date(r.targetMonth).getMonth()
      const val = Number(r.targetValue)
      map[key].monthValues[monthIdx] = val
      map[key].total += val
    })
    const result = Object.values(map)

    // 补充 ownerName 为可读名称
    const deptIds = Array.from(new Set(result.filter((r: any) => r.ownerType === 'department').map((r: any) => r.ownerId)))
    const memberIds = Array.from(new Set(result.filter((r: any) => r.ownerType === 'member').map((r: any) => r.ownerId)))
    const deptMap: Record<string, string> = {}
    const memberMap: Record<string, string> = {}
    if (deptIds.length) {
      const depts = await this.deptRepo.findBy({ id: In(deptIds as any) })
      depts.forEach(d => (deptMap[d.id as any] = d.name as any))
    }
    if (memberIds.length) {
      const members = await this.memberRepo.find({ where: { id: In(memberIds as any) } as any, relations: ['user'], select: { id: true, nickname: true, user: { username: true } } as any })
      members.forEach((m: any) => (memberMap[m.id] = m.nickname || m.user?.username || m.id))
    }
    result.forEach((r: any) => {
      if (r.ownerType === 'department') r.ownerName = deptMap[r.ownerId] || r.ownerName
      if (r.ownerType === 'member') r.ownerName = memberMap[r.ownerId] || r.ownerName
    })
    return result
  }

  async saveYear(body: any, userId: string) {
    const { ownerType, ownerIds, targetType, unit, year, months, tenantId } = body
    const targetOwnerIds: string[] = Array.isArray(ownerIds) && ownerIds.length ? ownerIds : []
    if (!targetOwnerIds.length) return { success: false, message: 'ownerIds is empty' }

    for (const oid of targetOwnerIds) {
      const toSave: Target[] = []
      for (let i = 0; i < 12; i++) {
        const month = i + 1
        const monthStr = `${year}-${String(month).padStart(2, '0')}-01`
        const entity = this.repo.create({
          tenantId,
          ownerType,
          ownerId: oid,
          targetType,
          unit,
          targetMonth: monthStr,
          targetValue: String(months[i] || 0),
          createdBy: userId,
        })
        toSave.push(entity)
      }
      // 先删除本年同对象同类型
      await this.repo.createQueryBuilder()
        .delete()
        .where('tenant_id = :tenantId AND owner_type = :ownerType AND owner_id = :ownerId AND target_type = :targetType AND target_month BETWEEN :s AND :e', {
          tenantId,
          ownerType,
          ownerId: oid,
          targetType,
          s: `${year}-01-01`,
          e: `${year}-12-31`,
        }).execute()
      await this.repo.save(toSave)
    }
    return { success: true }
  }

  async ownerOptions(ownerType: 'department'|'member', tenantId?: string) {
    if (ownerType === 'member') {
      const list = await this.memberRepo.find({
        where: tenantId ? ({ tenantId } as any) : ({} as any),
        relations: ['user'],
        select: { id: true, nickname: true, user: { username: true } } as any,
      })
      return list.map((m: any) => ({ id: m.id, name: m.nickname || m.user?.username || m.id }))
    }
    const depts = await this.deptRepo.find({ where: tenantId ? { tenantId } as any : {}, select: { id: true, name: true } as any })
    return depts.map(d => ({ id: d.id, name: d.name }))
  }
}


