import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Member } from './member.entity';
import { Department } from './department.entity';

@Entity('member_departments')
export class MemberDepartment {
  @PrimaryColumn({ name: 'memberId', type: 'bigint', comment: '成员ID' })
  memberId: number;

  @PrimaryColumn({ name: 'departmentId', type: 'bigint', comment: '部门ID' })
  departmentId: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', comment: '删除时间' })
  deletedAt?: Date;

  // 关联关系
  @ManyToOne(() => Member, (member) => member.memberDepartments)
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @ManyToOne(() => Department, (department) => department.memberDepartments)
  @JoinColumn({ name: 'departmentId' })
  department: Department;
}
