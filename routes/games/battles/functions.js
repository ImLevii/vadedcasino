const { roundDecimal, sleep, sendLog } = require('../../../utils');
const io = require('../../../socketio/server');
const { sql, doTransaction } = require('../../../database');
const { mapItem } = require('../cases/functions');
const { getEOSBlockNumber, waitForEOSBlock } = require('../../../fairness/eos');
const { newBets } = require('../../../socketio/bets');
const { getResult, combine, sha256 } = require('../../../fairness');
const { getGameConfig } = require('../../../routes/admin/gameConfig');
const { ensureBattleBots } = require('./bots');
const { drawSeed, ticketFromDigest, battleRules } = require('../../../fairness/randomorg');

const cachedBattles = {};

async function getBattle(battleId, privKey) {

    if (!privKey) privKey = null;
    const cached = cachedBattles[battleId];

    if (cached) {
        if (cached.privKey && cached.privKey != privKey) return false;
        return cached;
    }

    const [[battle]] = await sql.query(`
        SELECT * FROM battles WHERE id = ? ORDER BY id DESC
    `, [battleId]);

    if (!battle || battle.privKey != privKey) return false;

    const [rounds] = await sql.query(`
        SELECT cases.id, cases.name, cases.slug, cases.img, caseVersions.price, caseVersions.id as revId, battleRounds.round FROM battleRounds
        INNER JOIN caseVersions ON battleRounds.caseVersionId = caseVersions.id
        INNER JOIN cases ON caseVersions.caseId = cases.id
        WHERE battleId = ? ORDER BY battleRounds.round ASC
    `, [battle.id]);

    const [items] = await sql.query(`
        SELECT id, itemId, name, img, price, rangeFrom, rangeTo, caseVersionId FROM caseItems WHERE caseVersionId IN (?)
    `, [rounds.map(e => e.revId)]);

    const cases = [...new Map(rounds.map(v => [v.id, v])).values()].map(e => {
        return {
            id: e.id,
            name: e.name,
            slug: e.slug,
            img: e.img,
            price: e.price,
            items: items.filter(i => i.caseVersionId == e.revId).map(e => mapItem(e))
        }
    });

    const [players] = await sql.query(`
        SELECT users.id, users.username, users.xp, users.role, users.anon, battlePlayers.slot, battlePlayers.team
        FROM battlePlayers INNER JOIN users ON battlePlayers.userId = users.id
        WHERE battlePlayers.battleId = ? ORDER BY battlePlayers.slot ASC
    `, [battle.id]);

    let openings = [];

    if (battle.startedAt) {
        [openings] = await sql.query(`
            SELECT battleOpenings.round, caseOpenings.userId, caseOpenings.caseItemId, fairRolls.seed, fairRolls.nonce, fairRolls.result FROM battleOpenings
            INNER JOIN caseOpenings ON battleOpenings.caseOpeningId = caseOpenings.id
            INNER JOIN fairRolls ON fairRolls.id = caseOpenings.rollId
            WHERE battleOpenings.battleId = ?
        `, [battle.id]);
    }

    const battleData = mapBattle(battle, cases, rounds, players, openings);
    if (!battle.startedAt) cachedBattles[battleId] = battleData;
    return battleData;

}

function battleCommitTo(battleId, commitTo) {

    if (!cachedBattles[battleId]) return;
    const battle = cachedBattles[battleId];

    battle.EOSBlock = commitTo;
    io.to('battles').emit('battles:commit', battleId, commitTo);
    io.to('battle:' + battleId).emit('battle:commit', battleId, commitTo);

}

function newBattlePlayer(battleId, user, slot, team) {

    if (!cachedBattles[battleId]) return;
    const battle = cachedBattles[battleId];

    const player = {
        id: user.id,
        username: user.username,
        xp: user.xp,
        role: user.role,
        slot,
        team
    };

    battle.players.push(player);
    io.to('battles').emit('battles:join', battleId, player);
    io.to('battle:' + battleId).emit('battle:join', battleId, player);

}

const minBattles = 10;

