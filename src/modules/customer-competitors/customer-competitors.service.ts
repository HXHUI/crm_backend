import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { CustomerCompetitor, RelatedType } from '../../entities/customer-competitor.entity'
import { Customer } from '../../entities/customer.entity'
import { Opportunity } from '../../entities/opportunity.entity'
import { Contract } from '../../entities/contract.entity'
import { Order } from '../../entities/order.entity'

export interface CreateCompetitorDto {
  relatedType: RelatedType
  relatedId: number
  manufacturer: string
  productName?: string | null
  annualUsageAmount?: number | null
  unit?: string | null
  unitPrice?: number | null
  policy?: string | null
  advantages?: string | null
  problems?: string | null
}

export type UpdateCompetitorDto = Partial<CreateCompetitorDto>

@Injectable()
export class CustomerCompetitorsService {
  constructor(
    @InjectRepository(CustomerCompetitor)
    private readonly competitorRepo: Repository<CustomerCompetitor>,
  ) {}

  async create(dto: CreateCompetitorDto, tenantId?: number | null) {
    const entity = this.competitorRepo.create({
      ...dto,
      tenantId,
    })
    return this.competitorRepo.save(entity)
  }

  async findAll(params: { tenantId?: number | null; relatedType?: RelatedType; relatedId?: number }) {
    const qb = this.competitorRepo.createQueryBuilder('competitor')
    if (params.tenantId !== undefined) {
      qb.andWhere('competitor.tenantId = :tenantId', { tenantId: params.tenantId })
    }
    if (params.relatedType) {
      qb.andWhere('competitor.relatedType = :relatedType', { relatedType: params.relatedType })
    }
    if (params.relatedId) {
      qb.andWhere('competitor.relatedId = :relatedId', { relatedId: params.relatedId })
    }
    qb.orderBy('competitor.createdAt', 'DESC')
    const list = await qb.getMany()

    if (!list.length) return list

    // 根据关联类型和ID批量查询名称信息，组装“关联对象”字段，方便前端展示
    const manager = this.competitorRepo.manager
    const customerRepo = manager.getRepository(Customer)
    const opportunityRepo = manager.getRepository(Opportunity)
    const contractRepo = manager.getRepository(Contract)
    const orderRepo = manager.getRepository(Order)
    // 确保ID是数字类型
    const customerIds = list
      .filter((item) => item.relatedType === RelatedType.CUSTOMER)
      .map((item) => (typeof item.relatedId === 'string' ? parseInt(item.relatedId, 10) : item.relatedId))
    const opportunityIds = list
      .filter((item) => item.relatedType === RelatedType.OPPORTUNITY)
      .map((item) => (typeof item.relatedId === 'string' ? parseInt(item.relatedId, 10) : item.relatedId))
    const contractIds = list
      .filter((item) => item.relatedType === RelatedType.CONTRACT)
      .map((item) => (typeof item.relatedId === 'string' ? parseInt(item.relatedId, 10) : item.relatedId))
    const orderIds = list
      .filter((item) => item.relatedType === RelatedType.ORDER)
      .map((item) => (typeof item.relatedId === 'string' ? parseInt(item.relatedId, 10) : item.relatedId))

    // 构建查询条件，明确处理租户ID
    const buildWhereCondition = (ids: number[]) => {
      const condition: any = { id: In(ids) }
      if (params.tenantId !== undefined && params.tenantId !== null) {
        condition.tenantId = params.tenantId
      }
      return condition
    }

    const [customers, opportunities, contracts, orders] = await Promise.all([
      customerIds.length
        ? customerRepo.find({
            where: buildWhereCondition(customerIds),
            select: ['id', 'name', 'companyName'],
          })
        : Promise.resolve([] as Customer[]),
      opportunityIds.length
        ? opportunityRepo.find({
            where: buildWhereCondition(opportunityIds),
            select: ['id', 'name'],
          })
        : Promise.resolve([] as Opportunity[]),
      contractIds.length
        ? contractRepo.find({
            where: buildWhereCondition(contractIds),
            select: ['id', 'contractNumber'],
          })
        : Promise.resolve([] as Contract[]),
      orderIds.length
        ? orderRepo.find({
            where: buildWhereCondition(orderIds),
            select: ['id', 'orderNumber'],
          })
        : Promise.resolve([] as Order[]),
    ])

    const customerMap = new Map<number, Customer>(customers.map((c) => [c.id, c]))
    const opportunityMap = new Map<number, Opportunity>(opportunities.map((o) => [o.id, o]))
    const contractMap = new Map<number, Contract>(contracts.map((c) => [c.id, c]))
    const orderMap = new Map<number, Order>(orders.map((o) => [o.id, o]))

    // 调试日志
    console.log('竞品列表数量:', list.length)
    console.log('客户ID列表:', customerIds)
    console.log('查询到的客户数量:', customers.length)
    console.log('客户Map:', Array.from(customerMap.entries()))

    return list.map((item) => {
      let relatedObjectName: string | null = null
      let relatedObjectLabel: string | null = null

      switch (item.relatedType) {
        case RelatedType.CUSTOMER: {
          // 确保 relatedId 是数字类型
          const relatedId = typeof item.relatedId === 'string' ? parseInt(item.relatedId, 10) : item.relatedId
          const customer = customerMap.get(relatedId)
          console.log(`竞品ID ${item.id}: relatedId=${relatedId}, 找到客户:`, customer ? customer.name || customer.companyName : '未找到')
          if (customer) {
            relatedObjectLabel = '客户'
            relatedObjectName = customer.name || customer.companyName || null
          }
          break
        }
        case RelatedType.OPPORTUNITY: {
          const relatedId = typeof item.relatedId === 'string' ? parseInt(item.relatedId, 10) : item.relatedId
          const opp = opportunityMap.get(relatedId)
          if (opp) {
            relatedObjectLabel = '商机'
            relatedObjectName = opp.name
          }
          break
        }
        case RelatedType.CONTRACT: {
          const relatedId = typeof item.relatedId === 'string' ? parseInt(item.relatedId, 10) : item.relatedId
          const contract = contractMap.get(relatedId)
          if (contract) {
            relatedObjectLabel = '合同'
            relatedObjectName = contract.contractNumber
          }
          break
        }
        case RelatedType.ORDER: {
          const relatedId = typeof item.relatedId === 'string' ? parseInt(item.relatedId, 10) : item.relatedId
          const order = orderMap.get(relatedId)
          if (order) {
            relatedObjectLabel = '订单'
            relatedObjectName = order.orderNumber
          }
          break
        }
        default:
          break
      }

      return {
        ...item,
        relatedObjectLabel,
        relatedObjectName,
      } as CustomerCompetitor & {
        relatedObjectLabel?: string | null
        relatedObjectName?: string | null
      }
    })
  }

  async findOne(id: number, tenantId?: number | null) {
    const where: any = { id }
    if (tenantId !== undefined) where.tenantId = tenantId
    const entity = await this.competitorRepo.findOne({ where })
    if (!entity) throw new NotFoundException('竞品不存在')
    return entity
  }

  async update(id: number, dto: UpdateCompetitorDto, tenantId?: number | null) {
    const entity = await this.findOne(id, tenantId)
    Object.assign(entity, dto)
    return this.competitorRepo.save(entity)
  }

  async remove(id: number, tenantId?: number | null) {
    const entity = await this.findOne(id, tenantId)
    await this.competitorRepo.softRemove(entity)
    return { affected: 1 }
  }
}

