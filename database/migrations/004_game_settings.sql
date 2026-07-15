-- ============================================================
-- Migration: Game Settings & Configuration
-- Creates a table for dynamic per-game configuration
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

-- Seed default game settings
INSERT IGNORE INTO `gameSettings` (`game`, `key`, `value`, `type`, `label`, `description`, `min`, `max`, `step`) VALUES
-- Crash
('crash',   'houseEdge',          '4',   'number', 'House Edge (%)',   'The house edge percentage for Crash',  '0', '20', '0.5'),
('crash',   'betTime',            '10000','number','Bet Time (ms)',    'Time players have to place bets',      '1000', '60000', '500'),
('crash',   'tickRate',           '150',  'number','Tick Rate (ms)',   'Game tick interval in milliseconds',   '50', '1000', '10'),
('crash',   'maxProfit',          '1000000','number','Max Profit',     'Maximum profit per bet',               '1000', '10000000', '1000'),
-- Mines
('mines',   'houseEdge',          '7.5',  'number','House Edge (%)',   'The house edge percentage for Mines',  '0', '20', '0.5'),
('mines',   'totalTiles',         '25',   'number','Total Tiles',      'Total grid tiles',                     '5', '50', '1'),
-- Roulette
('roulette','houseEdge',          '5',    'number','House Edge (%)',   'The house edge percentage for Roulette','0', '20', '0.5'),
('roulette','betTime',            '10000','number','Bet Time (ms)',    'Time players have to place bets',      '1000', '60000', '500'),
('roulette','rollTime',           '5000', 'number','Roll Time (ms)',   'Animation time for the roll',          '1000', '15000', '500'),
('roulette','maxBet',             '25000','number','Max Bet',          'Maximum bet amount',                   '100', '1000000', '100'),
('roulette','colorsMultipliers',  '{"0":14,"1":2,"2":2,"3":7}', 'json','Color Multipliers','Payout multipliers per color', NULL, NULL, NULL),
-- Coinflip
('coinflip','houseEdge',          '5',    'number','House Edge (%)',   'The house edge percentage for Coinflip','0', '20', '0.5'),
-- Jackpot
('jackpot', 'houseEdge',          '5',    'number','House Edge (%)',   'The house edge percentage for Jackpot', '0', '20', '0.5'),
('jackpot', 'betTime',            '30000','number','Bet Time (ms)',    'Time before round auto-rolls',          '5000', '120000', '1000'),
('jackpot', 'minPlayers',         '2',    'number','Min Players',      'Minimum players to start a round',      '1', '10', '1'),
('jackpot', 'minBet',             '1',    'number','Min Bet',          'Minimum bet amount',                    '0.1', '1000', '0.1'),
('jackpot', 'maxBet',             '20000','number','Max Bet',          'Maximum bet amount',                    '100', '1000000', '100'),
-- Blackjack
('blackjack','houseEdge',         '2.5',  'number','House Edge (%)',   'The house edge percentage for Blackjack','0', '20', '0.5'),
-- Cases (commission)
('cases',   'commissionPct',      '0',    'number','Commission (%)',   'Default commission for case creators',  '0', '100', '1'),
('cases',   'topDropPrice',       '25000','number','Top Drop Price',   'Minimum item price for top drops',      '1000', '1000000', '1000');