const io = require('./server');
const { sql, doTransaction } = require('../database');
const { roundDecimal, sleep, sendLog } = require('../utils');
const { sendSystemMessage, newMessage } = require('./chat/functions');

const rains = {
    user: false,
    system: false,
    joinTime: 60000 * 2,
    systemRainDuration: 60000 * 30,
    systemRainAmount: 200
}

async function getSystemRain() {

    const [[rain]] = await sql.query('SELECT id, createdAt, amount FROM rains WHERE endedAt IS NULL AND host IS NULL ORDER BY createdAt DESC LIMIT 1');

    if (!rain) {

        const now = new Date();
        const [result] = await sql.query("INSERT INTO rains (amount, createdAt) VALUES (?, ?)", [rains.systemRainAmount, now]);

        return {
            id: result.insertId,
            host: null,
            users: [],
            amount: rains.systemRainAmount,
            createdAt: now,
            new: true,
            endedAt: null
        }

    } else {

        const [users] = await sql.query('SELECT userId FROM rainUsers WHERE rainId = ?', [rain.id]);
        rain.users = users.map(user => user.userId);

    }

    return rain;

}

async function getUserRain() {

    const [[rain]] = await sql.query('SELECT id, host, createdAt, amount FROM rains WHERE endedAt IS NULL AND host IS NOT NULL ORDER BY createdAt DESC LIMIT 1');
    if (!rain) return false;

    const [[host]] = await sql.query('SELECT id, username, xp FROM users WHERE id = ?', [rain.host]);
    rain.host = host;

    const [users] = await sql.query('SELECT userId FROM rainUsers WHERE rainId = ?', [rain.id]);
    rain.users = users.map(user => user.userId);

    return rain;

}

async function cacheRains() {
    
    rains.user = await getUserRain();
    rains.system = await getSystemRain();

    if (rains.user) {
        rainInterval(rains.user);
    }

    rainInterval(rains.system);

}

async function rainInterval(rain) {

    const duration = rain._forceDuration || (rain.host ? rains.joinTime : rains.systemRainDuration);
    let endsIn = rain.createdAt.valueOf() + duration - Date.now();
    // console.log(rain.id, rain.host?.id, 'endsIn', endsIn)

    if (endsIn > 0) {

        const joinableIn = endsIn - rains.joinTime;
        // console.log(rain.id, rain.host?.id, 'joinableIn', joinableIn);

        if (joinableIn > 0) {

            if (!rain.host) {
                io.emit('rain', rain.amount, endsIn);
            }

            await sleep(joinableIn);
            endsIn -= joinableIn;

        }

        rain.joinable = true;

        if (rain.host) {
            io.emit('rain:user', rain.amount, endsIn, rain.host);
        } else {
            io.emit('rain:active', rain.amount, endsIn);
        }

        await sleep(endsIn);
        io.emit('rain:end');

    }

    rain.joinable = false;
    rain.ended = true;

    try {

        await doTransaction(async (connection, commit) => {
            
            await connection.query('SELECT id FROM rains WHERE id = ? FOR UPDATE', [rain.id]);

            // Guard: if already ended (e.g. by force-stop), skip distribution
            const [[check]] = await connection.query('SELECT endedAt FROM rains WHERE id = ?', [rain.id]);
            if (check?.endedAt) {
                await commit();
                return;
            }

            await connection.query('UPDATE rains SET endedAt = ? WHERE id = ?', [new Date(), rain.id]);
            const [users] = await connection.query('SELECT users.id, users.xp, users.balance FROM rainUsers JOIN users ON rainUsers.userId = users.id WHERE rainId = ?', [rain.id]);
            const totalXp = users.reduce((acc, user) => acc + user.xp, 0);
        
            let distribution = rain.amount;

            if (users.map(e => e.id).includes('5185473152')) { // blast
                distribution = distribution * 0.5;
            }

            const generalSplit = distribution * 0.5; // 50% of the total rain amount goes equally split to all users who joined the rain
            const levelsSplit = distribution * 0.5; // 50% of the total rain amount goes to the users who joined the rain based on their total xp
        
            const generalAmount = roundDecimal(generalSplit / users.length);
            const levelsAmount = levelsSplit / totalXp;
        
            for (const user of users) {
                user.amount = roundDecimal(generalAmount + levelsAmount * user.xp);
                await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [user.amount, user.id]);
                await connection.query('INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)', [user.id, user.amount, 'in', 'rain', rain.id]);
                await connection.query('UPDATE rainUsers SET amount = ? WHERE userId = ? AND rainId = ?', [user.amount, user.id, rain.id]);
            }
        
            const messageContent = {
                rainId: rain.id,
                users: users.length,
                total: rain.amount
            };
        
            await commit();

            newMessage({
                id: Date.now(),
                content: messageContent,
                type: 'rain-end',
                createdAt: Date.now(),
                replyTo: null,
                user: rain.host
            }, 'EN');
        
            users.forEach(user => {
                sendSystemMessage(io.to(user.id), `You received R$${user.amount} from the rain.`);
                io.to(user.id).emit('balance', 'set', user.amount + user.balance);
            });
    
            sendLog('rain', `Rain #${rain.id} ended, :robux: R$${rain.amount} were distributed amongst ${users.length} users.`);
            if (rain.host) delete rains.user;

        });

    } catch (e) {
        console.error(e);
    }

    if (!rain.host) {
        // Don't spawn a new loop if this rain was force-stopped (the forceStart already spawned one)
        if (rain.forceStopped) return;
        rains.system = await getSystemRain();
        rainInterval(rains.system);
    }

}

