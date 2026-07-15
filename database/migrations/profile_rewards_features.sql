-- Migration: Profile Rewards & Security Features
-- Date: 2026-07-08
-- Description: Add daily free cases, deposit-unlocked cases, supercharge bonus, user security (2FA, Steam, self-lockdown), and settings

-- ============================================================
-- 1. ALTER users table - add security & settings columns
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS `steamTradeUrl` VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `steamApiKey` VARCHAR(64) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `selfLockUntil` DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `soundEnabled` TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `visualEffects` TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `notificationsEnabled` TINYINT(1) NOT NULL DEFAULT 1;

-- ============================================================
-- 2. CREATE dailyCaseClaims table - free level-based cases
-- ============================================================

CREATE TABLE IF NOT EXISTS `dailyCaseClaims` (
    `id`        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `level`     TINYINT UNSIGNED NOT NULL,
    `amount`    DECIMAL(20,2)   NOT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_dailyCaseClaims_userId_createdAt` (`userId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. CREATE depositCases table - deposit-unlocked cases with 1x WR
-- ============================================================

CREATE TABLE IF NOT EXISTS `depositCases` (
    `id`               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`           BIGINT UNSIGNED NOT NULL,
    `depositAmount`    DECIMAL(20,2)   NOT NULL,
    `casesTotal`       INT UNSIGNED    NOT NULL DEFAULT 5,
    `casesOpened`      INT UNSIGNED    NOT NULL DEFAULT 0,
    `wagerRequired`    DECIMAL(20,2)   NOT NULL,
    `wagerProgress`    DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `active`           TINYINT(1)      NOT NULL DEFAULT 1,
    `expiresAt`        DATETIME        DEFAULT NULL,
    `createdAt`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_depositCases_userId_active` (`userId`, `active`),
    KEY `idx_depositCases_expiresAt` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. CREATE supercharges table - deposit bonus tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS `supercharges` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`        BIGINT UNSIGNED NOT NULL,
    `depositAmount` DECIMAL(20,2)   NOT NULL,
    `bonusAmount`   DECIMAL(20,2)   NOT NULL,
    `active`        TINYINT(1)      NOT NULL DEFAULT 1,
    `claimedAt`     DATETIME        DEFAULT NULL,
    `expiresAt`     DATETIME        DEFAULT NULL,
    `createdAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_supercharges_userId_active` (`userId`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. Align pre-existing tables (older shape) with current schema
-- ============================================================

ALTER TABLE depositCases ADD COLUMN IF NOT EXISTS `wagerProgress` DECIMAL(20,2) NOT NULL DEFAULT 0 AFTER `wagerRequired`;
ALTER TABLE depositCases ADD COLUMN IF NOT EXISTS `active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `wagerProgress`;

ALTER TABLE supercharges ADD COLUMN IF NOT EXISTS `bonusAmount` DECIMAL(20,2) NOT NULL DEFAULT 0 AFTER `depositAmount`;
ALTER TABLE supercharges ADD COLUMN IF NOT EXISTS `active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `bonusAmount`;
ALTER TABLE supercharges ADD COLUMN IF NOT EXISTS `claimedAt` DATETIME DEFAULT NULL AFTER `active`;
ALTER TABLE supercharges MODIFY COLUMN `expiresAt` DATETIME DEFAULT NULL;

-- ============================================================
-- 6. Settings key-value store (rewards configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS `settings` (
    `id`        VARCHAR(64) NOT NULL,
    `value`     TEXT        NOT NULL,
    `updatedAt` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migration complete
SELECT 'Profile Rewards & Security Features migration completed successfully' AS status;
