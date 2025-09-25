import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTagsService } from './customer-tags.service';
import { CustomerTagsController } from './customer-tags.controller';
import { CustomerTag } from '../../entities/customer-tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerTag])],
  controllers: [CustomerTagsController],
  providers: [CustomerTagsService],
  exports: [CustomerTagsService],
})
export class CustomerTagsModule {}
