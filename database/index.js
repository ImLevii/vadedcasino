const fs = require('fs');
const path = require('path');

require('dotenv').config();
require('dotenv').config({ path: path.join(process.cwd(), '.env.local'), override: true });

const dialect = (process.env.SQL_DIALECT || 'mysql').toLowerCase();

let pool;
let sqliteDb;
let sqliteFilePath;

function transformSqlForSqlite(sql) {
    let transformed = sql;

    transformed = transformed.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO');

    if (/ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(transformed)) {
        transformed = transformed
            .replace(/^\s*INSERT\s+INTO/i, 'INSERT OR REPLACE INTO')
            .replace(/\s+ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i, '');
    }

    transformed = transformed.replace(
        /DATE_SUB\(NOW\(\),\s*INTERVAL\s*(\d+)\s*DAY\)/gi,
        "DATETIME('now', '-$1 day')"
    );
    transformed = transformed.replace(
        /DATE_SUB\(NOW\(\),\s*INTERVAL\s*(\d+)\s*HOUR\)/gi,
        "DATETIME('now', '-$1 hour')"
    );
    transformed = transformed.replace(
        /DATE_SUB\(NOW\(\),\s*INTERVAL\s*(\d+)\s*MINUTE\)/gi,
        "DATETIME('now', '-$1 minute')"
    );
    transformed = transformed.replace(
        /DATE_ADD\(NOW\(\),\s*INTERVAL\s*(\d+)\s*DAY\)/gi,
        "DATETIME('now', '+$1 day')"
    );
    transformed = transformed.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
    transformed = transformed.replace(/UNIX_TIMESTAMP\(([^)]+)\)/gi, "CAST(strftime('%s', $1) AS INTEGER)");
    transformed = transformed.replace(/\s+FOR\s+UPDATE\b/gi, '');

    return transformed;
}

function normalizeSqliteParam(value) {
    if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
        // mysql2 often returns RowDataPacket-like objects; when passed back to SQL,
        // persist them as JSON text for SQLite compatibility.
        return JSON.stringify(value);
    }
    return value;
}

function expandInArrayParams(sql, params) {
    let idx = 0;
    let outSql = sql;
    const outParams = [];

    outSql = outSql.replace(/IN\s*\(\s*\?\s*\)/gi, () => {
        const value = params[idx++];
        if (Array.isArray(value)) {
            if (!value.length) return 'IN (NULL)';
            outParams.push(...value.map(normalizeSqliteParam));
            return `IN (${value.map(() => '?').join(', ')})`;
        }
        outParams.push(normalizeSqliteParam(value));
        return 'IN (?)';
    });

    while (idx < params.length) outParams.push(normalizeSqliteParam(params[idx++]));
    return [outSql, outParams];
}

function expandBulkValuesParams(sql, params) {
    if (!/VALUES\s*\?/i.test(sql)) return [sql, params.map(normalizeSqliteParam)];
    if (!params.length || !Array.isArray(params[0]) || !Array.isArray(params[0][0])) {
        return [sql, params.map(normalizeSqliteParam)];
    }

    const rows = params[0];
    if (!rows.length) {
        return [sql, params.slice(1).map(normalizeSqliteParam)];
    }

    const width = rows[0].length;
    const tuplesSql = rows.map(() => `(${new Array(width).fill('?').join(', ')})`).join(', ');
    const flattened = rows.flat().map(normalizeSqliteParam);
    const tail = params.slice(1).map(normalizeSqliteParam);

    const outSql = sql.replace(/VALUES\s*\?/i, `VALUES ${tuplesSql}`);
    return [outSql, flattened.concat(tail)];
}

