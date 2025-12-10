import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { PricingCalculatorService } from '../../common/services/pricing-calculator.service';
import { TenantModule } from '../tenant/tenant.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { Quote } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Product } from '../../entities/product.entity';
import { Contract } from '../../entities/contract.entity';
import { Order } from '../../entities/order.entity';
import { Department } from '../../entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, QuoteItem, Customer, Contact, Opportunity, Product, Contract, Order, Department]), TenantModule, WorkflowModule],
  controllers: [QuotesController],
  providers: [QuotesService, NumberGeneratorService, PricingCalculatorService],
  exports: [QuotesService],
})
export class QuotesModule {}

