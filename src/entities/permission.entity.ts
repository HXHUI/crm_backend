import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { RolePermission } from './role-permission.entity';

export enum PermissionType {
  MENU = 'menu',
  BUTTON = 'button',
  API = 'api',
}

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ comment: '权限名称' })
  name: string;

  @Column({ unique: true, comment: '权限编码' })
  code: string;

  @Column({ nullable: true, comment: '权限描述' })
  description?: string;

  @Column({
    type: 'enum',
    enum: PermissionType,
    default: PermissionType.API,
    comment: '权限类型',
  })
  type: PermissionType;

  @Column({ nullable: true, comment: '父权限ID' })
  parentId?: string;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sort: number;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  // 关联关系
  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission)
  rolePermissions: RolePermission[];
}