async function sqliteQueryWithDb(db, sql, params = []) {
    let query = transformSqlForSqlite(sql);

    let transformedParams = Array.isArray(params) ? params : [params];
    [query, transformedParams] = expandBulkValuesParams(query, transformedParams);
    [query, transformedParams] = expandInArrayParams(query, transformedParams);

    const alterMatch = query.match(/^\s*ALTER\s+TABLE\s+`?(\w+)`?\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+([\s\S]+)$/i);
    if (alterMatch) {
        const table = alterMatch[1];
        const definition = alterMatch[2];
        const columnMatch = definition.match(/^`?(\w+)`?/);
        const column = columnMatch ? columnMatch[1] : null;
        if (column) {
            const pragmaRows = db.prepare(`PRAGMA table_info(\`${table}\`)`).all();
            const exists = pragmaRows.some((row) => row.name === column);
            if (!exists) {
                db.exec(`ALTER TABLE \`${table}\` ADD COLUMN ${definition.replace(/IF\s+NOT\s+EXISTS\s+/i, '')}`);
            }
            return [{ warningStatus: 0, affectedRows: exists ? 0 : 1 }, undefined];
        }
    }

    const describeMatch = query.match(/^\s*DESCRIBE\s+`?(\w+)`?/i);
    if (describeMatch) {
        const table = describeMatch[1];
        const rows = db.prepare(`PRAGMA table_info(\`${table}\`)`).all().map((r) => ({
            Field: r.name,
            Type: r.type,
            Null: r.notnull ? 'NO' : 'YES',
            Key: r.pk ? 'PRI' : '',
            Default: r.dflt_value,
            Extra: '',
        }));
        return [rows, undefined];
    }

    const showTablesMatch = query.match(/^\s*SHOW\s+TABLES/i);
    if (showTablesMatch) {
        const rows = db.prepare("SELECT name AS table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
        return [rows, undefined];
    }

    const isRead = /^\s*(SELECT|PRAGMA|WITH)/i.test(query);
    const stmt = db.prepare(query);

    if (isRead) {
        const rows = stmt.all(...transformedParams);
        return [rows, undefined];
    }

    const result = stmt.run(...transformedParams);
    return [{
        insertId: Number(result.lastInsertRowid || 0),
        affectedRows: Number(result.changes || 0),
        warningStatus: 0,
    }, undefined];
}

async function sqliteQuery(sql, params = []) {
    return sqliteQueryWithDb(sqliteDb, sql, params);
}

function initMySql() {
    const mysql = require('mysql2/promise');

    const connection = {
        host: process.env.SQL_HOST || 'localhost',
        user: process.env.SQL_USER,
        database: process.env.SQL_DB,
        password: process.env.SQL_PASS,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        // users.id and other BIGINT columns hold 18-digit snowflake IDs that exceed
        // JS Number precision (2^53). Return BIGINT as a String only when it can't be
        // represented accurately; smaller values (e.g. COUNT(*)) stay as Numbers.
        supportBigNumbers: true,
        bigNumberStrings: false,
        typeCast: function (field, next) {
            if (field.type == 'NEWDECIMAL') {
                const value = field.string();
                return (value === null) ? null : Number(value);
            }
            return next();
        }
    };

    pool = mysql.createPool(connection);
}

function initSqlite() {
    const { DatabaseSync } = require('node:sqlite');

    sqliteFilePath = process.env.SQLITE_FILE || path.join(process.cwd(), 'database', 'local.sqlite');
    const sqliteDir = path.dirname(sqliteFilePath);

    if (!fs.existsSync(sqliteDir)) fs.mkdirSync(sqliteDir, { recursive: true });

    sqliteDb = new DatabaseSync(sqliteFilePath);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');

    pool = {
        query: sqliteQuery,
        getConnection: async () => ({
            query: sqliteQuery,
            beginTransaction: async () => sqliteDb.exec('BEGIN'),
            commit: async () => sqliteDb.exec('COMMIT'),
            rollback: async () => sqliteDb.exec('ROLLBACK'),
            release: () => {},
        }),
    };
}

if (dialect === 'sqlite') initSqlite();
else initMySql();

// pool.on('connection', function (connection) {
//     console.log('Connection established');
// });

// pool.on('acquire', function (connection) {
//     console.log('Connection %d acquired', connection.threadId);
// });

// pool.on('release', function (connection) {
//     console.log('Connection %d released', connection.threadId);
// });

// pool.on('enqueue', function () {
//     console.log('Waiting for available connection slot');
// });

// pool.on('error', function (err) {
//     console.error('Pool error', err);
// });

async function doTransaction(transactionLogic) {

    if (dialect === 'sqlite') {
        const { DatabaseSync } = require('node:sqlite');
        const txDb = new DatabaseSync(sqliteFilePath);
        txDb.exec('PRAGMA foreign_keys = ON;');

        let hasEnded = false;

        async function commit() {
            if (hasEnded) throw new Error('Transaction has already been committed or rolled back.');
            txDb.exec('COMMIT');
            hasEnded = true;
        }

        async function rollback() {
            if (hasEnded) throw new Error('Transaction has already been committed or rolled back.');
            try {
                txDb.exec('ROLLBACK');
            } catch (_) {}
            hasEnded = true;
        }

        try {
            txDb.exec('BEGIN IMMEDIATE');
            const res = await transactionLogic({ query: (sql, params = []) => sqliteQueryWithDb(txDb, sql, params) }, commit, rollback);
            if (!hasEnded) await rollback();
            return res;
        } catch (err) {
            if (!hasEnded) await rollback();
            throw err;
        } finally {
            txDb.close();
        }
    }

    const connection = await pool.getConnection();
    // if (!connection) throw new Error('Could not get connection from pool.');

    let hasEnded = false;

    async function commit() {
        if (hasEnded) throw new Error('Transaction has already been committed or rolled back.');
        const [commitResult] = await connection.commit();
        if (commitResult && commitResult.warningStatus) {
            throw new Error('Commit err: ' + commitResult.warningStatus);
        }
        hasEnded = true;
    }

    async function rollback() {
        if (hasEnded) throw new Error('Transaction has already been committed or rolled back.');
        const [rollbackResult] = await connection.rollback();
        if (rollbackResult && rollbackResult.warningStatus) {
            throw new Error('Rollback err: ' + rollbackResult.warningStatus);
        }
        hasEnded = true;
    }

    try {

        const [txResult] = await connection.beginTransaction();
        if (txResult && txResult.warningStatus) {
            throw new Error('Transaction err: ' + txResult.warningStatus);
        }

        const res = await transactionLogic(connection, commit, rollback);

        if (!hasEnded) await rollback();
        return res;
        
    } catch (err) {
        if (!hasEnded) await rollback();
        throw err;
    } finally {
        connection.release();
    }
}

module.exports = {
    sql: pool,
    doTransaction
};