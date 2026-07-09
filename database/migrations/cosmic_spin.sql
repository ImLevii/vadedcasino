-- Migration: Cosmic Spin
-- Date: 2026-07-08
-- Description: Cosmic Spin mode for case battles - rare items are masked as the Cosmic logo
--              during the roll, followed by an exclusive second spin of rare items only.
--              Battles with Cosmic Spin enabled use an extended round time (12s vs 6.5s).

ALTER TABLE battles ADD COLUMN IF NOT EXISTS `cosmicSpin` TINYINT(1) NOT NULL DEFAULT 0;
