import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { Member } from './member.entity';
import { MemberRole } from './member-role.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ comment: '角色名称' })
  name: string;

  @Column({ nullable: true, comment: '角色描述' })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  // 关联关系
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => MemberRole, (memberRole) => memberRole.role)
  memberRoles: MemberRole[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（成员ID）' })
  createdBy?: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Member;
}
