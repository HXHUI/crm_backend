import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLeadsColumnsToCamel20250922120000 implements MigrationInterface {
  name = 'RenameLeadsColumnsToCamel20250922120000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: any[] = await queryRunner.query('SHOW COLUMNS FROM leads');
    const has = (name: string) => rows.some(r => r.Field === name);

    if (has('created_at') && !has('createdAt')) {
      await queryRunner.query('ALTER TABLE leads CHANGE created_at createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
    }
    if (has('updated_at') && !has('updatedAt')) {
      await queryRunner.query('ALTER TABLE leads CHANGE updated_at updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    }
    if (has('deleted_at') && !has('deletedAt')) {
      await queryRunner.query('ALTER TABLE leads CHANGE deleted_at deletedAt TIMESTAMP NULL');
    }
    if (has('last_contacted_at') && !has('lastContactedAt')) {
      await queryRunner.query('ALTER TABLE leads CHANGE last_contacted_at lastContactedAt DATETIME NULL');
    }
    if (has('converted_at') && !has('convertedAt')) {
      await queryRunner.query('ALTER TABLE leads CHANGE converted_at convertedAt DATETIME NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows: any[] = await queryRunner.query('SHOW COLUMNS FROM leads');
    const has = (name: string) => rows.some(r => r.Field === name);

    if (has('createdAt') && !has('created_at')) {
      await queryRunner.query('ALTER TABLE leads CHANGE createdAt created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
    }
    if (has('updatedAt') && !has('updated_at')) {
      await queryRunner.query('ALTER TABLE leads CHANGE updatedAt updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    }
    if (has('deletedAt') && !has('deleted_at')) {
      await queryRunner.query('ALTER TABLE leads CHANGE deletedAt deleted_at TIMESTAMP NULL');
    }
    if (has('lastContactedAt') && !has('last_contacted_at')) {
      await queryRunner.query('ALTER TABLE leads CHANGE lastContactedAt last_contacted_at DATETIME NULL');
    }
    if (has('convertedAt') && !has('converted_at')) {
      await queryRunner.query('ALTER TABLE leads CHANGE convertedAt converted_at DATETIME NULL');
    }
  }
}
