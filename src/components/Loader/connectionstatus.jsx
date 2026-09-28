import {createEffect, createSignal, onCleanup, Show} from 'solid-js';
import {useWebsocket} from '../../contexts/socketprovider';

export default function ConnectionStatus() {
    const [, connection] = useWebsocket();
    const [visible, setVisible] = createSignal(false);
    createEffect(() => {
        if (connection.status() === 'connected') { setVisible(false); return; }
        const timer = setTimeout(() => setVisible(true), 1500);
        onCleanup(() => clearTimeout(timer));
    });
    return <Show when={visible()}>
        <div class='live-connection-status' role='status' aria-live='polite'>
            <span class='connection-dot'/>
            <span>{connection.status() === 'connecting' ? 'Connecting to live games…' : 'Restoring live updates…'}</span>
            <button type='button' onClick={connection.retry}>Retry connection</button>
        </div>
        <style jsx>{`
            .live-connection-status { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 12px 16px; margin-top: 12px; border: 1px solid #86e2a82a; border-radius: 4px; background: #143125; color: #c1dbc9; font-size: 12px; }
            .connection-dot { width: 6px; height: 6px; background: #83e9aa; border-radius: 50%; box-shadow: 0 0 10px #83e9aa60; }
            button { margin-left: auto; background: #ffffff08; border: 1px solid #ffffff18; color: #b6f6d0; padding: 8px 12px; cursor: pointer; font: inherit; }
        `}</style>
    </Show>;
}
