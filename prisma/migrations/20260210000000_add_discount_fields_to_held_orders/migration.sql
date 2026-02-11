-- Add order-level discount fields to held_orders
ALTER TABLE `held_orders`
  ADD COLUMN `discount_type` ENUM('fixed','percentage') NULL AFTER `subtotal`,
  ADD COLUMN `discount_value` DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER `discount_type`;
