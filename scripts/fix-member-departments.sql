-- 修复 member_departments 表的外键约束问题
USE crm_db;

-- 删除外键约束（忽略错误）
SET @sql = 'ALTER TABLE member_departments DROP FOREIGN KEY FK_member_departments_member';
SET @sql = 'ALTER TABLE member_departments DROP FOREIGN KEY FK_member_departments_department';
SET @sql = 'DROP INDEX IDX_5bf9d66cd5f923802a2b6ca757 ON member_departments';

-- 重新创建外键约束
ALTER TABLE member_departments 
ADD CONSTRAINT FK_member_departments_member 
FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE member_departments 
ADD CONSTRAINT FK_member_departments_department 
FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE;

-- 创建新的索引
CREATE INDEX IDX_member_departments_member ON member_departments(memberId);
CREATE INDEX IDX_member_departments_department ON member_departments(departmentId);
