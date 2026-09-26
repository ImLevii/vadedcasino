const { sql } = require('../../../database');
const { sha256 } = require('../../../fairness');
const { ALGORITHM, verifyProof } = require('../../../fairness/randomorg');

async function getBattleFairness(id, privateKey = null) {
    const [[battle]] = await sql.query('SELECT * FROM battles WHERE id = ?', [id]);
    if (!battle || (battle.privKey || null) !== privateKey) return null;
    const [players] = await sql.query(`SELECT battlePlayers.userId, battlePlayers.slot, battlePlayers.team, users.username
        FROM battlePlayers INNER JOIN users ON users.id = battlePlayers.userId
        WHERE battleId = ? ORDER BY slot ASC`, [id]);
    const [rounds] = await sql.query(`SELECT battleRounds.round, battleRounds.caseVersionId, cases.name, cases.img, caseVersions.price
        FROM battleRounds INNER JOIN caseVersions ON caseVersions.id = battleRounds.caseVersionId
        INNER JOIN cases ON cases.id = caseVersions.caseId WHERE battleId = ? ORDER BY round ASC`, [id]);
    const [items] = await sql.query(`SELECT id, caseVersionId, name, img, price, rangeFrom, rangeTo FROM caseItems
        WHERE caseVersionId IN (?) ORDER BY rangeFrom ASC`, [rounds.map(r => r.caseVersionId)]);
    const [rolls] = await sql.query(`SELECT battleOpenings.round, caseOpenings.userId, caseOpenings.caseItemId,
        fairRolls.nonce, fairRolls.seed, fairRolls.result FROM battleOpenings
        INNER JOIN caseOpenings ON caseOpenings.id = battleOpenings.caseOpeningId
        INNER JOIN fairRolls ON fairRolls.id = caseOpenings.rollId WHERE battleOpenings.battleId = ? ORDER BY fairRolls.nonce ASC`, [id]);
    const proof = battle.randomProof ? JSON.parse(battle.randomProof) : null;
    return {
        id: battle.id, gamemode: battle.gamemode, teams: battle.teams, playersPerTeam: battle.playersPerTeam, createdAt: battle.createdAt, startedAt: battle.startedAt,
        endedAt: battle.endedAt, round: battle.round, winnerTeam: battle.winnerTeam,
        status: battle.endedAt ? 'finished' : battle.startedAt ? 'running' : players.length === battle.teams * battle.playersPerTeam ? 'waiting for randomness' : 'waiting for players',
        provider: battle.randomTicket ? 'RANDOM.ORG' : 'EOS (legacy)',
        algorithm: battle.randomTicket ? ALGORITHM : 'hmac-sha256-legacy-v1',
        serverSeedHash: sha256(battle.serverSeed),
        // Seats are locked before this seed is disclosed. Future rolls remain
        // hidden in the panel until their round, though the seeds are replayable.
        serverSeed: battle.startedAt ? battle.serverSeed : null,
        clientSeed: battle.clientSeed, ticketId: battle.randomTicket || null,
        eosBlock: battle.EOSBlock || null, proof,
        signatureVerified: proof ? verifyProof(proof) : null,
        players, rounds: rounds.map(r => ({ ...r,
            items: items.filter(item => item.caseVersionId === r.caseVersionId),
            rolls: battle.endedAt || r.round <= battle.round ? rolls.filter(roll => roll.round === r.round) : [],
        })),
        tieRule: 'Among tied teams, the lowest sum of rolled tickets wins. If those sums are equal, the highest team number wins.',
    };
}
module.exports = { getBattleFairness };
