/**
 * SkinDeck Diagnostic Tool
 * 
 * This script diagnoses why SkinDeck is not showing up on deposit/withdraw pages.
 * It checks the capabilities endpoint and common configuration issues.
 * 
 * Usage: node scripts/diagnose-skindeck.js [production-url]
 * Example: node scripts/diagnose-skindeck.js https://cosmicluck.gg
 */

const http = require('http');
const https = require('https');

async function checkCapabilities(baseUrl) {
    console.log('🔍 Checking SkinDeck capabilities...\n');

    return new Promise((resolve, reject) => {
        const url = new URL(`${baseUrl}/trading/skindeck/capabilities`);
        const client = url.protocol === 'https:' ? https : http;

        const req = client.get(url.toString(), (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout (10s)'));
        });
    });
}

async function diagnose(baseUrl) {
    console.log(`🌐 Checking: ${baseUrl}\n`);

    try {
        const capabilities = await checkCapabilities(baseUrl);
        
        console.log('📊 Capabilities Response:');
        console.log(JSON.stringify(capabilities, null, 2));
        console.log();

        if (!capabilities.enabled) {
            console.log('❌ SkinDeck is DISABLED\n');
            console.log('Possible reasons:');
            console.log('1. SKINDECK_ENABLED is not set to "true" in Dokploy environment variables');
            console.log('2. Feature flag "skindeck" is disabled in database');
            console.log('3. SKINDECK_API_KEY is missing or invalid');
            console.log('4. SKINDECK_WEBHOOK_SECRET is missing');
            console.log('5. SKINDECK_MODE is not set to "sandbox" or "live"');
            console.log('6. SKINDECK_API_URL is not configured');
            console.log('\n🔧 Fix Steps:');
            console.log('1. Go to Dokploy dashboard → cosmicluck → Environment');
            console.log('2. Add/update these environment variables:');
            console.log('   SKINDECK_ENABLED=true');
            console.log('   SKINDECK_API_KEY=3c070d6951fe6aef8e6f8d976f430772b295bce9b0b2bd615b788f52e7c0de80');
            console.log('   SKINDECK_WEBHOOK_SECRET=skindeck-webhook-secret-change-me');
            console.log('   SKINDECK_MODE=live');
            console.log('   SKINDECK_API_URL=https://api.skindeck.com/v1');
            console.log('3. Save and trigger a redeploy');
            console.log('4. Run this SQL on your production database:');
            console.log("   INSERT IGNORE INTO `features` (`id`, `enabled`) VALUES ('skindeck', 1);");
            console.log("   UPDATE `features` SET `enabled` = 1 WHERE `id` = 'skindeck';");
        } else {
            console.log('✅ SkinDeck is ENABLED');
            console.log(`   Mode: ${capabilities.mode}`);
            console.log('\nIf CS2 Skins is still not showing:');
            console.log('1. Clear browser cache and hard refresh (Ctrl+Shift+R)');
            console.log('2. Check browser console for JavaScript errors');
            console.log('3. Verify the frontend build includes the latest code');
            console.log('4. Try redeploying in Dokploy to ensure latest code is deployed');
        }
    } catch (error) {
        console.log('❌ Failed to check capabilities\n');
        console.log(`Error: ${error.message}\n`);
        console.log('Possible reasons:');
        console.log('1. The site is not accessible');
        console.log('2. The /trading/skindeck/capabilities endpoint does not exist');
        console.log('3. The server is down or not responding');
        console.log('\n🔧 Fix Steps:');
        console.log('1. Verify the site is accessible:', baseUrl);
        console.log('2. Check Dokploy deployment status');
        console.log('3. Ensure the latest code is deployed (trigger redeploy)');
        console.log('4. Check server logs in Dokploy for errors');
    }
}

// Get base URL from command line or use default
const baseUrl = process.argv[2] || 'http://localhost:3000';

diagnose(baseUrl).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});