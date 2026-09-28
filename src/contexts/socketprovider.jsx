import {createContext, useContext, createResource, onCleanup} from "solid-js";
import io from "socket.io-client";
import {getJWT} from "../util/api";
import {resolveSocketUrl} from '../util/server-url.mjs';

const WebsocketContext = createContext();

export function WebsocketProvider(props) {

    let activeSocket
    let reconnectTimer
    let tickTimer
    onCleanup(() => {
        clearTimeout(reconnectTimer)
        clearTimeout(tickTimer)
        activeSocket?.removeAllListeners()
        activeSocket?.disconnect()
    })
    const [ws, { mutate }] = createResource(connectSocket), socket = [ws]

    async function connectSocket() {

        const socketUrl = resolveSocketUrl(import.meta.env, window.location.origin)

        function createSocket() {
            const serverless = import.meta.env.VITE_VERCEL_BACKEND === '1'
            const tempWs = io(socketUrl, { transports: serverless ? ['websocket'] : ['polling', 'websocket'], reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: Infinity})
            activeSocket = tempWs
            const subscriptions = new Map()
            const emit = tempWs.emit.bind(tempWs)
            tempWs.emit = (event, ...args) => {
                if (event.endsWith(':subscribe') || event === 'chat:join') subscriptions.set(event + JSON.stringify(args), [event, ...args])
                if (event.endsWith(':unsubscribe')) {
                    const target = event.replace(':unsubscribe', ':subscribe')
                    for (const [key, value] of subscriptions) if (value[0] === target) subscriptions.delete(key)
                }
                return emit(event, ...args)
            }
            function tick() {
                if (!tempWs.connected) return
                tempWs.timeout(15000).emit('runtime:tick', () => {
                    if (tempWs.connected && activeSocket === tempWs) tickTimer = setTimeout(tick, 1000)
                })
            }

            tempWs.on('connect', () => {
                console.log('Connected to WS')
                tempWs.emit('auth', getJWT())
                for (const args of subscriptions.values()) emit(...args)
                if (serverless) { clearTimeout(tickTimer); tick() }
                mutate(tempWs)
            })

            tempWs.on('disconnect', (reason) => {
                clearTimeout(tickTimer)
                if (reason !== 'io server disconnect') return

                mutate(null)
                reconnectTimer = setTimeout(() => {
                    tempWs.removeAllListeners()
                    tempWs.disconnect()
                    createSocket()
                }, 1000)
            })

            return tempWs
        }

        createSocket()

    }

    return (
        <WebsocketContext.Provider value={socket}>
            {props.children}
        </WebsocketContext.Provider>
    );
}

export function useWebsocket() { return useContext(WebsocketContext); }
