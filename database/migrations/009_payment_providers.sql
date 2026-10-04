CREATE TABLE IF NOT EXISTS `paymentProviders` (
  id VARCHAR(32) NOT NULL,
  settings TEXT NOT NULL,
  credentials TEXT DEFAULT NULL,
  version INT NOT NULL DEFAULT 1,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `providerDisputes` (
  provider VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  settlementRef VARCHAR(128) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (provider, mode, settlementRef)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `providerPayments` (
  id BIGINT NOT NULL AUTO_INCREMENT,
  requestId VARCHAR(64) NOT NULL UNIQUE,
  userId BIGINT NOT NULL,
  provider VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  flow VARCHAR(16) NOT NULL DEFAULT 'api',
  type VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL,
  coins DECIMAL(20,2) NOT NULL,
  fiatCents BIGINT NOT NULL,
  feeCents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  receiver VARCHAR(255) DEFAULT NULL,
  providerRef VARCHAR(128) DEFAULT NULL,
  settlementRef VARCHAR(128) DEFAULT NULL,
  settled INT NOT NULL DEFAULT 0,
  checkoutUrl TEXT DEFAULT NULL,
  lastError VARCHAR(128) DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizedAt DATETIME DEFAULT NULL,
  UNIQUE KEY provider_payment_reference (provider, mode, providerRef),
  UNIQUE KEY provider_settlement_reference (provider, mode, settlementRef),
  PRIMARY KEY (id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `providerAccounts` (
  userId BIGINT NOT NULL,
  provider VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  accountId VARCHAR(128) DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (userId, provider, mode),
  UNIQUE KEY provider_account_identity (provider, mode, accountId)
) ENGINE=InnoDB;
