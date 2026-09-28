CREATE TABLE IF NOT EXISTS `gameOperationControls` (
    `game` VARCHAR(32) NOT NULL,
    `gameId` BIGINT NOT NULL DEFAULT 0,
    `revision` BIGINT NOT NULL DEFAULT 0,
    `pausedAt` DATETIME DEFAULT NULL,
    `locked` TINYINT NOT NULL DEFAULT 0,
    `cancelledAt` DATETIME DEFAULT NULL,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`game`, `gameId`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `gameOperationAudit` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `requestId` VARCHAR(64) NOT NULL,
    `adminId` BIGINT NOT NULL,
    `game` VARCHAR(32) NOT NULL,
    `gameId` BIGINT NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `stateBefore` TEXT DEFAULT NULL,
    `stateAfter` TEXT DEFAULT NULL,
    `parameters` TEXT DEFAULT NULL,
    `success` TINYINT NOT NULL DEFAULT 0,
    `errorCode` VARCHAR(80) DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_gameOperationAudit_requestId` (`requestId`),
    KEY `idx_gameOperationAudit_game` (`game`, `gameId`, `id`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `gameRoundRules` (
    `game` VARCHAR(32) NOT NULL,
    `gameId` BIGINT NOT NULL,
    `config` TEXT NOT NULL,
    PRIMARY KEY (`game`, `gameId`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `gameOperationHealth` (
    `game` VARCHAR(32) NOT NULL,
    `nodeId` VARCHAR(64) NOT NULL,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `errorCode` VARCHAR(80) DEFAULT NULL,
    `failedAt` DATETIME DEFAULT NULL,
    PRIMARY KEY (`game`)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `gameOperationPresence` (
    `socketId` VARCHAR(128) NOT NULL,
    `userId` BIGINT DEFAULT NULL,
    `nodeId` VARCHAR(64) NOT NULL,
    `lastSeen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`socketId`),
    KEY `idx_gameOperationPresence_lastSeen` (`lastSeen`)
) ENGINE=InnoDB;
