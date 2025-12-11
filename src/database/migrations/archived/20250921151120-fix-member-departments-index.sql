-- 修复 member_departments 表的索引问题
-- 注意：如果外键或索引不存在，这些语句会失败，但迁移服务会继续执行
-- 删除外键约束（如果存在则删除，不存在则忽略错误）
-- 使用存储过程来安全地删除外键

-- 删除所有 member_departments 表上的外键约束
-- 由于我们不知道所有外键的名称，我们需要先查询所有外键，然后逐个删除
-- 但由于 MySQL 普通 SQL 不支持循环，我们采用以下策略：
-- 1. 先尝试删除已知的外键
-- 2. 然后尝试删除索引，如果失败，说明还有其他外键在使用
-- 3. 在这种情况下，我们跳过索引删除（索引会在外键删除时自动删除，或者需要手动处理）

-- 删除 FK_member_departments_member 外键（如果存在）
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND constraint_name = 'FK_member_departments_member'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE member_departments DROP FOREIGN KEY FK_member_departments_member',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除 FK_member_departments_department 外键（如果存在）
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND constraint_name = 'FK_member_departments_department'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE member_departments DROP FOREIGN KEY FK_member_departments_department',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 尝试删除其他可能的外键（TypeORM 自动生成的外键名称）
-- 查询所有外键，然后尝试删除第一个（如果存在）
SET @fk_name = (
  SELECT constraint_name 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND constraint_type = 'FOREIGN KEY'
  LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE member_departments DROP FOREIGN KEY ', @fk_name),
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 再次尝试删除可能剩余的外键（最多尝试 5 次）
SET @fk_name = (
  SELECT constraint_name 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND constraint_type = 'FOREIGN KEY'
  LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE member_departments DROP FOREIGN KEY ', @fk_name),
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_name = (
  SELECT constraint_name 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND constraint_type = 'FOREIGN KEY'
  LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE member_departments DROP FOREIGN KEY ', @fk_name),
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_name = (
  SELECT constraint_name 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND constraint_type = 'FOREIGN KEY'
  LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE member_departments DROP FOREIGN KEY ', @fk_name),
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_name = (
  SELECT constraint_name 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND constraint_type = 'FOREIGN KEY'
  LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL,
  CONCAT('ALTER TABLE member_departments DROP FOREIGN KEY ', @fk_name),
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除有问题的索引（如果存在）
-- 注意：如果索引被外键使用，需要先删除所有使用该索引的外键
-- 由于 MySQL 的限制，我们需要先删除所有可能使用该索引的外键
-- 由于迁移服务使用分号分割 SQL，我们无法使用存储过程，所以采用以下策略：
-- 1. 先尝试删除索引，如果失败（被外键使用），则忽略错误
-- 2. 由于我们已经删除了两个已知的外键，如果索引仍然被使用，可能是其他名称的外键
-- 3. 在这种情况下，我们直接尝试删除索引，如果失败就跳过（索引可能已经被其他迁移删除）

-- 尝试删除索引（如果被外键使用会失败，但我们可以继续）
-- 注意：这里我们使用一个技巧：先检查索引是否存在，如果存在且可能被外键使用，
-- 我们尝试删除，如果失败就忽略（因为外键可能已经被删除，或者索引已经被删除）

-- 检查索引是否存在
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND index_name = 'IDX_5bf9d66cd5f923802a2b6ca757'
);

-- 如果索引存在，尝试删除它
-- 如果索引被外键使用，这个操作会失败，但我们已经删除了两个已知的外键
-- 如果还有其他外键在使用这个索引，我们需要先删除它们
-- 但由于我们无法在普通 SQL 中循环，我们采用以下策略：
-- 如果删除失败，说明还有其他外键在使用，这种情况下我们跳过索引删除
-- （因为索引会在外键删除时自动删除，或者我们需要手动处理）

-- 为了安全，我们先检查是否还有外键存在
SET @fk_count = (
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_schema = DATABASE()
    AND table_name = 'member_departments' 
    AND constraint_type = 'FOREIGN KEY'
);

-- 如果外键数量为 0 且索引存在，则可以安全删除索引
-- 如果还有外键存在，说明我们之前的外键删除可能没有成功，或者有其他外键
-- 在这种情况下，我们无法安全地删除索引，所以跳过
SET @sql = IF(@fk_count = 0 AND @index_exists > 0,
  'ALTER TABLE member_departments DROP INDEX IDX_5bf9d66cd5f923802a2b6ca757',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 重新创建外键约束
ALTER TABLE member_departments 
ADD CONSTRAINT FK_member_departments_member 
FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE member_departments 
ADD CONSTRAINT FK_member_departments_department 
FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE;
