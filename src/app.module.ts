import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

// 配置
import { getDatabaseConfig } from './config/database.config';

// 通用模块
import { RedisModule } from './common/redis/redis.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { DatabaseModule } from './database/database.module';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { DepartmentModule } from './modules/department/department.module';
import { RoleModule } from './modules/role/role.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CustomerTagsModule } from './modules/customer-tags/customer-tags.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { LeadsModule } from './modules/leads/leads.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { TargetsModule } from './modules/targets/targets.module';

// 健康检查
import { HealthController } from './common/health/health.controller';
import { CommonController } from './common/common.controller';

// 实体
import * as entities from './entities';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
      inject: [ConfigService],
    }),

    // 通用模块
    RedisModule,
    DatabaseModule,

    // 业务模块
    AuthModule,
    UserModule,
    TenantModule,
    DepartmentModule,
    RoleModule,
    CustomersModule,
    CustomerTagsModule,
    ContactsModule,
    OpportunitiesModule,
    ActivitiesModule,
    LeadsModule,
    StatisticsModule,
    TargetsModule,
  ],
  controllers: [
    HealthController,
    CommonController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
