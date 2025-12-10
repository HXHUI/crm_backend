import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Member } from '../../entities/member.entity';
import { MemberRole } from '../../entities/member-role.entity';
import { Department } from '../../entities/department.entity';
import { WorkflowNode, NodeType } from '../../entities/workflow-node.entity';

@Injectable()
export class WorkflowApproverResolverService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(MemberRole)
    private readonly memberRoleRepository: Repository<MemberRole>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  /**
   * 根据节点配置解析审批人列表
   */
  async resolveApprovers(node: WorkflowNode, tenantId: number, businessOwnerId?: number, businessDepartmentId?: number): Promise<number[]> {
    const { nodeType, approverConfig } = node;
    const approverIds: number[] = [];

    switch (nodeType) {
      case NodeType.FIXED_MEMBER:
        // 固定成员
        if (approverConfig.memberIds && Array.isArray(approverConfig.memberIds)) {
          approverIds.push(...approverConfig.memberIds);
        }
        break;

      case NodeType.ROLE:
        // 角色
        if (approverConfig.roleIds && Array.isArray(approverConfig.roleIds)) {
          const membersWithRoles = await this.memberRoleRepository.find({
            where: {
              roleId: In(approverConfig.roleIds),
              member: {
                tenantId,
                status: 'active' as any,
              },
            },
            relations: ['member'],
          });
          const memberIds = membersWithRoles.map((mr) => mr.memberId);
          approverIds.push(...memberIds);
        }
        break;

      case NodeType.DEPARTMENT_MANAGER:
        // 部门负责人
        const departmentIds = approverConfig.departmentIds || [];
        if (businessDepartmentId && !departmentIds.includes(businessDepartmentId)) {
          departmentIds.push(businessDepartmentId);
        }

        for (const deptId of departmentIds) {
          const managerIds = await this.findDepartmentManagers(deptId, approverConfig.includeParent || false, tenantId);
          approverIds.push(...managerIds);
        }
        break;
    }

    // 去重
    return Array.from(new Set(approverIds));
  }

  /**
   * 查找部门负责人（支持向上查找）
   */
  private async findDepartmentManagers(
    departmentId: number,
    includeParent: boolean,
    tenantId: number,
  ): Promise<number[]> {
    const managerIds: number[] = [];
    let currentDeptId: number | null = departmentId;

    while (currentDeptId) {
      const department = await this.departmentRepository.findOne({
        where: { id: currentDeptId, tenantId },
        relations: ['manager'],
      });

      if (department && department.managerId) {
        managerIds.push(department.managerId);
      }

      if (!includeParent) {
        break;
      }

      currentDeptId = department?.parentId || null;
    }

    return managerIds;
  }

  /**
   * 验证审批人是否有效
   */
  async validateApprover(memberId: number, tenantId: number): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenantId, status: 'active' as any },
    });
    return !!member;
  }
}

