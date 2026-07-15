const express = require('express');
const router = express.Router();

const { sql, doTransaction } = require('../../database');
const { rains, forceStartSystemRain, forceEndSystemRain, scheduleRain, cancelScheduledRain } = require('../../socketio/rain');
const io = require('../../socketio/server');
const { sendLog } = require('../../utils');

const resultsPerPage = 10;

router.get('/', async (req, res) => {

    const rain = rains.system;

    const sortBy = req.query.sortBy || 'amount';
    if (!['amount', 'createdAt'].includes(sortBy)) return res.status(400).json({ error: 'INVALID_SORT_BY' });

    const sortOrder = req.query.sortOrder || 'DESC';
    if (!['ASC', 'DESC'].includes(sortOrder)) return res.status(400).json({ error: 'INVALID_SORT_ORDER' });

    let searchQuery = 'WHERE rainId = ?';
    let searchArgs = [rain.id];

    const search = req.query.search;
    if (search) {
        if (typeof search !== 'string' || search.length < 1 || search.length > 30) return res.status(400).json({ error: 'INVALID_SEARCH' });
        searchQuery += ` AND LOWER(username) LIKE ?`;
        searchArgs.push(`%${search.toLowerCase()}%`);
    }

    let page = parseInt(req.query.page);
    page = !isNaN(page) && page > 0 ? page : 1;

    const offset = (page - 1) * resultsPerPage;

    const [[{ total }]] = await sql.query(`SELECT COUNT(*) as total FROM rainTips JOIN users ON rainTips.userId = users.id ${searchQuery}`, searchArgs);
    if (!total) return res.json({ page: 1, pages: 0, total: 0, data: [] });

    const pages = Math.ceil(total / resultsPerPage);

    if (page > pages) return res.status(404).json({ error: 'PAGE_NOT_FOUND' });

    const [data] = await sql.query(
        `SELECT users.id, users.username, users.role, users.xp, rainTips.amount, rainTips.createdAt FROM rainTips JOIN users ON rainTips.userId = users.id ${searchQuery} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
        searchArgs.concat([resultsPerPage, offset])
    );
    
    res.json({
        page,
        pages,
        total,
        data
    });

});

router.post('/add', async (req, res) => {

    const amount = parseFloat(req.body.amount);
    if (!amount || isNaN(amount) || amount < 0.01 || amount > 1000000) return res.status(400).json({ error: 'INVALID_AMOUNT' });
    setRain(req, res, amount)

});

router.post('/substract', async (req, res) => {

    const amount = parseFloat(req.body.amount);
    if (!amount || isNaN(amount) || amount < 0.01 || amount > 1000000) return res.status(400).json({ error: 'INVALID_AMOUNT' });
    setRain(req, res, -amount)

});

async function setRain(req, res, amount) {

    try {
        
        await doTransaction(async (connection, commit, rollback) => {
            
            const rain = rains.system;

            const [[currentRain]] = await connection.query('SELECT id, amount, host, createdAt, amount FROM rains WHERE id = ? FOR UPDATE', [rain.id]);
            if (currentRain.endedAt) return res.status(400).json({ error: 'RAIN_ENDED' });
            if (currentRain.amount + amount < 0) return res.status(400).json({ error: 'OUT_OF_BOUNDS' });

            await connection.query('UPDATE rains SET amount = amount + ? WHERE id = ?', [amount, rain.id]);            
            await commit();

            rain.amount += amount;
            io.emit('rain:pot', rain.amount);
        
            res.json({ success: true });
            sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* ${amount > 0 ? 'added' : 'substracted'} :robux: R$${Math.abs(amount)} ${amount > 0 ? 'to' : 'from'} the rain pot.`);
        
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'SERVER_ERROR' });
    }

}

