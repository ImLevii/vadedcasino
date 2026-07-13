-- Migration 006: Remove Jackpot game, prepare Crash rebuild
-- DESTRUCTIVE: drops jackpot tables and removes jackpot config rows.
-- Back up the database before running.

-- Remove jackpot feature flag and settings
DELETE FROM `features` WHERE `id` = 'jackpot';
DELETE FROM `gameSettings` WHERE `game` = 'jackpot';

-- Drop jackpot tables
DROP TABLE IF EXISTS `jackpotBets`;
DROP TABLE IF EXISTS `jackpot`;

-- New crash settings (idempotent)
INSERT IGNORE INTO `gameSettings` (`game`, `key`, `value`, `type`, `label`, `description`, `min`, `max`, `step`) VALUES
('crash', 'maxPayout',    '50000', 'number', 'Max Payout',          'Maximum payout per bet',                    '1000', '10000000', '1000'),
('crash', 'minBet',       '0.1',   'number', 'Min Bet',             'Minimum bet amount',                        '0.01', '1000',     '0.01'),
('crash', 'maxBet',       '25000', 'number', 'Max Bet',             'Maximum bet amount',                        '100',  '1000000',  '100'),
('crash', 'bonusPotRake', '1',     'number', 'Bonus Pot Rake (%)',  'Percent of each bet feeding the bonus pot', '0',    '10',       '0.1');

-- Persistent crash bonus pot value
INSERT IGNORE INTO `settings` (`id`, `value`) VALUES ('crashBonusPot', '0');
