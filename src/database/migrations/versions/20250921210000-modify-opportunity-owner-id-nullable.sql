-- 删除外键约束
ALTER TABLE opportunities DROP FOREIGN KEY FK_cc51e62c9dfa9d01661bc4a4e9c;

-- 修改opportunities表的ownerId字段为可空
ALTER TABLE opportunities MODIFY COLUMN ownerId VARCHAR(36) NULL COMMENT '负责人ID';

-- 重新添加外键约束
ALTER TABLE opportunities ADD CONSTRAINT FK_opportunities_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL;
