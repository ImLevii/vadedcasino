-- Migration: Community Cases
-- Date: 2026-07-08
-- Description: Player-created cases with creator commission, likes, and a 7-day earnings claim window

-- ============================================================
-- 1. ALTER cases table - creator ownership + counters
-- ============================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS `creatorId` BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS `commissionPct` DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS `openCount` INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS `likeCount` INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE cases ADD INDEX IF NOT EXISTS `idx_cases_creatorId` (`creatorId`);

-- ============================================================
-- 2. CREATE caseLikes table - one like per user per case
-- ============================================================

CREATE TABLE IF NOT EXISTS `caseLikes` (
    `caseId`    INT UNSIGNED    NOT NULL,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`caseId`, `userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. CREATE communityCaseEarnings table - commission ledger
--    Earnings expire 7 days after creation if unclaimed
-- ============================================================

CREATE TABLE IF NOT EXISTS `communityCaseEarnings` (
    `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `caseId`    INT UNSIGNED    NOT NULL,
    `creatorId` BIGINT UNSIGNED NOT NULL,
    `amount`    DECIMAL(20,2)   NOT NULL,
    `claimedAt` DATETIME        DEFAULT NULL,
    `expiresAt` DATETIME        NOT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_communityCaseEarnings_creator` (`creatorId`, `claimedAt`, `expiresAt`),
    KEY `idx_communityCaseEarnings_caseId` (`caseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
