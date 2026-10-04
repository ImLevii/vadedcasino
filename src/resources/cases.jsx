// Display strips and demo results share the case's weighted distribution.
// Normalize rounding drift so every strip has a complete landing slot.
export const pickCaseItem = (caseItems, random = Math.random) => {
    const pool = (caseItems || []).filter(item => Number(item.probability) > 0)
    const total = pool.reduce((sum, item) => sum + Number(item.probability), 0)
    if (!total) return caseItems?.[0]
    let ticket = Math.max(0, Math.min(1, random())) * total
    for (const item of pool) {
        ticket -= Number(item.probability)
        if (ticket < 0) return item
    }
    return pool[pool.length - 1]
}

export const generateRandomItems = (caseItems, chance) => {
    if (!Array.isArray(caseItems)) return [];

    if (!caseItems.length) return [];
    return Array.from({length: 56}, () => pickCaseItem(caseItems, chance ? () => chance.random() : Math.random));
}

// ── Cosmic Spin ──
// Rare items are masked as the Cosmic logo during the first spin,
// then revealed through an exclusive second spin of rare items only.

export const COSMIC_ITEM = {
    id: 'cosmic-spin-gem',
    name: 'Cosmic Spin',
    img: '/public/assets/icons/cosmic-gem.png',
    price: 0,
    cosmic: true
}

export const isRareItem = (item, casePrice) => {
    if (!item || item.cosmic) return false
    return item.price >= (casePrice || 0) * 4 || (item.probability > 0 && item.probability <= 5)
}

export const getRareItems = (caseItems, casePrice) => {
    if (!Array.isArray(caseItems)) return []
    return caseItems.filter(item => isRareItem(item, casePrice))
}

export const maskRareItems = (items, casePrice) => {
    if (!Array.isArray(items)) return []
    return items.map(item => isRareItem(item, casePrice) ? COSMIC_ITEM : item)
}

export const generateRareItems = (caseItems, casePrice, chance) => {
    const rares = getRareItems(caseItems, casePrice)
    if (!rares.length) return []

    const items = []
    for (let i = 0; i < 56; i++) {
        const roll = chance ? chance.random() : Math.random()
        items.push(rares[Math.floor(roll * rares.length)])
    }

    return items
}
