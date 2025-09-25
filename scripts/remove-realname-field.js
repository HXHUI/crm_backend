const mysql = require('mysql2/promise');

async function removeRealNameField() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'crm_db'
  });

  try {
    console.log('开始删除realName字段...');
    
    // 检查字段是否存在
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'crm_db' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'realName'
    `);
    
    if (columns.length > 0) {
      // 删除realName字段
      await connection.execute('ALTER TABLE users DROP COLUMN realName');
      console.log('✅ realName字段删除成功');
    } else {
      console.log('ℹ️ realName字段不存在，无需删除');
    }
    
  } catch (error) {
    console.error('❌ 删除realName字段失败:', error.message);
  } finally {
    await connection.end();
  }
}

removeRealNameField();
