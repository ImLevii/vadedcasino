-- Migration: Counter-Strike case catalog support
-- Allows case item IDs to use stable string identifiers derived from Steam market_hash_name.

ALTER TABLE caseItems MODIFY COLUMN itemId VARCHAR(255) NULL;

SELECT 'CSGO case item ID migration completed successfully' AS status;