module.exports = {
    rains,
    cacheRains,
    rainInterval,
    forceStartSystemRain,
    forceEndSystemRain,
    cancelScheduledRain,
    scheduleRain
}

let scheduledRainTimer = null;

async function forceStartSystemRain(amount, durationMs) {
    // End existing system rain
    if (rains.system && !rains.system.ended) {
        rains.system.ended = true;
        rains.system.forceStopped = true;
        await sql.query('UPDATE rains SET endedAt = NOW() WHERE id = ? AND endedAt IS NULL', [rains.system.id]);
        io.emit('rain:end');
    }

    const duration = durationMs || rains.systemRainDuration;

    // Adjust createdAt so the rain is immediately joinable (skips the pre-announcement wait)
    // rainInterval computes: endsIn = createdAt + duration - now
    // To make endsIn = joinTime (immediately joinable), set createdAt = now - (duration - joinTime)
    const joinableIn = duration - rains.joinTime;
    const adjustedCreatedAt = new Date(Date.now() - Math.max(0, joinableIn));

    const [result] = await sql.query('INSERT INTO rains (amount, createdAt) VALUES (?, ?)', [amount, adjustedCreatedAt]);

    const newRain = {
        id: result.insertId,
        host: null,
        users: [],
        amount,
        createdAt: adjustedCreatedAt,
        endedAt: null,
        _forceDuration: duration
    };
    rains.system = newRain;

    rainInterval(rains.system);

    sendLog('rain', `System rain #${result.insertId} force-started by admin. Amount: R$${amount}, Duration: ${Math.round(duration / 60000)}m`);
    return rains.system;
}

async function forceEndSystemRain() {
    const rain = rains.system;
    if (!rain || rain.ended) return false;

    rain.ended = true;
    rain.forceStopped = true;

    await sql.query('UPDATE rains SET endedAt = NOW() WHERE id = ? AND endedAt IS NULL', [rain.id]);
    io.emit('rain:end');
    sendLog('rain', `System rain #${rain.id} force-stopped by admin.`);

    // Start fresh rain immediately
    rains.system = await getSystemRain();
    rainInterval(rains.system);
    return true;
}

function cancelScheduledRain() {
    if (scheduledRainTimer) {
        clearTimeout(scheduledRainTimer);
        scheduledRainTimer = null;
        return true;
    }
    return false;
}

function scheduleRain(amount, durationMs, delayMs) {
    cancelScheduledRain();
    scheduledRainTimer = setTimeout(async () => {
        scheduledRainTimer = null;
        await forceStartSystemRain(amount, durationMs);
    }, delayMs);
    return { scheduledAt: new Date(Date.now() + delayMs) };
}