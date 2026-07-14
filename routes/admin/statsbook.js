const express = require('express');
const router = express.Router();

const { sql } = require('../../database');
const { roundDecimal } = require('../../utils');

const resultsPerPage = 10;
const msInDay = 86400000;

let launchDay = false;

router.get('/', async (req, res) => {
    try {

    if (!launchDay) {
        [[{ launchDay }]] = await sql.query('SELECT MIN(createdAt) as launchDay FROM users');
        launchDay.setHours(0, 0, 0, 0);
        launchDay = launchDay.valueOf();
    }

    const today = Date.now();
    const totalDays = Math.ceil((today - launchDay) / msInDay);

    const pages = Math.ceil(totalDays / resultsPerPage);

    let page = parseInt(req.query.page);
    page = !isNaN(page) && page > 0 ? page : 1;

    if (page > pages) return res.status(404).json({ error: 'PAGE_NOT_FOUND' });

    const dayFromMs = today - ((page - 1) * resultsPerPage) * msInDay;
    const dayFrom = toDateString(dayFromMs - resultsPerPage * msInDay);
    const dayTo = toDateString(dayFromMs);
    // console.log(dayFrom, dayTo)

    const days = [];

    const [newUsers] = await sql.query(` 
        SELECT DATE(createdAt) as date, COUNT(*) as total
        FROM users WHERE DATE(createdAt) >= ? AND DATE(createdAt) <= ? 
        GROUP BY date ORDER BY date DESC
    `, [dayFrom, dayTo]);

    const newUsersMap = {};
    newUsers.forEach(e => newUsersMap[toDateString(e.date)] = e.total);

    const [skinDeposits] = await sql.query(`
        SELECT DATE(createdAt) as date, SUM(amount) as total
        FROM transactions
        WHERE type = 'deposit' AND method = 'skindeck' AND DATE(createdAt) >= ? AND DATE(createdAt) <= ?
        GROUP BY date ORDER BY date DESC
    `, [dayFrom, dayTo]);

    const skinDepositsMap = {};
    skinDeposits.forEach(e => skinDepositsMap[toDateString(e.date)] = e.total);

    const [cryptoDeposits] = await sql.query(`
        SELECT DATE(createdAt) as date, SUM(fiatAmount) as total
        FROM cryptoDeposits WHERE DATE(createdAt) >= ? AND DATE(createdAt) <= ?
        GROUP BY date ORDER BY date DESC
    `, [dayFrom, dayTo]);

    const cryptoDepositsMap = {};
    cryptoDeposits.forEach(e => cryptoDepositsMap[toDateString(e.date)] = e.total);

    const [cryptoWithdraws] = await sql.query(`
        SELECT DATE(modifiedAt) as date, SUM(fiatAmount) as total
        FROM cryptoWithdraws WHERE status = 'completed' AND DATE(modifiedAt) >= ? AND DATE(modifiedAt) <= ?
        GROUP BY date ORDER BY date DESC
    `, [dayFrom, dayTo]);

    const cryptoWithdrawsMap = {};
    cryptoWithdraws.forEach(e => cryptoWithdrawsMap[toDateString(e.date)] = e.total);

    const [creditCardDeposits] = await sql.query(`
        SELECT DATE(modifiedAt) as date, SUM(fiatAmount) as total
        FROM cardDeposits WHERE completed = 1 AND DATE(modifiedAt) >= ? AND DATE(modifiedAt) <= ?
        GROUP BY date ORDER BY date DESC
    `, [dayFrom, dayTo]);

    const creditCardDepositsMap = {};
    creditCardDeposits.forEach(e => creditCardDepositsMap[toDateString(e.date)] = roundDecimal(e.total * 0.9));

    const [giftCardDeposits] = await sql.query(`
        SELECT DATE(redeemedAt) as date, SUM(amount) as total
        FROM giftCards WHERE DATE(redeemedAt) >= ? AND DATE(redeemedAt) <= ? AND usd = 1
        GROUP BY date ORDER BY date DESC
    `, [dayFrom, dayTo]);

    const giftCardDepositsMap = {};
    giftCardDeposits.forEach(e => giftCardDepositsMap[toDateString(e.date)] = e.total);

    const [surveys] = await sql.query(`
        SELECT DATE(createdAt) as date, SUM(revenue) as total
        FROM surveys WHERE chargedbackAt IS NULL AND DATE(createdAt) >= ? AND DATE(createdAt) <= ?
        GROUP BY date ORDER BY date DESC
    `, [dayFrom, dayTo]);

    const surveysMap = {};
    surveys.forEach(e => surveysMap[toDateString(e.date)] = e.total); // roundDecimal(e.total * 0.25));

    const offset = (page - 1) * resultsPerPage;
    const max = Math.min(totalDays - offset, resultsPerPage);

    for (let i = 0; i < max; i++) {
    
        const day = toDateString(dayFromMs - i * msInDay);

        const newUsersCount = newUsersMap[day] || 0;

        const skinDepositsCount = skinDepositsMap[day] || 0;

        const giftCardDepositsCount = giftCardDepositsMap[day] || 0;
        const cryptoDepositsCount = (cryptoDepositsMap[day] || 0);
        const cryptoWithdrawsCount = (cryptoWithdrawsMap[day] || 0);
        const creditCardDepositsCount = creditCardDepositsMap[day] || 0;
        const surveysRevenue = surveysMap[day] || 0;

        days.push({
            date: day,
            npc: newUsersCount,
            skinDeposits: skinDepositsCount,
            cryptoDeposits: cryptoDepositsCount,
            cryptoWithdraws: cryptoWithdrawsCount,
            giftCardDeposits: giftCardDepositsCount,
            creditCardDeposits: creditCardDepositsCount,
            surveysRevenue,
            netProfit: roundDecimal(cryptoDepositsCount - cryptoWithdrawsCount + giftCardDepositsCount + creditCardDepositsCount + surveysRevenue)
        });

    }
    
    res.json({
        page,
        pages,
        total: totalDays,
        data: days
    })

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }

});

function toDateString(date) {
    date = new Date(date);
    return date.toISOString().split('T')[0]
}

module.exports = router;