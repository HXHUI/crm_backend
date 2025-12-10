import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

// 自定义命名策略：将驼峰命名转换为下划线命名
class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName: string): string {
    return customName ? customName : this.toSnakeCase(className);
  }

  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return customName ? customName : this.toSnakeCase(propertyName);
  }

  relationName(propertyName: string): string {
    return this.toSnakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.toSnakeCase(relationName + '_' + referencedColumnName);
  }

  joinTableName(firstTableName: string, secondTableName: string): string {
    return this.toSnakeCase(firstTableName + '_' + secondTableName);
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return this.toSnakeCase(tableName + '_' + (columnName ? columnName : propertyName));
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'root'),
  password: configService.get<string>('DB_PASSWORD', 'root'),
  database: configService.get<string>('DB_DATABASE', 'crm_db'),
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: false, // 暂时禁用同步，避免索引冲突
  // 只记录错误和警告，不记录查询日志
  logging: configService.get<string>('NODE_ENV') === 'development' 
    ? ['error', 'warn'] 
    : false,
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: true,
  timezone: '+08:00',
  charset: 'utf8mb4',
  namingStrategy: new SnakeNamingStrategy(), // 使用下划线命名策略
  extra: {
    charset: 'utf8mb4_unicode_ci',
    // 连接池配置
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    // 锁等待超时设置
    lockWaitTimeout: 50,
    // 事务隔离级别
    transactionIsolation: 'READ_COMMITTED',
  },
});
