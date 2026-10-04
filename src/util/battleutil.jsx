export function fillEmptySlots(max, players) {
    let filledArray = Array(max).fill(null);

    for (let i = 0; i < (players || []).length; i++) {
        let index = players[i]?.slot - 1;
        if (index >= 0 && index < max) filledArray[index] = players[i];
    }

    return filledArray;
}

export function calculateWinnings(cases, rounds, players) {
    if (!Array.isArray(cases) || !Array.isArray(rounds) || !players) return 0

    let total = 0

    for (let round of rounds) {
        if (!round) continue

        let caseItems = cases?.find(c => c.id === round.caseId)?.items

        for (let item of round?.items || []) {
            let winningItem = caseItems?.find(i => item.itemId === i.id)
            total += Math.round(Number(winningItem?.price || 0) * 100)
        }
    }

    return Math.round(total / players) / 100
}

export function convertItems(items, cases, caseId, round) {
    let convertedItems = []

    let caseItems = cases?.find(c => c.id === caseId)?.items
    if (!caseItems) return []

    ;(items || []).forEach((item, index) => {
        const original = caseItems.find(i => i.id === item.itemId)
        if (!original) return
        let caseItem = {...original}
        caseItem.userId = item.userId
        caseItem.slot = item.slot || index + 1

        if (typeof round === 'number') {
            caseItem.round = round
        }

        convertedItems.push(caseItem)
    })

    return convertedItems
}

export function getWonItems(rounds, cases) {
    let items = []

    for (let i = 0; i < rounds?.length; i++) {
        let currentRound = rounds[i]
        if (!currentRound || !currentRound.caseId) continue
        items.push(...convertItems(currentRound.items, cases, currentRound.caseId, i + 1))
    }

    return items
}

/**
 * @param itemsInRound - CONVERTED Array of items, should include price on each object
 * @param playersPerTeam - Players per team so we can calculate winning teams
 * @returns {number []} - Calculates the teams that win the current round and returns it as an array of ints
 */
export function getRoundWinner(itemsInRound, playersPerTeam, gamemode = 'standard') {
    if (!itemsInRound?.length || !playersPerTeam) return []
    let teamValues = Array(Math.ceil(itemsInRound.length / playersPerTeam)).fill(0)
    let winningTeams = []

    for (let j = 0; j < itemsInRound.length; j++) {
        let team = Math.floor(j / playersPerTeam)
        teamValues[team] += Math.round(Number(itemsInRound[j].price || 0) * 100)
    }

    let biggestWinnings = gamemode === 'crazy' ? Math.min(...teamValues) : Math.max(...teamValues)

    for (let j = 0; j < teamValues.length; j++) {
        if (teamValues[j] === biggestWinnings) winningTeams.push(j)
    }

    return winningTeams
}
