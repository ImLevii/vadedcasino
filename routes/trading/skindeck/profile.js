// Site account IDs are independent of Steam IDs (including Steam OAuth accounts).
function getSteamProfile(user) {
    const error = code => Object.assign(new Error(code), { code });
    if (!user?.steamTradeUrl || !user?.steamApiKey) throw error('STEAM_DETAILS_REQUIRED');
    let url;
    try { url = new URL(user.steamTradeUrl); } catch (_) { throw error('INVALID_TRADE_URL'); }
    const partner = url.searchParams.get('partner');
    if (url.origin !== 'https://steamcommunity.com' || url.pathname !== '/tradeoffer/new/'
        || url.username || url.password || !/^\d{1,10}$/.test(partner || '')
        || !/^[\w-]+$/.test(url.searchParams.get('token') || '')
        || BigInt(partner) < 1n || BigInt(partner) > 4294967295n) {
        throw error('INVALID_TRADE_URL');
    }
    const steamId = (76561197960265728n + BigInt(partner)).toString();
    if (user.steamId && String(user.steamId) !== steamId) throw error('STEAM_TRADE_ACCOUNT_MISMATCH');
    return { steamId, tradeUrl: url.href, apiKey: user.steamApiKey };
}

module.exports = { getSteamProfile };
