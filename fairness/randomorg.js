const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env.randomorg.local') });

const ENDPOINT = 'https://api.random.org/json-rpc/4/invoke';
const ALGORITHM = 'hmac-sha256-rejection-v2';
const publicKey = fs.readFileSync(path.join(__dirname, '../public/assets/fairness/random-org-public-key.pem'), 'utf8');
let nextRequestAt = 0;
let queue = Promise.resolve();

// Serialize requests and honor the service's advisory delay. Never log params:
// authenticated calls contain a server-only credential.
function rpc(method, params, fetcher = fetch) {
    const queuedAt = Date.now();
    const request = queue.then(async () => {
        const delay = nextRequestAt - Date.now();
        if (Date.now() - queuedAt > 10000 || delay > 5000) throw new Error('RANDOM_ORG_BUSY');
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
        let body;
        try {
            const response = await fetcher(ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method, params, id: crypto.randomUUID() }),
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) throw new Error('HTTP failure');
            body = await response.json();
        } catch {
            throw new Error('RANDOM_ORG_UNAVAILABLE');
        }
        nextRequestAt = Date.now() + Math.max(150, Number(body.result?.advisoryDelay) || 0);
        if (body.error || !body.result) throw new Error('RANDOM_ORG_REQUEST_FAILED');
        return body.result;
    });
    queue = request.catch(() => {});
    return request;
}

function apiKey() {
    if (!process.env.RANDOM_ORG_API_KEY) throw new Error('RANDOM_ORG_NOT_CONFIGURED');
    return process.env.RANDOM_ORG_API_KEY;
}

async function createTicket(call = rpc) {
    if (process.env.NODE_ENV === 'production' && (!process.env.RANDOM_ORG_LICENSE || process.env.RANDOM_ORG_LICENSE === 'developer')) throw new Error('RANDOM_ORG_DEVELOPER_LICENSE');
    const tickets = await call('createTickets', { apiKey: apiKey(), n: 1, showResult: true });
    if (!/^[a-f0-9]{16}$/.test(tickets?.[0]?.ticketId)) throw new Error('RANDOM_ORG_INVALID_TICKET');
    return tickets[0].ticketId;
}

function verifyProof(proof, key = publicKey) {
    try {
        return crypto.verify('RSA-SHA512', Buffer.from(JSON.stringify(proof.random)), key, Buffer.from(proof.signature, 'base64'));
    } catch { return false; }
}

function commitment(battle) {
    return { battleId: String(battle.id), serverSeedHash: crypto.createHash('sha256').update(battle.serverSeed).digest('hex'), algorithm: ALGORITHM, ...(battle.rulesHash ? { rulesHash: battle.rulesHash } : {}) };
}

function battleRules(battle, rounds, players) {
    return {
        gamemode: battle.gamemode, teams: Number(battle.teams), playersPerTeam: Number(battle.playersPerTeam),
        players: [...players].sort((a,b)=>a.slot-b.slot).map(p=>({id:String(p.userId ?? p.id),slot:Number(p.slot),team:Number(p.team)})),
        rounds: [...rounds].sort((a,b)=>a.round-b.round).map(r=>({round:Number(r.round),caseVersionId:String(r.caseVersionId),
            items:[...r.items].sort((a,b)=>a.rangeFrom-b.rangeFrom||a.id-b.id).map(i=>({id:String(i.id),rangeFrom:Number(i.rangeFrom),rangeTo:Number(i.rangeTo),price:Number(i.price).toFixed(2)}))})),
    };
}

function validateProof(proof, battle, verify = verifyProof) {
    const r = proof?.random;
    const expected = commitment(battle);
    if (!verify(proof) || r?.method !== 'generateSignedStrings' || r.n !== 1 || r.length !== 32 ||
        r.characters !== '0123456789abcdef' || r.ticketData?.ticketId !== battle.randomTicket ||
        !Array.isArray(r.data) || r.data.length !== 1 || !/^[a-f0-9]{32}$/.test(r.data[0]) ||
        Object.keys(expected).some(k => r.userData?.[k] !== expected[k])) {
        throw new Error('RANDOM_ORG_INVALID_PROOF');
    }
    if (process.env.NODE_ENV === 'production' && r.license?.type === 'developer') throw new Error('RANDOM_ORG_DEVELOPER_LICENSE');
    return r.data[0];
}

async function drawSeed(battle, call = rpc, verify = verifyProof) {
    // A persisted ticket is single-use. Recover its result on timeout/restart;
    // never allocate a replacement ticket or silently switch RNG providers.
    let proof = battle.randomProof ? JSON.parse(battle.randomProof) : null;
    if (!proof) {
        const ticket = await call('getTicket', { ticketId: battle.randomTicket });
        if (ticket.ticketId !== battle.randomTicket || ticket.showResult !== true) throw new Error('RANDOM_ORG_INVALID_TICKET');
        if (ticket.result) proof = ticket.result;
        else if (ticket.usedTime) throw new Error('RANDOM_ORG_RESULT_PENDING');
        else proof = await call('generateSignedStrings', {
            apiKey: apiKey(), n: 1, length: 32, characters: '0123456789abcdef', replacement: true,
            ticketId: battle.randomTicket, userData: commitment(battle),
        });
    }
    const clientSeed = validateProof(proof, battle, verify);
    return { clientSeed, proof: { random: proof.random, signature: proof.signature } };
}

// Uniform tickets in [1, 100000], without floating-point truncation/modulo bias.
function ticketFromDigest(digest) {
    let current = digest;
    for (let retry = 0; ; retry++) {
        for (let offset = 0; offset < 64; offset += 8) {
            const value = parseInt(current.slice(offset, offset + 8), 16);
            if (value < 4294900000) return value % 100000 + 1;
        }
        current = crypto.createHash('sha256').update(`${digest}:retry:${retry + 1}`).digest('hex');
    }
}

module.exports = { ALGORITHM, rpc, createTicket, drawSeed, verifyProof, validateProof, commitment, ticketFromDigest, battleRules };
