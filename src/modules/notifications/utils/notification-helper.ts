import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../../../entities/member.entity';
import { BusinessType } from '../../../entities/workflow-template.entity';
import { NotificationType } from '../../../entities/notification.entity';

export class NotificationHelper {
  /**
   * 通过memberId获取userId
   */
  static async getUserIdFromMemberId(
    memberRepository: Repository<Member>,
    memberId: number,
  ): Promise<number | null> {
    const member = await memberRepository.findOne({
      where: { id: memberId },
      select: ['userId'],
    });

    return member?.userId || null;
  }

  /**
   * 批量通过memberId获取userId
   */
  static async getUserIdsFromMemberIds(
    memberRepository: Repository<Member>,
    memberIds: number[],
  ): Promise<number[]> {
    if (memberIds.length === 0) {
      return [];
    }

    const members = await memberRepository.find({
      where: { id: memberIds as any },
      select: ['userId'],
    });

    return members.map((m) => m.userId).filter((id) => id != null);
  }

  /**
   * 格式化业务类型名称
   */
  static formatBusinessTypeName(businessType: BusinessType): string {
    const typeMap: Record<BusinessType, string> = {
      [BusinessType.QUOTE]: '报价',
      [BusinessType.CONTRACT]: '合同',
      [BusinessType.ORDER]: '订单',
    };

    return typeMap[businessType] || businessType;
  }

  /**
   * 格式化审批通知内容
   */
  static formatWorkflowNotification(
    action: 'submit' | 'approve' | 'approve_complete' | 'reject' | 'transfer' | 'add_sign' | 'return',
    businessType: BusinessType,
    actorName: string,
    options?: {
      nextNodeName?: string;
      comment?: string;
    },
  ): { title: string; content: string } {
    const businessTypeName = this.formatBusinessTypeName(businessType);

    switch (action) {
      case 'submit':
        return {
          title: `新的${businessTypeName}审批任务`,
          content: `${actorName}提交了${businessTypeName}审批，请及时处理`,
        };

      case 'approve':
        return {
          title: `${businessTypeName}审批已通过`,
          content: `您的${businessTypeName}审批已通过${options?.nextNodeName ? `，已进入${options.nextNodeName}审批节点` : ''}`,
        };

      case 'approve_complete':
        return {
          title: `${businessTypeName}审批已完成`,
          content: `您的${businessTypeName}审批已全部通过`,
        };

      case 'reject':
        return {
          title: `${businessTypeName}审批被拒绝`,
          content: `${actorName}拒绝了您的${businessTypeName}审批${options?.comment ? `，原因：${options.comment}` : ''}`,
        };

      case 'transfer':
        return {
          title: `${businessTypeName}审批任务转办`,
          content: `${actorName}将${businessTypeName}审批任务转办给您`,
        };

      case 'add_sign':
        return {
          title: `邀请参与${businessTypeName}审批`,
          content: `${actorName}邀请您参与${businessTypeName}审批`,
        };

      case 'return':
        return {
          title: `${businessTypeName}审批被退回`,
          content: `${actorName}退回了您的${businessTypeName}审批${options?.comment ? `，原因：${options.comment}` : ''}，请修改后重新提交`,
        };

      default:
        return {
          title: `${businessTypeName}审批通知`,
          content: `您有新的${businessTypeName}审批相关通知`,
        };
    }
  }
}

