-- 为客户表添加扩展字段列
-- Migration: Add custom_fields column to customers table
-- Date: 2025-12-14
-- Description: 在customers表中添加custom_fields JSON列，用于存储扩展字段值

ALTER TABLE `customers` 
ADD COLUMN `custom_fields` JSON NULL COMMENT '扩展字段值（JSON格式，key为field_code，value为字段值）' 
AFTER `address_detail`;

