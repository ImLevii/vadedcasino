#!/usr/bin/env node

/**
 * Non-destructive SkinDeck deployment readiness check.
 * This script never prints credential values and never creates a trade.
 */
require('dotenv').config();

const { sql } = require('../database');
const { getSkinDeckConfig } = require('../routes/trading/skindeck/config');
const { isProviderContractReady } = require('../routes/trading/skindeck/contract');

const results = [];
function check(name, passed, detail) {
    results.push({ name, passed, detail });
    console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function verifyDatabase() {
    const [[feature]] = await sql.query('SELECT enabled FROM features WHERE id = ?', ['skindeck']);
    check('Feature flag exists', !!feature, feature ? null : 'Add the skindeck feature row before rollout.');
    check('Feature flag enabled', feature?.enabled === 1, feature?.enabled === 1 ? null : 'Keep disabled until every readiness check passes.');

    const [table] = await sql.query("SHOW TABLES LIKE 'paymentTransactions'");
    check('Payment transaction table', table.length > 0, table.length ? null : 'Run database/migrations/007_skindeck_payments.sql.');

    if (table.length) {
        const [columns] = await sql.query('SHOW COLUMNS FROM paymentTransactions');
        const names = new Set(columns.map((column) => column.Field));
        const required = ['internalRef', 'providerRef', 'providerStatus', 'status', 'skinItems', 'value', 'providerValue', 'providerCurrency', 'finalizedAt', 'lastError'];
        const missing = required.filter((name) => !names.has(name));
        check('Settlement schema', missing.length === 0, missing.length ? `Missing columns: ${missing.join(', ')}` : null);
    }
}

async function verifyEnvironment() {
    const config = getSkinDeckConfig();
    check('Integration explicitly enabled', config.enabled === true, 'SKINDECK_ENABLED must be true only at cutover.');
    check('Valid provider mode', ['sandbox', 'live'].includes(config.mode), 'Use sandbox or live.');
    check('Merchant API key present', !!config.apiKey, 'Credential value is intentionally not displayed.');
    check('Webhook secret present', !!config.webhookSecret, 'Credential value is intentionally not displayed.');
    check('Provider contract verified', isProviderContractReady(config.mode), config.mode === 'live' ? 'Live remains fail-closed until the exact merchant contract is implemented and verified.' : null);
    check('Public frontend URL', /^https:\/\//.test(process.env.FRONTEND_URL || ''), 'Production callbacks require an HTTPS FRONTEND_URL.');
}

async function verifyEndpoint() {
    const base = process.env.SKINDECK_HEALTHCHECK_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
    try {
        const response = await fetch(`${base.replace(/\/$/, '')}/trading/skindeck/capabilities`, { signal: AbortSignal.timeout(5000) });
        const body = await response.json();
        check('Capabilities endpoint', response.ok, `HTTP ${response.status}`);
        check('Runtime configured', body.configured === true, body.configured ? null : 'Required runtime configuration is incomplete.');
        check('Runtime contract ready', body.contractReady === true, body.contractReady ? null : 'Provider operations are correctly fail-closed.');
        check('Runtime integration enabled', body.enabled === true, body.enabled ? `${body.mode} mode` : 'No live or sandbox trades can be created.');
    } catch (error) {
        check('Capabilities endpoint', false, `Non-destructive check failed: ${error.message}`);
    }
}

async function main() {
    console.log('SkinDeck production readiness\n');
    try {
        await verifyEnvironment();
        await verifyDatabase();
        await verifyEndpoint();
    } catch (error) {
        check('Readiness execution', false, error.message);
    } finally {
        await sql.end?.().catch?.(() => {});
    }

    const failed = results.filter((result) => !result.passed);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
    if (failed.length) {
        console.log('SkinDeck is not production-ready. Keep the feature disabled and resolve every failed check.');
        process.exitCode = 1;
    } else {
        console.log('All non-destructive readiness checks passed. Complete a monitored sandbox transaction before live cutover.');
    }
}

main().catch((error) => {
    console.error('Readiness check failed:', error.message);
    process.exitCode = 1;
});
