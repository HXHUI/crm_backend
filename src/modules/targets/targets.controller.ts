import { Controller, Get, Post, Delete, Body, Query, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { TargetsService } from './targets.service'

@Controller('targets')
@UseGuards(JwtAuthGuard)
export class TargetsController {
  constructor(private service: TargetsService) {}

  @Get()
  async list(@Query() query: any) {
    // 统一处理 ownerType 参数：可能是字符串、数组或 undefined
    if (query.ownerType) {
      // 如果已经是数组，直接使用；如果是字符串，转换为数组
      if (!Array.isArray(query.ownerType)) {
        query.ownerType = [query.ownerType]
      }
    }
    const data = await this.service.list(query)
    return { code: 200, message: 'ok', data }
  }

  @Get('owner-options')
  async ownerOptions(@Query('ownerType') ownerType: 'tenant'|'department'|'member', @Query('tenantId') tenantId?: string) {
    const data = await this.service.ownerOptions(ownerType, tenantId ? parseInt(tenantId, 10) : undefined)
    return { code: 200, data }
  }

  @Post('save-year')
  async saveYear(@Body() body: any, @Req() req: any) {
    const userId = typeof (req.user?.member?.id || req.user?.memberId || req.user?.id) === 'string' ? parseInt(req.user?.member?.id || req.user?.memberId || req.user?.id || '0', 10) : (req.user?.member?.id || req.user?.memberId || req.user?.id || 0)
    const res = await this.service.saveYear(body, userId)
    return { code: 200, message: 'saved', data: res }
  }

  @Get('trend')
  async getTrend(
    @Req() req: any,
    @Query('targetType') targetType: string,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear()
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined
    const parsedScopeType = scopeType || 'me_and_subordinates'
    
    const data = await this.service.getTargetTrendForTenants(
      [tenantId],
      targetType,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId || currentMemberId,
    )
    return { code: 200, message: 'ok', data }
  }

  @Get('ranking')
  async getRanking(
    @Req() req: any,
    @Query('targetType') targetType: string,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear()
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined
    const parsedScopeType = scopeType || 'me_and_subordinates'
    
    const data = await this.service.getTargetRankingForTenants(
      [tenantId],
      targetType,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId || currentMemberId,
    )
    return { code: 200, message: 'ok', data }
  }

  @Delete()
  async delete(@Body() body: any, @Req() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId
    const { ownerType, ownerId, targetType, year } = body
    await this.service.delete(tenantId, ownerType, ownerId, targetType, year)
    return { code: 200, message: '删除成功' }
  }
}


