const express = require('express');
const router = express.Router();

const { doTransaction } = require('../../../database');
const io = require('../../../socketio/server');

const { sha256 } = require('../../../fairness');
const { roundDecimal, sendLog } = require('../../../utils');
const { newReward } = require('../functions');

router.get('/postback', async (req, res) => {

    const data = req.query;
    const hash = sha256(data.userId + data.ip + data.revenue + data.coins + process.env.LOOTABLY_POSTBACK_SECRET);

    if (hash !== data.hash) {
        console.log(`Invalid lootably hash`, data, hash);
        return res.json(0);
    }

    try {

        await doTransaction(async (connection, commit) => {
                    
            data.coins = +data.coins;
            data.revenue = +data.revenue;
            const [[exists]] = await connection.query('SELECT id, userId, coins, chargedbackAt FROM surveys WHERE provider = "lootably" AND transactionId = ? FOR UPDATE', [data.transactionId]);

            if (exists) {
        
                if (exists.chargedbackAt || data.status !== '0') {
                    console.log(`Lootably postback already processed`, data, exists);
                    return res.json(1);
                }
        
                await connection.query('UPDATE surveys SET chargedbackAt = NOW() WHERE id = ?', [exists.id]);
                await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)', [exists.userId, exists.coins, 'out', 'survey-chargeback', exists.id]);
                await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [exists.coins, exists.userId]);
                await commit();

                io.to(exists.userId).emit('balance', 'add', -exists.coins);
                sendLog('surveys', `Lootably survey completion #${exists.id} of 🪙${exists.coins} Coins for user \`${exists.userId}\` was charged back.`);
                return res.json(1);

            }

            const [[user]] = await connection.query('SELECT id, username, balance, xp FROM users WHERE id = ? FOR UPDATE', [data.userId]);
            
            const [result] = await connection.query('INSERT INTO surveys (userId, provider, transactionId, coins, ip, revenue) VALUES (?, ?, ?, ?, ?, ?)', [data.userId, 'lootably', data.transactionId, data.coins, data.ip, data.revenue]);
            await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)', [data.userId, data.coins, 'in', 'survey', result.insertId]);
            await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [data.coins, data.userId]);
            await commit();

            newReward(user, 'lootably', data.coins);
            sendLog('surveys', `*${user.username}* (\`${user.id}\`) completed Lootably survey #${result.insertId} and earned 🪙${data.coins} Coins.`);
            io.to(user.id).emit('balance', 'set', roundDecimal(user.balance + data.coins));
            return res.json(1);

        });

    } catch (e) {
        console.error(e);
        res.json(0);
    }

});

module.exports = router;