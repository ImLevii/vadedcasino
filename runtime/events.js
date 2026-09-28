const { storage } = require('./context');

// Neon is the shared event log. Publish locally after commit and catch up from
// other instances both on the interval and before acknowledging a heartbeat.
function installEvents(io, pool) {
    const Adapter = io.of('/').adapter.constructor;
    let cursor = null;
    let polling;
    const delivered = new Set();
    class NeonAdapter extends Adapter {
        broadcast(packet, options) {
            const event = { packet, rooms: [...options.rooms], except: [...options.except], flags: options.flags };
            const context = storage.getStore();
            if (context && !context.closed) context.emissions.push(event);
            else super.broadcast(packet, options);
        }
    }
    io.adapter(NeonAdapter);
    function publish(event) {
        Adapter.prototype.broadcast.call(io.of('/').adapter, event.packet, {
            rooms: new Set(event.rooms), except: new Set(event.except), flags: event.flags || {}
        });
    }
    async function initialize() {
        if (cursor !== null) return;
        const [[row]] = await pool.query('SELECT COALESCE(MAX(id), 0) AS id FROM runtimeEvents');
        cursor = Number(row.id);
    }
    function poll() {
        if (polling) return polling;
        if (!io.engine?.clientsCount || cursor === null) return Promise.resolve();
        polling = (async () => {
            try {
                const [events] = await pool.query('SELECT id, payload FROM runtimeEvents WHERE id > ? ORDER BY id LIMIT 1000', [cursor]);
                for (const event of events) {
                    const id = Number(event.id);
                    if (!delivered.delete(id)) publish(JSON.parse(event.payload));
                    cursor = id;
                }
            } catch (error) { console.error('[realtime]', error.code || 'POLL_FAILED'); }
            finally { polling = null; }
        })();
        return polling;
    }
    const timer = setInterval(() => storage.exit(poll), 500);
    timer.unref();
    return {
        initialize,
        flush: () => storage.exit(poll),
        bind(context) {
            let rows = [];
            context.persistEvents = async () => {
                if (!context.emissions.length) return;
                const values = context.emissions.map(event => JSON.stringify(event));
                const result = await context.connection.nativeQuery(
                    'INSERT INTO "runtimeEvents" (payload) SELECT value FROM jsonb_array_elements_text($1::jsonb) AS value RETURNING id',
                    [JSON.stringify(values)]
                );
                rows = result.rows;
            };
            context.publishEvents = () => {
                rows.forEach((row, index) => {
                    const id = Number(row.id);
                    // A poll may already have delivered the committed row.
                    if (cursor !== null && id <= cursor) return;
                    if (io.engine?.clientsCount) {
                        delivered.add(id);
                        publish(context.emissions[index]);
                    }
                });
            };
        }
    };
}

module.exports = { installEvents };
