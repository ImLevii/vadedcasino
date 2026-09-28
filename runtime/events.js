const { storage } = require('./context');

// Neon is the shared event log. Polling only runs while a WebSocket request is
// alive; reconnecting clients reload snapshots before receiving new events.
function installEvents(io, pool) {
    const Adapter = io.of('/').adapter.constructor;
    let cursor = null;
    let polling = false;
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
    async function poll() {
        if (polling || !io.engine?.clientsCount || cursor === null) return;
        polling = true;
        try {
            const [events] = await pool.query('SELECT id, payload FROM runtimeEvents WHERE id > ? ORDER BY id LIMIT 1000', [cursor]);
            for (const event of events) { publish(JSON.parse(event.payload)); cursor = Number(event.id); }
        } catch (error) { console.error('[realtime]', error.code || 'POLL_FAILED'); }
        finally { polling = false; }
    }
    const timer = setInterval(() => storage.exit(poll), 500);
    timer.unref();
    return {
        initialize,
        bind(context) {
            context.persistEvents = async () => {
                for (const event of context.emissions) {
                    await context.connection.query('INSERT INTO runtimeEvents (payload) VALUES (?)', [JSON.stringify(event)]);
                }
            };
        }
    };
}

module.exports = { installEvents };
