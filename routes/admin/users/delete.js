function reject(status, code) {
    const error = new Error(code);
    error.status = status;
    throw error;
}

async function deleteUserAccount(connection, actor, userId, confirmation) {
    if (!/^\d{1,20}$/.test(userId)) reject(400, 'INVALID_USER_ID');
    if (!['ADMIN', 'OWNER'].includes(actor.role)) reject(403, 'CANNOT_DELETE_USER');
    if (String(actor.id) === userId) reject(400, 'CANNOT_DELETE_SELF');
    if (confirmation !== userId) reject(400, 'DELETE_CONFIRMATION_REQUIRED');
    const [[user]] = await connection.query('SELECT id, role, perms, deletedAt FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!user || user.deletedAt) reject(404, 'USER_NOT_FOUND');
    if (user.role === 'BOT' || user.perms >= actor.perms) reject(403, 'CANNOT_DELETE_USER');

    // Keep the account ID and provider IDs as tombstones: historical ledger entries
    // remain attributable and OAuth cannot silently recreate a deleted account.
    await connection.query(`UPDATE users SET deletedAt = NOW(), deletedBy = ?,
        username = 'Deleted user', avatarUrl = NULL, passwordHash = NULL,
        banned = 1, accountLock = 1, role = 'USER', perms = 0, lastLogout = NOW(),
        steamTradeUrl = NULL, steamApiKey = NULL, \`2fa\` = NULL, ip = NULL,
        affiliateCode = NULL, mentionsEnabled = 0, notificationsEnabled = 0
        WHERE id = ?`, [actor.id, userId]);
    await connection.query('DELETE FROM discordAuths WHERE userId = ?', [userId]);
}

module.exports = { deleteUserAccount };
