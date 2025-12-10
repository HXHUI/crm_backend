import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictType } from '../../entities/dict-type.entity';
import { DictItem } from '../../entities/dict-item.entity';
import { DictionaryService } from './dictionary.service';
import { DictionaryController } from './dictionary.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DictType, DictItem])],
  controllers: [DictionaryController],
  providers: [DictionaryService],
  exports: [DictionaryService],
})
export class DictionaryModule {}


