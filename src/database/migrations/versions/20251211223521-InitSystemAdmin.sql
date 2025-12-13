-- 初始化系统管理员
-- 迁移版本: 20251211223521
-- 描述: 创建默认的系统管理员账户（如果不存在系统管理员）
-- 
-- 注意：
-- 1. 默认用户名：admin
-- 2. 默认密码：admin123456（首次登录后请立即修改）
-- 3. 如果已存在系统管理员，此脚本不会创建新账户
-- 4. 如果已存在用户名为 'admin' 的用户，此脚本不会覆盖

-- 检查是否已有系统管理员
SELECT COUNT(*) INTO @has_system_admin
FROM users 
WHERE is_system_admin = TRUE 
  AND deleted_at IS NULL;

-- 检查是否已存在用户名为 'admin' 的用户
SELECT COUNT(*) INTO @admin_exists
FROM users 
WHERE username = 'admin' 
  AND deleted_at IS NULL;

-- 如果没有系统管理员且不存在用户名为 'admin' 的用户，则创建默认系统管理员
-- 密码：admin123456 (bcrypt hash with salt rounds 10)
-- 这个哈希值对应密码：admin123456
INSERT INTO users (
  username,
  email,
  password_hash,
  phone,
  status,
  is_system_admin,
  created_at,
  updated_at
)
SELECT 
  'admin',
  'admin@crm.local',
  '$2b$10$dpAK.snm4p6nS/y0it1kjekZNXAKFj7HRTqJxNJ8CLqgYR/dNaCVu',  -- 密码：admin123456
  '13800000000',
  'active',
  TRUE,
  NOW(),
  NOW()
WHERE @has_system_admin = 0 
  AND @admin_exists = 0
LIMIT 1;

-- 输出执行结果信息
SELECT 
  CASE 
    WHEN @has_system_admin = 0 AND @admin_exists = 0 THEN 
      '✓ 系统管理员账户已创建：用户名=admin, 密码=admin123456（请立即修改密码）'
    WHEN @has_system_admin > 0 THEN 
      'ℹ 已存在系统管理员，跳过创建'
    WHEN @admin_exists > 0 THEN 
      '⚠ 已存在用户名为 admin 的用户，跳过创建（请手动将该用户设置为系统管理员：UPDATE users SET is_system_admin = TRUE WHERE username = ''admin'';）'
    ELSE 
      '? 未知状态'
  END AS message;

