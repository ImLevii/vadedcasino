const { sql } = require('../../../database');
const { roundDecimal, getUserLevel } = require('../../../utils');

// Admin-tunable parameters (persisted in the settings table, key 'rewardsConfig')
const rewardsParams = {
    dailyCase: {
        cooldownHours: 24,
        tierStep: 5,
        maxLevel: 100,
        amountPerLevel: 0.1
    },
    depositCases: {
        casesTotal: 5,
        durationHours: 24,
        rewardMinPct: 0.5,
        rewardMaxPct: 2.5,
        tiers: [
            { minDeposit: 20, wagerMultiplier: 20 },
            { minDeposit: 45, wagerMultiplier: 5 },
            { minDeposit: 180, wagerMultiplier: 1 }
        ]
    },
    supercharge: {
        minDeposit: 90,
        bonusPct: 5,
        durationMinutes: 60
    }
};

function buildDailyTiers() {
    const { tierStep, maxLevel, amountPerLevel } = rewardsParams.dailyCase;
    const count = Math.max(1, Math.floor(maxLevel / tierStep));
    return Array.from({ length: count }, (_, i) => {
        const minLevel = (i + 1) * tierStep;
        return { minLevel, amount: roundDecimal(minLevel * amountPerLevel) };
    }).reverse();
}

const dailyCaseConfig = {
    get cooldown() { return rewardsParams.dailyCase.cooldownHours * 60 * 60 * 1000; },
    tiers: buildDailyTiers()
};

const depositCasesConfig = {
    get tiers() {
        return rewardsParams.depositCases.tiers.slice().sort((a, b) => b.minDeposit - a.minDeposit);
    },
    get minDeposit() {
        return Math.min(...rewardsParams.depositCases.tiers.map(t => t.minDeposit));
    },
    get casesTotal() { return rewardsParams.depositCases.casesTotal; },
    get duration() { return rewardsParams.depositCases.durationHours * 60 * 60 * 1000; },
    get rewardMinPct() { return rewardsParams.depositCases.rewardMinPct / 100; },
    get rewardMaxPct() { return rewardsParams.depositCases.rewardMaxPct / 100; }
};

const superchargeConfig = {
    get minDeposit() { return rewardsParams.supercharge.minDeposit; },
    get bonusPct() { return rewardsParams.supercharge.bonusPct / 100; },
    get duration() { return rewardsParams.supercharge.durationMinutes * 60 * 1000; }
};

// Multiplier table for reward case openings (weights on the same 100000 scale as caseItems).
// EV ~= 0.99x of the case's base amount.
const REWARD_CASE_TABLE = [
    { multiplier: 0.2, weight: 25000 },
    { multiplier: 0.5, weight: 30000 },
    { multiplier: 1, weight: 26800 },
    { multiplier: 2, weight: 13000 },
    { multiplier: 4, weight: 4000 },
    { multiplier: 8, weight: 1100 },
    { multiplier: 16, weight: 100 }
];

// Builds a caseItems-like pool of coin rewards for a given base amount.
function buildRewardPool(amount) {
    let rangeStart = 1;
    return REWARD_CASE_TABLE.map(entry => {
        const price = Math.max(0.01, roundDecimal(amount * entry.multiplier));
        const rangeFrom = rangeStart;
        const rangeTo = rangeStart + entry.weight - 1;
        rangeStart = rangeTo + 1;

        return {
            name: `${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Coins`,
            img: '/public/assets/icons/coin.svg',
            price,
            rangeFrom,
            rangeTo,
            probability: entry.weight / 1000
        };
    });
}

async function loadRewardsConfig() {
    try {
        const [[row]] = await sql.query('SELECT value FROM settings WHERE id = ?', ['rewardsConfig']);
        if (row) applyRewardsParams(JSON.parse(row.value));
    } catch (e) {
        console.error('Failed to load rewards config, using defaults:', e.message);
    }
}