function battleEnded(battleId, winnerTeam, serverSeed, clientSeed) {

    const battle = cachedBattles[battleId];
    if (!battle) return;

    battle.winnerTeam = winnerTeam;
    battle.endedAt = new Date();
    battle.serverSeed = serverSeed;
    battle.clientSeed = clientSeed;

    io.to('battles').emit('battles:ended', battleId, winnerTeam);
    io.to('battle:' + battleId).emit('battle:ended', battleId, { winnerTeam, serverSeed, clientSeed });

    if (battle.privKey) {
        return setTimeout(() => {
            delete cachedBattles[battleId];
        }, 30000);
    }

    const publicBattles = Object.values(cachedBattles).filter(e => !e.privKey);

    if (publicBattles.length > minBattles) {
        const oldestEnded = publicBattles.filter(e => e.endedAt).sort((a, b) => a.endedAt - b.endedAt)[0];
        delete cachedBattles[oldestEnded?.id];
    }

}

async function cacheBattles() {

    const serverless = require('../../../runtime/context').enabled;
    if (serverless) for (const id of Object.keys(cachedBattles)) delete cachedBattles[id];

    await ensureBattleBots(sql);

    const [battles] = await sql.query(`
        SELECT * FROM battles WHERE endedAt IS NULL ORDER BY id DESC
    `);

    if (battles.length < minBattles) {
        const [recentBattles] = await sql.query(`
            SELECT * FROM battles WHERE endedAt IS NOT NULL ORDER BY id DESC LIMIT ?
        `, [minBattles - battles.length]);
        battles.push(...recentBattles);
    }

    if (!battles.length) return;
    const battlesIds = battles.map(e => e.id);

    const [rounds] = await sql.query(`
        SELECT cases.id, cases.name, cases.slug, cases.img, battleRounds.round, caseVersions.price, caseVersions.id as revId, battleRounds.battleId FROM battleRounds
        INNER JOIN caseVersions ON battleRounds.caseVersionId = caseVersions.id
        INNER JOIN cases ON caseVersions.caseId = cases.id
        WHERE battleId IN (?) ORDER BY battleRounds.round ASC
    `, [battlesIds]);

    const [items] = await sql.query(`
        SELECT id, itemId, name, img, price, rangeFrom, rangeTo, caseVersionId FROM caseItems WHERE caseVersionId IN (?)
    `, [rounds.map(e => e.revId)]);

    const [players] = await sql.query(`
        SELECT users.id, users.username, users.xp, users.role, users.anon, battlePlayers.slot, battlePlayers.team, battlePlayers.battleId
        FROM battlePlayers INNER JOIN users ON battlePlayers.userId = users.id
        WHERE battlePlayers.battleId IN (?) ORDER BY battlePlayers.slot ASC
    `, [battlesIds]);

    const cases = [...new Map(rounds.map(v => [v.id, v])).values()].map(e => {
        return {
            id: e.id,
            name: e.name,
            slug: e.slug,
            img: e.img,
            price: e.price,
            items: items.filter(i => i.caseVersionId == e.revId).map(e => mapItem(e))
        }
    });

    for (const battle of battles) {

        const battleCases = cases.filter(e => rounds.some(r => r.id == e.id));
        const battleRounds = rounds.filter(e => e.battleId === battle.id);
        const battlePlayers = players.filter(e => e.battleId === battle.id);

        const data = mapBattle(battle, battleCases, battleRounds, battlePlayers);
        cachedBattles[battle.id] = data;

        if (battlePlayers.length == (battle.teams * battle.playersPerTeam) && !battle.endedAt) {
            if (serverless) await startBattle(battle, battlePlayers);
            else startBattle(battle, battlePlayers).catch(error => console.error('[battles] Failed to resume battle:', battle.id, error));
        }

    }

}

function mapBattle(battle, cases, rounds, players, openings = []) {

    return {
        id: battle.id,
        entryPrice: battle.entryPrice,
        teams: battle.teams,
        round: battle.round,
        privKey: battle.privKey,
        minLevel: battle.minLevel,
        ownerFunding: battle.ownerFunding,
        playersPerTeam: battle.playersPerTeam,
        EOSBlock: battle.EOSBlock,
        randomTicket: battle.randomTicket,
        serverSeedHash: sha256(battle.serverSeed),
        clientSeed: battle.clientSeed,
        serverSeed: battle.startedAt ? battle.serverSeed : sha256(battle.serverSeed),
        gamemode: battle.gamemode,
        cosmicSpin: !!battle.cosmicSpin,
        cases,
        players: players.map(e => {
            return {
                id: e.id,
                username: e.username,
                xp: e.xp,
                role: e.role,
                slot: e.slot,
                team: e.team
            }
        }),
        rounds: rounds.map(e => {
            return {
                caseId: e.id,
                round: e.round,
                items: openings.filter(i => i.round == e.round).map(e => {
                    return {
                        userId: e.userId,
                        nonce: e.nonce,
                        result: e.result,
                        seed: e.seed,
                        itemId: e.caseItemId
                    }
                })
            }
        }),
        winnerTeam: battle.winnerTeam,
        createdAt: battle.createdAt,
        startedAt: battle.startedAt,
        endedAt: battle.endedAt
    }

}

