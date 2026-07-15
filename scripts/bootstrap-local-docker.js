require('dotenv').config();

const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COMPOSE_FILE = path.join(ROOT, 'docker-compose.mysql.yml');
const ENV_FILE = path.join(ROOT, '.env.local');

const LOCAL_SQL = {
    SQL_HOST: '127.0.0.1',
    SQL_USER: 'root',
    SQL_PASS: 'root',
    SQL_DB: 'cosmicluck_local',
};

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: ROOT,
        stdio: 'inherit',
        env: process.env,
        ...options,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
    }
}

function ensureLocalSqlEnvFile() {
    let content = '';
    if (fs.existsSync(ENV_FILE)) content = fs.readFileSync(ENV_FILE, 'utf8');

    const lines = content ? content.split(/\r?\n/) : [];
    const keys = Object.keys(LOCAL_SQL);

    for (const key of keys) {
        const index = lines.findIndex((line) => line.startsWith(`${key}=`));
        if (index === -1) {
            lines.push(`${key}=${LOCAL_SQL[key]}`);
            continue;
        }

        const current = lines[index].slice(key.length + 1).trim();
        if (!current) lines[index] = `${key}=${LOCAL_SQL[key]}`;
    }

    fs.writeFileSync(ENV_FILE, lines.join('\n').replace(/\n+$/, '\n'));
}

function waitForMySql(host, port, timeoutMs = 120000) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
        const tryConnect = () => {
            const socket = net.createConnection({ host, port });

            socket.once('connect', () => {
                socket.destroy();
                resolve();
            });

            socket.once('error', () => {
                socket.destroy();
                if (Date.now() - start >= timeoutMs) {
                    reject(new Error(`Timed out waiting for MySQL on ${host}:${port}`));
                    return;
                }
                setTimeout(tryConnect, 1500);
            });
        };

        tryConnect();
    });
}

async function main() {
    const adminArgs = process.argv.slice(2);

    console.log('[db:docker] Checking Docker availability...');
    run('docker', ['--version']);

    console.log('[db:docker] Starting local MySQL container...');
    run('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d', 'mysql']);

    console.log('[db:docker] Waiting for MySQL to accept connections...');
    await waitForMySql(LOCAL_SQL.SQL_HOST, 3306);

    ensureLocalSqlEnvFile();

    console.log('[db:docker] Running schema + admin bootstrap...');
    const bootstrapResult = spawnSync(
        process.execPath,
        [path.join('scripts', 'bootstrap-local-db.js'), ...adminArgs],
        {
            cwd: ROOT,
            stdio: 'inherit',
            env: {
                ...process.env,
                ...LOCAL_SQL,
            },
        }
    );

    if (bootstrapResult.error) throw bootstrapResult.error;
    if (bootstrapResult.status !== 0) {
        throw new Error(`bootstrap-local-db.js failed with exit code ${bootstrapResult.status}`);
    }

    console.log('[db:docker] Complete. MySQL is running in Docker on 127.0.0.1:3306');
}

main().catch((error) => {
    console.error('[db:docker] Failed:', error.message || error);
    process.exit(1);
});
