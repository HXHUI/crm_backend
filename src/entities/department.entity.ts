import { Entity, Column, ManyToOne, OneToMany, ManyToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { Member } from './member.entity';
import { MemberDepartment } from './member-department.entity';

@Entity('departments')
export class Department extends BaseEntity {
  @Column({ comment: '部门名称' })
  name: string;

  @Column({ nullable: true, comment: '部门编码' })
  code?: string;

  @Column({ nullable: true, comment: '部门描述' })
  description?: string;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true, comment: '父部门ID' })
  parentId?: number;

  @Column({ name: 'manager_id', type: 'bigint', nullable: true, comment: '部门负责人ID' })
  managerId?: number;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sort: number;

  // 关联关系
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID', nullable: false })
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // 父部门关系
  @ManyToOne(() => Department, (department) => department.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Department;

  @OneToMany(() => Department, (department) => department.parent)
  children: Department[];

  // 部门负责人关系
  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager?: Member;

  @ManyToMany(() => Member, (member) => member.departments)
  members: Member[];

  @OneToMany(() => MemberDepartment, (memberDept) => memberDept.department)
  memberDepartments: MemberDepartment[];

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（成员ID）' })
  createdBy?: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Member;
}
