#!/usr/bin/env node

/**
 * 修复迁移表结构的脚本
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function fixMigrationsTable() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_db',
    charset: 'utf8mb4'
  };

  let connection;
  
  try {
    console.log('🔗 连接到MySQL数据库...');
    connection = await mysql.createConnection(config);

    console.log('📊 检查迁移表结构...');
    
    // 检查表是否存在
    const [tables] = await connection.execute(
      'SHOW TABLES LIKE "migrations"'
    );

    if (tables.length === 0) {
      console.log('❌ 迁移表不存在');
      return;
    }

    // 检查表结构
    const [columns] = await connection.execute('DESCRIBE migrations');
    console.log('📋 当前迁移表结构:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // 检查是否有version字段
    const hasVersionField = columns.some(col => col.Field === 'version');
    
    if (!hasVersionField) {
      console.log('🔧 添加缺失的version字段...');
      await connection.execute('ALTER TABLE migrations ADD COLUMN version VARCHAR(255) NOT NULL UNIQUE');
      console.log('✅ version字段添加成功');
    } else {
      console.log('✅ version字段已存在');
    }

    // 检查是否有name字段
    const hasNameField = columns.some(col => col.Field === 'name');
    
    if (!hasNameField) {
      console.log('🔧 添加缺失的name字段...');
      await connection.execute('ALTER TABLE migrations ADD COLUMN name VARCHAR(255) NOT NULL');
      console.log('✅ name字段添加成功');
    } else {
      console.log('✅ name字段已存在');
    }

    // 最终检查
    const [finalColumns] = await connection.execute('DESCRIBE migrations');
    console.log('');
    console.log('📋 修复后的迁移表结构:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('');
    console.log('🎉 迁移表结构修复完成！');
    console.log('现在可以重新运行数据库初始化：');
    console.log('npm run db:init');

  } catch (error) {
    console.error('❌ 修复迁移表失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('');
      console.log('💡 可能的解决方案：');
      console.log('1. 检查数据库用户名和密码是否正确');
      console.log('2. 确保MySQL服务正在运行');
      console.log('3. 检查.env文件中的数据库配置');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 显示帮助信息
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🔧 CRM迁移表修复工具');
  console.log('');
  console.log('用法:');
  console.log('  node scripts/fix-migrations-table.js');
  console.log('');
  console.log('功能:');
  console.log('  - 检查迁移表结构');
  console.log('  - 修复缺失的字段');
  console.log('  - 确保表结构与代码匹配');
  console.log('');
  process.exit(0);
}

fixMigrationsTable();
