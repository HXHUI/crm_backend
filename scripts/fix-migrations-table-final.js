#!/usr/bin/env node

/**
 * 最终修复迁移表结构的脚本
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function fixMigrationsTableFinal() {
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

    console.log('🔧 修复迁移表结构...');
    
    // 删除现有的迁移表
    console.log('🗑️  删除现有迁移表...');
    await connection.execute('DROP TABLE IF EXISTS migrations');

    // 重新创建迁移表
    console.log('📝 重新创建迁移表...');
    await connection.execute(`
      CREATE TABLE migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 检查最终表结构
    const [columns] = await connection.execute('DESCRIBE migrations');
    console.log('');
    console.log('📋 修复后的迁移表结构:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    console.log('');
    console.log('🎉 迁移表结构修复完成！');
    console.log('现在可以重新运行数据库初始化：');
    console.log('npm run db:init');

  } catch (error) {
    console.error('❌ 修复迁移表失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixMigrationsTableFinal();
