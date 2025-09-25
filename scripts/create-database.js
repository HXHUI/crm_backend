#!/usr/bin/env node

/**
 * 独立的数据库创建脚本
 * 用于创建CRM数据库
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function createDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
  };

  const databaseName = process.env.DB_DATABASE || 'crm_db';

  let connection;
  
  try {
    console.log('🔗 连接到MySQL服务器...');
    connection = await mysql.createConnection(config);

    console.log(`📊 检查数据库 "${databaseName}" 是否存在...`);
    
    // 检查数据库是否存在
    const [databases] = await connection.execute(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [databaseName]
    );

    if (databases.length === 0) {
      console.log(`📝 创建数据库: ${databaseName}`);
      await connection.execute(
        `CREATE DATABASE ${databaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ 数据库 "${databaseName}" 创建成功！`);
    } else {
      console.log(`ℹ️  数据库 "${databaseName}" 已存在`);
    }

    console.log('🎉 数据库准备完成！');
    console.log('');
    console.log('现在可以运行以下命令初始化数据库：');
    console.log('npm run db:init');

  } catch (error) {
    console.error('❌ 创建数据库失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('');
      console.log('💡 可能的解决方案：');
      console.log('1. 检查数据库用户名和密码是否正确');
      console.log('2. 确保MySQL服务正在运行');
      console.log('3. 检查.env文件中的数据库配置');
      console.log('4. 确保用户有创建数据库的权限');
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
  console.log('🚀 CRM数据库创建工具');
  console.log('');
  console.log('用法:');
  console.log('  node scripts/create-database.js');
  console.log('');
  console.log('环境变量:');
  console.log('  DB_HOST      MySQL主机地址 (默认: localhost)');
  console.log('  DB_PORT      MySQL端口 (默认: 3306)');
  console.log('  DB_USERNAME  MySQL用户名 (默认: root)');
  console.log('  DB_PASSWORD  MySQL密码 (默认: 空)');
  console.log('  DB_DATABASE  数据库名称 (默认: crm_db)');
  console.log('');
  console.log('示例:');
  console.log('  # 使用默认配置');
  console.log('  node scripts/create-database.js');
  console.log('');
  console.log('  # 使用环境变量');
  console.log('  DB_PASSWORD=your_password node scripts/create-database.js');
  process.exit(0);
}

createDatabase();
