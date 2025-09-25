import { QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 迁移工具类
 * 用于处理复杂的多语句SQL迁移
 */
export class MigrationHelper {
  /**
   * 执行包含多个SQL语句的迁移文件
   * @param queryRunner TypeORM查询运行器
   * @param sqlFilePath SQL文件路径
   */
  static async executeComplexMigration(
    queryRunner: QueryRunner,
    sqlFilePath: string
  ): Promise<void> {
    try {
      // 读取SQL文件
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      
      // 分割SQL语句（按分号分割，但排除注释中的分号）
      const statements = this.parseSqlStatements(sqlContent);
      
      console.log(`开始执行迁移文件: ${sqlFilePath}`);
      console.log(`共找到 ${statements.length} 个SQL语句`);
      
      // 逐个执行SQL语句
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        
        // 跳过空语句和注释
        if (!statement || statement.startsWith('--')) {
          continue;
        }
        
        console.log(`执行第 ${i + 1} 个语句: ${statement.substring(0, 50)}...`);
        
        try {
          await queryRunner.query(statement);
          console.log(`✅ 第 ${i + 1} 个语句执行成功`);
        } catch (error) {
          console.error(`❌ 第 ${i + 1} 个语句执行失败:`, error.message);
          throw error;
        }
      }
      
      console.log(`✅ 迁移文件执行完成: ${sqlFilePath}`);
    } catch (error) {
      console.error(`❌ 迁移文件执行失败: ${sqlFilePath}`, error);
      throw error;
    }
  }

  /**
   * 解析SQL语句
   * 智能分割SQL语句，避免在字符串或注释中分割
   */
  private static parseSqlStatements(sqlContent: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let i = 0;

    while (i < sqlContent.length) {
      const char = sqlContent[i];
      const nextChar = sqlContent[i + 1];

      // 处理字符串
      if ((char === "'" || char === '"' || char === '`') && !inString) {
        inString = true;
        stringChar = char;
        currentStatement += char;
      } else if (char === stringChar && inString) {
        // 检查是否是转义的引号
        if (nextChar === stringChar) {
          currentStatement += char + nextChar;
          i++; // 跳过下一个字符
        } else {
          inString = false;
          stringChar = '';
          currentStatement += char;
        }
      } else if (char === ';' && !inString) {
        // 遇到分号且不在字符串中，结束当前语句
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else {
        currentStatement += char;
      }

      i++;
    }

    // 添加最后一个语句（如果有）
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements.filter(stmt => stmt && !stmt.startsWith('--'));
  }

  /**
   * 检查表是否存在
   */
  static async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    );
    return result[0].count > 0;
  }

  /**
   * 检查列是否存在
   */
  static async columnExists(
    queryRunner: QueryRunner, 
    tableName: string, 
    columnName: string
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [tableName, columnName]
    );
    return result[0].count > 0;
  }

  /**
   * 安全地添加列（如果不存在）
   */
  static async addColumnIfNotExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    columnDefinition: string
  ): Promise<void> {
    const exists = await this.columnExists(queryRunner, tableName, columnName);
    if (!exists) {
      await queryRunner.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      console.log(`✅ 添加列成功: ${tableName}.${columnName}`);
    } else {
      console.log(`⚠️ 列已存在，跳过: ${tableName}.${columnName}`);
    }
  }

  /**
   * 安全地创建表（如果不存在）
   */
  static async createTableIfNotExists(
    queryRunner: QueryRunner,
    tableName: string,
    tableDefinition: string
  ): Promise<void> {
    const exists = await this.tableExists(queryRunner, tableName);
    if (!exists) {
      await queryRunner.query(`CREATE TABLE ${tableName} ${tableDefinition}`);
      console.log(`✅ 创建表成功: ${tableName}`);
    } else {
      console.log(`⚠️ 表已存在，跳过: ${tableName}`);
    }
  }
}
