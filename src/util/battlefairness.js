const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));

async function ticket(digest, algorithm) {
    if (algorithm === 'hmac-sha256-legacy-v1') return parseInt(digest.slice(0, 15), 16) % 100000 + 1;
    if (algorithm !== 'hmac-sha256-rejection-v2') throw new Error('Unsupported algorithm');
    let current = digest;
    for (let retry = 0; ; retry++) {
        for (let offset = 0; offset < 64; offset += 8) {
            const n = parseInt(current.slice(offset, offset + 8), 16);
            if (n < 4294900000) return n % 100000 + 1;
        }
        current = await sha256(`${digest}:retry:${retry + 1}`);
    }
}

let signingKey;
export async function hashBattleRules(data) {
    return sha256(JSON.stringify({
        gamemode:data.gamemode, teams:Number(data.teams), playersPerTeam:Number(data.playersPerTeam),
        players:[...data.players].sort((a,b)=>a.slot-b.slot).map(p=>({id:String(p.userId ?? p.id),slot:Number(p.slot),team:Number(p.team)})),
        rounds:[...data.rounds].sort((a,b)=>a.round-b.round).map(r=>({round:Number(r.round),caseVersionId:String(r.caseVersionId),
            items:[...r.items].sort((a,b)=>a.rangeFrom-b.rangeFrom||a.id-b.id).map(i=>({id:String(i.id),rangeFrom:Number(i.rangeFrom),rangeTo:Number(i.rangeTo),price:Number(i.price).toFixed(2)}))})),
    }));
}
async function verifySignature(proof) {
    if (!signingKey) {
        const response = await fetch('/assets/fairness/random-org-public-key.pem');
        if (!response.ok) throw new Error('Signing key unavailable');
        const pem = await response.text();
        const bytes = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), c => c.charCodeAt(0));
        signingKey = await crypto.subtle.importKey('spki', bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' }, false, ['verify']);
    }
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', signingKey,
        Uint8Array.from(atob(proof.signature), c => c.charCodeAt(0)), encoder.encode(JSON.stringify(proof.random)));
}

export async function verifyBattleProof(data) {
    let signature = null;
    if (data.proof) {
        const r = data.proof.random;
        signature = await verifySignature(data.proof) && r.ticketData?.ticketId === data.ticketId &&
            r.method === 'generateSignedStrings' && r.n === 1 && r.length === 32 &&
            r.characters === '0123456789abcdef' && r.data?.length === 1 &&
            r.data[0] === data.clientSeed && r.userData?.battleId === String(data.id) &&
            r.userData?.serverSeedHash === data.serverSeedHash && r.userData?.algorithm === data.algorithm &&
            r.userData?.rulesHash === await hashBattleRules(data);
    }
    if (!data.serverSeed) return { signature, commitment: null, rolls: {}, winner: null };
    const commitment = await sha256(data.serverSeed) === data.serverSeedHash;
    const key = await crypto.subtle.importKey('raw', encoder.encode(data.serverSeed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const rolls = {};
    for (const round of data.rounds) {
        for (const roll of round.rolls) {
            const digest = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${data.clientSeed}:${roll.nonce}`)));
            const result = await ticket(digest, data.algorithm);
            const player = data.players.find(p => p.userId === roll.userId);
            const expectedNonce = (round.round - 1) * data.players.length + player?.slot;
            const item = round.items.find(i => result >= i.rangeFrom && result <= i.rangeTo);
            rolls[roll.nonce] = commitment && roll.nonce === expectedNonce && digest === roll.seed &&
                result === Number(roll.result) && item?.id === roll.caseItemId;
        }
    }
    let winner = null;
    if (data.endedAt) {
        const totals = {}, sums = {};
        for (const round of data.rounds) for (const roll of round.rolls) {
            const team = data.players.find(p => p.userId === roll.userId)?.team;
            const item = round.items.find(i => i.id === roll.caseItemId);
            const value = data.algorithm === 'hmac-sha256-rejection-v2' ? Math.round(Number(item?.price) * 100) : Number(item?.price);
            totals[team] = (totals[team] || 0) + value;
            sums[team] = (sums[team] || 0) + Number(roll.result);
        }
        const best = data.gamemode === 'crazy' ? Math.min(...Object.values(totals)) : Math.max(...Object.values(totals));
        const tied = Object.keys(totals).filter(team => totals[team] === best);
        const expectedWinner = tied.reduce((a,b) => sums[a] < sums[b] ? a : b, tied[0]);
        winner = Object.keys(rolls).length === data.rounds.length * data.players.length && Object.values(rolls).every(Boolean) && Number(expectedWinner) === Number(data.winnerTeam);
    }
    return { signature, commitment, rolls, winner };
}
