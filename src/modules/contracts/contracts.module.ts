import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { PricingCalculatorService } from '../../common/services/pricing-calculator.service';
import { TenantModule } from '../tenant/tenant.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { Contract } from '../../entities/contract.entity';
import { ContractItem } from '../../entities/contract-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Quote } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Product } from '../../entities/product.entity';
import { Order } from '../../entities/order.entity';
import { Tenant } from '../../entities/tenant.entity';
import { Department } from '../../entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ContractItem, Customer, Contact, Quote, QuoteItem, Opportunity, Product, Order, Tenant, Department]), TenantModule, WorkflowModule],
  controllers: [ContractsController],
  providers: [ContractsService, NumberGeneratorService, PricingCalculatorService],
  exports: [ContractsService],
})
export class ContractsModule {}