// ── Rain status ──────────────────────────────────────────────
router.get('/status', (req, res) => {
    const system = rains.system;
    if (!system) return res.json({ active: false });

    const endsAt = system.createdAt
        ? new Date(system.createdAt.valueOf() + rains.systemRainDuration)
        : null;

    res.json({
        active: !system.ended,
        id: system.id,
        amount: system.amount,
        createdAt: system.createdAt,
        endsAt,
        timeLeftMs: endsAt ? Math.max(0, endsAt - Date.now()) : 0,
        joinable: system.joinable || false,
        usersJoined: system.users?.length || 0,
        config: {
            systemRainDuration: rains.systemRainDuration,
            systemRainAmount: rains.systemRainAmount,
            joinTime: rains.joinTime,
        }
    });
});

// ── Force start ───────────────────────────────────────────────
router.post('/start', async (req, res) => {
    const amount = parseFloat(req.body.amount);
    if (!amount || isNaN(amount) || amount < 1 || amount > 1000000) return res.status(400).json({ error: 'INVALID_AMOUNT' });

    const durationMinutes = parseFloat(req.body.durationMinutes);
    const durationMs = (!isNaN(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 120)
        ? durationMinutes * 60000
        : undefined;

    try {
        const rain = await forceStartSystemRain(amount, durationMs);
        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* force-started a system rain. Amount: R$${amount}${durationMs ? `, Duration: ${durationMinutes}m` : ''}`);
        res.json({ success: true, rain });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

// ── Force stop ────────────────────────────────────────────────
router.post('/stop', async (req, res) => {
    try {
        const stopped = await forceEndSystemRain();
        if (!stopped) return res.status(400).json({ error: 'NO_ACTIVE_RAIN' });
        sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* force-stopped the active system rain.`);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

// ── Schedule rain ─────────────────────────────────────────────
router.post('/schedule', (req, res) => {
    const amount = parseFloat(req.body.amount);
    if (!amount || isNaN(amount) || amount < 1 || amount > 1000000) return res.status(400).json({ error: 'INVALID_AMOUNT' });

    const delayMinutes = parseFloat(req.body.delayMinutes);
    if (isNaN(delayMinutes) || delayMinutes < 0.5 || delayMinutes > 1440) return res.status(400).json({ error: 'INVALID_DELAY' });

    const durationMinutes = parseFloat(req.body.durationMinutes);
    const durationMs = (!isNaN(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 120)
        ? durationMinutes * 60000
        : undefined;

    const result = scheduleRain(amount, durationMs, delayMinutes * 60000);
    sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* scheduled a rain of R$${amount} in ${delayMinutes}m.`);
    res.json({ success: true, scheduledAt: result.scheduledAt });
});

// ── Cancel schedule ───────────────────────────────────────────
router.post('/schedule/cancel', (req, res) => {
    const cancelled = cancelScheduledRain();
    res.json({ success: true, wasPending: cancelled });
});

// ── Update config ─────────────────────────────────────────────
router.post('/config', (req, res) => {
    const { systemRainAmount, systemRainDurationMinutes, joinTimeMinutes } = req.body;

    if (systemRainAmount !== undefined) {
        const amt = parseFloat(systemRainAmount);
        if (!isNaN(amt) && amt >= 1 && amt <= 1000000) rains.systemRainAmount = amt;
    }
    if (systemRainDurationMinutes !== undefined) {
        const dur = parseFloat(systemRainDurationMinutes);
        if (!isNaN(dur) && dur >= 1 && dur <= 120) rains.systemRainDuration = dur * 60000;
    }
    if (joinTimeMinutes !== undefined) {
        const jt = parseFloat(joinTimeMinutes);
        if (!isNaN(jt) && jt >= 0.5 && jt <= 10) rains.joinTime = jt * 60000;
    }

    sendLog('admin', `[\`${req.userId}\`] *${req.user.username}* updated rain config.`);
    res.json({ success: true, config: { systemRainAmount: rains.systemRainAmount, systemRainDuration: rains.systemRainDuration, joinTime: rains.joinTime } });
});

module.exports = router;