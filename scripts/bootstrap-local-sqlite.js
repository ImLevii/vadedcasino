require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_ADMIN_ID = 9999999999;
const DEFAULT_ADMIN_USER = 'admin';
const DEFAULT_ADMIN_PASS = 'admin';

function splitTopLevelComma(text) {
    const parts = [];
    let current = '';
    let depth = 0;
    let quote = null;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (quote) {
            current += ch;
            if (ch === quote && text[i - 1] !== '\\') quote = null;
            continue;
        }

        if (ch === "'" || ch === '"') {
            quote = ch;
            current += ch;
            continue;
        }

        if (ch === '(') depth++;
        if (ch === ')') depth = Math.max(0, depth - 1);

        if (ch === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
}

function mapColumnType(def) {
    let out = def;

    out = out.replace(/\bUNSIGNED\b/gi, '');
    out = out.replace(/\bAUTO_INCREMENT\b/gi, '');
    out = out.replace(/\bON UPDATE CURRENT_TIMESTAMP\b/gi, '');
    out = out.replace(/\bCHARACTER SET\s+\w+/gi, '');
    out = out.replace(/\bCOLLATE\s+\w+/gi, '');

    out = out.replace(/\bENUM\s*\([^)]*\)/gi, 'TEXT');
    out = out.replace(/\b(?:BIGINT|INT|INTEGER|SMALLINT|TINYINT)\s*(\([^)]*\))?/gi, 'INTEGER');
    out = out.replace(/\b(?:DECIMAL|NUMERIC|DOUBLE|FLOAT|REAL)\s*(\([^)]*\))?/gi, 'REAL');
    out = out.replace(/\b(?:DATETIME|TIMESTAMP|DATE|TIME)\b/gi, 'TEXT');
    out = out.replace(/\b(?:VARCHAR|CHAR|TEXT|MEDIUMTEXT|LONGTEXT)\s*(\([^)]*\))?/gi, 'TEXT');

    out = out.replace(/\s+/g, ' ').trim();
    return out;
}

function convertCreateTable(mysqlStatement) {
    const tableMatch = mysqlStatement.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?(\w+)`?\s*\(([^]*)\)\s*ENGINE=/i);
    if (!tableMatch) return null;

    const table = tableMatch[1];
    const body = tableMatch[2];
    const defs = splitTopLevelComma(body);

    const sqliteDefs = [];
    let autoPkColumn = null;

    for (const rawDef of defs) {
        const def = rawDef.trim();
        if (!def) continue;

        if (/^KEY\s+/i.test(def)) continue;

        if (/^UNIQUE\s+KEY\s+/i.test(def)) {
            const cols = def.match(/\(([^)]*)\)/);
            if (cols) sqliteDefs.push(`UNIQUE (${cols[1]})`);
            continue;
        }

        if (/^PRIMARY\s+KEY\s+/i.test(def)) {
            if (autoPkColumn) continue;
            sqliteDefs.push(def.replace(/`/g, ''));
            continue;
        }

        if (/^CONSTRAINT\s+/i.test(def)) continue;

        const colMatch = def.match(/^`?(\w+)`?\s+(.+)$/);
        if (!colMatch) continue;

        const colName = colMatch[1];
        const rest = colMatch[2];

        if (/AUTO_INCREMENT/i.test(rest)) {
            sqliteDefs.push(`\`${colName}\` INTEGER PRIMARY KEY AUTOINCREMENT`);
            autoPkColumn = colName;
            continue;
        }

        sqliteDefs.push(`\`${colName}\` ${mapColumnType(rest)}`);
    }

    return `CREATE TABLE IF NOT EXISTS \`${table}\` (${sqliteDefs.join(', ')});`;
}

function convertSchema(mysqlSchema) {
    const withoutComments = mysqlSchema
        .replace(/^\s*--.*$/gm, '')
        .replace(/SET\s+FOREIGN_KEY_CHECKS\s*=\s*\d+\s*;?/gi, '');

    const statements = withoutComments
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

    const out = [];
    for (const statement of statements) {
        if (/^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i.test(statement)) {
            const converted = convertCreateTable(`${statement};`);
            if (converted) out.push(converted);
        }
    }

    return out.join('\n');
}

function ensureSqliteFilePath() {
    const fromEnv = process.env.SQLITE_FILE && process.env.SQLITE_FILE.trim();
    const dbFile = fromEnv || path.join(process.cwd(), 'database', 'local.sqlite');
    const dbDir = path.dirname(dbFile);

    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    return dbFile;
}

function ensureEnvDialect(filePath) {
    const envPath = path.join(process.cwd(), '.env.local');
    const exists = fs.existsSync(envPath);
    const lines = exists ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/) : [];

    const set = (key, value) => {
        const idx = lines.findIndex((line) => line.startsWith(`${key}=`));
        if (idx === -1) lines.push(`${key}=${value}`);
        else lines[idx] = `${key}=${value}`;
    };

    set('SQL_DIALECT', 'sqlite');
    set('SQLITE_FILE', filePath);

    fs.writeFileSync(envPath, `${lines.filter(Boolean).join('\n')}\n`);
}

async function main() {
    const username = process.argv[2] || DEFAULT_ADMIN_USER;
    const password = process.argv[3] || DEFAULT_ADMIN_PASS;

    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const mysqlSchema = fs.readFileSync(schemaPath, 'utf8');
    const sqliteSchema = convertSchema(mysqlSchema);

    const dbFile = ensureSqliteFilePath();
    const db = new DatabaseSync(dbFile);

    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(sqliteSchema);

    const hash = await bcrypt.hash(password, 10);
    db.prepare(
        `INSERT INTO users (id, username, passwordHash, role, perms, balance, xp, createdAt)
         VALUES (?, ?, ?, 'OWNER', 4, 0, 0, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           username = excluded.username,
           passwordHash = excluded.passwordHash,
           role = 'OWNER',
           perms = 4`
    ).run(DEFAULT_ADMIN_ID, username, hash);

    ensureEnvDialect(dbFile);

    console.log('[db:sqlite] Complete');
    console.log(`[db:sqlite] File: ${dbFile}`);
    console.log(`[db:sqlite] Admin: id=${DEFAULT_ADMIN_ID}, username=${username}`);
    console.log('[db:sqlite] .env.local updated with SQL_DIALECT=sqlite and SQLITE_FILE');
}

main().catch((error) => {
    console.error('[db:sqlite] Failed:', error);
    process.exit(1);
});
