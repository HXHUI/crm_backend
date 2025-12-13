#!/usr/bin/env node

/**
 * 完整的数据库设置脚本
 * 1. 创建数据库
 * 2. 运行初始化
 */

const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 执行命令: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function executeSqlFile(sqlFilePath) {
  // 先连接到 MySQL 服务器（不指定数据库）
  const serverConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4'
  };

  // 从环境变量读取数据库名称
  const databaseName = process.env.DB_DATABASE || 'crm_db';

  let connection;
  try {
    console.log(`📄 读取SQL文件: ${sqlFilePath}`);
    let sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 替换SQL中的硬编码数据库名称
    sql = sql.replace(/crm_db/g, databaseName);
    
    console.log('🔗 连接到MySQL服务器...');
    connection = await mysql.createConnection(serverConfig);
    
    console.log(`⚙️  执行SQL脚本（数据库: ${databaseName}）...`);
    // 先切换到目标数据库
    await connection.query(`USE ${databaseName}`);
    
    // 直接执行整个SQL文件（支持多语句）
    try {
      await connection.query(sql);
      console.log('✅ SQL脚本执行完成');
      
      // 验证关键表是否创建成功
      const [tables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('permissions', 'users', 'tenants', 'customers')
      `, [databaseName]);
      
      if (tables.length < 4) {
        console.log(`  ⚠️  警告：部分表可能未创建成功，已创建的表：${tables.map(t => t.TABLE_NAME).join(', ')}`);
      } else {
        console.log(`  ✅ 验证通过：关键表已创建（${tables.length}个）`);
      }
    } catch (error) {
      // 忽略一些常见的错误（如表已存在、数据已存在等）
      if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
          error.code === 'ER_DUP_ENTRY' || 
          error.code === 'ER_DUP_KEYNAME' || 
          error.message.includes('already exists') || 
          error.message.includes('Duplicate entry')) {
        console.log(`  ⚠️  部分操作已存在，继续执行...`);
        // 即使有部分错误，也尝试继续
      } else {
        console.error(`  ❌ SQL执行错误详情:`, error.message);
        if (error.code) {
          console.error(`     错误代码: ${error.code}`);
        }
        if (error.sql) {
          console.error(`     错误SQL: ${error.sql.substring(0, 200)}...`);
        }
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ 执行SQL文件失败:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function setupDatabase() {
  try {
    console.log('🎯 开始设置CRM数据库...');
    console.log('');

    // 步骤1: 创建数据库
    console.log('📝 步骤1: 创建数据库');
    await runCommand('node', ['scripts/create-database.js']);
    console.log('');

    // 步骤2: 执行 init-db.sql 创建表结构
    console.log('📋 步骤2: 创建表结构');
    // 使用 path.resolve 确保路径正确解析
    const sqlFilePath = path.resolve(__dirname, '..', 'src', 'database', 'init-db.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL文件不存在: ${sqlFilePath}`);
    }
    await executeSqlFile(sqlFilePath);
    console.log('');

    // 步骤3: 初始化数据库（插入基础数据）
    console.log('🔧 步骤3: 插入基础数据');
    await runCommand('npm', ['run', 'db:init']);
    console.log('');

    console.log('🎉 数据库设置完成！');
    console.log('');
    console.log('✅ 数据库已创建并初始化');
    console.log('✅ 所有表已创建');
    console.log('✅ 基础数据已插入');
    console.log('');
    console.log('🚀 现在可以启动应用了：');
    console.log('npm run start:dev');

  } catch (error) {
    console.error('❌ 数据库设置失败:', error.message);
    console.log('');
    console.log('💡 可能的解决方案：');
    console.log('1. 检查MySQL服务是否正在运行');
    console.log('2. 检查.env文件中的数据库配置');
    console.log('3. 确保数据库用户有足够的权限');
    console.log('4. 手动创建数据库：npm run db:create');
    
    process.exit(1);
  }
}

// 显示帮助信息
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🚀 CRM数据库完整设置工具');
  console.log('');
  console.log('用法:');
  console.log('  node scripts/setup-database.js');
  console.log('');
    console.log('功能:');
    console.log('  1. 创建数据库 (如果不存在)');
    console.log('  2. 执行 src/database/init-db.sql 创建表结构');
    console.log('  3. 插入基础数据');
  console.log('');
  console.log('环境变量:');
  console.log('  需要配置.env文件中的数据库连接信息');
  console.log('');
  console.log('示例:');
  console.log('  # 完整设置');
  console.log('  node scripts/setup-database.js');
  console.log('');
  console.log('  # 分步执行');
  console.log('  npm run db:create    # 创建数据库');
  console.log('  npm run db:init      # 初始化数据库');
  process.exit(0);
}

setupDatabase();
