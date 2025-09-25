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

  @Column({ nullable: true, comment: '部门负责人ID' })
  managerId?: string;

  @Column({ nullable: true, comment: '父部门ID' })
  parentId?: string;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  // 树形结构关系
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Department;

  @OneToMany(() => Department, (department) => department.parent)
  children: Department[];

  // 关联关系
  @Column({ comment: '租户ID', nullable: false })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  // 部门负责人关系
  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'managerId' })
  manager?: Member;

  @ManyToMany(() => Member, (member) => member.departments)
  members: Member[];

  @OneToMany(() => MemberDepartment, (memberDept) => memberDept.department)
  memberDepartments: MemberDepartment[];
}
