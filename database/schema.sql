-- Cosmic Luck Database Schema
-- Run once against an empty database

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS `announcements` (
    `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `message`     VARCHAR(500)    NOT NULL,
    `type`        ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
    `link`        VARCHAR(500)    DEFAULT NULL,
    `linkText`    VARCHAR(100)    DEFAULT NULL,
    `active`      TINYINT(1)      NOT NULL DEFAULT 1,
    `dismissible` TINYINT(1)      NOT NULL DEFAULT 0,
    `priority`    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `startsAt`    DATETIME        DEFAULT NULL,
    `expiresAt`   DATETIME        DEFAULT NULL,
    `createdBy`   BIGINT UNSIGNED DEFAULT NULL,
    `createdAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Home Slider
-- ============================================================
CREATE TABLE IF NOT EXISTS `homeSlides` (
    `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title`           VARCHAR(120) NOT NULL,
    `subtitle`        VARCHAR(180) DEFAULT NULL,
    `cta`             VARCHAR(60)  DEFAULT NULL,
    `href`            VARCHAR(500) DEFAULT NULL,
    `tag`             VARCHAR(80)  DEFAULT NULL,
    `accentColor`     VARCHAR(24)  NOT NULL DEFAULT '#1fd65f',
    `image`           VARCHAR(512) DEFAULT NULL,
    `backgroundImage` VARCHAR(512) DEFAULT NULL,
    `active`          TINYINT(1)   NOT NULL DEFAULT 1,
    `sortOrder`       INT          NOT NULL DEFAULT 0,
    `createdAt`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_homeSlides_active_sort` (`active`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `homeSlideSeedState` (
    `seedKey`  VARCHAR(64) NOT NULL,
    `seededAt` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`seedKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Core: Users
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`                    BIGINT UNSIGNED NOT NULL,
    `username`              VARCHAR(255)    NOT NULL DEFAULT '',
    `passwordHash`          VARCHAR(255)    DEFAULT NULL,
    `ip`                    VARCHAR(64)     DEFAULT NULL,
    `country`               VARCHAR(8)      DEFAULT NULL,
    `balance`               DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `heldBalance`           DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `xp`                    DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `role`                  ENUM('USER','MOD','DEV','ADMIN','OWNER','BOT') NOT NULL DEFAULT 'USER',
    `perms`                 TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `anon`                  TINYINT(1)      NOT NULL DEFAULT 0,
    `banned`                TINYINT(1)      NOT NULL DEFAULT 0,
    `tipBan`                TINYINT(1)      NOT NULL DEFAULT 0,
    `rainBan`               TINYINT(1)      NOT NULL DEFAULT 0,
    `leaderboardBan`        TINYINT(1)      NOT NULL DEFAULT 0,
    `accountLock`           TINYINT(1)      NOT NULL DEFAULT 0,
    `sponsorLock`           TINYINT(1)      NOT NULL DEFAULT 0,
    `verified`              TINYINT(1)      NOT NULL DEFAULT 0,
    `2fa`                   VARCHAR(64)     DEFAULT NULL,
    `lastLogout`            DATETIME        DEFAULT NULL,
    `mutedUntil`            DATETIME        DEFAULT NULL,
    `mentionsEnabled`       TINYINT(1)      NOT NULL DEFAULT 1,
    `affiliateCode`         VARCHAR(64)     DEFAULT NULL,
    `affiliateCodeLock`     TINYINT(1)      NOT NULL DEFAULT 0,
    `affiliateEarningsOffset` DECIMAL(20,2) NOT NULL DEFAULT 0,
    `deposited`             DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `wagered`               DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `maxPerTip`             DECIMAL(20,2)   DEFAULT NULL,
    `maxTipPerUser`         DECIMAL(20,2)   DEFAULT NULL,
    `tipAllowance`          DECIMAL(20,2)   DEFAULT NULL,
    `rainTipAllowance`      DECIMAL(20,2)   DEFAULT NULL,
    `cryptoAllowance`       DECIMAL(20,2)   DEFAULT NULL,
    `steamId`               VARCHAR(32)     DEFAULT NULL,
    `googleId`              VARCHAR(64)     DEFAULT NULL,
    `steamTradeUrl`         VARCHAR(255)    DEFAULT NULL,
    `steamApiKey`           VARCHAR(64)     DEFAULT NULL,
    `selfLockUntil`         DATETIME        DEFAULT NULL,
    `soundEnabled`          TINYINT(1)      NOT NULL DEFAULT 1,
    `visualEffects`         TINYINT(1)      NOT NULL DEFAULT 1,
    `notificationsEnabled`  TINYINT(1)      NOT NULL DEFAULT 1,
    `createdAt`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_affiliateCode` (`affiliateCode`),
    UNIQUE KEY `uq_steamId` (`steamId`),
    UNIQUE KEY `uq_googleId` (`googleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Bets (universal log)
-- ============================================================
CREATE TABLE IF NOT EXISTS `bets` (
    `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `amount`    DECIMAL(20,2)   NOT NULL,
    `winnings`  DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `edge`      DECIMAL(10,4)   NOT NULL DEFAULT 0,
    `game`      VARCHAR(32)     NOT NULL,
    `gameId`    BIGINT UNSIGNED DEFAULT NULL,
    `completed` TINYINT(1)      NOT NULL DEFAULT 0,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_bets_userId` (`userId`),
    KEY `idx_bets_completed` (`completed`),
    KEY `idx_bets_game` (`game`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS `transactions` (
    `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `amount`    DECIMAL(20,2)   NOT NULL,
    `type`      ENUM('deposit','withdraw','in','out') NOT NULL,
    `method`    VARCHAR(64)     NOT NULL,
    `methodId`  BIGINT UNSIGNED DEFAULT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_tx_userId` (`userId`),
    KEY `idx_tx_type_method` (`type`,`method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- ============================================================
-- Cases
-- ============================================================
CREATE TABLE IF NOT EXISTS `cases` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `name`          VARCHAR(255)    NOT NULL,
    `slug`          VARCHAR(128)    NOT NULL,
    `img`           VARCHAR(512)    DEFAULT NULL,
    `creatorId`     BIGINT UNSIGNED DEFAULT NULL,
    `commissionPct` DECIMAL(5,2)    NOT NULL DEFAULT 0,
    `openCount`     INT UNSIGNED    NOT NULL DEFAULT 0,
    `likeCount`     INT UNSIGNED    NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_cases_slug` (`slug`),
    KEY `idx_cases_creatorId` (`creatorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `caseVersions` (
    `id`        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `caseId`    INT UNSIGNED  NOT NULL,
    `price`     DECIMAL(20,2) NOT NULL,
    `endedAt`   DATETIME      DEFAULT NULL,
    `createdAt` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_caseVersions_caseId` (`caseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `caseItems` (
    `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `caseVersionId`  INT UNSIGNED  NOT NULL,
    `itemId`         VARCHAR(255)  DEFAULT NULL,
    `name`           VARCHAR(255)  NOT NULL,
    `img`            VARCHAR(512)  DEFAULT NULL,
    `price`          DECIMAL(20,2) NOT NULL,
    `rangeFrom`      INT UNSIGNED  NOT NULL DEFAULT 0,
    `rangeTo`        INT UNSIGNED  NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_caseItems_caseVersionId` (`caseVersionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fairRolls` (
    `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `seed`      VARCHAR(255)    NOT NULL,
    `nonce`     INT UNSIGNED    NOT NULL DEFAULT 0,
    `result`    VARCHAR(64)     DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `caseOpenings` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId`         BIGINT UNSIGNED NOT NULL,
    `caseVersionId`  INT UNSIGNED    NOT NULL,
    `caseItemId`     INT UNSIGNED    NOT NULL,
    `rollId`         BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_caseOpenings_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `caseLikes` (
    `caseId`    INT UNSIGNED    NOT NULL,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`caseId`, `userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Creator commission ledger - earnings expire 7 days after creation if unclaimed
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

-- ============================================================
-- Battles
-- ============================================================
CREATE TABLE IF NOT EXISTS `battles` (
    `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `ownerId`        BIGINT UNSIGNED NOT NULL,
    `ownerFunding`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `entryPrice`     DECIMAL(20,2) NOT NULL,
    `privKey`        VARCHAR(8)    DEFAULT NULL,
    `minLevel`       INT UNSIGNED  NOT NULL DEFAULT 0,
    `teams`          TINYINT       NOT NULL DEFAULT 2,
    `playersPerTeam` TINYINT       NOT NULL DEFAULT 1,
    `gamemode`       ENUM('standard','crazy','group') NOT NULL DEFAULT 'standard',
    `cosmicSpin`     TINYINT(1)    NOT NULL DEFAULT 0,
    `serverSeed`     VARCHAR(255)  NOT NULL DEFAULT '',
    `EOSBlock`       BIGINT UNSIGNED DEFAULT NULL,
    `clientSeed`     VARCHAR(255)  DEFAULT NULL,
    `round`          INT UNSIGNED  NOT NULL DEFAULT 0,
    `winnerTeam`     TINYINT       DEFAULT NULL,
    `createdAt`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `startedAt`      DATETIME      DEFAULT NULL,
    `endedAt`        DATETIME      DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_battles_ownerId` (`ownerId`),
    KEY `idx_battles_endedAt` (`endedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `battleRounds` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `battleId`      INT UNSIGNED NOT NULL,
    `caseVersionId` INT UNSIGNED NOT NULL,
    `round`         INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_battleRounds_battleId` (`battleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `battlePlayers` (
    `id`       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `battleId` INT UNSIGNED    NOT NULL,
    `userId`   BIGINT UNSIGNED NOT NULL,
    `slot`     TINYINT         NOT NULL DEFAULT 0,
    `team`     TINYINT         NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `idx_battlePlayers_battleId` (`battleId`),
    KEY `idx_battlePlayers_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `battleOpenings` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `battleId`      INT UNSIGNED NOT NULL,
    `caseOpeningId` BIGINT UNSIGNED NOT NULL,
    `round`         INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_battleOpenings_battleId` (`battleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Crash
-- ============================================================
CREATE TABLE IF NOT EXISTS `crash` (
    `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `serverSeed`  VARCHAR(255)  NOT NULL DEFAULT '',
    `crashPoint`  DECIMAL(10,2) DEFAULT NULL,
    `createdAt`   DATETIME      DEFAULT NULL,
    `startedAt`   DATETIME      DEFAULT NULL,
    `endedAt`     DATETIME      DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_crash_endedAt` (`endedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `crashBets` (
    `id`              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`          BIGINT UNSIGNED NOT NULL,
    `roundId`         INT UNSIGNED    NOT NULL,
    `amount`          DECIMAL(20,2)   NOT NULL,
    `autoCashoutPoint` DECIMAL(10,2)  DEFAULT NULL,
    `cashoutPoint`    DECIMAL(10,2)   DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_crashBets_roundId` (`roundId`),
    KEY `idx_crashBets_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Coinflip
-- ============================================================
CREATE TABLE IF NOT EXISTS `coinflips` (
    `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `ownerId`     BIGINT UNSIGNED NOT NULL,
    `fire`        BIGINT UNSIGNED DEFAULT NULL,
    `ice`         BIGINT UNSIGNED DEFAULT NULL,
    `amount`      DECIMAL(20,2)   NOT NULL,
    `serverSeed`  VARCHAR(255)    NOT NULL DEFAULT '',
    `EOSBlock`    BIGINT UNSIGNED DEFAULT NULL,
    `clientSeed`  VARCHAR(255)    DEFAULT NULL,
    `winnerSide`  ENUM('fire','ice') DEFAULT NULL,
    `startedAt`   DATETIME        DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_coinflips_ownerId` (`ownerId`),
    KEY `idx_coinflips_startedAt` (`startedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Roulette
-- ============================================================
CREATE TABLE IF NOT EXISTS `roulette` (
    `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `result`    TINYINT      DEFAULT NULL,
    `color`     TINYINT      DEFAULT NULL,
    `createdAt` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `rolledAt`  DATETIME     DEFAULT NULL,
    `endedAt`   DATETIME     DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_roulette_endedAt` (`endedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rouletteBets` (
    `id`       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`   BIGINT UNSIGNED NOT NULL,
    `roundId`  INT UNSIGNED    NOT NULL,
    `color`    TINYINT         NOT NULL,
    `amount`   DECIMAL(20,2)   NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_rouletteBets_roundId` (`roundId`),
    KEY `idx_rouletteBets_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Provably Fair (Mines / Blackjack shared seeds)
-- ============================================================
CREATE TABLE IF NOT EXISTS `serverSeeds` (
    `id`       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`   BIGINT UNSIGNED NOT NULL,
    `seed`     VARCHAR(255)    NOT NULL,
    `nonce`    INT UNSIGNED    NOT NULL DEFAULT 0,
    `endedAt`  DATETIME        DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_serverSeeds_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `clientSeeds` (
    `id`       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`   BIGINT UNSIGNED NOT NULL,
    `seed`     VARCHAR(255)    NOT NULL,
    `endedAt`  DATETIME        DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_clientSeeds_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Mines
-- ============================================================
CREATE TABLE IF NOT EXISTS `mines` (
    `id`             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`         BIGINT UNSIGNED NOT NULL,
    `amount`         DECIMAL(20,2)   NOT NULL,
    `clientSeedId`   INT UNSIGNED    NOT NULL,
    `serverSeedId`   INT UNSIGNED    NOT NULL,
    `nonce`          INT UNSIGNED    NOT NULL DEFAULT 0,
    `minesCount`     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `mines`          TEXT            DEFAULT NULL,
    `revealedTiles`  TEXT            DEFAULT NULL,
    `payout`         DECIMAL(20,2)   DEFAULT NULL,
    `endedAt`        DATETIME        DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_mines_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Blackjack
-- ============================================================
CREATE TABLE IF NOT EXISTS `blackjack` (
    `id`           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`       BIGINT UNSIGNED NOT NULL,
    `amount`       DECIMAL(20,2)   NOT NULL,
    `clientSeedId` INT UNSIGNED    NOT NULL,
    `serverSeedId` INT UNSIGNED    NOT NULL,
    `nonce`        INT UNSIGNED    NOT NULL DEFAULT 0,
    `actions`      TEXT            DEFAULT NULL,
    `payout`       DECIMAL(20,2)   DEFAULT NULL,
    `endedAt`      DATETIME        DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_blackjack_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Slots
-- ============================================================
CREATE TABLE IF NOT EXISTS `slots` (
    `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`             VARCHAR(255) NOT NULL,
    `slug`             VARCHAR(128) NOT NULL,
    `img`              VARCHAR(512) DEFAULT NULL,
    `provider`         VARCHAR(64)  DEFAULT NULL,
    `rtp`              DECIMAL(5,2) DEFAULT NULL,
    `version`          VARCHAR(64)  DEFAULT NULL,
    `versionUpdatedAt` DATETIME     DEFAULT NULL,
    `providerGameId`   VARCHAR(128) DEFAULT NULL,
    `enabled`          TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_slots_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Rain
-- ============================================================
CREATE TABLE IF NOT EXISTS `rains` (
    `id`        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `amount`    DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `host`      BIGINT UNSIGNED DEFAULT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `endedAt`   DATETIME        DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_rains_endedAt` (`endedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rainUsers` (
    `id`        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `rainId`    INT UNSIGNED    NOT NULL,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `amount`    DECIMAL(20,2)   DEFAULT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_rainUsers_rainId` (`rainId`),
    KEY `idx_rainUsers_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rainTips` (
    `id`        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `rainId`    INT UNSIGNED    NOT NULL,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `amount`    DECIMAL(20,2)   NOT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_rainTips_rainId` (`rainId`),
    KEY `idx_rainTips_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Chat
-- ============================================================
CREATE TABLE IF NOT EXISTS `chatMessages` (
    `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type`      ENUM('user','system','rain-tip','rain-end','clear') NOT NULL DEFAULT 'user',
    `senderId`  BIGINT UNSIGNED DEFAULT NULL,
    `content`   TEXT            DEFAULT NULL,
    `channelId` VARCHAR(8)      DEFAULT NULL,
    `replyTo`   BIGINT UNSIGNED DEFAULT NULL,
    `deletedAt` DATETIME        DEFAULT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_chatMessages_senderId` (`senderId`),
    KEY `idx_chatMessages_channelId` (`channelId`),
    KEY `idx_chatMessages_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Admin / Config
-- ============================================================
CREATE TABLE IF NOT EXISTS `bannedPhrases` (
    `id`        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `phrase`    VARCHAR(512)    NOT NULL,
    `addedBy`   BIGINT UNSIGNED DEFAULT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `features` (
    `id`      VARCHAR(64) NOT NULL,
    `enabled` TINYINT(1)  NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed all feature flags enabled by default
INSERT IGNORE INTO `features` (`id`, `enabled`) VALUES
    ('battles', 1),
    ('coinflip', 1),
    ('crash', 1),
    ('roulette', 1),
    ('mines', 1),
    ('blackjack', 1),
    ('slots', 1),
    ('chat', 1),
    ('rain', 1),
    ('leaderboard', 1),
    ('rakeback', 1),
    ('promoCodes', 1),
    ('affiliates', 1),
    ('surveys', 1),
    ('cryptoDeposits', 1),
    ('cryptoWithdrawals', 1),
    ('skindeck', 1),
    ('rainCaptcha', 1),
    ('rainDailyDepositRequirement', 1);

-- ============================================================
-- Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS `notifications` (
    `id`        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `type`      VARCHAR(64)     NOT NULL,
    `content`   TEXT            DEFAULT NULL,
    `seen`      TINYINT(1)      NOT NULL DEFAULT 0,
    `deleted`   TINYINT(1)      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_notifications_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Crypto
-- ============================================================
CREATE TABLE IF NOT EXISTS `cryptos` (
    `id`          VARCHAR(32)   NOT NULL,
    `name`        VARCHAR(128)  NOT NULL,
    `coingeckoId` VARCHAR(128)  NOT NULL,
    `price`       DECIMAL(20,8) NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed supported crypto pairs
INSERT IGNORE INTO `cryptos` (`id`, `name`, `coingeckoId`, `price`) VALUES
    ('BTC',         'Bitcoin',        'bitcoin',          0),
    ('ETH',         'Ethereum',       'ethereum',         0),
    ('LTC',         'Litecoin',       'litecoin',         0),
    ('USDT.ERC20',  'Tether (ERC20)', 'tether',           0),
    ('USDC',        'USD Coin',       'usd-coin',         0),
    ('BNB.BSC',     'BNB (BEP20)',    'binancecoin',      0),
    ('BUSD.BEP20',  'BUSD (BEP20)',   'binance-usd',      0),
    ('DOGE',        'Dogecoin',       'dogecoin',         0);

CREATE TABLE IF NOT EXISTS `cryptoWallets` (
    `id`       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`   BIGINT UNSIGNED NOT NULL,
    `currency` VARCHAR(32)     NOT NULL,
    `address`  VARCHAR(512)    NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_cryptoWallets_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cryptoDeposits` (
    `id`           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`       BIGINT UNSIGNED NOT NULL,
    `currency`     VARCHAR(32)     NOT NULL,
    `cryptoAmount` DECIMAL(20,8)   NOT NULL DEFAULT 0,
    `fiatAmount`   DECIMAL(20,8)   NOT NULL DEFAULT 0,
    `coinAmount`   INT UNSIGNED    NOT NULL DEFAULT 0,
    `txId`         VARCHAR(255)    DEFAULT NULL,
    `status`       ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
    `createdAt`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modifiedAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_cryptoDeposits_userId` (`userId`),
    KEY `idx_cryptoDeposits_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cryptoWithdraws` (
    `id`           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`       BIGINT UNSIGNED NOT NULL,
    `coinAmount`   DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `fiatAmount`   DECIMAL(20,8)   NOT NULL DEFAULT 0,
    `cryptoAmount` DECIMAL(20,8)   NOT NULL DEFAULT 0,
    `address`      VARCHAR(512)    NOT NULL DEFAULT '',
    `currency`     VARCHAR(32)     NOT NULL DEFAULT '',
    `chain`        VARCHAR(64)     DEFAULT NULL,
    `exchangeId`   VARCHAR(255)    DEFAULT NULL,
    `txId`         VARCHAR(255)    DEFAULT NULL,
    `status`       ENUM('pending','sending','sent','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
    `createdAt`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modifiedAt`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_cryptoWithdraws_userId` (`userId`),
    KEY `idx_cryptoWithdraws_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cardDeposits` (
    `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`     BIGINT UNSIGNED NOT NULL,
    `fiatAmount` DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `completed`  TINYINT(1)      NOT NULL DEFAULT 0,
    `modifiedAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_cardDeposits_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Gift Cards
-- ============================================================
CREATE TABLE IF NOT EXISTS `giftCards` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code`       VARCHAR(32)  NOT NULL,
    `amount`     INT UNSIGNED NOT NULL DEFAULT 0,
    `usd`        TINYINT(1)   NOT NULL DEFAULT 0,
    `redeemedAt` DATETIME     DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_giftCards_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Affiliates
-- ============================================================
CREATE TABLE IF NOT EXISTS `affiliates` (
    `id`               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`           BIGINT UNSIGNED NOT NULL,
    `affiliateId`      BIGINT UNSIGNED NOT NULL,
    `affiliateReward`  DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `ip`               VARCHAR(64)     DEFAULT NULL,
    `createdAt`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_affiliates_userId` (`userId`),
    KEY `idx_affiliates_affiliateId` (`affiliateId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `affiliateClaims` (
    `id`        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `amount`    DECIMAL(20,2)   NOT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_affiliateClaims_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Promo Codes
-- ============================================================
CREATE TABLE IF NOT EXISTS `promoCodes` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code`        VARCHAR(64)  NOT NULL,
    `amount`      DECIMAL(20,2) NOT NULL DEFAULT 0,
    `totalUses`   INT UNSIGNED DEFAULT NULL,
    `currentUses` INT UNSIGNED NOT NULL DEFAULT 0,
    `minLvl`      INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_promoCodes_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `promoCodeUses` (
    `id`           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`       BIGINT UNSIGNED NOT NULL,
    `promoCodeId`  INT UNSIGNED    NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_promoCodeUses_userId` (`userId`),
    KEY `idx_promoCodeUses_promoCodeId` (`promoCodeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Leaderboards
-- ============================================================
CREATE TABLE IF NOT EXISTS `leaderboards` (
    `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type`      ENUM('daily','weekly') NOT NULL,
    `createdAt` DATE         NOT NULL,
    `endedAt`   DATE         DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_leaderboards_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `leaderboardUsers` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `leaderboardId` INT UNSIGNED    NOT NULL,
    `userId`        BIGINT UNSIGNED NOT NULL,
    `position`      TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `totalWagered`  DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `amountWon`     DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `createdAt`     DATE            NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_leaderboardUsers_leaderboardId` (`leaderboardId`),
    KEY `idx_leaderboardUsers_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Surveys
-- ============================================================
CREATE TABLE IF NOT EXISTS `surveys` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`        BIGINT UNSIGNED NOT NULL,
    `provider`      VARCHAR(32)     NOT NULL,
    `coins`         DECIMAL(20,2)   NOT NULL DEFAULT 0,
    `revenue`       DECIMAL(20,8)   NOT NULL DEFAULT 0,
    `createdAt`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `chargedbackAt` DATETIME        DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_surveys_userId` (`userId`),
    KEY `idx_surveys_provider` (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Rakeback
-- ============================================================
CREATE TABLE IF NOT EXISTS `rakebackClaims` (
    `id`        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `userId`    BIGINT UNSIGNED NOT NULL,
    `type`      ENUM('instant','daily','weekly','monthly') NOT NULL,
    `amount`    DECIMAL(20,2)   NOT NULL,
    `createdAt` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_rakebackClaims_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Discord / Earn
-- ============================================================
CREATE TABLE IF NOT EXISTS `discordAuths` (
    `id`     VARCHAR(32)     NOT NULL,
    `userId` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_discordAuths_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `earnUsers` (
    `id`        VARCHAR(32)  NOT NULL,
    `unclaimed` DECIMAL(20,2) NOT NULL DEFAULT 0,
    `elegible`  TINYINT(1)   NOT NULL DEFAULT 0,
    `farming`   TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `earnClaims` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `earnUserId`  VARCHAR(32)  NOT NULL,
    `amount`      DECIMAL(20,2) NOT NULL,
    `createdAt`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_earnClaims_earnUserId` (`earnUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `earnPayouts` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `amount`     DECIMAL(20,2) NOT NULL,
    `usersCount` INT UNSIGNED  NOT NULL DEFAULT 0,
    `createdAt`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `earnPayoutUsers` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `earnPayoutId` INT UNSIGNED NOT NULL,
    `earnUserId`   VARCHAR(32)  NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_earnPayoutUsers_payoutId` (`earnPayoutId`),
    KEY `idx_earnPayoutUsers_earnUserId` (`earnUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Profile Rewards
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

CREATE TABLE IF NOT EXISTS `settings` (
    `id`        VARCHAR(64) NOT NULL,
    `value`     TEXT        NOT NULL,
    `updatedAt` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Game Settings (dynamic house edge / config per game)
-- ============================================================
CREATE TABLE IF NOT EXISTS `gameSettings` (
    `id`        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `game`      VARCHAR(32)   NOT NULL,
    `key`       VARCHAR(64)   NOT NULL,
    `value`     TEXT          NOT NULL,
    `type`      ENUM('number','string','boolean','json') NOT NULL DEFAULT 'number',
    `label`     VARCHAR(128)  DEFAULT NULL,
    `description` VARCHAR(512) DEFAULT NULL,
    `min`       DECIMAL(20,8) DEFAULT NULL,
    `max`       DECIMAL(20,8) DEFAULT NULL,
    `step`      DECIMAL(20,8) DEFAULT NULL,
    `updatedAt` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_gameSettings_game_key` (`game`, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `gameSettings` (`game`, `key`, `value`, `type`, `label`, `description`, `min`, `max`, `step`) VALUES
('crash',   'houseEdge',          '4',   'number', 'House Edge (%)',   'The house edge percentage for Crash',  '0', '20', '0.5'),
('crash',   'betTime',            '10000','number','Bet Time (ms)',    'Time players have to place bets',      '1000', '60000', '500'),
('crash',   'tickRate',           '150',  'number','Tick Rate (ms)',   'Game tick interval in milliseconds',   '50', '1000', '10'),
('crash',   'maxProfit',          '1000000','number','Max Profit',     'Maximum profit per bet',               '1000', '10000000', '1000'),
('crash',   'maxPayout',          '50000','number','Max Payout',       'Maximum payout per bet',               '1000', '10000000', '1000'),
('crash',   'minBet',             '0.1',  'number','Min Bet',          'Minimum bet amount',                   '0.01', '1000', '0.01'),
('crash',   'maxBet',             '25000','number','Max Bet',          'Maximum bet amount',                   '100', '1000000', '100'),
('crash',   'bonusPotRake',       '1',    'number','Bonus Pot Rake (%)','Percent of each bet feeding the bonus pot', '0', '10', '0.1'),
('mines',   'houseEdge',          '7.5',  'number','House Edge (%)',   'The house edge percentage for Mines',  '0', '20', '0.5'),
('mines',   'totalTiles',         '25',   'number','Total Tiles',      'Total grid tiles',                     '5', '50', '1'),
('roulette','houseEdge',          '5',    'number','House Edge (%)',   'The house edge percentage for Roulette','0', '20', '0.5'),
('roulette','betTime',            '10000','number','Bet Time (ms)',    'Time players have to place bets',      '1000', '60000', '500'),
('roulette','rollTime',           '5000', 'number','Roll Time (ms)',   'Animation time for the roll',          '1000', '15000', '500'),
('roulette','maxBet',             '25000','number','Max Bet',          'Maximum bet amount',                   '100', '1000000', '100'),
('roulette','colorsMultipliers',  '{"0":14,"1":2,"2":2,"3":7}', 'json','Color Multipliers','Payout multipliers per color', NULL, NULL, NULL),
('coinflip','houseEdge',          '5',    'number','House Edge (%)',   'The house edge percentage for Coinflip','0', '20', '0.5'),
('blackjack','houseEdge',         '2.5',  'number','House Edge (%)',   'The house edge percentage for Blackjack','0', '20', '0.5'),
('cases',   'commissionPct',      '0',    'number','Commission (%)',   'Default commission for case creators',  '0', '100', '1'),
('cases',   'topDropPrice',       '25000','number','Top Drop Price',   'Minimum item price for top drops',      '1000', '1000000', '1000'),
('battles', 'houseEdge',          '10',   'number','House Edge (%)',   'The house edge percentage for Battles', '0', '20', '0.5');

-- Provably fair server seed column for roulette
SET @rouletteExists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'roulette' AND column_name = 'serverSeed');
SET @rouletteSql = IF(@rouletteExists = 0, 'ALTER TABLE `roulette` ADD COLUMN `serverSeed` VARCHAR(255) DEFAULT NULL AFTER `color`', 'SELECT 1');
PREPARE rouletteStmt FROM @rouletteSql;
EXECUTE rouletteStmt;
DEALLOCATE PREPARE rouletteStmt;

SET FOREIGN_KEY_CHECKS = 1;
