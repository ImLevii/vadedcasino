const STAFF_ROLES = new Set(['OWNER', 'ADMIN', 'DEV', 'MOD']);
const isStaff = user => STAFF_ROLES.has(user?.role);
async function ensureStaffChatSchema(connection) {
    await connection.query(`CREATE TABLE IF NOT EXISTS staffChatSettings (userId BIGINT NOT NULL PRIMARY KEY, enabled TINYINT NOT NULL DEFAULT 0)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS staffChatMessages (messageId BIGINT NOT NULL PRIMARY KEY)`);
}
async function getStaffChatMode(connection, user) {
    if (!isStaff(user)) return false;
    const [[row]] = await connection.query('SELECT enabled FROM staffChatSettings WHERE userId = ?', [user.id]);
    return !!row?.enabled;
}
function publicChatUser(user, staffMode) {
    if (staffMode) return {username:'COSMICLUCK', role:'STAFF', staffMode:true};
    return {id:user.id, username:user.username, role:user.role, xp:user.xp};
}
module.exports = {isStaff, ensureStaffChatSchema, getStaffChatMode, publicChatUser};
