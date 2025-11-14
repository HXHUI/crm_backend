import { Entity, ManyToOne, JoinColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Member } from './member.entity';
import { Role } from './role.entity';

@Entity('member_roles')
export class MemberRole {
  @PrimaryColumn({ name: 'member_id', type: 'bigint', comment: '成员ID' })
  memberId: number;

  @PrimaryColumn({ name: 'role_id', type: 'bigint', comment: '角色ID' })
  roleId: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', comment: '删除时间' })
  deletedAt?: Date;

  // 关联关系
  @ManyToOne(() => Member, (member) => member.memberRoles)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Role, (role) => role.memberRoles)
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
