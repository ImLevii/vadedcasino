-- Migration: Rebrand from Robux to Coins
-- Date: 2026-06-12
-- Description: Rename robuxAmount to coinAmount, remove Roblox-specific tables

-- 1. Rename columns in cryptoDeposits
ALTER TABLE cryptoDeposits CHANGE COLUMN robuxAmount coinAmount DECIMAL(15,2) NOT NULL;

-- 2. Rename columns in cryptoWithdraws  
ALTER TABLE cryptoWithdraws CHANGE COLUMN robuxAmount coinAmount DECIMAL(15,2) NOT NULL;

-- 3. Rename columns in surveys
ALTER TABLE surveys CHANGE COLUMN robux coins DECIMAL(15,2) NOT NULL;

-- 4. Rename columns in caseItems
ALTER TABLE caseItems CHANGE COLUMN robloxId itemId VARCHAR(255) NOT NULL;

-- 5. Remove Roblox-specific column from users (if exists)
ALTER TABLE users DROP COLUMN IF EXISTS robloxCookie;

-- 6. Drop Roblox trading tables (if exist)
DROP TABLE IF EXISTS robuxExchanges;
DROP TABLE IF EXISTS gamePassTxs;
DROP TABLE IF EXISTS marketplaceListings;
DROP TABLE IF EXISTS marketplaceListingItems;

-- 7. Remove old Roblox deposit/withdrawal feature flags
DELETE FROM features WHERE id IN ('robuxDeposits', 'robuxWithdrawals', 'limitedDeposits', 'limitedWithdrawals');

-- Migration complete
SELECT 'Rebrand migration completed successfully' AS status;
