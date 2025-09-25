import { MigrationInterface, QueryRunner } from 'typeorm'

export class LeadCustomerAddress20250922121000 implements MigrationInterface {
  name = 'LeadCustomerAddress20250922121000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // leads
    const leadCols: any[] = await queryRunner.query('SHOW COLUMNS FROM leads')
    const has = (name: string) => leadCols.some(c => c.Field === name)
    if (!has('industry')) await queryRunner.query("ALTER TABLE leads ADD COLUMN industry VARCHAR(50) NULL COMMENT '客户行业（字典key）'")
    if (!has('level')) await queryRunner.query("ALTER TABLE leads ADD COLUMN level VARCHAR(20) NULL COMMENT '客户等级'")
    if (!has('province')) await queryRunner.query("ALTER TABLE leads ADD COLUMN province VARCHAR(50) NULL COMMENT '省份'")
    if (!has('city')) await queryRunner.query("ALTER TABLE leads ADD COLUMN city VARCHAR(50) NULL COMMENT '城市'")
    if (!has('district')) await queryRunner.query("ALTER TABLE leads ADD COLUMN district VARCHAR(50) NULL COMMENT '区县'")
    if (!has('address_detail')) await queryRunner.query("ALTER TABLE leads ADD COLUMN address_detail VARCHAR(200) NULL COMMENT '详细地址'")

    // customers
    const custCols: any[] = await queryRunner.query('SHOW COLUMNS FROM customers')
    const hasC = (name: string) => custCols.some(c => c.Field === name)
    if (!hasC('province')) await queryRunner.query("ALTER TABLE customers ADD COLUMN province VARCHAR(50) NULL COMMENT '省份'")
    if (!hasC('city')) await queryRunner.query("ALTER TABLE customers ADD COLUMN city VARCHAR(50) NULL COMMENT '城市'")
    if (!hasC('district')) await queryRunner.query("ALTER TABLE customers ADD COLUMN district VARCHAR(50) NULL COMMENT '区县'")
    if (!hasC('address_detail')) await queryRunner.query("ALTER TABLE customers ADD COLUMN address_detail VARCHAR(200) NULL COMMENT '详细地址'")
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 简化：不回滚
  }
}
