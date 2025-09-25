import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm'

export class ActivityRefactor20250922140000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('activities')
    if (!table) return

    // Drop FKs on customerId and opportunityId if present
    const fkToDrop = table.foreignKeys.filter(
      fk => fk.columnNames.includes('customerId') || fk.columnNames.includes('opportunityId'),
    )
    for (const fk of fkToDrop) {
      await queryRunner.dropForeignKey('activities', fk)
    }

    // Drop columns if exist
    if (table.findColumnByName('customerId')) {
      await queryRunner.dropColumn('activities', 'customerId')
    }
    if (table.findColumnByName('opportunityId')) {
      await queryRunner.dropColumn('activities', 'opportunityId')
    }

    // Add new columns
    await queryRunner.addColumns('activities', [
      new TableColumn({
        name: 'relatedToType',
        type: "enum",
        enum: ['customer', 'contact', 'opportunity', 'lead'],
        isNullable: false,
        comment: '关联主体类型',
      }),
      new TableColumn({
        name: 'relatedToId',
        type: 'varchar',
        length: '36',
        isNullable: false,
        comment: '关联主体ID',
      }),
      new TableColumn({
        name: 'assignedBy',
        type: 'varchar',
        length: '36',
        isNullable: true,
        comment: '分配人(成员ID)',
      }),
      new TableColumn({
        name: 'priority',
        type: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        default: `'medium'`,
        isNullable: false,
        comment: '优先级',
      }),
      new TableColumn({
        name: 'content',
        type: 'text',
        isNullable: true,
        comment: '活动详细内容/完成笔记',
      }),
    ])

    // Helpful composite index for lookups
    await queryRunner.createIndex(
      'activities',
      new TableIndex({ name: 'idx_activities_related_to', columnNames: ['relatedToType', 'relatedToId'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('activities')
    if (!table) return

    // Drop index
    const idx = table.indices.find(i => i.name === 'idx_activities_related_to')
    if (idx) await queryRunner.dropIndex('activities', idx)

    // Drop new columns
    for (const col of ['content', 'priority', 'assignedBy', 'relatedToId', 'relatedToType']) {
      if (table.findColumnByName(col)) {
        await queryRunner.dropColumn('activities', col)
      }
    }

    // Re-add legacy columns
    await queryRunner.addColumns('activities', [
      new TableColumn({ name: 'customerId', type: 'varchar', length: '36', isNullable: false, comment: '客户ID' }),
      new TableColumn({ name: 'opportunityId', type: 'varchar', length: '36', isNullable: true, comment: '商机ID' }),
    ])

    // Restore foreign keys (best-effort)
    await queryRunner.createForeignKey(
      'activities',
      new TableForeignKey({
        columnNames: ['customerId'],
        referencedTableName: 'customers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createForeignKey(
      'activities',
      new TableForeignKey({
        columnNames: ['opportunityId'],
        referencedTableName: 'opportunities',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    )
  }
}


