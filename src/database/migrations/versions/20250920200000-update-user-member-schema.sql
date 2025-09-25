-- 更新用户表：邮箱改为可选，手机号码改为必填且唯一
ALTER TABLE users 
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN phone SET NOT NULL;

-- 添加手机号码唯一约束（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'UQ_users_phone' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT UQ_users_phone UNIQUE (phone);
    END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN users.email IS '邮箱（可选）';
COMMENT ON COLUMN users.phone IS '手机号码（必填，唯一）';
