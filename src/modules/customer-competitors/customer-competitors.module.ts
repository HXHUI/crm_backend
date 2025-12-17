import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomerCompetitor } from '../../entities/customer-competitor.entity'
import { Customer } from '../../entities/customer.entity'
import { Opportunity } from '../../entities/opportunity.entity'
import { Contract } from '../../entities/contract.entity'
import { Order } from '../../entities/order.entity'
import { CustomerCompetitorsService } from './customer-competitors.service'
import { CustomerCompetitorsController } from './customer-competitors.controller'

@Module({
  imports: [TypeOrmModule.forFeature([CustomerCompetitor, Customer, Opportunity, Contract, Order])],
  controllers: [CustomerCompetitorsController],
  providers: [CustomerCompetitorsService],
  exports: [CustomerCompetitorsService],
})
export class CustomerCompetitorsModule {}

