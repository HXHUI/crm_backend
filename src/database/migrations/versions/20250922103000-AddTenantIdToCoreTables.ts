import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToCoreTables20250922103000 implements MigrationInterface {
  name = 'AddTenantIdToCoreTables20250922103000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // customers
    await queryRunner.query(`ALTER TABLE customers ADD COLUMN tenant_id varchar(36) NULL COMMENT '租户ID'`);
    await queryRunner.query(`CREATE INDEX idx_customers_tenant_id ON customers (tenant_id)`);
    await queryRunner.query(`ALTER TABLE customers ADD CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);

    // contacts
    await queryRunner.query(`ALTER TABLE contacts ADD COLUMN tenant_id varchar(36) NULL COMMENT '租户ID'`);
    await queryRunner.query(`CREATE INDEX idx_contacts_tenant_id ON contacts (tenant_id)`);
    await queryRunner.query(`ALTER TABLE contacts ADD CONSTRAINT fk_contacts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);

    // opportunities
    await queryRunner.query(`ALTER TABLE opportunities ADD COLUMN tenant_id varchar(36) NULL COMMENT '租户ID'`);
    await queryRunner.query(`CREATE INDEX idx_opportunities_tenant_id ON opportunities (tenant_id)`);
    await queryRunner.query(`ALTER TABLE opportunities ADD CONSTRAINT fk_opportunities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);

    // activities
    await queryRunner.query(`ALTER TABLE activities ADD COLUMN tenant_id varchar(36) NULL COMMENT '租户ID'`);
    await queryRunner.query(`CREATE INDEX idx_activities_tenant_id ON activities (tenant_id)`);
    await queryRunner.query(`ALTER TABLE activities ADD CONSTRAINT fk_activities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // activities
    await queryRunner.query(`ALTER TABLE activities DROP FOREIGN KEY fk_activities_tenant`);
    await queryRunner.query(`DROP INDEX idx_activities_tenant_id ON activities`);
    await queryRunner.query(`ALTER TABLE activities DROP COLUMN tenant_id`);

    // opportunities
    await queryRunner.query(`ALTER TABLE opportunities DROP FOREIGN KEY fk_opportunities_tenant`);
    await queryRunner.query(`DROP INDEX idx_opportunities_tenant_id ON opportunities`);
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN tenant_id`);

    // contacts
    await queryRunner.query(`ALTER TABLE contacts DROP FOREIGN KEY fk_contacts_tenant`);
    await queryRunner.query(`DROP INDEX idx_contacts_tenant_id ON contacts`);
    await queryRunner.query(`ALTER TABLE contacts DROP COLUMN tenant_id`);

    // customers
    await queryRunner.query(`ALTER TABLE customers DROP FOREIGN KEY fk_customers_tenant`);
    await queryRunner.query(`DROP INDEX idx_customers_tenant_id ON customers`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN tenant_id`);
  }
}


