import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
import { CustomerRequirementsModule } from './modules/customer-requirements/customer-requirements.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { LeadsModule } from './modules/leads/leads.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { TargetsModule } from './modules/targets/targets.module';
import { ProductsModule } from './modules/products/products.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { UploadModule } from './modules/upload/upload.module';
import { VisitsModule } from './modules/visits/visits.module';
import { BusinessInfoModule } from './modules/business-info/business-info.module';
import { TianyanchaModule } from './modules/tianyancha/tianyancha.module';
import { DictionaryModule } from './modules/dictionary/dictionary.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// 健康检查
import { HealthController } from './common/health/health.controller';
import { CommonController } from './common/common.controller';

// 中间件
import { DepartmentMiddleware } from './common/middleware/department.middleware';

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
    CustomerRequirementsModule,
    ContactsModule,
    OpportunitiesModule,
    ActivitiesModule,
    LeadsModule,
    StatisticsModule,
    TargetsModule,
    ProductsModule,
    QuotesModule,
    OrdersModule,
    ContractsModule,
    UploadModule,
    VisitsModule,
    BusinessInfoModule,
    TianyanchaModule,
    DictionaryModule,
    WorkflowModule,
    NotificationsModule,
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 在所有路由上应用部门中间件（在 JWT 守卫之后）
    consumer
      .apply(DepartmentMiddleware)
      .forRoutes('*');
  }
}
