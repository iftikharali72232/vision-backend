-- AlterTable
ALTER TABLE `products` ADD COLUMN `unit` ENUM('pieces', 'kg', 'gram', 'liters', 'ml', 'box', 'pack') NOT NULL DEFAULT 'pieces';
