const express = require('express');
const router = express.Router();

const axios = require("axios");
const { sha256 } = require('../../../fairness');
const crypto = require('crypto');

const { sql, doTransaction } = require('../../../database');
const io = require('../../../socketio/server');

const { isAuthed, apiLimiter } = require('../../auth/functions');
const { enabledFeatures, depositBonus } = require('../../admin/config');
const { roundDecimal, sendLog, newNotification, formatConsoleError } = require('../../../utils');
const { cryptoData } = require('../crypto/deposit/functions');
const { activateDepositRewards } = require('../../user/rewards/functions');

const WebSocket = require('ws');

const buildSignature = (data, secret) => {
    let signatureString = "";

    Object.keys(data).sort().forEach((key) => {
        if (key === "signature") return;
        if (typeof data[key] === "object") return;
        signatureString += data[key];
    })
    return sha256(`${signatureString}${secret}`);
}

const fees = {
    percent: 3.5,
    fixed: 0.35
}

const min = 5;
const max = 500;

function addFees(amount) {
    return +(Math.ceil((amount * (fees.percent / 100) + fees.fixed + amount) * 10) / 10).toFixed(2);
}

router.get('/', async (req, res) => {

    res.json({
        available: !!(enabledFeatures.cardDeposits && process.env.ZEBRA_API_KEY && process.env.ZEBRA_PARTNER_ID),
        baseMin: min,
        baseMax: max,
        minAmount: addFees(min),
        maxAmount: addFees(max),
        percentFee: fees.percent,
        fixedFee: fees.fixed, 
        rate: cryptoData.coinRate
    });

});

router.post('/', apiLimiter, isAuthed, async (req, res) => {

    if (!enabledFeatures.cardDeposits) return res.status(400).json({ error: 'DISABLED' });
    if (!process.env.ZEBRA_API_KEY || !process.env.ZEBRA_PARTNER_ID) return res.status(503).json({error:'PAYMENT_PROVIDER_UNAVAILABLE'});

    let amount = req.body.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'INVALID_AMOUNT' });

    amount = roundDecimal((amount / cryptoData.coinRate.coins) * cryptoData.coinRate.usd);
    if (amount < min) return res.status(400).json({ error: 'MIN_DEPOSIT_CC' });
    if (amount > max) return res.status(400).json({ error: 'MAX_DEPOSIT_CC' });

    const dataToEncrypt = {
        userId: crypto.randomUUID() // req.userId
    };

    const signature = buildSignature(dataToEncrypt, process.env.ZEBRA_API_KEY);
    const dataToSend = {
        ...dataToEncrypt,
        signature
    };

    let tradeRes;

    try {
        const { data: tradeResp } = await axios({
            url: `https://api.zebrasmarket.com/partner/${process.env.ZEBRA_PARTNER_ID}/trade_url`,
            method: 'POST',
            timeout: 6000,
            data: dataToSend,
            validateStatus: () => true,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        tradeRes = tradeResp;
    } catch (e) {
        console.error(formatConsoleError(e));
        return res.status(400).json({ error: 'UNKNOWN_ERROR' });
    }

    if (tradeRes.error) {
        if (tradeRes.spam) {
            console.log('Rate-limit reached on cc deposit');
            return res.status(400).json({ error: 'SLOW_DOWN' });
        } else {
            console.log(`Error on cc deposit`, tradeRes.msg || tradeRes);
        }
        return res.status(400).json({ error: 'UNKNOWN_ERROR' });
    }

    const data = tradeRes?.data;
    if (!data || !data.orderId || typeof data.url !== 'string') return res.status(503).json({error:'PAYMENT_PROVIDER_UNAVAILABLE'});
    const orderId = data.orderId;

    const token = data.url.split('token=')[1];
    const stripeRes = await getStripeUrl(token, orderId, amount);

    if (!stripeRes || stripeRes.error || !stripeRes.data.url) {
        console.log(`Error on cc deposit stripeRes`, stripeRes);
        return res.status(400).json({ error: 'UNKNOWN_ERROR' });
    }

    await sql.query('INSERT INTO cardDeposits (orderId, fiatAmount, userId) VALUES (?, ?, ?)', [orderId, amount, req.userId]);
    res.json({ url: stripeRes.data.url });

});

