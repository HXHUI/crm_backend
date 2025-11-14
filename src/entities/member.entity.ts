import { Entity, Column, ManyToOne, OneToMany, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { Department } from './department.entity';
import { MemberDepartment } from './member-department.entity';
import { MemberRole } from './member-role.entity';
import { Customer } from './customer.entity';

export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Entity('members')
export class Member extends BaseEntity {
  @Column({
    type: 'enum',
    enum: MemberStatus,
    default: MemberStatus.ACTIVE,
    comment: '成员状态',
  })
  status: MemberStatus;

  @Column({ nullable: true, comment: '成员在租户中的昵称' })
  nickname?: string;

  @Column({ nullable: true, comment: '成员在租户中的职位' })
  position?: string;

  @Column({ type: 'json', nullable: true, comment: '成员权限配置' })
  permissions?: Record<string, any>;

  // 关联关系
  @Column({ name: 'user_id', type: 'bigint', comment: '用户ID' })
  userId: number;

  @ManyToOne(() => User, (user) => user.members)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  tenantId: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.members)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToMany(() => Department, (department) => department.members)
  @JoinTable({
    name: 'member_departments',
    joinColumn: { name: 'memberId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'departmentId', referencedColumnName: 'id' }
  })
  departments: Department[];

  @OneToMany(() => MemberDepartment, (memberDept) => memberDept.member)
  memberDepartments: MemberDepartment[];

  @OneToMany(() => MemberRole, (memberRole) => memberRole.member)
  memberRoles: MemberRole[];

  @OneToMany(() => Customer, (customer) => customer.owner)
  customers: Customer[];
}
