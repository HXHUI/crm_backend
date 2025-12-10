import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { WorkflowTemplate } from '../../entities/workflow-template.entity';
import { WorkflowNode } from '../../entities/workflow-node.entity';
import { WorkflowInstance } from '../../entities/workflow-instance.entity';
import { WorkflowRecord } from '../../entities/workflow-record.entity';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowTemplate)
    private readonly templateRepository: Repository<WorkflowTemplate>,
    @InjectRepository(WorkflowNode)
    private readonly nodeRepository: Repository<WorkflowNode>,
    @InjectRepository(WorkflowInstance)
    private readonly instanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowRecord)
    private readonly recordRepository: Repository<WorkflowRecord>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建审批流模板
   */
  async createTemplate(createDto: CreateWorkflowTemplateDto, tenantId: number): Promise<WorkflowTemplate> {
    const { name, description, businessType, isActive = true, nodes } = createDto;

    // 检查是否已存在同名的启用模板
    const existingTemplate = await this.templateRepository.findOne({
      where: { name, businessType, tenantId, isActive: true },
    });

    if (existingTemplate) {
      throw new ConflictException('该业务类型下已存在同名的启用模板');
    }

    // 验证节点配置
    if (!nodes || nodes.length === 0) {
      throw new BadRequestException('审批流至少需要一个节点');
    }

    // 验证节点顺序
    const nodeOrders = nodes.map((n, index) => n.nodeOrder ?? index + 1);
    const uniqueOrders = new Set(nodeOrders);
    if (uniqueOrders.size !== nodeOrders.length) {
      throw new BadRequestException('节点顺序不能重复');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 创建模板
      const template = manager.create(WorkflowTemplate, {
        name,
        description,
        businessType,
        isActive,
        version: 1,
        tenantId,
      });
      const savedTemplate = await manager.save(template);

      // 创建节点
      const sortedNodes = [...nodes].sort((a, b) => (a.nodeOrder ?? 0) - (b.nodeOrder ?? 0));
      const nodeEntities = sortedNodes.map((nodeDto, index) => {
        return manager.create(WorkflowNode, {
          name: nodeDto.name,
          nodeType: nodeDto.nodeType,
          approvalMode: nodeDto.approvalMode,
          approverConfig: nodeDto.approverConfig,
          nodeOrder: nodeDto.nodeOrder ?? index + 1,
          templateId: savedTemplate.id,
        });
      });

      await manager.save(nodeEntities);

      // 重新加载关联数据
      return await manager.findOne(WorkflowTemplate, {
        where: { id: savedTemplate.id },
        relations: ['nodes'],
      });
    });
  }

  /**
   * 获取审批流模板列表
   */
  async findAllTemplates(tenantId: number, businessType?: string) {
    const where: any = { tenantId };
    if (businessType) {
      where.businessType = businessType;
    }

    return await this.templateRepository.find({
      where,
      relations: ['nodes'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取审批流模板详情
   */
  async findTemplateById(id: number, tenantId: number): Promise<WorkflowTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
      relations: ['nodes'],
      order: { nodes: { nodeOrder: 'ASC' } },
    });

    if (!template) {
      throw new NotFoundException('审批流模板不存在');
    }

    return template;
  }

  /**
   * 获取启用的审批流模板（用于业务对象提交审批）
   */
  async findActiveTemplate(businessType: string, tenantId: number): Promise<WorkflowTemplate | null> {
    return await this.templateRepository.findOne({
      where: { businessType: businessType as any, tenantId, isActive: true },
      relations: ['nodes'],
      order: { nodes: { nodeOrder: 'ASC' } },
    });
  }

  /**
   * 更新审批流模板
   */
  async updateTemplate(id: number, updateDto: UpdateWorkflowTemplateDto, tenantId: number): Promise<WorkflowTemplate> {
    const template = await this.findTemplateById(id, tenantId);

    if (updateDto.nodes) {
      // 验证节点配置
      if (updateDto.nodes.length === 0) {
        throw new BadRequestException('审批流至少需要一个节点');
      }

      // 检查是否有使用该模板的审批实例
      const hasInstances = await this.instanceRepository.count({
        where: { templateId: id, tenantId },
      });

      if (hasInstances > 0) {
        // 检查是否有审批记录引用这些节点
        const existingNodes = await this.nodeRepository.find({
          where: { templateId: id },
          select: ['id'],
        });

        if (existingNodes.length > 0) {
          const nodeIds = existingNodes.map((n) => n.id);
          const hasRecords = await this.recordRepository.count({
            where: { nodeId: In(nodeIds), tenantId },
          });

          if (hasRecords > 0) {
            throw new BadRequestException(
              '该审批流模板已被使用，无法修改节点配置。如需修改，请先完成或取消所有相关的审批流程，或创建新模板。',
            );
          }
        }
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      // 更新模板基本信息
      if (updateDto.name !== undefined) template.name = updateDto.name;
      if (updateDto.description !== undefined) template.description = updateDto.description;
      if (updateDto.businessType !== undefined) template.businessType = updateDto.businessType;
      if (updateDto.isActive !== undefined) template.isActive = updateDto.isActive;

      await manager.save(template);

      // 如果更新了节点，先删除旧节点，再创建新节点
      if (updateDto.nodes) {
        // 再次检查（在事务中）
        const existingNodes = await manager.find(WorkflowNode, {
          where: { templateId: id },
          select: ['id'],
        });

        if (existingNodes.length > 0) {
          const nodeIds = existingNodes.map((n) => n.id);
          const hasRecords = await manager.count(WorkflowRecord, {
            where: { nodeId: In(nodeIds), tenantId },
          });

          if (hasRecords > 0) {
            throw new BadRequestException(
              '该审批流模板已被使用，无法修改节点配置。如需修改，请先完成或取消所有相关的审批流程，或创建新模板。',
            );
          }
        }

        await manager.delete(WorkflowNode, { templateId: id });

        const sortedNodes = [...updateDto.nodes].sort((a, b) => (a.nodeOrder ?? 0) - (b.nodeOrder ?? 0));
        const nodeEntities = sortedNodes.map((nodeDto, index) => {
          return manager.create(WorkflowNode, {
            name: nodeDto.name,
            nodeType: nodeDto.nodeType,
            approvalMode: nodeDto.approvalMode,
            approverConfig: nodeDto.approverConfig,
            nodeOrder: nodeDto.nodeOrder ?? index + 1,
            templateId: id,
          });
        });

        await manager.save(nodeEntities);
      }

      // 重新加载
      return await this.findTemplateById(id, tenantId);
    });
  }

  /**
   * 删除审批流模板
   */
  async deleteTemplate(id: number, tenantId: number): Promise<void> {
    const template = await this.findTemplateById(id, tenantId);

    // 检查是否有正在使用的审批实例
    // TODO: 这里可以添加检查逻辑

    await this.templateRepository.remove(template);
  }
}

