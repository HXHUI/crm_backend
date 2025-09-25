import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'root'),
  password: configService.get<string>('DB_PASSWORD', ''),
  database: configService.get<string>('DB_DATABASE', 'crm_db'),
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: false, // 暂时禁用同步，避免索引冲突
  logging: configService.get<string>('NODE_ENV') === 'development',
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: true,
  timezone: '+08:00',
  charset: 'utf8mb4',
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
