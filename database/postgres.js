const { Pool, types } = require('pg');
const { compileQuery, convertCreateTable } = require('./postgres-sql');

function parseBigInt(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : value;
}

function poolOptions(connectionString) {
    if (!connectionString) throw new Error('PostgreSQL requires DATABASE_URL in .env.local or the server environment');
    let url;
    try { url = new URL(connectionString); } catch { throw new Error('DATABASE_URL must be a PostgreSQL connection string'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must use postgres:// or postgresql://');
    const neon = /\.neon\.(tech|build)$/i.test(url.hostname);
    // Verify Neon's certificate and hostname, even when its copied URL says require.
    if (neon) url.searchParams.set('sslmode', 'verify-full');
    return {
        connectionString: url.toString(),
        enableChannelBinding: true,
        max: 10,
        connectionTimeoutMillis: Math.max(1000, Number(process.env.SQL_CONNECT_TIMEOUT_MS) || 10000),
        idleTimeoutMillis: 30000,
        options: '-c timezone=UTC',
        types: {
            getTypeParser(oid, format) {
                if (format !== 'binary' && oid === 20) return parseBigInt;
                if (format !== 'binary' && oid === 1700) return Number;
                return types.getTypeParser(oid, format);
            },
        },
    };
}

function mapError(error) {
    const codes = {
        '23505': 'ER_DUP_ENTRY',
        '42703': 'ER_BAD_FIELD_ERROR',
        '42P01': 'ER_NO_SUCH_TABLE',
        '42701': 'ER_DUP_FIELDNAME',
        '42P07': 'ER_TABLE_EXISTS_ERROR',
    };
    if (codes[error.code]) {
        error.postgresCode = error.code;
        error.code = codes[error.code];
    }
    return error;
}

function createQuery(executor) {
    return async function query(sql, params = []) {
        try {
            const describe = sql.trim().match(/^DESCRIBE\s+`?(\w+)`?;?$/i);
            if (describe) {
                const result = await executor.query(
                    'SELECT column_name AS "Field", data_type AS "Type", is_nullable AS "Null", column_default AS "Default" FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 ORDER BY ordinal_position',
                    [describe[1]]
                );
                return [result.rows, result.fields];
            }
            if (/^\s*SHOW TABLES\s*;?$/i.test(sql)) {
                const result = await executor.query("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name");
                return [result.rows, result.fields];
            }
            if (/^\s*CREATE TABLE\b/i.test(sql)) {
                for (const statement of convertCreateTable(sql)) await executor.query(statement);
                return [{ affectedRows: 0, warningStatus: 0 }, []];
            }
            const compiled = compileQuery(sql, params);
            const result = await executor.query(compiled.text, compiled.values);
            if (/^\s*(SELECT|WITH|EXPLAIN)\b/i.test(sql)) return [result.rows, result.fields];
            return [{
                insertId: result.rows[0]?.id ?? 0,
                affectedRows: result.rowCount ?? result.affectedRows ?? 0,
                warningStatus: 0,
            }, result.fields];
        } catch (error) {
            throw mapError(error);
        }
    };
}

function createPostgresPool(connectionString, PoolClass = Pool) {
    const rawPool = new PoolClass(poolOptions(connectionString));
    rawPool.on('error', error => console.error('[database] PostgreSQL idle connection error:', error.code || 'UNKNOWN'));
    return {
        query: createQuery(rawPool),
        async getConnection() {
            const client = await rawPool.connect();
            const command = async text => {
                await client.query(text);
                return [{ warningStatus: 0 }];
            };
            return {
                query: createQuery(client),
                beginTransaction: () => command('BEGIN'),
                commit: () => command('COMMIT'),
                rollback: () => command('ROLLBACK'),
                release: () => client.release(),
            };
        },
        end: () => rawPool.end(),
    };
}

module.exports = { createPostgresPool, createQuery, poolOptions, parseBigInt };