function validateRewardsParams(params) {
    const num = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

    const d = params?.dailyCase;
    if (!d || !num(d.cooldownHours, 1, 168) || !num(d.tierStep, 1, 50) || !num(d.maxLevel, d.tierStep, 500) || !num(d.amountPerLevel, 0.001, 1000)) return 'INVALID_DAILY_CASE';

    const dc = params?.depositCases;
    if (!dc || !num(dc.casesTotal, 1, 100) || !num(dc.durationHours, 1, 720) || !num(dc.rewardMinPct, 0.01, 100) || !num(dc.rewardMaxPct, dc.rewardMinPct, 100)) return 'INVALID_DEPOSIT_CASES';
    if (!Array.isArray(dc.tiers) || !dc.tiers.length || dc.tiers.length > 10) return 'INVALID_DEPOSIT_TIERS';
    for (const tier of dc.tiers) {
        if (!num(tier?.minDeposit, 0.01, 1000000) || !num(tier?.wagerMultiplier, 0, 1000)) return 'INVALID_DEPOSIT_TIERS';
    }

    const s = params?.supercharge;
    if (!s || !num(s.minDeposit, 0.01, 1000000) || !num(s.bonusPct, 0, 100) || !num(s.durationMinutes, 1, 10080)) return 'INVALID_SUPERCHARGE';

    return null;
}

function applyRewardsParams(params) {
    rewardsParams.dailyCase = { ...rewardsParams.dailyCase, ...params.dailyCase };
    rewardsParams.depositCases = { ...rewardsParams.depositCases, ...params.depositCases };
    rewardsParams.supercharge = { ...rewardsParams.supercharge, ...params.supercharge };
    dailyCaseConfig.tiers = buildDailyTiers();
}

async function updateRewardsConfig(params) {
    const error = validateRewardsParams(params);
    if (error) return error;

    applyRewardsParams(params);
    await sql.query(
        'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['rewardsConfig', JSON.stringify(rewardsParams)]
    );
    return null;
}

function getRewardsParams() {
    return rewardsParams;
}

loadRewardsConfig();

function getDailyCaseTier(level) {
    return dailyCaseConfig.tiers.find(tier => level >= tier.minLevel) || null;
}

function getUnlockedDailyTiers(level) {
    return dailyCaseConfig.tiers.filter(tier => level >= tier.minLevel);
}

function getDailyClaimTotal(level) {
    return roundDecimal(getUnlockedDailyTiers(level).reduce((total, tier) => total + tier.amount, 0));
}

// Called within deposit transactions - pure DB writes, no balance changes.
async function activateDepositRewards(connection, userId, amount) {

    const depositTier = depositCasesConfig.tiers.find(tier => amount >= tier.minDeposit);

    if (depositTier) {
        await connection.query(
            'INSERT INTO depositCases (userId, depositAmount, casesTotal, wagerRequired, expiresAt) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))',
            [userId, amount, depositCasesConfig.casesTotal, roundDecimal(amount * depositTier.wagerMultiplier), depositCasesConfig.duration / 1000]
        );
    }

    if (amount >= superchargeConfig.minDeposit) {
        const [[existing]] = await connection.query(
            'SELECT id FROM supercharges WHERE userId = ? AND active = 1 AND createdAt > DATE_SUB(NOW(), INTERVAL ? SECOND) LIMIT 1',
            [userId, superchargeConfig.duration / 1000]
        );

        if (!existing) {
            await connection.query(
                'INSERT INTO supercharges (userId, depositAmount, bonusAmount, expiresAt) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))',
                [userId, amount, roundDecimal(amount * superchargeConfig.bonusPct), superchargeConfig.duration / 1000]
            );
        }
    }

}

