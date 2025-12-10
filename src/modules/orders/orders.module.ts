import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { PricingCalculatorService } from '../../common/services/pricing-calculator.service';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Quote } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Contract } from '../../entities/contract.entity';
import { ContractItem } from '../../entities/contract-item.entity';
import { Product } from '../../entities/product.entity';
import { TenantModule } from '../tenant/tenant.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { Department } from '../../entities/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Customer, Opportunity, Quote, QuoteItem, Contract, ContractItem, Product, Department]),
    TenantModule,
    WorkflowModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, NumberGeneratorService, PricingCalculatorService],
  exports: [OrdersService],
})
export class OrdersModule {}

