const { createHash } = require('crypto');

function displayName(value) {
    if (typeof value !== 'string') return null;
    // Keep Unicode names and emoji; remove control characters, not non-ASCII text.
    const name = value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim();
    return Array.from(name).slice(0, 255).join('') || null;
}

function avatarUrl(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch (_) {
        return null;
    }
}

async function saveProviderProfile(sql, provider, providerId, profile = {}) {
    const column = { steam: 'steamId', google: 'googleId' }[provider];
    if (!column || typeof providerId !== 'string' || !/^\d+$/.test(providerId)) {
        throw new Error('Invalid provider identity');
    }
    const name = displayName(profile.username);
    const picture = avatarUrl(profile.avatarUrl);
    const fallback = `${provider === 'steam' ? 'Player' : 'User'}${providerId.slice(-6)}`;
    let [[user]] = await sql.query(`SELECT id, deletedAt FROM users WHERE ${column} = ?`, [providerId]);
    if (user?.deletedAt) throw new Error('ACCOUNT_DELETED');
    if (!user) {
        const id = BigInt(`0x${createHash('sha256').update(`${provider}:${providerId}`).digest('hex').slice(0, 15)}`).toString();
        await sql.query(`INSERT IGNORE INTO users (id, username, avatarUrl, ${column}) VALUES (?, ?, ?, ?)`,
            [id, name || fallback, picture, providerId]);
        [[user]] = await sql.query(`SELECT id, deletedAt FROM users WHERE ${column} = ?`, [providerId]);
        if (!user) throw new Error('Provider identity could not be saved');
        if (user.deletedAt) throw new Error('ACCOUNT_DELETED');
    }
    // Refresh returning users too. A temporary provider failure must not erase a saved profile.
    const [result] = await sql.query("UPDATE users SET username = COALESCE(?, NULLIF(TRIM(username), ''), ?), avatarUrl = COALESCE(?, avatarUrl) WHERE id = ? AND deletedAt IS NULL",
        [name, fallback, picture, user.id]);
    if (!result.affectedRows) throw new Error('ACCOUNT_DELETED');
    return user.id;
}

module.exports = { displayName, avatarUrl, saveProviderProfile };
