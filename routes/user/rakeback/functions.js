const { sql } = require('../../../database');
const { roundDecimal } = require('../../../utils');

const startDate = new Date('2023-10-08 05:50:00');

const rakebackTypes = {
    'instant': {
        min: 0.01,
        cooldown: 0,
        percentage: 2
    },
    'daily': {
        min: 0.01,
        cooldown: 24 * 60 * 60 * 1000,
        percentage: 2
    },
    'weekly': {
        min: 0.01,
        cooldown: 7 * 24 * 60 * 60 * 1000,
        percentage: 2
    },
    'monthly': {
        min: 0.01,
        cooldown: 30 * 24 * 60 * 60 * 1000,
        percentage: 2
    }
}

const cachedRakebacks = {};

async function getUserRakebacks(userId) {

    const cached = cachedRakebacks[userId];
    if (cached && !Object.values(cached).some(e => !e.canClaim && e.unclaimedRakeback >= e.min && new Date() >= e.canClaimAt)) return cached;
    
    const userRakebacks = {};

    const [lastClaims] = await sql.query(`
        SELECT type, MAX(createdAt) as lastClaimDate
        FROM rakebackClaims
        WHERE userId = ?
        GROUP BY type
    `, [userId]);

    const claimsMap = {};
    lastClaims.forEach(claim => {
        claimsMap[claim.type] = claim.lastClaimDate;
    });

    const types = Object.keys(rakebackTypes);
    const claimDates = types.map(type => claimsMap[type] || startDate);
    const [[unclaimed]] = await sql.query(`
        SELECT ${types.map(() => 'SUM(CASE WHEN createdAt > ? THEN edge ELSE 0 END)').map((sum, index) => `${sum} AS total${index}`).join(', ')}
        FROM bets
        WHERE userId = ? AND completed = 1
    `, [...claimDates, userId]);

    for (const [index, type] of types.entries()) {

        const lastClaimDate = claimDates[index];

        const houseEdge = unclaimed[`total${index}`] || 0;
        const rakeback = roundDecimal(houseEdge * (rakebackTypes[type].percentage / 100));

        const canClaimAt = new Date(new Date(lastClaimDate).valueOf() + rakebackTypes[type].cooldown);

        userRakebacks[type] = {
            ...rakebackTypes[type],
            lastClaim: lastClaimDate,
            unclaimedRakeback: rakeback,
            canClaim: Date.now() >= canClaimAt && rakeback >= rakebackTypes[type].min,
            canClaimAt
        }

    }

    cachedRakebacks[userId] = userRakebacks;
    cachedRakebacks[userId].cachedAt = Date.now();
    // setTimeout(() => delete cachedRakebacks[userId], 60000);

    return userRakebacks;

}

setInterval(() => {
    for (const userId in cachedRakebacks) {
        if (Date.now() - cachedRakebacks[userId].cachedAt > 60000 * 20) delete cachedRakebacks[userId];
    }
}, 60000 * 20);

module.exports = {
    cachedRakebacks,
    rakebackTypes,
    getUserRakebacks,
    startDate
}