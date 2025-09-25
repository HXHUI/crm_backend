import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeadsTable20250922110000 implements MigrationInterface {
  name = 'CreateLeadsTable20250922110000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
        owner_id VARCHAR(36) NOT NULL COMMENT '当前负责人ID',
        first_name VARCHAR(50) COMMENT '名',
        last_name VARCHAR(50) COMMENT '姓',
        company VARCHAR(100) COMMENT '公司名称',
        title VARCHAR(100) COMMENT '职位',
        phone VARCHAR(20) COMMENT '电话',
        email VARCHAR(100) COMMENT '邮箱',
        lead_source VARCHAR(50) NOT NULL DEFAULT 'other' COMMENT '线索来源',
        status ENUM('new','contacted','qualified','unqualified','converted') NOT NULL DEFAULT 'new' COMMENT '线索状态',
        rating ENUM('hot','warm','cold') DEFAULT 'warm' COMMENT '评分',
        last_contacted_at DATETIME NULL COMMENT '最后联系时间',
        converted_at DATETIME NULL COMMENT '转化时间',
        converted_customer_id VARCHAR(36) NULL COMMENT '转化的客户ID',
        converted_contact_id VARCHAR(36) NULL COMMENT '转化的联系人ID',
        converted_opportunity_id VARCHAR(36) NULL COMMENT '转化的商机ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`CREATE INDEX idx_leads_tenant_id ON leads (tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_leads_owner_id ON leads (owner_id)`);
    await queryRunner.query(`CREATE INDEX idx_leads_status ON leads (status)`);
    await queryRunner.query(`CREATE INDEX idx_leads_rating ON leads (rating)`);

    await queryRunner.query(`ALTER TABLE leads ADD CONSTRAINT fk_leads_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE leads ADD CONSTRAINT fk_leads_owner FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE leads ADD CONSTRAINT fk_leads_customer FOREIGN KEY (converted_customer_id) REFERENCES customers(id) ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE leads ADD CONSTRAINT fk_leads_contact FOREIGN KEY (converted_contact_id) REFERENCES contacts(id) ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE leads ADD CONSTRAINT fk_leads_opportunity FOREIGN KEY (converted_opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS leads`);
  }
}


