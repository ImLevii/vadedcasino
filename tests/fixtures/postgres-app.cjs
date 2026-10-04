// Run the real Express application against an isolated embedded PostgreSQL.
const { PGlite } = require('@electric-sql/pglite');
const { buildSchema } = require('../../database/postgres-sql');
const adapter = require('../../database/postgres');

async function main() {
    const db = new PGlite({ parsers: { 20: adapter.parseBigInt, 1700: Number } });
    await db.exec(buildSchema());
    if (process.env.PROVIDERS_TEST === '1') {
        // Existing deployments may have the first provider schema, without settlement fields.
        await db.exec('ALTER TABLE "providerPayments" DROP COLUMN "settled", DROP COLUMN "settlementRef", DROP COLUMN "flow"');
    }
    const hash = await require('bcrypt').hash('postgres-smoke-password', 4);
    await db.query('INSERT INTO users (id, username, "passwordHash", role, perms) VALUES (1, $1, $2, $3, 4)', ['pgsmoke', hash, 'OWNER']);
    let queue = Promise.resolve();
    async function acquire() {
        let release;
        const previous = queue;
        queue = new Promise(resolve => { release = resolve; });
        await previous;
        return release;
    }
    class EmbeddedPool {
        on() {}
        async query(text, values) {
            const release = await acquire();
            try { return await db.query(text, values); } finally { release(); }
        }
        async connect() {
            const release = await acquire();
            return { query: (text, values) => db.query(text, values), release };
        }
        end() { return db.close(); }
    }
    const createPool = adapter.createPostgresPool;
    adapter.createPostgresPool = url => createPool(url, EmbeddedPool);
    // Keep third-party traffic out of a database smoke test.
    const axios = require('axios');
    const providerFixture=process.env.PROVIDERS_TEST==='1'?await require('./payment-providers.cjs').install(db,axios):null;
    const cashierTest=process.env.CASHIER_TEST==='1';
    const cashierCalls={payouts:[],giftcardBroadcasts:0};
    if(cashierTest){
        // Exercise upgrading the existing production schema, not just a fresh install.
        await db.exec('ALTER TABLE "cryptoDeposits" ALTER COLUMN "coinAmount" TYPE INTEGER');
        await db.query(`INSERT INTO users (id,username,role,perms,balance,"cryptoAllowance") VALUES (20,'Cashier player','USER',0,100,100),(21,'Cashier rollback','USER',0,100,100)`);
        await db.query(`INSERT INTO "cryptoWallets" ("userId",currency,address) VALUES (20,'LTC','fixture-wallet'),(21,'LTC','rollback-wallet')`);
        await db.query(`INSERT INTO "cryptoWithdraws" (id,"userId","coinAmount","fiatAmount","cryptoAmount",address,currency,chain,status) VALUES (901,20,10,7,7,'fixture-destination','LTC','LTC','pending'),(902,20,12,8.4,8.4,'fixture-uncertain','LTC','LTC','pending'),(903,20,8,5.6,5.6,'fixture-cancel','LTC','LTC','pending')`);
        await db.query(`UPDATE "cryptoWithdraws" SET status='sending' WHERE id=902`);
        cashierCalls.payouts.push(902); // Transfer accepted before the provider was retired.
        await db.query(`INSERT INTO transactions ("userId",amount,type,method,"methodId") VALUES (20,10,'out','crypto',901),(20,12,'out','crypto',902),(20,8,'out','crypto',903)`);
        await db.exec(`CREATE FUNCTION reject_cashier_credit() RETURNS trigger AS $$ BEGIN IF NEW.id = 21 AND NEW.balance > OLD.balance THEN RAISE EXCEPTION 'fixture credit failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql; CREATE TRIGGER cashier_failed_credit BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION reject_cashier_credit();`);
        const originalCreate=axios.create;
        axios.create=options=>{
            if(options.baseURL!=='https://api.mexc.com')return originalCreate(options);
            const client=async(input)=>{
                const config=typeof input==='string'?{url:input}:input;
                if(config.url==='/api/v3/capital/config/getall')return {data:[{coin:'LTC',name:'Litecoin',networkList:[{netWork:'LTC',name:'Litecoin',withdrawEnable:true,withdrawFee:'0.01',withdrawMin:'0.1',withdrawMax:'100000',withdrawIntegerMultiple:'0.00000001'}]}]};
                if(config.url==='/api/v3/ticker/price')return {data:[{symbol:'LTCUSDT',price:'1'}]};
                if(config.url==='/api/v3/account')return {data:{balances:[{asset:'LTC',free:'100000'}]}};
                if(config.url==='/api/v3/capital/withdraw'){
                    if(require('../../runtime/context').storage.getStore())throw new Error('Payout occurred before durable commit');
                    const id=Number(config.params.withdrawOrderId.replace('cosmicluck-',''));
                    const [[claim]]=await require('../../database').sql.query('SELECT status FROM cryptoWithdraws WHERE id=?',[id]);
                    if(claim.status!=='sending')throw new Error('Claim was not committed');
                    cashierCalls.payouts.push(id);
                    if(id===902)throw new Error('Simulated provider timeout after accepting transfer');
                    return {data:{id:'mexc-'+id}};
                }
                if(config.url==='/api/v3/capital/withdraw/history')return {data:cashierCalls.payouts.map(id=>({id:'mexc-'+id,withdrawOrderId:'cosmicluck-'+id,address:id===902?'fixture-uncertain':'fixture-destination',coin:'LTC',status:7,txId:'fixture-chain-'+id}))};
                throw new Error('Unexpected MEXC request');
            };
            client.interceptors={request:{use(){}}};return client;
        };
    }
    let steamLogins = 0;
    let googleLogins = 0;
    axios.get = async (url, options) => {
        if (url.startsWith('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/')) {
            steamLogins++;
            if (steamLogins === 3) throw new Error('Temporary Steam outage');
            return { data: { response: { players: [{
                steamid: '76561198012345678',
                personaname: steamLogins === 1 ? '  星 🌟 玩家  ' : '玩家 updated 🎮',
                avatarfull: `https://avatars.steamstatic.com/test-${steamLogins}.jpg`
            }] } } };
        }
        if (url === 'https://www.googleapis.com/oauth2/v2/userinfo') {
            googleLogins++;
            return { data: {
                id: '112233445566778899000', name: googleLogins === 1 ? '  Zoë 東京  ' : 'Zoë 新しい',
                picture: `https://lh3.googleusercontent.com/test-${googleLogins}`
            } };
        }
        if (url.startsWith('https://api.coingecko.com/')) {
            return { data: Object.fromEntries(options.params.ids.split(',').map(id => [id, { usd: 1 }])) };
        }
        throw new Error('External HTTP is disabled in the PostgreSQL smoke test');
    };
    axios.post = async (url,body) => {
        if(cashierTest&&url==='https://www.coinpayments.net/api.php')return {data:{error:'ok',result:{address:'fixture-'+new URLSearchParams(body).get('currency')+'-deposit-address'}}};
        if (url === 'https://steamcommunity.com/openid/login') return { data: 'is_valid:true' };
        if (url === 'https://oauth2.googleapis.com/token') return { data: { access_token: 'fixture-token' } };
        return { data: {} };
    };
    if (process.env.VERCEL === '1') {
        require('../../fairness').generateServerSeed = () => 'fixture-live-8';
        await db.query(`UPDATE "gameSettings" SET value = '1000' WHERE game = 'crash' AND key = 'betTime'`);
        await db.query(`UPDATE "gameSettings" SET value = '1000' WHERE game = 'roulette' AND key IN ('betTime','rollTime')`);
        await db.query('UPDATE users SET balance = 85 WHERE id = 1');
        const crash = await db.query(`INSERT INTO crash ("serverSeed", "crashPoint", "createdAt", "startedAt") VALUES ('test-crash-seed', 2, NOW() - INTERVAL '40 seconds', NOW() - INTERVAL '30 seconds') RETURNING id`);
        const cb = await db.query(`INSERT INTO "crashBets" ("userId", "roundId", amount, "autoCashoutPoint") VALUES (1, $1, 10, 1.2) RETURNING id`, [crash.rows[0].id]);
        await db.query(`INSERT INTO bets ("userId", amount, edge, game, "gameId", completed) VALUES (1, 10, 0.75, 'crash', $1, 0)`, [cb.rows[0].id]);
        const roulette = await db.query(`INSERT INTO roulette ("serverSeed", result, color, "createdAt", "rolledAt") VALUES ('test-roulette-seed', 1, 1, NOW() - INTERVAL '40 seconds', NOW() - INTERVAL '30 seconds') RETURNING id`);
        const rb = await db.query(`INSERT INTO "rouletteBets" ("userId", "roundId", amount, color) VALUES (1, $1, 5, 1) RETURNING id`, [roulette.rows[0].id]);
        await db.query(`INSERT INTO bets ("userId", amount, edge, game, "gameId", completed) VALUES (1, 5, 0.25, 'roulette', $1, 0)`, [rb.rows[0].id]);
        // This committed seed selects fire. A fractional payout previously
        // caused every Vercel request to roll back while resuming this game.
        await db.query("INSERT INTO users (id, username) VALUES (2, 'coinflip-opponent')");
        const coinflip = await db.query(`INSERT INTO coinflips ("ownerId", fire, ice, amount, "serverSeed", "clientSeed", "EOSBlock") VALUES (1, 1, 2, 1, 'test-coinflip-seed', 'test-client-seed', 100) RETURNING id`);
        await db.query(`INSERT INTO bets ("userId", amount, edge, game, "gameId", completed) VALUES (1, 1, 0.05, 'coinflip', $1, 0), (2, 1, 0.05, 'coinflip', $1, 0)`, [coinflip.rows[0].id]);
        if(process.env.OPERATIONS_TEST==='1') {
            await db.query(`INSERT INTO users (id,username,role,perms,balance,"2fa") VALUES (3,'Second admin','ADMIN',4,100,NULL),(4,'Read only developer','DEV',0,0,NULL),(5,'MFA owner','OWNER',4,0,'JBSWY3DPEHPK3PXP'),(6,'Refund failure fixture','USER',0,100,NULL)`);
            for(const [id,userId,tiles] of [[901,1,'[]'],[902,2,'[1,2]'],[903,6,'[]']]) {
                await db.query(`INSERT INTO mines (id,"userId",amount,"clientSeedId","serverSeedId",nonce,"minesCount",mines,"revealedTiles") VALUES ($1,$2,10,1,1,1,1,'[0]',$3)`,[id,userId,tiles]);
                await db.query(`INSERT INTO bets ("userId",amount,game,"gameId",completed) VALUES ($1,10,'mines',$2,0)`,[userId,id]);
            }
            await db.exec(`CREATE FUNCTION reject_fixture_refund() RETURNS trigger AS $$ BEGIN IF NEW.id = 6 AND NEW.balance > OLD.balance THEN RAISE EXCEPTION 'fixture credit failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql; CREATE TRIGGER fixture_failed_credit BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION reject_fixture_refund();`);
        }
        const server = require('../../api/index');
        Object.assign(require('../../routes/games/roulette/functions').roulette.config, {betTime: 1000, rollTime: 1000});
        const requestHandler = server.listeners('request')[0];
        if(cashierTest){const io=require('../../socketio/server');const emit=io.emit.bind(io);io.emit=(name,...args)=>{if(name==='admin:giftcards:created')cashierCalls.giftcardBroadcasts++;return emit(name,...args);};}
        server.removeAllListeners('request');
        server.on('request', (req, res) => {
            if(providerFixture?.handle(req,res))return;
            if(cashierTest&&req.url==='/__test/cashier'){
                require('../../runtime/serverless').run(async()=>{
                    const {sql}=require('../../database');
                    const [users]=await sql.query('SELECT id,balance,cryptoAllowance FROM users WHERE id IN (20,21) ORDER BY id');
                    const [deposits]=await sql.query('SELECT * FROM cryptoDeposits');
                    const [withdrawals]=await sql.query('SELECT * FROM cryptoWithdraws ORDER BY id');
                    const [audit]=await sql.query('SELECT action,targetId FROM cashierAudit');
                    const [ledger]=await sql.query('SELECT * FROM transactions WHERE userId IN (20,21)');
                    return {users,deposits,withdrawals,audit,ledger,calls:cashierCalls};
                },{scopes:['admin']}).then(data=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(data));},error=>{res.statusCode=500;res.end(JSON.stringify({error:error.message}));});return;
            }
            if (process.env.OPERATIONS_TEST === '1' && req.url === '/__test/operations-recovery') {
                require('../../runtime/serverless').run(async () => {
                    const {sql} = require('../../database');
                    const [crash] = await sql.query("INSERT INTO crash (serverSeed, crashPoint, createdAt, startedAt) VALUES ('recovery-test', 2, DATE_SUB(NOW(), INTERVAL 40 SECOND), DATE_SUB(NOW(), INTERVAL 30 SECOND))");
                    const [cb] = await sql.query('INSERT INTO crashBets (userId, roundId, amount, autoCashoutPoint) VALUES (1, ?, 10, 1.2)', [crash.insertId]);
                    await sql.query("INSERT INTO bets (userId, amount, game, gameId, completed) VALUES (1, 10, 'crash', ?, 0)", [cb.insertId]);
                    const [roulette] = await sql.query("INSERT INTO roulette (serverSeed, result, color, createdAt, rolledAt) VALUES ('recovery-test', 1, 1, DATE_SUB(NOW(), INTERVAL 40 SECOND), DATE_SUB(NOW(), INTERVAL 30 SECOND))");
                    const [rb] = await sql.query('INSERT INTO rouletteBets (userId, roundId, amount, color) VALUES (1, ?, 5, 1)', [roulette.insertId]);
                    await sql.query("INSERT INTO bets (userId, amount, game, gameId, completed) VALUES (1, 5, 'roulette', ?, 0)", [rb.insertId]);
                    return {crash:crash.insertId,roulette:roulette.insertId};
                }, {scopes:['admin']}).then(data=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(data));},error=>{res.statusCode=500;res.end(JSON.stringify({error:error.message}));});
                return;
            }
            if (req.url !== '/__test/disconnect') return requestHandler(req, res);
            req.path = req.url;
            require('../../runtime/serverless').middleware(req, res, async () => {
                await require('../../database').sql.query('UPDATE users SET balance = balance + 999 WHERE id = 1');
                console.log('DISCONNECT_ROUTE_STARTED');
                // Simulate a route whose caller leaves before a response exists.
            });
        });
        server.listen(Number(process.env.PORT), '127.0.0.1');
    } else require('../../app');
}
main().catch(error => { console.error(error); process.exit(1); });
