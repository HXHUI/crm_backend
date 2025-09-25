-- 删除外键约束
ALTER TABLE customers DROP FOREIGN KEY FK_e272f7a6dd948d44fe4ea097452;

-- 修改ownerId为可空字段
ALTER TABLE customers MODIFY COLUMN ownerId VARCHAR(36) NULL COMMENT '所属成员ID';

-- 重新添加外键约束
ALTER TABLE customers ADD CONSTRAINT FK_customers_owner FOREIGN KEY (ownerId) REFERENCES members(id) ON DELETE SET NULL;
