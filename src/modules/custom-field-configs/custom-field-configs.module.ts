import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomFieldConfigsController } from './custom-field-configs.controller';
import { CustomFieldConfigsService } from './custom-field-configs.service';
import { CustomFieldConfig } from '../../entities/custom-field-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldConfig])],
  controllers: [CustomFieldConfigsController],
  providers: [CustomFieldConfigsService],
  exports: [CustomFieldConfigsService],
})
export class CustomFieldConfigsModule {}

