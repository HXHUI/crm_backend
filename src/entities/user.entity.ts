import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Member } from './member.entity';
import { Tenant } from './tenant.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true, comment: '用户名' })
  username: string;

  @Column({ unique: true, nullable: true, comment: '邮箱' })
  email?: string;

  @Column({ comment: '密码哈希' })
  passwordHash: string;

  @Column({ unique: true, comment: '手机号' })
  phone: string;

  @Column({ nullable: true, comment: '头像URL' })
  avatar?: string;


  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    comment: '用户状态',
  })
  status: UserStatus;

  @Column({ nullable: true, comment: '最后登录时间' })
  lastLoginAt?: Date;

  @Column({ nullable: true, comment: '最后登录IP' })
  lastLoginIp?: string;

  // 关联关系
  @OneToMany(() => Member, (member) => member.user)
  members: Member[];

  @OneToMany(() => Tenant, (tenant) => tenant.owner)
  ownedTenants: Tenant[];
}
