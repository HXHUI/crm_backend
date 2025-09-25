import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission extends BaseEntity {
  @PrimaryColumn({ comment: '角色ID' })
  roleId: string;

  @PrimaryColumn({ comment: '权限ID' })
  permissionId: string;

  // 关联关系
  @ManyToOne(() => Role, (role) => role.rolePermissions)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions)
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;
}
