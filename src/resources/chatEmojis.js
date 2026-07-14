const unicodeEmoji = (value, name, keywords = '') => ({
    type: 'unicode',
    value,
    name,
    keywords
})

const animatedEmoji = (fallback, name, codepoint, keywords = '') => ({
    type: 'image',
    value: `:${name}:`,
    fallback,
    name,
    keywords,
    animated: true,
    url: `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/512.gif`
})

export const DEFAULT_CHAT_EMOJIS = [
    animatedEmoji('😂', 'laughing', '1f602', 'lol funny tears joy'),
    animatedEmoji('🥳', 'party', '1f973', 'celebrate birthday confetti'),
    animatedEmoji('🔥', 'fire', '1f525', 'hot lit flame'),
    animatedEmoji('😍', 'heart_eyes', '1f60d', 'love wow crush'),
    animatedEmoji('🤑', 'money_face', '1f911', 'cash win rich coins'),
    animatedEmoji('🚀', 'rocket', '1f680', 'moon launch fast'),
    animatedEmoji('🎉', 'celebrate', '1f389', 'party popper win'),
    animatedEmoji('💀', 'skull', '1f480', 'dead loss rip'),
    unicodeEmoji('😀', 'grinning', 'happy smile'),
    unicodeEmoji('🤣', 'rolling_laugh', 'lol funny tears'),
    unicodeEmoji('😊', 'blush', 'happy smile'),
    unicodeEmoji('🥰', 'love_face', 'hearts happy'),
    unicodeEmoji('😎', 'cool', 'sunglasses'),
    unicodeEmoji('🤩', 'star_eyes', 'wow excited'),
    unicodeEmoji('😏', 'smirk'),
    unicodeEmoji('🤔', 'thinking', 'hmm'),
    unicodeEmoji('😤', 'angry', 'mad steam'),
    unicodeEmoji('😭', 'crying', 'sad tears'),
    unicodeEmoji('😱', 'scream', 'scared shock'),
    unicodeEmoji('🙄', 'eye_roll'),
    unicodeEmoji('😴', 'sleeping', 'tired'),
    unicodeEmoji('🤯', 'mind_blown', 'shock wow'),
    unicodeEmoji('😈', 'devil', 'evil'),
    unicodeEmoji('👍', 'thumbs_up', 'yes good like'),
    unicodeEmoji('👎', 'thumbs_down', 'no bad dislike'),
    unicodeEmoji('👏', 'clap', 'applause'),
    unicodeEmoji('🙏', 'pray', 'please thanks'),
    unicodeEmoji('💪', 'strong', 'muscle'),
    unicodeEmoji('✌️', 'peace', 'victory'),
    unicodeEmoji('👋', 'wave', 'hello bye'),
    unicodeEmoji('🫡', 'salute'),
    unicodeEmoji('❤️', 'heart', 'love red'),
    unicodeEmoji('💚', 'green_heart', 'love cosmic'),
    unicodeEmoji('💯', 'hundred', 'perfect'),
    unicodeEmoji('✨', 'sparkles', 'shine'),
    unicodeEmoji('⭐', 'star', 'favorite'),
    unicodeEmoji('🏆', 'trophy', 'winner victory'),
    unicodeEmoji('💎', 'gem', 'diamond mines'),
    unicodeEmoji('💰', 'money_bag', 'cash coins win'),
    unicodeEmoji('🎰', 'slots', 'casino jackpot'),
    unicodeEmoji('🍀', 'clover', 'luck green'),
    unicodeEmoji('💸', 'money_wings', 'cash lose'),
    unicodeEmoji('👀', 'eyes', 'watch look'),
    unicodeEmoji('🥶', 'cold'),
    unicodeEmoji('🥵', 'hot'),
    unicodeEmoji('😋', 'yummy'),
    unicodeEmoji('🤭', 'giggle', 'oops laugh')
]

export function findChatEmoji(name) {
    return DEFAULT_CHAT_EMOJIS.find(emoji => emoji.type === 'image' && emoji.name === name)
}