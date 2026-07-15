# SkinDeck Production Deployment Checklist

## What Was Fixed in Code
- ✅ Added `assets/icons/cs2-logo.svg` (missing icon)
- ✅ Enabled `skindeck` feature flag in `database/schema.sql`
- ✅ Added migration `database/migrations/007_skindeck_payments.sql` to enable `skindeck` on existing DBs
- ✅ Added SkinDeck env vars to `.env.local` for local development
- ✅ Profile page has Steam Trade URL and API Key modals (`src/components/Profile/overview.jsx`)
- ✅ Deposit page requires Steam fields (`src/components/Deposits/skindeck.jsx`)
- ✅ Withdraw page requires Steam fields (`src/components/Withdraws/skindeck.jsx`)
- ✅ Backend enforces Steam profile (`routes/trading/skindeck/index.js:requireSteamProfile`)

## Required Production Configuration

### 1. Set Environment Variables in Dokploy
Go to your **Dokploy dashboard → cosmicluck → Environment** and add:

```
SKINDECK_ENABLED=true
SKINDECK_API_KEY=3c070d6951fe6aef8e6f8d976f430772b295bce9b0b2bd615b788f52e7c0de80
SKINDECK_WEBHOOK_SECRET=skindeck-webhook-secret-change-me
SKINDECK_MODE=sandbox
```

**Important:** `.env.local` is **only for local development**. Dokploy does not use it. You must set these vars in the Dokploy dashboard.

### 2. Run Database Migration
Execute the migration against your production database:

```bash
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DB < database/migrations/007_skindeck_payments.sql
```

Or run the SQL directly in your MySQL client:

```sql
INSERT IGNORE INTO `features` (`id`, `enabled`) VALUES ('skindeck', 1);
UPDATE `features` SET `enabled` = 1 WHERE `id` = 'skindeck';
```

### 3. Trigger Redeploy
After setting env vars and running the migration:
- In Dokploy: **Deployments → Redeploy**
- Or push a new commit to GitHub to trigger automatic rebuild

## Verification
After deployment, visit:
- `https://cosmicluck.gg/deposit` - should show **CS2 Skins** section
- `https://cosmicluck.gg/withdraw` - should show **CS2 Skins** section
- `https://cosmicluck.gg/profile` - should show **Steam Trade URL** and **Steam API Key** action cards

## User Flow
1. User clicks **CS2 Skins** on deposit/withdraw page
2. If Steam fields missing: shows "STEAM CONNECTION REQUIRED" with link to profile
3. User goes to **Profile → Actions → Steam Trade URL** and enters trade URL
4. User goes to **Profile → Actions → Steam API Key** and enters API key
5. User returns to deposit/withdraw and can now use SkinDeck

## Notes
- Currently configured for **sandbox mode** (no real money/items move)
- To enable live mode: set `SKINDECK_MODE=live` and configure real API credentials
- Webhook URL for production: `https://cosmicluck.gg/trading/skindeck/webhook`