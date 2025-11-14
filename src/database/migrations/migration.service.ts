import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationInfo {
  version: string;
  name: string;
  executed: boolean;
  executedAt?: Date;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  // 兼容 ts-node 运行(src) 与 编译后运行(dist)，多路径并行扫描
  private readonly migrationsPaths = [
    path.join(__dirname, 'versions'),
    path.join(process.cwd(), 'src', 'database', 'migrations', 'versions'),
    path.join(process.cwd(), 'dist', 'database', 'migrations', 'versions'),
  ];

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 初始化迁移表
   * 注意：migrations 表的结构定义在 scripts/init-db.sql 中
   * 此方法仅作为备用方案，确保表存在（如果未运行 SQL 脚本）
   */
  async initMigrationsTable(): Promise<void> {
    try {
      // 检查表是否存在
      const tables = await this.dataSource.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'migrations'
      `);

      if (!Array.isArray(tables) || tables.length === 0) {
        // 表不存在，创建新表（结构与 init-db.sql 中保持一致）
        this.logger.warn('migrations 表不存在，正在创建（建议使用 scripts/init-db.sql 初始化数据库）');
        await this.dataSource.query(`
          CREATE TABLE migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(255) NOT NULL UNIQUE COMMENT '迁移版本号',
            name VARCHAR(255) NOT NULL COMMENT '迁移名称',
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            INDEX idx_version (version),
            INDEX idx_executed_at (executed_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        this.logger.log('迁移表创建完成');
      } else {
        // 表已存在，检查是否有 version 字段（兼容旧结构）
        const existingColumns = await this.dataSource.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'migrations'
        `);
        
        const columnNames = Array.isArray(existingColumns) 
          ? existingColumns.map((col: any) => col.COLUMN_NAME)
          : [];
        
        // 如果缺少 version 字段，说明是旧的 TypeORM 结构，需要升级
        if (!columnNames.includes('version')) {
          this.logger.warn('检测到旧的 migrations 表结构，正在升级...');
          
          // 添加 version 字段
          await this.dataSource.query(`
            ALTER TABLE migrations 
            ADD COLUMN version VARCHAR(255) NULL
          `);
          
          // 如果有 timestamp 字段，使用它作为 version
          if (columnNames.includes('timestamp')) {
            await this.dataSource.query(`
              UPDATE migrations 
              SET version = CAST(timestamp AS CHAR) 
              WHERE version IS NULL
            `);
          } else {
            // 否则使用 id 生成唯一 version
            await this.dataSource.query(`
              UPDATE migrations 
              SET version = CONCAT('mig_', LPAD(id, 10, '0')) 
              WHERE version IS NULL
            `);
          }
          
          // 修改为 NOT NULL 并添加唯一索引
          await this.dataSource.query(`
            ALTER TABLE migrations 
            MODIFY COLUMN version VARCHAR(255) NOT NULL,
            ADD UNIQUE KEY idx_version (version)
          `);
          
          // 添加其他缺失字段
          if (!columnNames.includes('executed_at')) {
            await this.dataSource.query(`
              ALTER TABLE migrations 
              ADD COLUMN executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间'
            `);
            if (columnNames.includes('timestamp')) {
              await this.dataSource.query(`
                UPDATE migrations 
                SET executed_at = FROM_UNIXTIME(timestamp / 1000) 
                WHERE executed_at IS NULL AND timestamp IS NOT NULL
              `);
            }
          }
          
          if (!columnNames.includes('created_at')) {
            await this.dataSource.query(`
              ALTER TABLE migrations 
              ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
            `);
          }
          
          // 处理旧的 timestamp 字段：添加默认值或删除（推荐删除，因为已有 executed_at）
          if (columnNames.includes('timestamp')) {
            // 先检查 timestamp 字段是否有默认值
            const [timestampCol] = await this.dataSource.query(`
              SELECT COLUMN_DEFAULT, IS_NULLABLE
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'migrations' 
              AND COLUMN_NAME = 'timestamp'
            `);
            
            if (Array.isArray(timestampCol) && timestampCol.length > 0) {
              const colInfo = timestampCol[0];
              // 如果没有默认值且不允许 NULL，添加默认值
              if (!colInfo.COLUMN_DEFAULT && colInfo.IS_NULLABLE === 'NO') {
                this.logger.log('为 timestamp 字段添加默认值...');
                // MySQL 不支持表达式作为默认值，使用当前时间戳（毫秒）
                const currentTimestamp = Date.now();
                await this.dataSource.query(`
                  ALTER TABLE migrations 
                  MODIFY COLUMN timestamp BIGINT DEFAULT ${currentTimestamp}
                `);
              }
            }
          }
          
          this.logger.log('迁移表结构升级完成');
        } else {
          // 表结构已有 version 字段，但可能仍有旧的 timestamp 字段需要处理
          if (columnNames.includes('timestamp')) {
            const [timestampCol] = await this.dataSource.query(`
              SELECT COLUMN_DEFAULT, IS_NULLABLE
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'migrations' 
              AND COLUMN_NAME = 'timestamp'
            `);
            
            if (Array.isArray(timestampCol) && timestampCol.length > 0) {
              const colInfo = timestampCol[0];
              // 如果没有默认值且不允许 NULL，添加默认值
              if (!colInfo.COLUMN_DEFAULT && colInfo.IS_NULLABLE === 'NO') {
                this.logger.log('为 timestamp 字段添加默认值...');
                const currentTimestamp = Date.now();
                await this.dataSource.query(`
                  ALTER TABLE migrations 
                  MODIFY COLUMN timestamp BIGINT DEFAULT ${currentTimestamp}
                `);
              }
            }
          }
          this.logger.log('迁移表结构正常');
        }
      }
    } catch (error) {
      this.logger.error('迁移表初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取已执行的迁移
   */
  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.dataSource.query('SELECT version FROM migrations ORDER BY version');
      return result.map(row => row.version);
    } catch (error) {
      this.logger.error('获取已执行迁移失败:', error);
      return [];
    }
  }

  /**
   * 获取所有迁移文件
   */
  async getAllMigrations(): Promise<MigrationInfo[]> {
    try {
      const executedVersions = await this.getExecutedMigrations();
      const migrations: MigrationInfo[] = [];

      // 扫描迁移目录（合并多路径）
      const seen = new Set<string>();
      const filesMerged: { file: string; full: string }[] = [];
      for (const p of this.migrationsPaths) {
        if (!p || !fs.existsSync(p)) continue;
        const files = fs.readdirSync(p)
          .filter(file => file.endsWith('.sql') || file.endsWith('.ts') || file.endsWith('.js'));
        for (const f of files) {
          if (seen.has(f)) continue;
          seen.add(f);
          filesMerged.push({ file: f, full: path.join(p, f) });
        }
      }
      filesMerged.sort((a,b)=> a.file.localeCompare(b.file));

      // 使用 Map 来去重相同版本号的迁移（保留最新的文件名）
      const versionMap = new Map<string, { version: string; name: string; file: string; full: string }>();
      
      for (const item of filesMerged) {
        const file = item.file;
        const version = file.split('-')[0];
        const base = file.replace(/\.(sql|ts|js)$/i, '');
        const name = base.substring(version.length + 1);
        
        // 如果版本号已存在，比较文件名，保留更新的（按字母顺序，fixed 版本通常更靠后）
        if (versionMap.has(version)) {
          const existing = versionMap.get(version)!;
          if (file.localeCompare(existing.file) > 0) {
            // 当前文件更新，替换
            versionMap.set(version, { version, name, file, full: item.full });
          }
        } else {
          versionMap.set(version, { version, name, file, full: item.full });
        }
      }

      // 将去重后的迁移添加到列表
      for (const { version, name, executed } of Array.from(versionMap.values()).map(item => ({
        version: item.version,
        name: item.name,
        executed: executedVersions.includes(item.version),
      }))) {
        migrations.push({ version, name, executed });
      }

      return migrations;
    } catch (error) {
      this.logger.error('获取迁移文件失败:', error);
      return [];
    }
  }

  /**
   * 执行迁移
   */
  async runMigrations(): Promise<void> {
    try {
      await this.initMigrationsTable();
      
      const migrations = await this.getAllMigrations();
      const pendingMigrations = migrations.filter(m => !m.executed);

      if (pendingMigrations.length === 0) {
        this.logger.log('没有待执行的迁移');
        return;
      }

      this.logger.log(`开始执行 ${pendingMigrations.length} 个迁移...`);

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      this.logger.log('所有迁移执行完成');
    } catch (error) {
      this.logger.error('迁移执行失败:', error);
      throw error;
    }
  }

  /**
   * 执行单个迁移
   */
  private async executeMigration(migration: MigrationInfo): Promise<void> {
    try {
      const baseName = `${migration.version}-${migration.name}`;
      const resolveFromPaths = (ext: string) => this.migrationsPaths.map(p => path.join(p, `${baseName}.${ext}`));
      const firstExisting = (paths: string[]) => paths.find(p => fs.existsSync(p));
      const sqlPath = firstExisting(resolveFromPaths('sql'));
      const tsPath = firstExisting(resolveFromPaths('ts'));
      const jsPath = firstExisting(resolveFromPaths('js'));

      this.logger.log(`执行迁移: ${migration.version} - ${migration.name}`);

      if (sqlPath && fs.existsSync(sqlPath)) {
        // SQL 迁移：移除行级注释后按分号拆分逐条执行
        const raw = fs.readFileSync(sqlPath, 'utf8');
        const cleaned = raw
          .split(/\r?\n/g)
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('--'))
          .join('\n');
        const statements = cleaned
          .split(/;\s*(?:\r?\n|$)/g)
          .map(s => s.trim())
          .filter(s => s);
        for (const stmt of statements) {
          await this.dataSource.query(stmt);
        }
      } else if ((tsPath && fs.existsSync(tsPath)) || (jsPath && fs.existsSync(jsPath))) {
        // TS/JS 迁移：动态导入并执行 up()
        const modPath = tsPath && fs.existsSync(tsPath) ? tsPath : (jsPath as string);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(modPath);
        const Exported = Object.values(mod).find(
          (v: any) => typeof v === 'function' && v.prototype && typeof v.prototype.up === 'function'
        ) as any;
        if (!Exported) {
          throw new Error(`未找到可执行的迁移类: ${modPath}`);
        }
        const instance = new Exported();
        await instance.up(this.dataSource.createQueryRunner());
      } else {
        throw new Error(`迁移文件不存在: ${baseName}(.sql|.ts|.js)`);
      }
      
      // 记录迁移执行
      // 先检查该版本是否已存在，避免重复插入
      const existing = await this.dataSource.query(
        'SELECT version FROM migrations WHERE version = ?',
        [migration.version]
      );
      
      if (Array.isArray(existing) && existing.length > 0) {
        this.logger.warn(`迁移 ${migration.version} 已存在，跳过记录插入`);
        return;
      }
      
      // 检查表结构，兼容旧的 timestamp 字段
      const columns = await this.dataSource.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'migrations'
      `);
      
      const columnNames = Array.isArray(columns) 
        ? columns.map((col: any) => col.COLUMN_NAME)
        : [];
      
      if (columnNames.includes('timestamp')) {
        // 旧结构：需要提供 timestamp 字段
        const timestamp = Date.now();
        await this.dataSource.query(
          'INSERT INTO migrations (version, name, timestamp) VALUES (?, ?, ?)',
          [migration.version, migration.name, timestamp]
        );
      } else {
        // 新结构：只需要 version 和 name
        await this.dataSource.query(
          'INSERT INTO migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );
      }

      this.logger.log(`迁移执行完成: ${migration.version} - ${migration.name}`);
    } catch (error) {
      this.logger.error(`迁移执行失败: ${migration.version} - ${migration.name}`, error);
      throw error;
    }
  }

  /**
   * 创建迁移文件
   */
  async createMigration(name: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      const version = `${timestamp}`;
      const fileName = `${version}-${name}.sql`;
      // 选取可写目录（优先 src，其次 dist，再次 __dirname）
      const targetDir = this.migrationsPaths.find(p => p && fs.existsSync(p)) || this.migrationsPaths[0];
      const filePath = path.join(targetDir, fileName);

      // 确保目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
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
      
      this.logger.log(`迁移文件创建成功: ${fileName}`);
      return fileName;
    } catch (error) {
      this.logger.error('创建迁移文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取迁移状态
   */
  async getMigrationStatus(): Promise<any> {
    try {
      const migrations = await this.getAllMigrations();
      const executed = migrations.filter(m => m.executed);
      const pending = migrations.filter(m => !m.executed);

      return {
        total: migrations.length,
        executed: executed.length,
        pending: pending.length,
        migrations: migrations,
        lastExecuted: executed.length > 0 ? executed[executed.length - 1] : null,
        nextPending: pending.length > 0 ? pending[0] : null,
      };
    } catch (error) {
      this.logger.error('获取迁移状态失败:', error);
      throw error;
    }
  }
}
