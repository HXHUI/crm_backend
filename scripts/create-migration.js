#!/usr/bin/env node

/**
 * 独立的迁移文件创建脚本
 * 不需要数据库连接，直接创建迁移文件
 */

const fs = require('fs');
const path = require('path');

function createMigration(name) {
  try {
    // 生成时间戳 (YYYYMMDDHHMMSS格式)
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const version = `${timestamp}`;
    const fileName = `${version}-${name}.sql`;
    
    // 迁移文件目录
    const migrationsPath = path.join(__dirname, '..', 'src', 'database', 'migrations', 'versions');
    const filePath = path.join(migrationsPath, fileName);

    // 确保目录存在
    if (!fs.existsSync(migrationsPath)) {
      fs.mkdirSync(migrationsPath, { recursive: true });
    }

    // 创建迁移文件模板
    const template = `-- Migration: ${name}
-- Version: ${version}
-- Created: ${new Date().toISOString()}

-- 在这里编写您的SQL语句
-- 例如：
-- CREATE TABLE example_table (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- 回滚语句（如果需要）
-- DROP TABLE IF EXISTS example_table;
`;

    fs.writeFileSync(filePath, template);
    
    console.log(`✅ 迁移文件创建成功: ${fileName}`);
    console.log(`📁 文件位置: ${filePath}`);
    
    return fileName;
  } catch (error) {
    console.error('❌ 创建迁移文件失败:', error.message);
    process.exit(1);
  }
}

// 获取命令行参数
const migrationName = process.argv[2];

if (!migrationName) {
  console.log('🚀 CRM 迁移文件创建工具');
  console.log('');
  console.log('用法:');
  console.log('  node scripts/create-migration.js <migration-name>');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/create-migration.js add-user-table');
  console.log('  node scripts/create-migration.js update-customer-schema');
  console.log('');
  process.exit(1);
}

createMigration(migrationName);
