import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Member } from './member.entity';
import { Role } from './role.entity';

@Entity('member_roles')
export class MemberRole extends BaseEntity {
  @PrimaryColumn({ comment: '成员ID' })
  memberId: string;

  @PrimaryColumn({ comment: '角色ID' })
  roleId: string;

  // 关联关系
  @ManyToOne(() => Member, (member) => member.memberRoles)
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @ManyToOne(() => Role, (role) => role.memberRoles)
  @JoinColumn({ name: 'roleId' })
  role: Role;
}
