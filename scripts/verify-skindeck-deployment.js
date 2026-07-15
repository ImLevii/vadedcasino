/**
 * SkinDeck Deployment Verification Script
 * 
 * This script checks if SkinDeck is properly configured for production.
 * Run this against your production database to verify the setup.
 * 
 * Usage: node scripts/verify-skindeck-deployment.js
 */

require('dotenv').config();
const { sql } = require('../database');

async function verifyDeployment() {
    console.log('🔍 Verifying SkinDeck deployment...\n');

    let allGood = true;

    // Check 1: Feature flag in database
    try {
        const [[feature]] = await sql.query(
            'SELECT enabled FROM features WHERE id = ?',
            ['skindeck']
        );
        
        if (!feature) {
            console.log('❌ Feature flag missing: skindeck not found in features table');
            allGood = false;
        } else if (feature.enabled !== 1) {
            console.log('❌ Feature flag disabled: skindeck is set to 0 in database');
            console.log("   Fix: INSERT IGNORE INTO `features` (`id`, `enabled`) VALUES ('skindeck', 1);");
            console.log("   Or: UPDATE `features` SET `enabled` = 1 WHERE `id` = 'skindeck';");
            allGood = false;
        } else {
            console.log('✅ Feature flag enabled: skindeck = 1');
        }
    } catch (error) {
        console.log('❌ Database error checking feature flag:', error.message);
        allGood = false;
    }

    // Check 2: Environment variables
    console.log('\n📋 Environment Variables:');
    
    const requiredEnvVars = [
        'SKINDECK_ENABLED',
        'SKINDECK_API_KEY',
        'SKINDECK_WEBHOOK_SECRET',
        'SKINDECK_MODE',
        'SKINDECK_API_URL'
    ];

    for (const envVar of requiredEnvVars) {
        const value = process.env[envVar];
        if (!value) {
            console.log(`❌ Missing: ${envVar}`);
            allGood = false;
        } else {
            const masked = envVar.includes('SECRET') || envVar.includes('KEY') 
                ? value.substring(0, 8) + '...' 
                : value;
            console.log(`✅ ${envVar} = ${masked}`);
        }
    }

    // Check 3: Database tables
    console.log('\n🗄️  Database Tables:');
    try {
        const [tables] = await sql.query(
            "SHOW TABLES LIKE 'paymentTransactions'"
        );
        if (tables.length === 0) {
            console.log('❌ Missing table: paymentTransactions');
            console.log('   Fix: Run database/migrations/007_skindeck_payments.sql');
            allGood = false;
        } else {
            console.log('✅ paymentTransactions table exists');
        }
    } catch (error) {
        console.log('❌ Database error checking tables:', error.message);
        allGood = false;
    }

    // Check 4: Capabilities endpoint
    console.log('\n🔌 API Capabilities:');
    try {
        const http = require('http');
        const options = {
            hostname: 'localhost',
            port: process.env.PORT || 3000,
            path: '/trading/skindeck/capabilities',
            method: 'GET',
            timeout: 5000
        };

        const capabilities = await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        });

        if (capabilities.enabled) {
            console.log('✅ SkinDeck API is enabled');
            console.log(`   Mode: ${capabilities.mode}`);
        } else {
            console.log('❌ SkinDeck API is disabled');
            console.log('   Check: SKINDECK_ENABLED=true and feature flag in database');
            allGood = false;
        }
    } catch (error) {
        console.log('⚠️  Could not verify API (server may not be running locally)');
        console.log(`   Error: ${error.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (allGood) {
        console.log('✅ All checks passed! SkinDeck is ready for production.');
    } else {
        console.log('❌ Some checks failed. Please fix the issues above.');
        console.log('\n📝 Quick Fix Guide:');
        console.log('1. Set environment variables in Dokploy dashboard:');
        console.log('   - SKINDECK_ENABLED=true');
        console.log('   - SKINDECK_API_KEY=your-api-key');
        console.log('   - SKINDECK_WEBHOOK_SECRET=your-webhook-secret');
        console.log('   - SKINDECK_MODE=live (or sandbox for testing)');
        console.log('   - SKINDECK_API_URL=https://api.skindeck.com/v1');
        console.log('\n2. Run database migration:');
        console.log('   mysql -h HOST -u USER -p DB < database/migrations/007_skindeck_payments.sql');
        console.log('\n3. Trigger redeploy in Dokploy');
    }
    console.log('='.repeat(50));

    process.exit(allGood ? 0 : 1);
}

verifyDeployment().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});