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
   */
  async initMigrationsTable(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          version VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      this.logger.log('迁移表初始化完成');
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

      for (const item of filesMerged) {
        const file = item.file;
          const version = file.split('-')[0];
          const base = file.replace(/\.(sql|ts|js)$/i, '');
          const name = base.substring(version.length + 1);
          
          migrations.push({
            version,
            name,
            executed: executedVersions.includes(version),
          });
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
      await this.dataSource.query(
        'INSERT INTO migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name]
      );

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
