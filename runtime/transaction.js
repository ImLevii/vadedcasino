const { storage } = require('./context');

// The legacy route modules share mutable caches. Serialize them both locally
// and across Vercel instances, and bind every query to the locked transaction.
// This favors correctness over throughput until those modules become stateless.
function createCoordinator(pool) {
    let tail = Promise.resolve();
    return function coordinate(work) {
        const operation = tail.then(async () => {
            const connection = await pool.getConnection();
            const context = { connection, pending: new Set(), emissions: [], closed: false, error: null };
            let savepoint = 0;
            context.transaction = async fn => {
                const name = `request_${++savepoint}`;
                await connection.query(`SAVEPOINT ${name}`);
                let ended = false;
                const commit = async () => {
                    await connection.query(`RELEASE SAVEPOINT ${name}`);
                    ended = true;
                };
                const rollback = async () => {
                    await connection.query(`ROLLBACK TO SAVEPOINT ${name}`);
                    await connection.query(`RELEASE SAVEPOINT ${name}`);
                    ended = true;
                };
                const emissionCount = context.emissions.length;
                try {
                    const result = await fn(connection, commit, rollback);
                    if (!ended) { await rollback(); context.emissions.length = emissionCount; }
                    return result;
                } catch (error) {
                    if (!ended) await rollback();
                    context.emissions.length = emissionCount;
                    throw error;
                }
            };
            try {
                await connection.beginTransaction();
                await connection.query('SELECT pg_advisory_xact_lock(738125921)');
                return await storage.run(context, async () => {
                    const result = await work(context);
                    while (context.pending.size) await Promise.allSettled([...context.pending]);
                    if (context.error) throw context.error;
                    if (context.persistEvents) await context.persistEvents();
                    await connection.commit();
                    context.closed = true;
                    context.publishEvents?.();
                    return result;
                });
            } catch (error) {
                context.closed = true;
                await connection.rollback();
                throw error;
            } finally { connection.release(); }
        });
        tail = operation.catch(() => {});
        return operation;
    };
}

module.exports = { createCoordinator };