function minifyBattle(battle) {
    const newBattle = {...battle};
    // delete newBattle.privKey;
    newBattle.cases = newBattle.cases.map(e => {
        const newCase = {...e};
        delete newCase.items;
        return newCase;
    });
    return newBattle;
}

const rollTime = 6500;
// Cosmic Spin battles need time for the exclusive second rare-only spin each round
const cosmicRollTime = 12000;
const getRollTime = (battle) => battle.cosmicSpin ? cosmicRollTime : rollTime;

const runningBattles = new Set();
const retryTimers = new Map();
async function startBattle(battle, players) {
    if (runningBattles.has(battle.id)) return;
    runningBattles.add(battle.id);
    clearTimeout(retryTimers.get(battle.id));
    retryTimers.delete(battle.id);
    try { return await runBattle(battle, players); }
    catch (error) {
        if (!error.message?.startsWith('RANDOM_ORG_')) throw error;
        if (cachedBattles[battle.id]) cachedBattles[battle.id].fairnessError = 'Waiting for verified randomness. Retrying automatically.';
        io.to('battle:' + battle.id).emit('battle:fairness', battle.id, { status: 'pending' });
        if (require('../../../runtime/context').enabled) return;
        const timer = setTimeout(() => startBattle(battle, players).catch(() => {}), 30000);
        timer.unref?.();
        retryTimers.set(battle.id, timer);
    } finally { runningBattles.delete(battle.id); }
}

