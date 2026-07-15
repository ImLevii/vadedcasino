const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'items.json');

function readItems() {
    if (!fs.existsSync(jsonPath)) return {};

    try {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8')) || {};
    } catch (err) {
        console.error('[csgo-items] Failed to read items.json:', err.message);
        return {};
    }
}

const items = readItems();

function getItemById(itemId) {
    if (!itemId) return null;
    return items[String(itemId)] || null;
}

function getCatalogItems() {
    return Object.values(items || {});
}

module.exports = {
    items,
    getItemById,
    getCatalogItems,
    jsonPath
};