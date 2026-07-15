const { sql } = require('../../database');
const { sendLog } = require('../../utils');

/**
 * Centralized Game Configuration Cache
 * 
 * All game modules read their settings from this cache.
 * Admins update settings via the admin API which writes to DB and refreshes cache.
 */

const gameConfigCache = {};

async function cacheGameConfig() {
    const [rows] = await sql.query('SELECT game, `key`, `value`, `type` FROM gameSettings');
    
    // Reset and rebuild
    for (const game of Object.keys(gameConfigCache)) {
        delete gameConfigCache[game];
    }
    
    for (const row of rows) {
        if (!gameConfigCache[row.game]) {
            gameConfigCache[row.game] = {};
        }
        
        let parsedValue = row.value;
        
        switch (row.type) {
            case 'number':
                parsedValue = Number(row.value);
                break;
            case 'boolean':
                parsedValue = row.value === '1' || row.value === 'true';
                break;
            case 'json':
                try {
                    parsedValue = JSON.parse(row.value);
                } catch (e) {
                    parsedValue = row.value;
                }
                break;
            case 'string':
            default:
                parsedValue = row.value;
                break;
        }
        
        gameConfigCache[row.game][row.key] = parsedValue;
    }
    
    console.log(`[gameConfig] Cached settings for ${Object.keys(gameConfigCache).length} games`);
}

function getGameConfig(game, key, defaultValue = undefined) {
    if (!gameConfigCache[game]) return defaultValue;
    if (key === undefined) return gameConfigCache[game] || {};
    return gameConfigCache[game][key] !== undefined ? gameConfigCache[game][key] : defaultValue;
}

function getHouseEdge(game) {
    return getGameConfig(game, 'houseEdge', 5); // Default 5% if not configured
}

async function updateGameSetting(game, key, value, adminUser = null) {
    const type = typeof value === 'number' ? 'number' 
               : typeof value === 'boolean' ? 'boolean'
               : typeof value === 'object' ? 'json'
               : 'string';
    
    const stringValue = type === 'json' ? JSON.stringify(value) : String(value);
    
    // Upsert
    const [existing] = await sql.query(
        'SELECT id FROM gameSettings WHERE game = ? AND `key` = ?',
        [game, key]
    );
    
    if (existing.length > 0) {
        await sql.query(
            'UPDATE gameSettings SET value = ? WHERE id = ?',
            [stringValue, existing[0].id]
        );
    } else {
        await sql.query(
            'INSERT INTO gameSettings (game, `key`, value, type) VALUES (?, ?, ?, ?)',
            [game, key, stringValue, type]
        );
    }
    
    // Refresh cache
    await cacheGameConfig();
    
    if (adminUser) {
        sendLog('admin', `[\`${adminUser.id}\`] *${adminUser.username}* updated game config \`${game}.${key}\` = \`${stringValue}\`.`);
    }
    
    return true;
}

async function getAllGameSettings() {
    const [rows] = await sql.query('SELECT * FROM gameSettings ORDER BY game, `key`');
    return rows;
}

// Initialize cache on startup
cacheGameConfig().catch(err => {
    console.error('[gameConfig] Failed to cache on startup:', err.message);
});

module.exports = {
    cacheGameConfig,
    getGameConfig,
    getHouseEdge,
    updateGameSetting,
    getAllGameSettings,
    gameConfigCache
};