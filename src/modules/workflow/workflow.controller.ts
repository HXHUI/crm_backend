import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkflowService } from './workflow.service';
import { WorkflowInstanceService } from './workflow-instance.service';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ApprovalActionDto, ReturnApprovalDto } from './dto/approval-action.dto';
import { TransferApprovalDto } from './dto/transfer-approval.dto';
import { AddSignDto } from './dto/add-sign.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('workflow')
@UseGuards(AuthGuard('jwt'))
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly instanceService: WorkflowInstanceService,
  ) {}

  // ========== 审批流模板管理 ==========

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() createDto: CreateWorkflowTemplateDto, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const template = await this.workflowService.createTemplate(createDto, tenantId);
    return {
      code: 201,
      message: '创建审批流模板成功',
      data: template,
    };
  }

  @Get('templates')
  async findAllTemplates(@Query('businessType') businessType: string, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const templates = await this.workflowService.findAllTemplates(tenantId, businessType);
    return {
      code: 200,
      message: '获取审批流模板列表成功',
      data: templates,
    };
  }

  @Get('templates/:id')
  async findTemplateById(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const template = await this.workflowService.findTemplateById(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '获取审批流模板详情成功',
      data: template,
    };
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowTemplateDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const template = await this.workflowService.updateTemplate(parseInt(id, 10), updateDto, tenantId);
    return {
      code: 200,
      message: '更新审批流模板成功',
      data: template,
    };
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.workflowService.deleteTemplate(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '删除审批流模板成功',
    };
  }

  // ========== 审批操作 ==========

  @Post('instances/submit')
  @HttpCode(HttpStatus.CREATED)
  async submitApproval(@Body() submitDto: SubmitApprovalDto, @CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const departmentId = user.currentDepartmentId
      ? typeof user.currentDepartmentId === 'string'
        ? parseInt(user.currentDepartmentId, 10)
        : user.currentDepartmentId
      : undefined;

    // TODO: 从业务对象获取ownerId和departmentId
    const instance = await this.instanceService.submitApproval(
      submitDto,
      memberId,
      tenantId,
      undefined,
      departmentId,
    );
    return {
      code: 201,
      message: '提交审批成功',
      data: instance,
    };
  }

  @Get('instances')
  async findMyApprovals(
    @Query('type') type: 'pending' | 'approved',
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    if (type === 'pending') {
      const result = await this.instanceService.findMyPendingApprovals(memberId, tenantId, pageNum, limitNum);
      return {
        code: 200,
        message: '获取待审批列表成功',
        data: result,
      };
    } else {
      const result = await this.instanceService.findMyApprovedList(memberId, tenantId, pageNum, limitNum);
      return {
        code: 200,
        message: '获取已审批列表成功',
        data: result,
      };
    }
  }

  @Post('instances/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() actionDto: ApprovalActionDto,
    @CurrentUser() user: any,
  ) {
    console.log('=== 审批通过接口被调用 ===');
    console.log('instanceId:', id);
    console.log('actionDto:', actionDto);
    console.log('user:', user);
    
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    
    console.log('memberId:', memberId);
    console.log('tenantId:', tenantId);
    
    const instance = await this.instanceService.approve(parseInt(id, 10), memberId, actionDto, tenantId);
    
    console.log('审批通过成功，返回实例ID:', instance.id);
    
    return {
      code: 200,
      message: '审批通过成功',
      data: instance,
    };
  }

  @Post('instances/:id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() actionDto: ApprovalActionDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const instance = await this.instanceService.reject(parseInt(id, 10), memberId, actionDto, tenantId);
    return {
      code: 200,
      message: '审批拒绝成功',
      data: instance,
    };
  }

  @Post('instances/:id/transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(
    @Param('id') id: string,
    @Body() transferDto: TransferApprovalDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const instance = await this.instanceService.transfer(parseInt(id, 10), memberId, transferDto, tenantId);
    return {
      code: 200,
      message: '转办成功',
      data: instance,
    };
  }

  @Post('instances/:id/add-sign')
  @HttpCode(HttpStatus.OK)
  async addSign(
    @Param('id') id: string,
    @Body() addSignDto: AddSignDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const instance = await this.instanceService.addSign(parseInt(id, 10), memberId, addSignDto, tenantId);
    return {
      code: 200,
      message: '加签成功',
      data: instance,
    };
  }

  @Post('instances/:id/return')
  @HttpCode(HttpStatus.OK)
  async returnApproval(
    @Param('id') id: string,
    @Body() returnDto: ReturnApprovalDto,
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const instance = await this.instanceService.returnApproval(parseInt(id, 10), memberId, returnDto, tenantId);
    return {
      code: 200,
      message: '退回成功',
      data: instance,
    };
  }

  @Get('instances/:id')
  async findInstanceById(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const instance = await this.instanceService.findInstanceById(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '获取审批详情成功',
      data: instance,
    };
  }
}

