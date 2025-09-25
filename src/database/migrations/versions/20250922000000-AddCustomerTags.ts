import { MigrationInterface, QueryRunner } from 'typeorm';
import { MigrationHelper } from '../MigrationHelper';
import * as path from 'path';

export class AddCustomerTags20250922000000 implements MigrationInterface {
  name = 'AddCustomerTags20250922000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🚀 开始执行客户标签迁移...');

    // 使用MigrationHelper执行复杂迁移
    const sqlFilePath = path.join(__dirname, '20250920195413-add-customer-tags-fixed.sql');
    await MigrationHelper.executeComplexMigration(queryRunner, sqlFilePath);

    console.log('✅ 客户标签迁移完成');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 开始回滚客户标签迁移...');

    // 删除关联表
    await queryRunner.query('DROP TABLE IF EXISTS customer_tag_relations');
    console.log('✅ 删除表: customer_tag_relations');

    // 删除标签表
    await queryRunner.query('DROP TABLE IF EXISTS customer_tags');
    console.log('✅ 删除表: customer_tags');

    console.log('✅ 客户标签迁移回滚完成');
  }
}
