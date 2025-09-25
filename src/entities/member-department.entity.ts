import { Entity, ManyToOne, JoinColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Member } from './member.entity';
import { Department } from './department.entity';

@Entity('member_departments')
export class MemberDepartment {
  @PrimaryColumn({ comment: '成员ID' })
  memberId: string;

  @PrimaryColumn({ comment: '部门ID' })
  departmentId: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  @DeleteDateColumn({ comment: '删除时间' })
  deletedAt?: Date;

  // 关联关系
  @ManyToOne(() => Member, (member) => member.memberDepartments)
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @ManyToOne(() => Department, (department) => department.memberDepartments)
  @JoinColumn({ name: 'departmentId' })
  department: Department;
}
