-- 重建 member_departments 表
USE crm_db;

-- 删除表（这会自动删除所有约束和索引）
DROP TABLE IF EXISTS member_departments;

-- 重新创建表
CREATE TABLE member_departments (
    memberId VARCHAR(36) NOT NULL,
    departmentId VARCHAR(36) NOT NULL,
    PRIMARY KEY (memberId, departmentId),
    INDEX IDX_member_departments_member (memberId),
    INDEX IDX_member_departments_department (departmentId),
    CONSTRAINT FK_member_departments_member 
        FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT FK_member_departments_department 
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
