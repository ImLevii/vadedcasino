export const generateRandomItems = (caseItems, chance) => {
    if (!Array.isArray(caseItems)) return [];

    const randomImages = [];
    const sortedItems = caseItems.slice().sort((a, b) => a.price - b.price);

    for (let i = 0; i < 56; i++) {
        let randomTicket = chance ? chance.random() * 100 : Math.random() * 100;
        for (let item of sortedItems) {
            randomTicket -= item.probability;
            if (randomTicket <= 0) {
                randomImages.push(item);
                break;
            }
        }
    }

    return randomImages;
}

// ── Cosmic Spin ──
// Rare items are masked as the Cosmic logo during the first spin,
// then revealed through an exclusive second spin of rare items only.

export const COSMIC_ITEM = {
    id: 'cosmic-spin-gem',
    name: 'Cosmic Spin',
    img: '/public/assets/icons/cosmic-gem.svg',
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