-- Migration: SkinDeck payment rail
-- Description: Add held balances and an idempotent provider payment ledger

ALTER TABLE users ADD COLUMN IF NOT EXISTS `heldBalance` DECIMAL(20,2) NOT NULL DEFAULT 0 AFTER `balance`;

CREATE TABLE IF NOT EXISTS `paymentTransactions` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `internalRef`    VARCHAR(36)     NOT NULL,
    `userId`         BIGINT UNSIGNED NOT NULL,
    `type`           ENUM('deposit','withdrawal') NOT NULL,
    `provider`       VARCHAR(32)     NOT NULL DEFAULT 'skindeck',
    `providerRef`    VARCHAR(255)    DEFAULT NULL,
    `status`         VARCHAR(64)     NOT NULL DEFAULT 'initiating',
    `providerStatus` VARCHAR(64)     DEFAULT NULL,
    `skinItems`      JSON            DEFAULT NULL,
    `value`          DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `providerValue`  DECIMAL(20,8)   DEFAULT NULL,
    `providerCurrency` VARCHAR(16)   DEFAULT NULL,
    `lastError`      VARCHAR(512)    DEFAULT NULL,
    `finalizedAt`    DATETIME        DEFAULT NULL,
    `createdAt`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_paymentTransactions_internalRef` (`internalRef`),
    UNIQUE KEY `uq_paymentTransactions_providerRef` (`providerRef`),
    KEY `idx_paymentTransactions_user_created` (`userId`, `createdAt`),
    KEY `idx_paymentTransactions_provider_status` (`provider`, `status`, `updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `features` (`id`, `enabled`) VALUES ('skindeck', 1);
-- Ensure the feature is enabled on existing deployments (idempotent).
UPDATE `features` SET `enabled` = 1 WHERE `id` = 'skindeck';
