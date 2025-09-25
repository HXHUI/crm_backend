import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '../config/database.config';
import { DatabaseService } from './database.service';
import { DatabaseController } from './database.controller';
import { MigrationService } from './migrations/migration.service';
import { MigrationController } from './migrations/migration.controller';
import * as entities from '../entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      entities.User,
      entities.Tenant,
      entities.Member,
      entities.Department,
      entities.Role,
      entities.Permission,
      entities.MemberDepartment,
      entities.MemberRole,
      entities.RolePermission,
      entities.Customer,
      entities.Contact,
      entities.Opportunity,
      entities.Activity,
      entities.SubscriptionPlan,
      entities.TenantSubscription,
    ]),
  ],
  controllers: [DatabaseController, MigrationController],
  providers: [DatabaseService, MigrationService],
  exports: [DatabaseService, MigrationService],
})
export class DatabaseModule {}
