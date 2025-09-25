#!/usr/bin/env node

/**
 * 完整的数据库设置脚本
 * 1. 创建数据库
 * 2. 运行初始化
 */

const { spawn } = require('child_process');
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

async function setupDatabase() {
  try {
    console.log('🎯 开始设置CRM数据库...');
    console.log('');

    // 步骤1: 创建数据库
    console.log('📝 步骤1: 创建数据库');
    await runCommand('node', ['scripts/create-database.js']);
    console.log('');

    // 步骤2: 初始化数据库
    console.log('🔧 步骤2: 初始化数据库');
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
  console.log('  2. 初始化数据库结构');
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
