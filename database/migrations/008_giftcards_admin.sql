-- Migration: Add redeemedBy column to giftCards for admin management
ALTER TABLE `giftCards` 
  ADD COLUMN `redeemedBy` BIGINT UNSIGNED DEFAULT NULL AFTER `redeemedAt`,
  ADD COLUMN `notes` VARCHAR(500) DEFAULT NULL AFTER `redeemedBy`,
  ADD INDEX `idx_giftCards_redeemedAt` (`redeemedAt`);

-- Default admin can see unredeemed cards first