-- Add serverSeed column to roulette table for provably fair generation
ALTER TABLE `roulette` ADD COLUMN IF NOT EXISTS `serverSeed` VARCHAR(255) DEFAULT NULL AFTER `color`;