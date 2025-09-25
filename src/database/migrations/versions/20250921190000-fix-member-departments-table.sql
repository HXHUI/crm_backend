ALTER TABLE `member_departments` DROP PRIMARY KEY;
ALTER TABLE `member_departments` DROP COLUMN `id`;
ALTER TABLE `member_departments` ADD PRIMARY KEY (`memberId`, `departmentId`);
