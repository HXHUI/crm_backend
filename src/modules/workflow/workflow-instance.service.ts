import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThanOrEqual } from 'typeorm';
import { WorkflowInstance, InstanceStatus } from '../../entities/workflow-instance.entity';
import { WorkflowRecord, RecordAction } from '../../entities/workflow-record.entity';
import { WorkflowTemplate } from '../../entities/workflow-template.entity';
import { WorkflowNode, ApprovalMode } from '../../entities/workflow-node.entity';
import { WorkflowApproverResolverService } from './workflow-approver-resolver.service';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ApprovalActionDto, ReturnApprovalDto } from './dto/approval-action.dto';
import { TransferApprovalDto } from './dto/transfer-approval.dto';
import { AddSignDto } from './dto/add-sign.dto';
import { Quote, QuoteStatus } from '../../entities/quote.entity';
import { Contract, ContractStatus } from '../../entities/contract.entity';
import { Order, OrderStatus } from '../../entities/order.entity';
import { BusinessType } from '../../entities/workflow-template.entity';

@Injectable()
export class WorkflowInstanceService {
  private readonly logger = new Logger(WorkflowInstanceService.name);

  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly instanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowRecord)
    private readonly recordRepository: Repository<WorkflowRecord>,
    @InjectRepository(WorkflowTemplate)
    private readonly templateRepository: Repository<WorkflowTemplate>,
    @InjectRepository(WorkflowNode)
    private readonly nodeRepository: Repository<WorkflowNode>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly approverResolver: WorkflowApproverResolverService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 提交审批
   */
  async submitApproval(
    submitDto: SubmitApprovalDto,
    initiatorId: number,
    tenantId: number,
    businessOwnerId?: number,
    businessDepartmentId?: number,
  ): Promise<WorkflowInstance> {
    // 获取审批流模板
    const template = await this.templateRepository.findOne({
      where: { id: submitDto.templateId, tenantId, isActive: true },
      relations: ['nodes'],
      order: { nodes: { nodeOrder: 'ASC' } },
    });

    if (!template) {
      throw new NotFoundException('审批流模板不存在或未启用');
    }

    // 检查是否已有审批实例
    const existingInstance = await this.instanceRepository.findOne({
      where: {
        businessType: submitDto.businessType,
        businessId: submitDto.businessId,
        tenantId,
        status: In([InstanceStatus.PENDING, InstanceStatus.RETURNED]),
      },
    });

    if (existingInstance) {
      throw new BadRequestException('该业务对象已有进行中的审批流程');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 创建审批实例
      const firstNode = template.nodes[0];
      const instance = manager.create(WorkflowInstance, {
        businessType: submitDto.businessType,
        businessId: submitDto.businessId,
        templateId: template.id,
        status: InstanceStatus.PENDING,
        currentNodeId: firstNode.id,
        currentNodeOrder: firstNode.nodeOrder,
        initiatorId,
        submitComment: submitDto.submitComment,
        tenantId,
      });

      const savedInstance = await manager.save(instance);

      // 解析第一节点的审批人
      const approverIds = await this.approverResolver.resolveApprovers(
        firstNode,
        tenantId,
        businessOwnerId,
        businessDepartmentId,
      );

      if (approverIds.length === 0) {
        throw new BadRequestException('无法找到审批人，请检查节点配置');
      }

      // 创建审批记录（待审批状态）
      const records = approverIds.map((approverId) => {
        return manager.create(WorkflowRecord, {
          instanceId: savedInstance.id,
          nodeId: firstNode.id,
          nodeOrder: firstNode.nodeOrder,
          approverId,
          action: RecordAction.PENDING, // 初始状态，等待审批
          tenantId,
        });
      });

      await manager.save(records);

      return await manager.findOne(WorkflowInstance, {
        where: { id: savedInstance.id },
        relations: ['template', 'initiator', 'records'],
      });
    });
  }

  /**
   * 根据业务对象获取审批实例
   */
  async findInstanceByBusiness(businessType: string, businessId: number, tenantId: number): Promise<WorkflowInstance | null> {
    const instances = await this.instanceRepository.find({
      where: {
        businessType: businessType as any,
        businessId,
        tenantId,
      },
      relations: [
        'template', 
        'template.nodes', 
        'initiator', 
        'initiator.user', 
        'records', 
        'records.approver', 
        'records.approver.user', 
        'records.node'
      ],
      order: { createdAt: 'DESC' },
      take: 1,
    });

    return instances.length > 0 ? instances[0] : null;
  }

  /**
   * 获取审批实例详情
   */
  async findInstanceById(id: number, tenantId: number): Promise<WorkflowInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id, tenantId },
      relations: [
        'template', 
        'template.nodes', 
        'initiator', 
        'initiator.user', 
        'records', 
        'records.approver', 
        'records.approver.user', 
        'records.node'
      ],
      order: { records: { nodeOrder: 'ASC', actionTime: 'ASC' } },
    });

    if (!instance) {
      throw new NotFoundException('审批实例不存在');
    }

    return instance;
  }

  /**
   * 获取我的待审批列表
   */
  async findMyPendingApprovals(memberId: number, tenantId: number, page = 1, limit = 20) {
    this.logger.log(`查找待审批列表 - memberId: ${memberId}, tenantId: ${tenantId}, page: ${page}, limit: ${limit}`);
    
    // 查找当前节点需要该成员审批的实例
    const records = await this.recordRepository.find({
      where: {
        approverId: memberId,
        tenantId,
        action: RecordAction.PENDING, // 待审批状态
      },
      relations: ['instance', 'instance.template', 'instance.template.nodes', 'instance.initiator', 'instance.initiator.user', 'node'],
    });

    this.logger.log(`找到 ${records.length} 条待审批记录`);

    // 过滤出当前节点正在审批的实例
    const instanceIds = new Set<number>();
    const pendingInstances = [];

    for (const record of records) {
      this.logger.debug(`处理记录 - recordId: ${record.id}, instanceId: ${record.instanceId}, nodeId: ${record.nodeId} (类型: ${typeof record.nodeId})`);
      
      // 如果已经通过 relations 加载了 instance，直接使用
      if (record.instance) {
        const instance = record.instance;
        const currentNodeId = instance.currentNodeId;
        const recordNodeId = record.nodeId;
        
        this.logger.debug(`实例状态: ${instance.status}, currentNodeId: ${currentNodeId} (类型: ${typeof currentNodeId}), record.nodeId: ${recordNodeId} (类型: ${typeof recordNodeId})`);
        this.logger.debug(`节点匹配检查: ${currentNodeId} === ${recordNodeId} = ${currentNodeId === recordNodeId}`);
        this.logger.debug(`状态检查: ${instance.status} === ${InstanceStatus.PENDING} = ${instance.status === InstanceStatus.PENDING}`);
        this.logger.debug(`已存在检查: ${instanceIds.has(instance.id)}`);
        
        // 确保实例状态是 PENDING 且当前节点匹配
        // 注意：record.nodeId 可能为 null，需要检查
        // 使用 == 而不是 === 来处理类型转换（比如数字和字符串）
        if (
          instance.status === InstanceStatus.PENDING &&
          (currentNodeId == recordNodeId || currentNodeId === recordNodeId) &&
          !instanceIds.has(instance.id)
        ) {
          instanceIds.add(instance.id);
          this.logger.log(`添加实例到待审批列表 - instanceId: ${instance.id}`);
          
          // 加载完整的关联数据
          const fullInstance = await this.instanceRepository.findOne({
            where: { id: instance.id, tenantId },
            relations: [
              'template',
              'template.nodes',
              'initiator',
              'initiator.user',
              'records',
              'records.approver',
              'records.approver.user',
              'records.node',
            ],
            order: { records: { nodeOrder: 'ASC', actionTime: 'ASC' } },
          });
          
          if (fullInstance) {
            pendingInstances.push(fullInstance);
            this.logger.log(`成功加载实例 - instanceId: ${fullInstance.id}`);
          } else {
            this.logger.warn(`无法加载完整实例 - instanceId: ${instance.id}`);
          }
        } else {
          this.logger.debug(`实例不匹配条件 - status: ${instance.status}, currentNodeId: ${currentNodeId}, record.nodeId: ${recordNodeId}, 已存在: ${instanceIds.has(instance.id)}`);
        }
      } else {
        this.logger.warn(`记录没有关联的实例 - recordId: ${record.id}, instanceId: ${record.instanceId}`);
      }
    }

    // 按创建时间倒序排序
    pendingInstances.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    // 分页处理
    const total = pendingInstances.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedInstances = pendingInstances.slice(start, end);

    this.logger.log(`返回 ${paginatedInstances.length} 个待审批实例 (共 ${total} 个)`);
    return {
      data: paginatedInstances,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取我的已审批列表
   */
  async findMyApprovedList(memberId: number, tenantId: number, page = 1, limit = 20) {
    const [records, total] = await this.recordRepository.findAndCount({
      where: {
        approverId: memberId,
        tenantId,
        action: In([
          RecordAction.APPROVE,
          RecordAction.REJECT,
          RecordAction.TRANSFER,
          RecordAction.ADD_SIGN,
          RecordAction.RETURN,
        ]),
      },
      relations: ['instance', 'instance.template', 'instance.initiator', 'instance.initiator.user', 'node'],
      order: { actionTime: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: records,
      total,
      page,
      limit,
    };
  }

  /**
   * 审批通过
   */
  async approve(instanceId: number, memberId: number, actionDto: ApprovalActionDto, tenantId: number): Promise<WorkflowInstance> {
    this.logger.log(`开始审批流程 - instanceId: ${instanceId}, memberId: ${memberId}, tenantId: ${tenantId}`);
    
    const instance = await this.findInstanceById(instanceId, tenantId);
    this.logger.log(`获取到审批实例 - id: ${instance.id}, status: ${instance.status}, currentNodeId: ${instance.currentNodeId}`);

    if (instance.status !== InstanceStatus.PENDING) {
      this.logger.warn(`审批流程已结束 - status: ${instance.status}`);
      throw new BadRequestException('该审批流程已结束');
    }

    if (!instance.currentNodeId) {
      this.logger.warn(`当前节点ID为空 - instanceId: ${instance.id}`);
      throw new BadRequestException('当前审批节点不存在，无法进行审批操作');
    }

    // 检查当前节点是否有该成员的待审批记录
    this.logger.log(`查找待审批记录 - instanceId: ${instance.id}, nodeId: ${instance.currentNodeId}, approverId: ${memberId}`);
    const currentRecord = await this.recordRepository.findOne({
      where: {
        instanceId: instance.id,
        nodeId: instance.currentNodeId,
        approverId: memberId,
        action: RecordAction.PENDING, // 待审批
        tenantId,
      },
    });

    if (!currentRecord) {
      this.logger.warn(`未找到待审批记录 - instanceId: ${instance.id}, nodeId: ${instance.currentNodeId}, approverId: ${memberId}`);
      throw new BadRequestException('您没有权限审批此节点');
    }
    
    this.logger.log(`找到待审批记录 - recordId: ${currentRecord.id}`);

    return await this.dataSource.transaction(async (manager) => {
      this.logger.log(`开始事务 - 更新审批记录`);
      
      // 更新审批记录
      currentRecord.action = RecordAction.APPROVE;
      currentRecord.comment = actionDto.comment;
      currentRecord.actionTime = new Date();
      await manager.save(currentRecord);
      this.logger.log(`审批记录已更新 - recordId: ${currentRecord.id}`);

      // 获取当前节点 - 优先从已加载的关联数据中获取
      let currentNode: WorkflowNode | null = null;
      if (instance.template?.nodes) {
        this.logger.log(`从关联数据中查找节点 - nodes数量: ${instance.template.nodes.length}, currentNodeId: ${instance.currentNodeId}`);
        currentNode = instance.template.nodes.find((n) => n.id === instance.currentNodeId) || null;
        if (currentNode) {
          this.logger.log(`从关联数据中找到节点 - nodeId: ${currentNode.id}, name: ${currentNode.name}`);
        }
      }
      
      // 如果从关联数据中找不到，则从数据库查询
      if (!currentNode && instance.currentNodeId) {
        this.logger.log(`从数据库查询节点 - nodeId: ${instance.currentNodeId}`);
        currentNode = await manager.findOne(WorkflowNode, {
          where: { id: instance.currentNodeId },
        });
        if (currentNode) {
          this.logger.log(`从数据库找到节点 - nodeId: ${currentNode.id}, name: ${currentNode.name}`);
        } else {
          this.logger.warn(`从数据库未找到节点 - nodeId: ${instance.currentNodeId}`);
        }
      }

      if (!currentNode) {
        this.logger.error(`当前审批节点不存在 - currentNodeId: ${instance.currentNodeId}, templateId: ${instance.templateId}`);
        throw new NotFoundException('当前审批节点不存在');
      }

      // 检查节点审批方式
      this.logger.log(`节点审批方式 - mode: ${currentNode.approvalMode}, nodeId: ${currentNode.id}`);
      
      if (currentNode.approvalMode === ApprovalMode.SEQUENTIAL) {
        // 串行审批：当前审批人通过后，进入下一节点
        this.logger.log(`串行审批 - 移动到下一节点`);
        await this.moveToNextNode(instance, manager, tenantId);
        this.logger.log(`已移动到下一节点`);
      } else {
        this.logger.log(`并行审批 - 检查所有审批记录`);
        // 并行审批：需要所有审批人都通过
        const allRecords = await manager.find(WorkflowRecord, {
          where: {
            instanceId: instance.id,
            nodeId: instance.currentNodeId,
            tenantId,
          },
        });

        const pendingRecords = allRecords.filter((r) => r.action === RecordAction.PENDING);
        const rejectedRecords = allRecords.filter((r) => r.action === RecordAction.REJECT);

        if (rejectedRecords.length > 0) {
          // 有拒绝的，整个流程拒绝
          instance.status = InstanceStatus.REJECTED;
          instance.completedAt = new Date();
          await manager.save(instance);
        } else if (pendingRecords.length === 0) {
          // 所有人都审批了，进入下一节点
          await this.moveToNextNode(instance, manager, tenantId);
        }
      }

      return await this.findInstanceById(instanceId, tenantId);
    });
  }

  /**
   * 审批拒绝
   */
  async reject(instanceId: number, memberId: number, actionDto: ApprovalActionDto, tenantId: number): Promise<WorkflowInstance> {
    const instance = await this.findInstanceById(instanceId, tenantId);

    if (instance.status !== InstanceStatus.PENDING) {
      throw new BadRequestException('该审批流程已结束');
    }

    const currentRecord = await this.recordRepository.findOne({
      where: {
        instanceId: instance.id,
        nodeId: instance.currentNodeId,
        approverId: memberId,
        action: RecordAction.PENDING,
        tenantId,
      },
    });

    if (!currentRecord) {
      throw new BadRequestException('您没有权限审批此节点');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 更新审批记录
      currentRecord.action = RecordAction.REJECT;
      currentRecord.comment = actionDto.comment;
      currentRecord.actionTime = new Date();
      await manager.save(currentRecord);

      // 更新实例状态
      instance.status = InstanceStatus.REJECTED;
      instance.completedAt = new Date();
      await manager.save(instance);
      
      // 更新业务对象状态
      await this.updateBusinessStatus(instance, InstanceStatus.REJECTED, manager);

      return await this.findInstanceById(instanceId, tenantId);
    });
  }

  /**
   * 转办
   */
  async transfer(instanceId: number, memberId: number, transferDto: TransferApprovalDto, tenantId: number): Promise<WorkflowInstance> {
    const instance = await this.findInstanceById(instanceId, tenantId);

    if (instance.status !== InstanceStatus.PENDING) {
      throw new BadRequestException('该审批流程已结束');
    }

    // 验证转办对象
    const isValid = await this.approverResolver.validateApprover(transferDto.transferredTo, tenantId);
    if (!isValid) {
      throw new BadRequestException('转办对象无效');
    }

    const currentRecord = await this.recordRepository.findOne({
      where: {
        instanceId: instance.id,
        nodeId: instance.currentNodeId,
        approverId: memberId,
        action: RecordAction.PENDING,
        tenantId,
      },
    });

    if (!currentRecord) {
      throw new BadRequestException('您没有权限转办此节点');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 更新原审批记录
      currentRecord.action = RecordAction.TRANSFER;
      currentRecord.comment = transferDto.comment;
      currentRecord.extraData = { transferredTo: transferDto.transferredTo };
      currentRecord.actionTime = new Date();
      await manager.save(currentRecord);

      // 创建新的审批记录给转办对象
      const newRecord = manager.create(WorkflowRecord, {
        instanceId: instance.id,
        nodeId: instance.currentNodeId,
        nodeOrder: instance.currentNodeOrder,
        approverId: transferDto.transferredTo,
        action: RecordAction.PENDING, // 待审批
        comment: `转办自：${memberId}`,
        extraData: { transferredFrom: memberId },
        tenantId,
      });

      await manager.save(newRecord);

      return await this.findInstanceById(instanceId, tenantId);
    });
  }

  /**
   * 加签
   */
  async addSign(instanceId: number, memberId: number, addSignDto: AddSignDto, tenantId: number): Promise<WorkflowInstance> {
    const instance = await this.findInstanceById(instanceId, tenantId);

    if (instance.status !== InstanceStatus.PENDING) {
      throw new BadRequestException('该审批流程已结束');
    }

    // 验证加签对象
    for (const approverId of addSignDto.approverIds) {
      const isValid = await this.approverResolver.validateApprover(approverId, tenantId);
      if (!isValid) {
        throw new BadRequestException(`加签对象 ${approverId} 无效`);
      }
    }

    const currentRecord = await this.recordRepository.findOne({
      where: {
        instanceId: instance.id,
        nodeId: instance.currentNodeId,
        approverId: memberId,
        tenantId,
      },
    });

    if (!currentRecord) {
      throw new BadRequestException('您没有权限加签此节点');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 创建加签记录
      const addSignRecord = manager.create(WorkflowRecord, {
        instanceId: instance.id,
        nodeId: instance.currentNodeId,
        nodeOrder: instance.currentNodeOrder,
        approverId: memberId,
        action: RecordAction.ADD_SIGN,
        comment: addSignDto.comment,
        extraData: { addedApprovers: addSignDto.approverIds },
        tenantId,
      });
      await manager.save(addSignRecord);

      // 为加签对象创建审批记录
      const newRecords = addSignDto.approverIds.map((approverId) => {
        return manager.create(WorkflowRecord, {
          instanceId: instance.id,
          nodeId: instance.currentNodeId,
          nodeOrder: instance.currentNodeOrder,
          approverId,
          action: RecordAction.PENDING, // 待审批
          comment: `加签审批`,
          extraData: { addedBy: memberId },
          tenantId,
        });
      });

      await manager.save(newRecords);

      return await this.findInstanceById(instanceId, tenantId);
    });
  }

  /**
   * 退回修改
   */
  async returnApproval(instanceId: number, memberId: number, returnDto: ReturnApprovalDto, tenantId: number): Promise<WorkflowInstance> {
    const instance = await this.findInstanceById(instanceId, tenantId);

    if (instance.status !== InstanceStatus.PENDING) {
      throw new BadRequestException('该审批流程已结束');
    }

    const currentRecord = await this.recordRepository.findOne({
      where: {
        instanceId: instance.id,
        nodeId: instance.currentNodeId,
        approverId: memberId,
        action: RecordAction.PENDING,
        tenantId,
      },
    });

    if (!currentRecord) {
      throw new BadRequestException('您没有权限退回此节点');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 更新审批记录
      currentRecord.action = RecordAction.RETURN;
      currentRecord.comment = returnDto.comment;
      currentRecord.extraData = { returnToNodeOrder: returnDto.returnToNodeOrder };
      currentRecord.actionTime = new Date();
      await manager.save(currentRecord);

      // 更新实例状态
      instance.status = InstanceStatus.RETURNED;
      if (returnDto.returnToNodeOrder) {
        // 退回至指定节点
        const targetNode = await manager.findOne(WorkflowNode, {
          where: { templateId: instance.templateId, nodeOrder: returnDto.returnToNodeOrder },
        });
        if (targetNode) {
          instance.currentNodeId = targetNode.id;
          instance.currentNodeOrder = targetNode.nodeOrder;
        }
      } else {
        // 退回至发起人
        instance.currentNodeId = null;
        instance.currentNodeOrder = null;
      }
      instance.completedAt = new Date();
      await manager.save(instance);

      return await this.findInstanceById(instanceId, tenantId);
    });
  }

  /**
   * 移动到下一节点
   */
  private async moveToNextNode(instance: WorkflowInstance, manager: any, tenantId: number): Promise<void> {
    this.logger.log(`moveToNextNode - instanceId: ${instance.id}, templateId: ${instance.templateId}, currentNodeId: ${instance.currentNodeId}`);
    
    // 获取模板的所有节点
    const template = await manager.findOne(WorkflowTemplate, {
      where: { id: instance.templateId },
      relations: ['nodes'],
    });

    if (!template) {
      this.logger.error(`审批流模板不存在 - templateId: ${instance.templateId}`);
      throw new NotFoundException('审批流模板不存在');
    }

    this.logger.log(`获取到模板 - templateId: ${template.id}, nodes数量: ${template.nodes?.length || 0}`);
    
    if (template.nodes && template.nodes.length > 0) {
      this.logger.log(`节点列表: ${template.nodes.map((n: WorkflowNode) => `id=${n.id}(type=${typeof n.id}), order=${n.nodeOrder}`).join(', ')}`);
      this.logger.log(`查找节点 - currentNodeId: ${instance.currentNodeId} (type: ${typeof instance.currentNodeId})`);
    }

    const sortedNodes = template.nodes.sort((a: WorkflowNode, b: WorkflowNode) => a.nodeOrder - b.nodeOrder);
    
    // 处理类型匹配问题 - 使用 == 而不是 === 来处理类型转换
    const currentIndex = sortedNodes.findIndex((n: WorkflowNode) => {
      // 使用 == 进行宽松比较，处理 number 和 string 类型
      const match = n.id == instance.currentNodeId || Number(n.id) === Number(instance.currentNodeId);
      if (!match) {
        this.logger.debug(`节点不匹配 - nodeId: ${n.id} (${typeof n.id}) vs currentNodeId: ${instance.currentNodeId} (${typeof instance.currentNodeId})`);
      }
      return match;
    });

    this.logger.log(`当前节点索引: ${currentIndex}, 总节点数: ${sortedNodes.length}`);

    if (currentIndex === -1) {
      this.logger.error(`当前节点不存在 - currentNodeId: ${instance.currentNodeId}, templateId: ${instance.templateId}`);
      throw new NotFoundException('当前节点不存在');
    }

    if (currentIndex === sortedNodes.length - 1) {
      // 最后一个节点，审批完成
      this.logger.log(`最后一个节点，审批完成`);
      instance.status = InstanceStatus.APPROVED;
      instance.completedAt = new Date();
      instance.currentNodeId = null;
      instance.currentNodeOrder = null;
      await manager.save(instance);
      this.logger.log(`审批流程已完成`);
      
      // 更新业务对象状态
      await this.updateBusinessStatus(instance, InstanceStatus.APPROVED, manager);
    } else {
      // 移动到下一节点
      const nextNode = sortedNodes[currentIndex + 1];
      this.logger.log(`移动到下一节点 - nextNodeId: ${nextNode.id}, nextNodeOrder: ${nextNode.nodeOrder}`);
      
      instance.currentNodeId = nextNode.id;
      instance.currentNodeOrder = nextNode.nodeOrder;
      await manager.save(instance);
      this.logger.log(`实例已更新到下一节点`);

      // 解析下一节点的审批人
      this.logger.log(`解析下一节点的审批人 - nodeId: ${nextNode.id}`);
      const approverIds = await this.approverResolver.resolveApprovers(nextNode, tenantId, undefined, undefined);
      this.logger.log(`解析到审批人数量: ${approverIds.length}, approverIds: ${approverIds.join(', ')}`);

      if (approverIds.length === 0) {
        this.logger.error(`无法找到下一节点的审批人 - nodeId: ${nextNode.id}`);
        throw new BadRequestException('无法找到下一节点的审批人，请检查节点配置');
      }

      // 创建下一节点的审批记录
      this.logger.log(`创建下一节点的审批记录`);
      const records = approverIds.map((approverId) => {
        return manager.create(WorkflowRecord, {
          instanceId: instance.id,
          nodeId: nextNode.id,
          nodeOrder: nextNode.nodeOrder,
          approverId,
          action: RecordAction.PENDING, // 待审批
          tenantId,
        });
      });

      await manager.save(records);
      this.logger.log(`已创建 ${records.length} 条审批记录`);
    }
    
    // 注意：instance 已经在条件分支中保存了，这里不需要再次保存
    this.logger.log(`moveToNextNode 完成`);
  }

  /**
   * 更新业务对象状态
   */
  private async updateBusinessStatus(
    instance: WorkflowInstance,
    workflowStatus: InstanceStatus,
    manager: any,
  ): Promise<void> {
    try {
      if (instance.businessType === BusinessType.QUOTE) {
        const quote = await manager.findOne(Quote, {
          where: { id: instance.businessId },
        });
        if (quote) {
          if (workflowStatus === InstanceStatus.APPROVED) {
            // 审批通过后，状态变为已生效
            quote.status = QuoteStatus.ACTIVE;
            this.logger.log(`更新报价状态为已生效 - quoteId: ${quote.id}`);
          } else if (workflowStatus === InstanceStatus.REJECTED) {
            quote.status = QuoteStatus.REJECTED;
            this.logger.log(`更新报价状态为已拒绝 - quoteId: ${quote.id}`);
          }
          await manager.save(quote);
        } else {
          this.logger.warn(`报价不存在 - quoteId: ${instance.businessId}`);
        }
      } else if (instance.businessType === BusinessType.CONTRACT) {
        const contract = await manager.findOne(Contract, {
          where: { id: instance.businessId },
        });
        if (contract) {
          if (workflowStatus === InstanceStatus.APPROVED) {
            // 审批通过后，状态变为已生效
            contract.status = ContractStatus.ACTIVE;
            this.logger.log(`更新合同状态为已生效 - contractId: ${contract.id}`);
          } else if (workflowStatus === InstanceStatus.REJECTED) {
            // 审批拒绝后，状态变为已拒绝
            contract.status = ContractStatus.REJECTED;
            this.logger.log(`更新合同状态为已拒绝 - contractId: ${contract.id}`);
          }
          await manager.save(contract);
        } else {
          this.logger.warn(`合同不存在 - contractId: ${instance.businessId}`);
        }
      } else if (instance.businessType === BusinessType.ORDER) {
        const order = await manager.findOne(Order, {
          where: { id: instance.businessId },
        });
        if (order) {
          if (workflowStatus === InstanceStatus.APPROVED) {
            // 审批通过后，状态变为已生效
            order.status = OrderStatus.ACTIVE;
            this.logger.log(`更新订单状态为已生效 - orderId: ${order.id}`);
          } else if (workflowStatus === InstanceStatus.REJECTED) {
            order.status = OrderStatus.REJECTED;
            this.logger.log(`更新订单状态为已拒绝 - orderId: ${order.id}`);
          }
          await manager.save(order);
        } else {
          this.logger.warn(`订单不存在 - orderId: ${instance.businessId}`);
        }
      }
    } catch (error) {
      this.logger.error(`更新业务对象状态失败 - businessType: ${instance.businessType}, businessId: ${instance.businessId}`, error);
      // 不抛出异常，避免影响审批流程的完成
    }
  }
}