async function runBattle(battle, players) {

    const [[storedBattle]] = await sql.query('SELECT * FROM battles WHERE id = ?', [battle.id]);
    if (!storedBattle || storedBattle.endedAt) return;
    battle = storedBattle;
    players = [...players].sort((a, b) => a.slot - b.slot);

    const [cases] = await sql.query(`
        SELECT cases.id, cases.name, cases.slug, cases.img, cases.creatorId, cases.commissionPct, caseVersions.price, caseVersions.id as revId, battleRounds.round FROM battleRounds
        INNER JOIN caseVersions ON battleRounds.caseVersionId = caseVersions.id
        INNER JOIN cases ON caseVersions.caseId = cases.id
        WHERE battleRounds.battleId = ? ORDER BY battleRounds.round ASC
    `, [battle.id]);

    // A restart may resume a battle after its final round was persisted but
    // before settlement. Reconstruct results from the committed seeds and use
    // the normal settlement path below, even when there are no rounds left.
    if (!cases.length) throw new Error('Battle has no case rounds');

    const [casesItems] = await sql.query(`SELECT * FROM caseItems WHERE caseVersionId IN(?);`, [cases.map(e => e.revId)]);

    const itemsByCase = {};
    casesItems.forEach(e => {
        if (!itemsByCase[e.caseVersionId]) itemsByCase[e.caseVersionId] = [];
        itemsByCase[e.caseVersionId].push(e);
    });
    
    let clientSeed = battle.clientSeed;
    if (battle.randomTicket) {
        battle.rulesHash = sha256(JSON.stringify(battleRules(battle, cases.map(c => ({...c, caseVersionId:c.revId, items:itemsByCase[c.revId]})), players)));
        const draw = await drawSeed(battle);
        clientSeed = draw.clientSeed;
        await sql.query('UPDATE battles SET clientSeed = ?, randomProof = ? WHERE id = ?', [clientSeed, JSON.stringify(draw.proof), battle.id]);
        if (cachedBattles[battle.id]) {
            cachedBattles[battle.id].clientSeed = clientSeed;
            delete cachedBattles[battle.id].fairnessError;
        }
        io.to('battle:' + battle.id).emit('battle:fairness', battle.id, { status: 'verified' });
    } else {
        // Existing battles retain their original committed EOS seed/algorithm.
        let commitTo = battle.EOSBlock;
        if (!commitTo) {
            const blockNumber = await getEOSBlockNumber();
            if (!Number.isFinite(blockNumber)) return;
            commitTo = blockNumber + 2;
            await sql.query('UPDATE battles SET EOSBlock = ? WHERE id = ?', [commitTo, battle.id]);
            battleCommitTo(battle.id, commitTo);
            if (require('../../../runtime/context').enabled) return;
        }
        clientSeed = clientSeed || await waitForEOSBlock(commitTo);
        if (!clientSeed) return;
    }

    let nonce = 0;
    const rounds = [];
    let total = 0;

    const teams = {};
    const teamsResults = {};

    for (let i = 0; i < cases.length; i++) {

        const c = cases[i];

        const caseItems = itemsByCase[c.revId];
        const items = [];

        for (let p = 0; p < players.length; p++) {

            nonce++;

            const player = players[p];
            const seed = combine(battle.serverSeed, clientSeed, nonce);
            const result = battle.randomTicket ? ticketFromDigest(seed) : getResult(seed);

            const item = caseItems.find(e => result >= e.rangeFrom && result <= e.rangeTo);
            if (!item) throw new Error('Item not found');
    
            items.push({
                userId: player.id,
                nonce: nonce,
                result,
                seed,
                itemId: item.id // mapItem(item)
            });

            const itemValue = battle.randomTicket ? Math.round(item.price * 100) : item.price;
            total += itemValue;
            teams[player.team] = (teams[player.team] || 0) + itemValue;
            teamsResults[player.team] = (teamsResults[player.team] || 0) + result;

        }

        rounds.push({
            caseId: c.id,
            caseVersionId: c.revId,
            round: c.round,
            items
        });

    }

    const cachedBattle = cachedBattles[battle.id];
    cachedBattle.rounds = rounds;

    const serverless = require('../../../runtime/context').enabled;

    if (battle.round && !serverless) {

        const timeTillNextRound = battle.createdAt.getTime() + (getRollTime(battle) * battle.round) - Date.now();
        await sleep(timeTillNextRound);

    }

    for (let i = battle.round; i < rounds.length; i++) {

        if (serverless && battle.startedAt && Date.now() < new Date(battle.startedAt).valueOf() + getRollTime(battle) * i) return;
        
        const round = rounds[i];

        try {
    
            await doTransaction(async (connection, commit) => {

                const [[currentBattle]] = await connection.query('SELECT startedAt FROM battles WHERE id = ? FOR UPDATE', [battle.id]);
                if (!currentBattle.startedAt) {

                    const uniqueCases = [...new Map(cases.map(e => [e.id, e])).values()].filter(e => e.creatorId);

                    for (const c of uniqueCases) {

                        const roundsUsed = cases.filter(e => e.id === c.id).length;
                        await connection.query('UPDATE cases SET openCount = openCount + ? WHERE id = ?', [players.length * roundsUsed, c.id]);

                        const payers = players.filter(p => String(p.role).toLowerCase() !== 'bot' && p.id !== c.creatorId).length;
                        const commission = roundDecimal(c.price * (c.commissionPct / 100) * payers * roundsUsed);

                        if (commission >= 0.01) {
                            await connection.query(
                                'INSERT INTO communityCaseEarnings (caseId, creatorId, amount, expiresAt) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
                                [c.id, c.creatorId, commission]
                            );
                        }

                    }

                    const fairRollsData = rounds.map(e => e.items).flat().map(e => [battle.serverSeed, clientSeed, e.nonce, e.seed, e.result]);
                    const fairRollsIds = [];
                
                    for (const row of fairRollsData) {
                        const [result] = await connection.query(`INSERT INTO fairRolls (serverSeed, clientSeed, nonce, seed, result) VALUES (?)`, [row]);
                        fairRollsIds.push(result.insertId);
                    }
                
                    const caseOpeningsData = rounds.map(r => r.items.map((e, i) => [e.userId, r.caseVersionId, fairRollsIds.shift(), e.itemId])).flat();
                    const caseOpeningsIds = [];
                
                    for (const row of caseOpeningsData) {
                        const [result] = await connection.query(`INSERT INTO caseOpenings (userId, caseVersionId, rollId, caseItemId) VALUES (?)`, [row]);
                        caseOpeningsIds.push(result.insertId);
                    }

                    const battleOpeningsData = rounds.map((r, o) => r.items.map((e, i) => [battle.id, caseOpeningsIds.shift(), r.round])).flat();
                
                    for (const row of battleOpeningsData) {
                        await connection.query(`INSERT INTO battleOpenings (battleId, caseOpeningId, round) VALUES (?)`, [row]);
                    }

                    await connection.query(`UPDATE battles SET round = ?, startedAt = NOW(), clientSeed = ? WHERE id = ?`, [round.round, clientSeed, battle.id]);
                    cachedBattle.startedAt = new Date();
                    battle.startedAt = cachedBattle.startedAt;
                    cachedBattle.clientSeed = clientSeed;
                    cachedBattle.serverSeed = battle.serverSeed;

                    
                } else {
                    await connection.query(`UPDATE battles SET round = ? WHERE id = ?`, [round.round, battle.id]);
                }

                await commit();

            });

        } catch (e) {
            return console.error(e);
        }

        if (i === 0) io.to('battle:' + battle.id).emit('battle:start', battle.id, rounds, clientSeed, battle.serverSeed);
        io.to('battle:' + battle.id).emit('battle:fairness', battle.id, { status: 'running' });
        io.to('battles').emit('battles:round', battle.id, round.round);
        io.to('battle:' + battle.id).emit('battle:round', battle.id, round.round);

        if (cachedBattle) {
            cachedBattle.round = round.round;
            // cachedBattle.rounds = rounds.slice(0, i + 1);
        }

        if (serverless) return;
        await sleep(getRollTime(battle));

    }

    if (serverless && Date.now() < new Date(battle.startedAt).valueOf() + getRollTime(battle) * rounds.length) return;

    const winnerTeams = Object.keys(teams).reduce((minKeys, currentKey) => {
        if (!minKeys.length) {
            return [currentKey];
        }
        
        const currentValue = teams[currentKey];
        const minValue = teams[minKeys[0]];
        
        if (battle.gamemode == 'crazy' ? currentValue < minValue : currentValue > minValue) {
            return [currentKey];
        } else if (currentValue === minValue) {
            return [...minKeys, currentKey];
        } else {
            return minKeys;
        }
    }, []);

    // get team from winnerTeams with highest price (lowest result) range rolls
    const winnerTeam = +(winnerTeams.reduce((a, b) => teamsResults[a] < teamsResults[b] ? a : b));

    const teamPlayers = players.filter(e => e.team == winnerTeam);
    const amount = roundDecimal(total / (battle.randomTicket ? 100 : 1) / teamPlayers.length);

    const winnersIds = teamPlayers.map(e => e.id);

    let settled = false;

    try {

        await doTransaction(async (connection, commit) => {

            const [[current]] = await connection.query('SELECT endedAt FROM battles WHERE id = ? FOR UPDATE', [battle.id]);
            if (!current || current.endedAt) return;
            await connection.query(`UPDATE users SET balance = balance + ? WHERE id IN(?) AND role <> ?`, [amount, winnersIds, 'BOT']);
            await connection.query(`UPDATE battles SET winnerTeam = ?, endedAt = NOW() WHERE id = ?`, [winnerTeam, battle.id]);
        
            await connection.query(`
                UPDATE bets SET completed = 1, winnings = CASE WHEN userId IN (?) THEN CAST(? AS DECIMAL(20,2)) ELSE 0 END WHERE game = ? AND gameId = ?`,
                [winnersIds, amount, 'battle', battle.id]
            );

            await commit();
            settled = true;

        });

    } catch (e) {
        return console.error(e);
    }

    if (!settled) return;

    let totalCost = 0;
        
    newBets(players.map(e => {

        let cost = battle.entryPrice;

        if (e.id == battle.ownerId && battle.ownerFunding) {
            const realEntryPrice = cases.reduce((a, b) => a + b.price, 0);
            const fundingAmount = (realEntryPrice - battle.entryPrice) * (players.length - 1)
            cost = roundDecimal(realEntryPrice + fundingAmount);
        }

        totalCost += cost;

        const winner = winnersIds.includes(e.id);
        if (winner) io.to(e.id).emit('balance', 'add', amount);
        
        return {
            user: e,
            amount: cost,
            edge: roundDecimal(amount * (getGameConfig('battles', 'houseEdge', 10) / 100)),
            payout: winner ? amount : 0,
            game: 'battle'
        }

    }));

    battleEnded(battle.id, winnerTeam, battle.serverSeed, clientSeed);

    const battleUrl = `${process.env.FRONTEND_URL}/battle/${battle.id}${battle.privKey ? `?pk=${battle.privKey}` : ''}`;

    sendLog('battles',{
        blocks: [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `*<${battleUrl}|Battle #${battle.id}>* Ended - Edge: :robux: R$${roundDecimal(totalCost - total)}`
            }
        }]
    });

}

module.exports = {
    cacheBattles,
    getBattle,
    cachedBattles,
    minifyBattle,
    newBattlePlayer,
    startBattle: require('../../../runtime/context').tracked(startBattle)
}
