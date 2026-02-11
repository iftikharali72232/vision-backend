/*
  Warnings:

  - A unique constraint covering the columns `[held_order_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `held_orders` ADD COLUMN `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `orders_held_order_id_key` ON `orders`(`held_order_id`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_held_order_id_fkey` FOREIGN KEY (`held_order_id`) REFERENCES `held_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
