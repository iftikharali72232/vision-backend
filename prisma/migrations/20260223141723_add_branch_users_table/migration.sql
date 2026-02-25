-- CreateTable
CREATE TABLE `branch_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_id` INTEGER NOT NULL,
    `system_user_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `avatar` VARCHAR(500) NULL,
    `pin` VARCHAR(10) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `branch_users_branch_id_system_user_id_key`(`branch_id`, `system_user_id`),
    UNIQUE INDEX `branch_users_branch_id_email_key`(`branch_id`, `email`),
    INDEX `branch_users_branch_id_idx`(`branch_id`),
    INDEX `branch_users_system_user_id_idx`(`system_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Make user_id nullable in orders, held_orders, and inventory_movements
-- so master users (who have no branchUser record) can create orders/holds
-- without causing a NOT NULL constraint violation.

-- Drop FK constraints first (MySQL requires this to modify columns)
ALTER TABLE `orders` DROP FOREIGN KEY `orders_user_id_fkey`;
ALTER TABLE `held_orders` DROP FOREIGN KEY `held_orders_user_id_fkey`;
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_user_id_fkey`;

-- Alter columns to be nullable
ALTER TABLE `orders` MODIFY `user_id` INTEGER NULL;
ALTER TABLE `held_orders` MODIFY `user_id` INTEGER NULL;
ALTER TABLE `inventory_movements` MODIFY `user_id` INTEGER NULL;