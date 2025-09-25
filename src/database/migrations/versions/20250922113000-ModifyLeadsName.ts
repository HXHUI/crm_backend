import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyLeadsName20250922113000 implements MigrationInterface {
  name = 'ModifyLeadsName20250922113000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 新增 name 字段
    await queryRunner.query(`ALTER TABLE leads ADD COLUMN name VARCHAR(100) NULL COMMENT '姓名' AFTER tenant_id`);

    // 用 first_name + last_name 回填 name（如果存在）
    await queryRunner.query(`UPDATE leads SET name = TRIM(CONCAT(IFNULL(first_name,''),' ',IFNULL(last_name,''))) WHERE (first_name IS NOT NULL OR last_name IS NOT NULL) AND (name IS NULL OR name = '')`);

    // 删除 first_name / last_name
    await queryRunner.query(`ALTER TABLE leads DROP COLUMN first_name`);
    await queryRunner.query(`ALTER TABLE leads DROP COLUMN last_name`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：恢复 first_name/last_name，并拆分 name（简单按空格）
    await queryRunner.query(`ALTER TABLE leads ADD COLUMN first_name VARCHAR(50) NULL`);
    await queryRunner.query(`ALTER TABLE leads ADD COLUMN last_name VARCHAR(50) NULL`);
    await queryRunner.query(`UPDATE leads SET first_name = SUBSTRING_INDEX(name,' ',1), last_name = TRIM(SUBSTRING(name, LENGTH(SUBSTRING_INDEX(name,' ',1)) + 1)) WHERE name IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE leads DROP COLUMN name`);
  }
}


