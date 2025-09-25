import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { MemberRole } from './member-role.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ comment: '角色名称' })
  name: string;

  @Column({ nullable: true, comment: '角色描述' })
  description?: string;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  // 关联关系
  @Column({ comment: '租户ID' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => MemberRole, (memberRole) => memberRole.role)
  memberRoles: MemberRole[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: RolePermission[];
}
