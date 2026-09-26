import {createEffect, createSignal, For, onCleanup, onMount, Show} from 'solid-js';
import {Portal} from 'solid-js/web';
import {api} from '../../util/api';
import {verifyBattleProof} from '../../util/battlefairness';
import {resolveImageSrc} from '../../util/image';

export default function BattleFairness(props) {
    const [data, setData] = createSignal(null);
    const [error, setError] = createSignal('');
    const [verification, setVerification] = createSignal(null);
    const [selected, setSelected] = createSignal(1);
    const [follow, setFollow] = createSignal(true);
    let dialog, disposed = false, pending = false;
    const current = () => data()?.rounds.find(r => r.round === selected());
    async function refresh() {
        if (pending || disposed) return;
        pending = true;
        try {
            const result = await api(`/battles/${props.id}/fairness${props.privateKey ? `?pk=${encodeURIComponent(props.privateKey)}` : ''}`, 'GET');
            if (disposed) return;
            if (!result || result.error) { setError('Unable to refresh proof. Retrying automatically.'); return; }
            setError('');
            if (JSON.stringify(result) === JSON.stringify(data()) && verification()) return;
            setData(result);
            setVerification(null);
            if (follow()) setSelected(Math.max(1, result.round));
            setVerification(await verifyBattleProof(result));
        } catch {
            if (!disposed) { setVerification(null); setError('Verification could not complete. Try refreshing the proof.'); }
        } finally { pending = false; }
    }
    createEffect(() => { props.revision; refresh(); });
    onMount(() => {
        dialog.showModal();
        const timer = setInterval(refresh, 3000);
        onCleanup(() => clearInterval(timer));
    });
    onCleanup(() => { disposed = true; });
    function download() {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data(), null, 2)], {type:'application/json'}));
        const link = document.createElement('a'); link.href = url; link.download = `battle-${props.id}-proof.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    const verdict = value => value == null ? 'Pending' : value ? 'Verified' : 'Failed';
    return <Portal>
        <dialog ref={dialog} class='battle-fairness' aria-labelledby='battle-fairness-title' onClose={props.onClose} onClick={e => { if(e.target === dialog) dialog.close(); }}>
            <div class='fairness-body'>
                <header><div><h2 id='battle-fairness-title'><span class='shield'>✓</span> Provably Fair</h2><p>Verify the seeds, signed randomness, and item ticket for every player.</p></div><button class='close' aria-label='Close fairness details' onClick={() => dialog.close()}>×</button></header>
                <Show when={error()}><p class='error' role='status'>{error()}</p></Show>
                <Show when={data()} fallback={<p class='loading'>Loading battle proof…</p>}>
                    <div class='metadata'>
                        <div><span>Battle</span><strong>#{data().id}</strong></div>
                        <div><span>Mode</span><strong>{data().gamemode}</strong></div>
                        <div><span>Created</span><strong>{new Date(data().createdAt).toLocaleString()}</strong></div>
                        <div><span>Status</span><strong class='live' aria-live='polite'>{data().status}</strong></div>
                        <div><span>Randomness</span><strong>{data().provider}</strong></div>
                        <div><span>Algorithm</span><code>{data().algorithm}</code></div>
                    </div>
                    <div class='seeds'>
                        <label>Server seed commitment · SHA-256<code>{data().serverSeedHash}</code></label>
                        <label>Server seed<code>{data().serverSeed || 'Hidden until all seats are locked and the battle starts'}</code></label>
                        <label>{data().ticketId ? 'RANDOM.ORG client seed' : 'EOS client seed'}<code>{data().clientSeed || 'Waiting for the committed draw'}</code></label>
                        <label>{data().ticketId ? 'Precommitted ticket' : 'Committed EOS block'}<code>{data().ticketId || data().eosBlock || 'Pending'}</code></label>
                    </div>
                    <div class='checks' aria-live='polite'>
                        <span classList={{good:verification()?.commitment === true, bad:verification()?.commitment === false}}>Seed commitment: {verdict(verification()?.commitment)}</span>
                        <Show when={data().ticketId}><span classList={{good:verification()?.signature === true,bad:verification()?.signature === false}}>RANDOM.ORG signature: {verdict(verification()?.signature)}</span></Show>
                        <Show when={data().proof?.random?.license}><span>{data().proof.random.license.type} license</span></Show>
                        <Show when={data().endedAt}><span classList={{good:verification()?.winner===true,bad:verification()?.winner===false}}>Winner: {verdict(verification()?.winner)}</span></Show>
                    </div>
                    <Show when={data().ticketId}><p class='note'>The server seed hash and RANDOM.ORG ticket are published before the draw. The signed result also binds the player seats, mode, item values, and ticket ranges. Seeds are revealed after all seats are locked. Verification runs in your browser.</p></Show>
                    <Show when={!data().ticketId}><p class='note'>This older battle retains its original EOS seed and ticket algorithm.</p></Show>
                    <div class='round-heading'><h3>Rounds</h3><label class='follow'><input type='checkbox' checked={follow()} onChange={e => {setFollow(e.currentTarget.checked);if(follow())setSelected(Math.max(1,data().round));}}/> Follow live round</label></div>
                    <nav aria-label='Fairness rounds' class='round-tabs'><For each={data().rounds}>{r => <button classList={{active:selected()===r.round}} aria-pressed={selected()===r.round} onClick={() => {setSelected(r.round);setFollow(false);}}>{r.round}</button>}</For></nav>
                    <div class='rolls'>
                        <For each={data().players}>{player => {
                            const roll = () => current()?.rolls.find(r => r.userId === player.userId);
                            const item = () => current()?.items.find(i => i.id === roll()?.caseItemId);
                            const verified = () => verification()?.rolls[roll()?.nonce];
                            return <article class='roll-card'>
                                <div class='item-art'><Show when={item()} fallback={<span class='pending-item'>?</span>}><img src={resolveImageSrc(item().img)} alt={item().name}/><small>{((item().rangeTo-item().rangeFrom+1)/1000).toFixed(3)}%</small></Show></div>
                                <div class='roll-details'><strong>{player.username}</strong><span>Round {selected()} · Seat {player.slot}</span><span>{current()?.name}</span>
                                    <Show when={roll()} fallback={<p class='note'>Waiting for this round</p>}><span>Ticket <b>{roll().result}</b> · Nonce {roll().nonce}</span><strong>{item()?.name}</strong><span class='price'>◉ {Number(item()?.price || 0).toFixed(2)}</span><small>Range {item()?.rangeFrom}–{item()?.rangeTo}</small><span classList={{good:verified()===true,bad:verified()===false}}>{verdict(verified())} roll</span></Show>
                                </div>
                            </article>;
                        }}</For>
                    </div>
                    <details><summary>How the tickets and winner are calculated</summary><p>HMAC-SHA256 uses the server seed as its key and “clientSeed:nonce” as its message. Nonces start at 1 and advance by round, then seat. New battles read 8 hexadecimal characters at a time, reject values at or above 4,294,900,000, then use (value % 100000) + 1. The ticket selects the item’s inclusive range. If all eight chunks are rejected, SHA256(digest + “:retry:” + counter), starting at 1, supplies the next chunks.</p><p>Standard battles award the highest team total; Crazy awards the lowest. Group battles share the total. {data().tieRule}</p></details>
                    <footer><button onClick={refresh}>Refresh proof</button><button onClick={download}>Download proof</button><a href='https://api.random.org/signatures/form' target='_blank' rel='noopener noreferrer'>RANDOM.ORG verifier ↗</a></footer>
                </Show>
            </div>
        </dialog>
        <style jsx>{`
            .battle-fairness { width:min(1000px,calc(100vw - 32px)); max-height:calc(100dvh - 40px); padding:0; border:1px solid #303630; border-radius:10px; background:#111612; color:#dfe6e0; box-shadow:0 24px 80px #0009; }
            .battle-fairness::backdrop { background:#000b; backdrop-filter:blur(5px); }
            .fairness-body { padding:24px; } header { display:flex; justify-content:space-between; gap:20px; margin-bottom:22px; } h2,h3,p { margin:0; } h2 { font-size:22px; color:#fff; } h3 { font-size:16px; } header p { margin-top:10px; color:#919b94; font-size:13px; line-height:1.6; } .shield { color:#1fd65f; margin-right:6px; }
            button,a { font:inherit; } button { cursor:pointer; border:1px solid #303a32; background:#1b231e; border-radius:5px; color:#bdc9c1; padding:8px 12px; } button:hover { border-color:#1fd65f; color:#fff; } .close { align-self:flex-start; font-size:24px; padding:0 10px; }
            .metadata { display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; padding:18px; background:#0c100e; border-radius:6px; font-size:12px; } .metadata>div { display:flex; gap:12px; min-width:0; } .metadata span { color:#939e96; min-width:84px; } .metadata strong,.metadata code { overflow-wrap:anywhere; } .live { color:#1fd65f; text-transform:capitalize; }
            .seeds { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:20px 0 14px; } .seeds label { display:flex; flex-direction:column; gap:7px; min-width:0; color:#929e96; font-size:12px; } .seeds code { padding:12px; background:#0c100e; border:1px solid #252e27; border-radius:5px; color:#d8e5dc; font-size:12px; overflow-wrap:anywhere; min-height:54px; }
            .checks { display:flex; flex-wrap:wrap; gap:10px 20px; font-size:12px; } .good,.price { color:#1fd65f; } .bad,.error { color:#ff8278; } .note { font-size:12px; color:#8b998f; line-height:1.6; margin-top:12px; } .error,.loading { padding:14px 0; }
            .round-heading { display:flex; justify-content:space-between; align-items:center; gap:12px; margin:24px 0 12px; padding-top:18px; border-top:1px dashed #2c352f; } .follow { display:flex; align-items:center; gap:7px; font-size:12px; color:#9aa99f; } .follow input { accent-color:#1fd65f; }
            .round-tabs { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:18px; } .round-tabs button { min-width:34px; padding:7px; } .round-tabs button.active { color:#1fd65f; border-color:#1fd65f; background:#173421; }
            .rolls { display:grid; grid-template-columns:1fr 1fr; gap:12px; } .roll-card { display:flex; gap:14px; border:1px solid #232e26; background:#151c17; border-radius:6px; padding:12px; min-width:0; } .item-art { width:110px; flex-shrink:0; position:relative; display:flex; align-items:center; justify-content:center; background:#0e1410; border-radius:4px; } .item-art img { width:100%; height:100px; object-fit:contain; } .item-art small { position:absolute; top:5px; right:6px; color:#98a69e; font-size:10px; } .pending-item { font-size:42px; color:#35483c; } .roll-details { display:flex; flex-direction:column; gap:7px; min-width:0; font-size:12px; } .roll-details strong { color:#edf5ef; overflow-wrap:anywhere; } .roll-details small { color:#8b998f; }
            details { margin-top:22px; color:#8e9d93; font-size:12px; line-height:1.7; } summary { cursor:pointer; color:#c4d2c9; } details p { margin-top:12px; } footer { margin-top:20px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; font-size:12px; } footer a { color:#6ce99b; margin-left:auto; }
            @media(max-width:650px) { .fairness-body { padding:16px; } .metadata,.seeds,.rolls { grid-template-columns:1fr; } h2 { font-size:19px; } .item-art { width:90px; } footer a { margin-left:0; } }
        `}</style>
    </Portal>;
}
