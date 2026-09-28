CREATE TABLE IF NOT EXISTS `cryptoDepositReceipts` (
    `providerId` VARCHAR(128) NOT NULL,
    `walletId` BIGINT NOT NULL,
    `depositId` BIGINT DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`providerId`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `cryptoWalletMetadata` (
    `walletId` BIGINT NOT NULL,
    `destinationTag` VARCHAR(128) DEFAULT NULL,
    PRIMARY KEY (`walletId`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `cashierAudit` (
    `requestId` VARCHAR(64) NOT NULL,
    `adminId` BIGINT NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `targetId` BIGINT NOT NULL DEFAULT 0,
    `fingerprint` VARCHAR(64) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `result` TEXT DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`requestId`)
) ENGINE=InnoDB;
