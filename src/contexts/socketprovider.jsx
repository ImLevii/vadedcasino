import {createContext, useContext, createSignal, onMount, onCleanup} from 'solid-js';
import io from 'socket.io-client';
import {getJWT} from '../util/api';
import {resolveSocketUrl} from '../util/server-url.mjs';
import {createRealtimeClient} from '../util/realtime-client.mjs';

const WebsocketContext = createContext();

export function WebsocketProvider(props) {
    const [ws, setSocket] = createSignal(null);
    const [status, setStatus] = createSignal('connecting');
    let client;

    onMount(() => {
        const serverless = import.meta.env.VITE_VERCEL_BACKEND === '1';
        const socket = io(resolveSocketUrl(import.meta.env, window.location.origin), {
            autoConnect: false,
            transports: serverless ? ['websocket'] : ['polling', 'websocket'],
            reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 4000,
            reconnectionAttempts: Infinity, timeout: 10000
        });
        client = createRealtimeClient(socket, {
            getToken: getJWT, onReady: setSocket, onDisconnect: () => setSocket(null),
            onStatus: setStatus, serverless
        });
        socket.connect();
        const presence=setInterval(()=>{if(socket.connected)socket.emit('presence:heartbeat');},20000);
        socket.on('auth',()=>socket.emit('presence:heartbeat'));
        const resume = () => { if (document.visibilityState === 'visible') client.retry(); };
        document.addEventListener('visibilitychange', resume);
        window.addEventListener('online', resume);
        onCleanup(() => {
            document.removeEventListener('visibilitychange', resume);
            window.removeEventListener('online', resume);
            client.dispose();
            clearInterval(presence);
        });
    });

    return <WebsocketContext.Provider value={[ws, {status, retry: () => client?.retry()}]}>
        {props.children}
    </WebsocketContext.Provider>;
}

export function useWebsocket() { return useContext(WebsocketContext); }
