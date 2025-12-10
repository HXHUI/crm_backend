import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from '../../entities/product.entity';
import { TenantModule } from '../tenant/tenant.module';
import { DictionaryModule } from '../dictionary/dictionary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), TenantModule, DictionaryModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

