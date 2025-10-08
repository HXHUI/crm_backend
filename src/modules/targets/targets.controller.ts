import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common'
import { TargetsService } from './targets.service'

@Controller('targets')
export class TargetsController {
  constructor(private service: TargetsService) {}

  @Get()
  async list(@Query() query: any) {
    const data = await this.service.list(query)
    return { code: 200, message: 'ok', data }
  }

  @Get('owner-options')
  async ownerOptions(@Query('ownerType') ownerType: 'department'|'member', @Query('tenantId') tenantId?: string) {
    const data = await this.service.ownerOptions(ownerType, tenantId)
    return { code: 200, data }
  }

  @Post('save-year')
  async saveYear(@Body() body: any, @Req() req: any) {
    const userId = (req.user?.member?.id || req.user?.memberId || req.user?.id || '').toString()
    const res = await this.service.saveYear(body, userId)
    return { code: 200, message: 'saved', data: res }
  }
}


