export function numberToColor(num) {
    switch(num) {
        case 0:
            return 'green'
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
            return 'red'
        case 14:
        case 13:
        case 12:
        case 11:
        case 10:
        case 9:
        case 8:
            return 'black'
        default:
            return 'green'
    }
}

export const ROULETTE_COLORS = {
    green: 0,
    red: 1,
    black: 2,
    bait: 3
}

export const ROULETTE_MULTIPLIERS = {
    green: 14,
    red: 2,
    black: 2,
    bait: 7
}

export function betColorToLabel(color) {
    if (color === 'bait') return 'DOUBLE'
    return String(color || '').toUpperCase()
}

export function betColorToDisplayName(color) {
    if (color === 'bait') return 'Double'
    return String(color || '').charAt(0).toUpperCase() + String(color || '').slice(1)
}