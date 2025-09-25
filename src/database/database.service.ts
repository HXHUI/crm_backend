import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Permission, PermissionType } from '../entities/permission.entity';
import { SubscriptionPlan, PlanType, BillingCycle } from '../entities/subscription-plan.entity';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 初始化数据库 - 创建数据库和表
   */
  async initializeDatabase(): Promise<void> {
    try {
      this.logger.log('开始初始化数据库...');

      // 1. 创建数据库（如果不存在）
      await this.createDatabaseIfNotExists();

      // 2. 运行数据库迁移
      await this.runMigrations();

      // 3. 插入基础数据
      await this.seedBaseData();

      this.logger.log('数据库初始化完成！');
    } catch (error) {
      this.logger.error('数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据库（如果不存在）
   */
  private async createDatabaseIfNotExists(): Promise<void> {
    const databaseName = this.configService.get<string>('DB_DATABASE', 'crm_db');
    
    // 创建临时连接（不指定数据库）
    const tempDataSource = new DataSource({
      type: 'mysql',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 3306),
      username: this.configService.get<string>('DB_USERNAME', 'root'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
      charset: 'utf8mb4',
    });

    try {
      await tempDataSource.initialize();
      
      // 检查数据库是否存在
      const result = await tempDataSource.query(
        `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
        [databaseName]
      );

      if (result.length === 0) {
        this.logger.log(`创建数据库: ${databaseName}`);
        await tempDataSource.query(`CREATE DATABASE ${databaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        this.logger.log(`数据库 ${databaseName} 创建成功`);
      } else {
        this.logger.log(`数据库 ${databaseName} 已存在`);
      }
    } catch (error) {
      this.logger.error('创建数据库失败:', error);
      throw error;
    } finally {
      if (tempDataSource.isInitialized) {
        await tempDataSource.destroy();
      }
    }
  }

  /**
   * 运行数据库迁移
   */
  private async runMigrations(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      // 同步数据库结构
      await this.dataSource.synchronize();
      this.logger.log('数据库表结构同步完成');
    } catch (error) {
      this.logger.error('数据库迁移失败:', error);
      throw error;
    }
  }

  /**
   * 插入基础数据
   */
  private async seedBaseData(): Promise<void> {
    try {
      await this.seedPermissions();
      await this.seedSubscriptionPlans();
      this.logger.log('基础数据插入完成');
    } catch (error) {
      this.logger.error('基础数据插入失败:', error);
      throw error;
    }
  }

  /**
   * 插入权限数据
   */
  private async seedPermissions(): Promise<void> {
    const permissionRepository = this.dataSource.getRepository(Permission);
    
    // 检查是否已有权限数据
    const existingPermissions = await permissionRepository.count();
    if (existingPermissions > 0) {
      this.logger.log('权限数据已存在，跳过插入');
      return;
    }

    const permissions = [
      {
        id: 'perm-001',
        name: '用户管理',
        code: 'user:manage',
        description: '用户管理权限',
        type: PermissionType.MENU,
        parentId: null,
        sort: 1,
        isActive: true,
      },
      {
        id: 'perm-002',
        name: '客户管理',
        code: 'customer:manage',
        description: '客户管理权限',
        type: PermissionType.MENU,
        parentId: null,
        sort: 2,
        isActive: true,
      },
      {
        id: 'perm-003',
        name: '商机管理',
        code: 'opportunity:manage',
        description: '商机管理权限',
        type: PermissionType.MENU,
        parentId: null,
        sort: 3,
        isActive: true,
      },
      {
        id: 'perm-004',
        name: '活动管理',
        code: 'activity:manage',
        description: '活动管理权限',
        type: PermissionType.MENU,
        parentId: null,
        sort: 4,
        isActive: true,
      },
      {
        id: 'perm-005',
        name: '查看客户',
        code: 'customer:view',
        description: '查看客户权限',
        type: PermissionType.API,
        parentId: 'perm-002',
        sort: 1,
        isActive: true,
      },
      {
        id: 'perm-006',
        name: '创建客户',
        code: 'customer:create',
        description: '创建客户权限',
        type: PermissionType.API,
        parentId: 'perm-002',
        sort: 2,
        isActive: true,
      },
      {
        id: 'perm-007',
        name: '编辑客户',
        code: 'customer:edit',
        description: '编辑客户权限',
        type: PermissionType.API,
        parentId: 'perm-002',
        sort: 3,
        isActive: true,
      },
      {
        id: 'perm-008',
        name: '删除客户',
        code: 'customer:delete',
        description: '删除客户权限',
        type: PermissionType.API,
        parentId: 'perm-002',
        sort: 4,
        isActive: true,
      },
      {
        id: 'perm-009',
        name: '查看商机',
        code: 'opportunity:view',
        description: '查看商机权限',
        type: PermissionType.API,
        parentId: 'perm-003',
        sort: 1,
        isActive: true,
      },
      {
        id: 'perm-010',
        name: '创建商机',
        code: 'opportunity:create',
        description: '创建商机权限',
        type: PermissionType.API,
        parentId: 'perm-003',
        sort: 2,
        isActive: true,
      },
      {
        id: 'perm-011',
        name: '编辑商机',
        code: 'opportunity:edit',
        description: '编辑商机权限',
        type: PermissionType.API,
        parentId: 'perm-003',
        sort: 3,
        isActive: true,
      },
      {
        id: 'perm-012',
        name: '删除商机',
        code: 'opportunity:delete',
        description: '删除商机权限',
        type: PermissionType.API,
        parentId: 'perm-003',
        sort: 4,
        isActive: true,
      },
      {
        id: 'perm-013',
        name: '查看活动',
        code: 'activity:view',
        description: '查看活动权限',
        type: PermissionType.API,
        parentId: 'perm-004',
        sort: 1,
        isActive: true,
      },
      {
        id: 'perm-014',
        name: '创建活动',
        code: 'activity:create',
        description: '创建活动权限',
        type: PermissionType.API,
        parentId: 'perm-004',
        sort: 2,
        isActive: true,
      },
      {
        id: 'perm-015',
        name: '编辑活动',
        code: 'activity:edit',
        description: '编辑活动权限',
        type: PermissionType.API,
        parentId: 'perm-004',
        sort: 3,
        isActive: true,
      },
      {
        id: 'perm-016',
        name: '删除活动',
        code: 'activity:delete',
        description: '删除活动权限',
        type: PermissionType.API,
        parentId: 'perm-004',
        sort: 4,
        isActive: true,
      },
    ];

    for (const permission of permissions) {
      const entity = permissionRepository.create(permission);
      await permissionRepository.save(entity);
    }

    this.logger.log('权限数据插入完成');
  }

  /**
   * 插入套餐数据
   */
  private async seedSubscriptionPlans(): Promise<void> {
    const planRepository = this.dataSource.getRepository(SubscriptionPlan);
    
    // 检查是否已有套餐数据
    const existingPlans = await planRepository.count();
    if (existingPlans > 0) {
      this.logger.log('套餐数据已存在，跳过插入');
      return;
    }

    const plans = [
      {
        id: 'plan-001',
        name: '免费版',
        description: '免费版套餐，适合个人用户',
        type: PlanType.FREE,
        price: 0.00,
        billingCycle: BillingCycle.MONTHLY,
        userLimit: 1,
        storageLimit: 1,
        features: ['基础客户管理', '基础商机管理', '基础活动管理'],
        isActive: true,
        sort: 1,
      },
      {
        id: 'plan-002',
        name: '基础版',
        description: '基础版套餐，适合小团队',
        type: PlanType.BASIC,
        price: 99.00,
        billingCycle: BillingCycle.MONTHLY,
        userLimit: 5,
        storageLimit: 10,
        features: ['完整客户管理', '完整商机管理', '完整活动管理', '基础报表'],
        isActive: true,
        sort: 2,
      },
      {
        id: 'plan-003',
        name: '专业版',
        description: '专业版套餐，适合中型企业',
        type: PlanType.PROFESSIONAL,
        price: 299.00,
        billingCycle: BillingCycle.MONTHLY,
        userLimit: 20,
        storageLimit: 50,
        features: ['完整客户管理', '完整商机管理', '完整活动管理', '高级报表', '自定义字段', 'API访问'],
        isActive: true,
        sort: 3,
      },
      {
        id: 'plan-004',
        name: '企业版',
        description: '企业版套餐，适合大型企业',
        type: PlanType.ENTERPRISE,
        price: 999.00,
        billingCycle: BillingCycle.MONTHLY,
        userLimit: -1,
        storageLimit: -1,
        features: ['完整功能', '无限用户', '无限存储', '高级安全', '专属支持', '自定义集成'],
        isActive: true,
        sort: 4,
      },
    ];

    for (const plan of plans) {
      const entity = planRepository.create(plan);
      await planRepository.save(entity);
    }

    this.logger.log('套餐数据插入完成');
  }

  /**
   * 获取数据库状态
   */
  async getDatabaseStatus(): Promise<any> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      const tables = await this.dataSource.query(`
        SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
      `, [this.configService.get<string>('DB_DATABASE', 'crm_db')]);

      return {
        status: 'connected',
        database: this.configService.get<string>('DB_DATABASE', 'crm_db'),
        tables: tables,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('获取数据库状态失败:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 重置数据库（谨慎使用）
   */
  async resetDatabase(): Promise<void> {
    this.logger.warn('开始重置数据库...');
    
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      // 删除所有表
      await this.dataSource.dropDatabase();
      
      // 重新创建
      await this.initializeDatabase();
      
      this.logger.log('数据库重置完成');
    } catch (error) {
      this.logger.error('数据库重置失败:', error);
      throw error;
    }
  }
}
