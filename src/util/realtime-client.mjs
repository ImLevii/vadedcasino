// Keep one Socket.IO instance for its entire lifetime so game listeners survive
// transport changes. Only subscriptions are replayed; betting commands are not.
export function createRealtimeClient(socket, { getToken, onReady, onDisconnect, onStatus, serverless = false }) {
    const emit = socket.emit.bind(socket);
    const subscriptions = new Map();
    let replaying = new Set();
    let tickTimer;
    let reconnectTimer;
    let authTimer;
    let generation = 0;
    let stopped = false;

    socket.emit = (event, ...args) => {
        if (event.endsWith(':subscribe') || event === 'chat:join') {
            const key = event + JSON.stringify(args);
            if (event === 'chat:join' || event === 'bets:subscribe') {
                for (const [oldKey, [oldEvent, ...oldArgs]] of subscriptions) {
                    if (oldEvent === event && oldKey !== key) {
                        subscriptions.delete(oldKey);
                        replaying.delete(oldKey);
                        if (event === 'bets:subscribe' && socket.connected) emit('bets:unsubscribe', ...oldArgs);
                    }
                }
            }
            subscriptions.set(key, [event, ...args]);
            replaying.delete(key);
        } else if (event.endsWith(':unsubscribe')) {
            const target = event.replace(':unsubscribe', ':subscribe');
            for (const [key, values] of subscriptions) {
                if (values[0] !== target) continue;
                if (args.length ? JSON.stringify(values.slice(1, 1 + args.length)) !== JSON.stringify(args) : values.length !== 1) continue;
                subscriptions.delete(key);
                replaying.delete(key);
            }
        }
        if (!socket.connected) {
            const callback=args.at(-1);
            if(typeof callback==='function')callback({error:'DISCONNECTED'});
            return socket;
        }
        return emit(event, ...args);
    };
    socket.on('game:control',data=>{
        if(!socket.connected || stopped)return;
        for(const args of subscriptions.values())if(args[0]===data.game+':subscribe')emit(...args);
    });

    function tick(epoch) {
        if (stopped || !socket.connected || epoch !== generation) return;
        socket.timeout(8000).emit('runtime:tick', (error, result) => {
            if (stopped || !socket.connected || epoch !== generation) return;
            onStatus(error || result?.ok === false ? 'recovering' : 'connected');
            tickTimer = setTimeout(() => tick(epoch), error ? 2000 : 1000);
        });
    }

    function restore() {
        replaying = new Set(subscriptions.keys());
        onReady(socket);
        queueMicrotask(() => {
            if (stopped || !socket.connected) return;
            for (const key of replaying) {
                const args = subscriptions.get(key);
                if (args) emit(...args);
            }
            replaying.clear();
        });
    }

    socket.on('connect', () => {
        clearTimeout(reconnectTimer);
        clearTimeout(tickTimer);
        clearTimeout(authTimer);
        generation++;
        onStatus('connecting');
        authTimer = setTimeout(() => socket.io.engine?.close(), 10000);
        emit('auth', getToken());
    });
    socket.on('auth', () => {
        if (stopped || !socket.connected) return;
        clearTimeout(authTimer);
        generation++;
        restore();
        onStatus('connected');
        clearTimeout(tickTimer);
        if (serverless) tick(generation);
    });
    socket.on('connect_error', () => {
        onStatus('reconnecting');
        if (!socket.active) reconnectTimer = setTimeout(() => socket.connect(), 2000);
    });
    socket.on('disconnect', reason => {
        generation++;
        clearTimeout(tickTimer);
        clearTimeout(authTimer);
        onDisconnect();
        onStatus('reconnecting');
        if (reason === 'io server disconnect') reconnectTimer = setTimeout(() => socket.connect(), 1000);
    });

    function retry() {
        if (stopped) return;
        if (socket.connected) {
            generation++;
            clearTimeout(tickTimer);
            emit('auth', getToken());
        } else socket.connect();
    }

    return {
        retry,
        dispose() {
            stopped = true;
            generation++;
            clearTimeout(tickTimer);
            clearTimeout(reconnectTimer);
            clearTimeout(authTimer);
            socket.removeAllListeners();
            socket.disconnect();
        }
    };
}