router.get('/ipn', incomingIpn);
router.post('/ipn', incomingIpn);

async function incomingIpn(req, res) {
    if (!process.env.ZEBRA_API_KEY) return res.status(503).json({error:'PAYMENT_PROVIDER_UNAVAILABLE'});

    const ipnSignature = buildSignature(req.body, process.env.ZEBRA_API_KEY);
    const sentSignature = req.body.signature;

    if (typeof sentSignature !== 'string' || !/^[a-f0-9]{64}$/i.test(sentSignature) || !crypto.timingSafeEqual(Buffer.from(ipnSignature, 'hex'), Buffer.from(sentSignature, 'hex'))) {
        return res.status(400).json({ error: 'INVALID_SIGNATURE' });
    }

    const orderId = req.body.orderId;
    const value = roundDecimal(+req.body.value / 100);

    try {

        await doTransaction(async (connection, commit) => {

            const [[deposit]] = await connection.query('SELECT cd.id, u.balance, u.username, userId, fiatAmount, completed FROM cardDeposits cd JOIN users u ON u.id = cd.userId WHERE orderId = ? FOR UPDATE', [orderId]);
            if (!deposit) {
                console.log(`Invalid orderId on cc deposit`, orderId);
                return res.status(400).json({ error: 'INVALID_ORDER_ID' });
            }
            
            if (deposit.completed) return res.json({ success: true });
    
            if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== Math.round(Number(deposit.fiatAmount) * 100)) {
                console.log(`Invalid amount on cc deposit`, value, deposit.fiatAmount);
                return res.status(400).json({ error: 'INVALID_AMOUNT' });
            }
    
            let coins = roundDecimal(deposit.fiatAmount * cryptoData.coinRate.coins / cryptoData.coinRate.usd);
    
            await connection.query('UPDATE cardDeposits SET coinAmount = ?, completed = 1 WHERE orderId = ?', [coins, orderId]);
            const [txResult] = await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)', [deposit.userId, coins, 'deposit', 'card', deposit.id]);
            await activateDepositRewards(connection, deposit.userId, coins);
    
            if (depositBonus) {
                const bonus = roundDecimal(coins * depositBonus);
                await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)', [deposit.userId, bonus, 'in', 'deposit-bonus', txResult.insertId]);
                coins = roundDecimal(coins + bonus);
            }
    
            await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [coins, deposit.userId]);
            await newNotification(deposit.userId, 'deposit-completed', { txId: txResult.insertId, amount: coins }, connection);
    
            await commit();

            io.to(deposit.userId).emit('balance', 'add', coins);
            sendLog('cardDeposits', `*${deposit.username}* (\`${deposit.userId}\`) deposited ${coins} coins ($${deposit.fiatAmount}usd) with credit card.`);
            res.json({ success: true });

        })

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'INTERNAL_ERROR' });
    }

}

async function getStripeUrl(token, orderId, amount) {

    return new Promise(async (resolve, reject) => {

        const ws = new WebSocket('wss://api.zebrasmarket.com/socket.io/?EIO=4&transport=websocket', {
            headers: {
                Origin: 'https://zebrasmarket.com'
            }
        });

        const b = [
            "entity:purchase",
            {
                "story": `CosmicLuck${orderId}`,
                "value": amount,
                "token": token
            }
        ];

        ws.on('open', function open() {
            // console.log('connected');
            ws.send(`40`);
        });

        let done = false;

        ws.on('message', function incoming(data) {

            const m = data.toString();

            if (m.startsWith('40{')) {
                ws.send(`420${JSON.stringify(b)}`);
            } else if (m == '2') {
                return ws.send(`3`);
            } else if (m.startsWith('430')) {
                const d = JSON.parse(m.slice(3));
                done = true;
                resolve(d?.[0]);
                ws.terminate();
            }

        });

        ws.on('close', function close() {
            if (!done) {
                console.log('cc close');
                resolve(false);
            }
        });

        ws.on('error', console.error);

        setTimeout(() => {
            if (!done) {
                ws.terminate();
                console.log('cc timeout');
                resolve(false);
            }
        }, 2000);

    });

}

module.exports = router;
