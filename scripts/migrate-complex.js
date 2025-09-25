const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 复杂迁移管理脚本
 * 用于处理包含多个SQL语句的迁移文件
 */

class ComplexMigrationManager {
  constructor() {
    this.migrationsDir = path.join(__dirname, '../src/database/migrations/versions');
  }

  /**
   * 执行复杂迁移
   * @param {string} migrationName 迁移名称
   */
  async executeComplexMigration(migrationName) {
    console.log(`🚀 开始执行复杂迁移: ${migrationName}`);
    
    try {
      // 查找对应的SQL文件
      const sqlFiles = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql') && file.includes(migrationName));
      
      if (sqlFiles.length === 0) {
        throw new Error(`未找到迁移文件: ${migrationName}`);
      }

      // 执行每个SQL文件
      for (const sqlFile of sqlFiles) {
        const sqlPath = path.join(this.migrationsDir, sqlFile);
        console.log(`📄 执行SQL文件: ${sqlFile}`);
        
        // 读取并分割SQL语句
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        const statements = this.parseSqlStatements(sqlContent);
        
        // 逐个执行SQL语句
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (!statement || statement.startsWith('--')) {
            continue;
          }
          
          console.log(`  📝 执行语句 ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
          
          try {
            execSync(`mysql -u root -proot -e "USE crm_db; ${statement}"`, { stdio: 'pipe' });
            console.log(`  ✅ 语句 ${i + 1} 执行成功`);
          } catch (error) {
            console.error(`  ❌ 语句 ${i + 1} 执行失败:`, error.message);
            throw error;
          }
        }
      }
      
      // 标记迁移为已执行
      this.markMigrationAsExecuted(migrationName);
      
      console.log(`✅ 复杂迁移执行完成: ${migrationName}`);
    } catch (error) {
      console.error(`❌ 复杂迁移执行失败: ${migrationName}`, error);
      throw error;
    }
  }

  /**
   * 解析SQL语句
   */
  parseSqlStatements(sqlContent) {
    const statements = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let i = 0;

    while (i < sqlContent.length) {
      const char = sqlContent[i];
      const nextChar = sqlContent[i + 1];

      if ((char === "'" || char === '"' || char === '`') && !inString) {
        inString = true;
        stringChar = char;
        currentStatement += char;
      } else if (char === stringChar && inString) {
        if (nextChar === stringChar) {
          currentStatement += char + nextChar;
          i++;
        } else {
          inString = false;
          stringChar = '';
          currentStatement += char;
        }
      } else if (char === ';' && !inString) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else {
        currentStatement += char;
      }

      i++;
    }

    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements.filter(stmt => stmt && !stmt.startsWith('--'));
  }

  /**
   * 标记迁移为已执行
   */
  markMigrationAsExecuted(migrationName) {
    try {
      const timestamp = new Date().getTime();
      execSync(`mysql -u root -proot -e "USE crm_db; INSERT INTO migrations (version, name) VALUES ('${timestamp}', '${migrationName}') ON DUPLICATE KEY UPDATE name = '${migrationName}';"`);
      console.log(`✅ 迁移记录已标记: ${migrationName}`);
    } catch (error) {
      console.error(`❌ 标记迁移记录失败:`, error.message);
    }
  }

  /**
   * 列出所有可用的复杂迁移
   */
  listComplexMigrations() {
    const sqlFiles = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'));
    
    console.log('📋 可用的复杂迁移:');
    sqlFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
  }
}

// 命令行接口
if (require.main === module) {
  const manager = new ComplexMigrationManager();
  const command = process.argv[2];
  const migrationName = process.argv[3];

  switch (command) {
    case 'execute':
      if (!migrationName) {
        console.error('❌ 请指定迁移名称');
        process.exit(1);
      }
      manager.executeComplexMigration(migrationName);
      break;
    case 'list':
      manager.listComplexMigrations();
      break;
    default:
      console.log('使用方法:');
      console.log('  node migrate-complex.js execute <migration-name>  # 执行迁移');
      console.log('  node migrate-complex.js list                     # 列出所有迁移');
      break;
  }
}

module.exports = ComplexMigrationManager;
