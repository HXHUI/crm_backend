-- 修复 member_departments 表的索引问题
-- 删除外键约束
ALTER TABLE member_departments DROP FOREIGN KEY FK_member_departments_member;
ALTER TABLE member_departments DROP FOREIGN KEY FK_member_departments_department;

-- 删除有问题的索引
DROP INDEX IDX_5bf9d66cd5f923802a2b6ca757 ON member_departments;

-- 重新创建外键约束
ALTER TABLE member_departments 
ADD CONSTRAINT FK_member_departments_member 
FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE member_departments 
ADD CONSTRAINT FK_member_departments_department 
FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE;