async function getRewardsOverview(userId) {

    const [[user]] = await sql.query('SELECT id, xp FROM users WHERE id = ?', [userId]);
    const level = getUserLevel(user?.xp || 0);
    const tier = getDailyCaseTier(level);

    // Last claim per tier within the cooldown window (level column stores the tier's minLevel)
    const [tierClaims] = await sql.query(
        'SELECT level, MAX(createdAt) as lastClaim FROM dailyCaseClaims WHERE userId = ? AND createdAt > DATE_SUB(NOW(), INTERVAL ? SECOND) GROUP BY level',
        [userId, dailyCaseConfig.cooldown / 1000]
    );

    const tierNextClaimAt = {};
    for (const claim of tierClaims) {
        tierNextClaimAt[claim.level] = new Date(claim.lastClaim).getTime() + dailyCaseConfig.cooldown;
    }

    const [activeDepositCases] = await sql.query(
        'SELECT id, depositAmount, casesTotal, casesOpened, wagerRequired, expiresAt, createdAt FROM depositCases WHERE userId = ? AND active = 1 AND expiresAt > NOW() AND casesOpened < casesTotal ORDER BY id ASC',
        [userId]
    );

    const depositCases = [];
    for (const dc of activeDepositCases) {
        const [[{ wagered }]] = await sql.query(
            'SELECT COALESCE(SUM(amount), 0) as wagered FROM bets WHERE userId = ? AND completed = 1 AND createdAt > ?',
            [userId, dc.createdAt]
        );

        depositCases.push({
            id: dc.id,
            depositAmount: dc.depositAmount,
            casesRemaining: dc.casesTotal - dc.casesOpened,
            wagerRequired: dc.wagerRequired,
            wagered: roundDecimal(Math.min(wagered, dc.wagerRequired)),
            unlocked: wagered >= dc.wagerRequired,
            expiresAt: dc.expiresAt
        });
    }

    const [[supercharge]] = await sql.query(
        'SELECT id, bonusAmount, createdAt FROM supercharges WHERE userId = ? AND active = 1 AND createdAt > DATE_SUB(NOW(), INTERVAL ? SECOND) ORDER BY id DESC LIMIT 1',
        [userId, superchargeConfig.duration / 1000]
    );

    const [[{ superchargeCount }]] = await sql.query('SELECT COUNT(*) as superchargeCount FROM supercharges WHERE userId = ?', [userId]);

    const [[{ depositedToday }]] = await sql.query(
        "SELECT COALESCE(SUM(amount), 0) as depositedToday FROM transactions WHERE userId = ? AND type = 'deposit' AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
        [userId]
    );

    return {
        serverTime: Date.now(),
        dailyCase: {
            level,
            minLevel: dailyCaseConfig.tiers[dailyCaseConfig.tiers.length - 1].minLevel,
            tiers: dailyCaseConfig.tiers.slice().reverse().map(t => {
                const nextOpenAt = tierNextClaimAt[t.minLevel] || 0;
                const unlocked = level >= t.minLevel;

                return {
                    minLevel: t.minLevel,
                    amount: t.amount,
                    unlocked,
                    canOpen: unlocked && Date.now() >= nextOpenAt,
                    nextOpenAt,
                    pool: buildRewardPool(t.amount)
                };
            }),
            totalClaimable: getDailyClaimTotal(level),
            tierMinLevel: tier?.minLevel || null,
            amount: tier?.amount || 0
        },
        depositCases: {
            minDeposit: depositCasesConfig.minDeposit,
            tiers: depositCasesConfig.tiers.slice().reverse().map(t => ({
                minDeposit: t.minDeposit,
                wagerMultiplier: t.wagerMultiplier,
                depositedToday: roundDecimal(Math.min(depositedToday, t.minDeposit))
            })),
            depositedToday: roundDecimal(depositedToday),
            casesPerDeposit: depositCasesConfig.casesTotal,
            active: depositCases,
            totalCasesRemaining: depositCases.reduce((total, dc) => total + dc.casesRemaining, 0)
        },
        supercharge: {
            minDeposit: superchargeConfig.minDeposit,
            active: !!supercharge,
            bonusAmount: supercharge?.bonusAmount || 0,
            totalCount: superchargeCount,
            expiresAt: supercharge ? new Date(supercharge.createdAt).getTime() + superchargeConfig.duration : null,
            pool: supercharge ? buildRewardPool(supercharge.bonusAmount) : null
        }
    };

}

module.exports = {
    dailyCaseConfig,
    depositCasesConfig,
    superchargeConfig,
    buildRewardPool,
    getDailyCaseTier,
    getUnlockedDailyTiers,
    getDailyClaimTotal,
    activateDepositRewards,
    getRewardsOverview,
    getRewardsParams,
    updateRewardsConfig
};
