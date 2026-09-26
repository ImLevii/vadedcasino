import {createContext, useContext, createResource, onCleanup} from "solid-js";
import io from "socket.io-client";
import {getJWT} from "../util/api";

const WebsocketContext = createContext();

export function WebsocketProvider(props) {

    let activeSocket
    let reconnectTimer
    onCleanup(() => {
        clearTimeout(reconnectTimer)
        activeSocket?.removeAllListeners()
        activeSocket?.disconnect()
    })
    const [ws, { mutate }] = createResource(connectSocket), socket = [ws]

    async function connectSocket() {

        const configured = (import.meta.env.VITE_SOCKET_URL || '').trim()
        const socketUrl = (!configured || configured === 'undefined') ? window.location.origin : configured

        function createSocket() {
            const tempWs = io(socketUrl, { transports: ['polling', 'websocket'], reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 10})
            activeSocket = tempWs

            tempWs.on('connect', () => {
                console.log('Connected to WS')
                tempWs.emit('auth', getJWT())
                mutate(tempWs)
            })

            tempWs.on('disconnect', (reason) => {
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
