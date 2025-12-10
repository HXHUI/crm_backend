import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  BusinessInfo,
  BusinessPersonnel,
  BusinessShareholder,
  BusinessBranch,
  BusinessInvestment,
  BusinessChangeRecord,
} from '../../entities/business-info.entity';
import { Customer } from '../../entities/customer.entity';
import { Lead } from '../../entities/lead.entity';
import { BusinessInfoService } from './business-info.service';
import { BusinessInfoController } from './business-info.controller';
import { TianyanchaModule } from '../tianyancha/tianyancha.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessInfo,
      BusinessPersonnel,
      BusinessShareholder,
      BusinessBranch,
      BusinessInvestment,
      BusinessChangeRecord,
      Customer,
      Lead,
    ]),
    ConfigModule,
    TianyanchaModule,
  ],
  controllers: [BusinessInfoController],
  providers: [BusinessInfoService],
  exports: [BusinessInfoService],
})
export class BusinessInfoModule {}

