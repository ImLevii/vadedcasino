const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { drawSeed, validateProof, verifyProof, commitment, ticketFromDigest, createTicket } = require('../fairness/randomorg');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const battle = { id: 123, serverSeed: 'committed-server-seed', randomTicket: '0123456789abcdef' };
function signed() {
    const random = { method:'generateSignedStrings', n:1, length:32, characters:'0123456789abcdef',
        data:['abcdef0123456789abcdef0123456789'], ticketData:{ticketId:battle.randomTicket},
        userData:commitment(battle), license:{type:'developer'} };
    return { random, signature:crypto.sign('RSA-SHA512',Buffer.from(JSON.stringify(random)),keys.privateKey).toString('base64') };
}
const verify = p => verifyProof(p, keys.publicKey);

test('signed randomness binds the ticket, battle, seed commitment and algorithm', () => {
    const proof = signed();
    assert.equal(verify(proof), true);
    assert.equal(validateProof(proof,battle,verify),proof.random.data[0]);
    for (const change of [p=>p.random.data[0]='f'.repeat(32),p=>p.random.ticketData.ticketId='f'.repeat(16),p=>p.random.userData.battleId='124']) {
        const altered = structuredClone(proof); change(altered);
        assert.throws(()=>validateProof(altered,battle,verify),/INVALID_PROOF/);
    }
    assert.throws(()=>validateProof(proof,{...battle,serverSeed:'different'},verify),/INVALID_PROOF/);
    assert.throws(()=>validateProof(proof,{...battle,randomTicket:'f'.repeat(16)},verify),/INVALID_PROOF/);
});

test('lost draw response recovers the same ticket without generating a second seed', async () => {
    const previous=process.env.RANDOM_ORG_API_KEY;
    process.env.RANDOM_ORG_API_KEY='test-only';
    try {
        const proof=signed();let used=false,draws=0;
        const call=async(method,params)=>{
            assert.equal(params.ticketId,battle.randomTicket);
            if(method==='getTicket')return {ticketId:battle.randomTicket,showResult:true,result:used?proof:null};
            assert.equal(method,'generateSignedStrings');draws++;used=true;
            assert.deepEqual(params.userData,commitment(battle));
            throw Error('RANDOM_ORG_UNAVAILABLE');
        };
        await assert.rejects(drawSeed(battle,call,verify),/UNAVAILABLE/);
        const recovered=await drawSeed(battle,call,verify);
        assert.equal(recovered.clientSeed,proof.random.data[0]);assert.equal(draws,1);
        const persisted=await drawSeed({...battle,randomProof:JSON.stringify(recovered.proof)},()=>{throw Error('Unexpected network call')},verify);
        assert.deepEqual(persisted,recovered);
    } finally { if(previous===undefined)delete process.env.RANDOM_ORG_API_KEY;else process.env.RANDOM_ORG_API_KEY=previous; }
});

test('production refuses Developer keys/results before creating tickets', async () => {
    const env={NODE_ENV:process.env.NODE_ENV,RANDOM_ORG_LICENSE:process.env.RANDOM_ORG_LICENSE};
    process.env.NODE_ENV='production';process.env.RANDOM_ORG_LICENSE='developer';
    try {
        await assert.rejects(createTicket(()=>{throw Error('Should not reach API')}),/DEVELOPER_LICENSE/);
        assert.throws(()=>validateProof(signed(),battle,verify),/DEVELOPER_LICENSE/);
    } finally {for(const [k,v]of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});

test('ticket rejection removes modulo bias and handles the all-rejected digest', () => {
    assert.equal(ticketFromDigest('0'.repeat(64)),1);
    assert.equal(ticketFromDigest('0001869f'+'0'.repeat(56)),100000);
    assert.equal(ticketFromDigest((4294899999).toString(16)+'0'.repeat(56)),100000);
    assert.equal(ticketFromDigest((4294900000).toString(16)+'0000002a'+'0'.repeat(48)),43);
    const retry=crypto.createHash('sha256').update('f'.repeat(64)+':retry:1').digest('hex');
    assert.equal(ticketFromDigest('f'.repeat(64)),ticketFromDigest(retry));
});

test('browser verifier independently validates signatures, nonces and item ranges', async () => {
    const source=fs.readFileSync(path.join(__dirname,'../src/util/battlefairness.js'),'utf8');
    const {verifyBattleProof,hashBattleRules}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    const original=global.fetch;
    global.fetch=async()=>new Response(keys.publicKey.export({type:'spki',format:'pem'}));
    try {
        const proof=signed(), clientSeed=proof.random.data[0];
        const seed=crypto.createHmac('sha256',battle.serverSeed).update(clientSeed+':1').digest('hex');
        const data={gamemode:"group",teams:1,playersPerTeam:1,id:battle.id,ticketId:battle.randomTicket,algorithm:commitment(battle).algorithm,serverSeedHash:commitment(battle).serverSeedHash,
            serverSeed:battle.serverSeed,clientSeed,proof,players:[{userId:1,slot:1,team:1}],rounds:[{round:1,caseVersionId:7,items:[{id:8,price:1.25,rangeFrom:1,rangeTo:100000}],rolls:[{nonce:1,userId:1,caseItemId:8,result:ticketFromDigest(seed),seed}]}]};
        data.proof.random.userData.rulesHash=await hashBattleRules(data);
        data.proof.signature=crypto.sign('RSA-SHA512',Buffer.from(JSON.stringify(data.proof.random)),keys.privateKey).toString('base64');
        assert.deepEqual(await verifyBattleProof(data),{signature:true,commitment:true,rolls:{1:true},winner:null});
        data.endedAt=new Date().toISOString();data.winnerTeam=1;
        assert.equal((await verifyBattleProof(data)).winner,true);
        data.winnerTeam=2;assert.equal((await verifyBattleProof(data)).winner,false);
        data.rounds[0].items[0].price=50;
        assert.equal((await verifyBattleProof(data)).signature,false);
        data.rounds[0].items[0].price=1.25;
        data.rounds[0].rolls[0].caseItemId=9;
        assert.equal((await verifyBattleProof(data)).rolls[1],false);
        data.serverSeed='tampered';
        assert.equal((await verifyBattleProof(data)).commitment,false);
        data.proof.random.data[0]='f'.repeat(32);
        assert.equal((await verifyBattleProof(data)).signature,false);
    } finally {global.fetch=original;}
});
