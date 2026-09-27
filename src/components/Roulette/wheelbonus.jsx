import {createSignal, For, Show, onCleanup} from 'solid-js';
import {Portal} from 'solid-js/web';

function WheelIcon() {
    return <svg viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='2.5' aria-hidden='true'>
        <circle cx='24' cy='24' r='19'/><circle cx='24' cy='24' r='11'/><circle cx='24' cy='24' r='4'/>
        <path d='M24 5v8m0 22v8M5 24h8m22 0h8M10.5 10.5l5.7 5.7m15.6 15.6 5.7 5.7m0-27-5.7 5.7M16.2 31.8l-5.7 5.7'/>
    </svg>;
}

export default function WheelBonus(props) {
    const [open, setOpen] = createSignal(false);
    let trigger, dialog;
    const close = () => {setOpen(false); trigger?.focus();};
    const keydown = event => {
        if (!open()) return;
        if (event.key === 'Escape') close();
        if (event.key === 'Tab') {
            const buttons = dialog?.querySelectorAll('button');
            if (!buttons?.length) return;
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
            if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
        }
    };
    document.addEventListener('keydown', keydown);
    onCleanup(() => document.removeEventListener('keydown', keydown));
    const show = () => {setOpen(true); queueMicrotask(() => dialog?.querySelector('button')?.focus());};
    return <>
        <button ref={trigger} class='wheel-bonus-card' onClick={show} aria-haspopup='dialog' aria-label='Wheel Bonus Pot: view rules'>
            <span class='wheel-bonus-icon'><WheelIcon/></span>
            <span class='wheel-bonus-copy'><strong>Wheel Bonus Pot</strong>
                <span class='wheel-bonus-amount'><img src='/assets/icons/coin.svg' alt='Coins'/>{Number(props.pot || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                <span class='wheel-bonus-streak' aria-label={`${props.streak || 0} of 3 consecutive green results`}>
                    <For each={[0,1,2]}>{index => <img classList={{lit:index < (props.streak || 0)}} src='/assets/chips/chip-green-clover.png' alt=''/ >}</For>
                </span>
            </span>
        </button>
        <Show when={open()}><Portal>
            <div class='wheel-bonus-overlay' onClick={event => {if(event.target === event.currentTarget) close();}}>
                <section ref={dialog} class='wheel-bonus-dialog' role='dialog' aria-modal='true' aria-labelledby='wheel-bonus-title'>
                    <header><h2 id='wheel-bonus-title'>Wheel Bonus Pot</h2><button aria-label='Close bonus rules' onClick={close}>×</button></header>
                    <div class='wheel-bonus-banner'><WheelIcon/></div>
                    <p>The Wheel Bonus Pot receives <strong>{Number(props.rate ?? .66).toFixed(2)}%</strong> of all coin-balance bets each round. It is won when green <strong>14×</strong> lands three times in a row.</p>
                    <p>The pot is split into three shares, one for each qualifying round. Bet at least <strong>{Number(props.minimum ?? .01).toFixed(2)} coins on green</strong> in any of those rounds to qualify for that round’s share.</p>
                    <p>Your payout is proportional to your green bet. For example, a 50-coin bet out of 100 eligible coins earns 50% of that round’s share. Shares with no eligible bets stay in the pot.</p>
                    <div class='wheel-bonus-note'>Only coin-balance bets qualify. After a bonus, a new three-green streak begins.</div>
                    <button class='wheel-bonus-confirm' onClick={close}>Alright</button>
                </section>
            </div>
        </Portal></Show>
        <style>{`
            .wheel-bonus-card { display:flex; align-items:center; gap:9px; width:218px; max-width:100%; padding:7px; background:#20232c; border:1px solid #282d36; border-radius:5px; text-align:left; cursor:pointer; font-family:inherit; }
            .wheel-bonus-icon { width:48px; height:48px; flex-shrink:0; display:grid; place-items:center; background:radial-gradient(circle,#1fd65f24,#0c1117 75%); border:1px solid #080b10; border-radius:4px; color:#1fd65f; }
            .wheel-bonus-icon svg { width:34px; filter:drop-shadow(0 0 9px #1fd65f55); }
            .wheel-bonus-copy { display:flex; flex-direction:column; gap:3px; }
            .wheel-bonus-copy > strong { font-size:12px; color:#f4f5f9; }
            .wheel-bonus-amount { display:flex; align-items:center; gap:5px; font-weight:800; color:#1fd65f; font-size:15px; font-variant-numeric:tabular-nums; }
            .wheel-bonus-amount img { width:15px; height:15px; }
            .wheel-bonus-streak { display:flex; gap:4px; }
            .wheel-bonus-streak img { width:16px; height:16px; object-fit:contain; opacity:.3; filter:grayscale(.55); }
            .wheel-bonus-streak img.lit { opacity:1; filter:drop-shadow(0 0 5px #1fd65f77); }
            .wheel-bonus-card:focus-visible,.wheel-bonus-dialog button:focus-visible { outline:2px solid #1fd65f; outline-offset:3px; }
            .wheel-bonus-overlay { position:fixed; inset:0; z-index:10000; display:grid; place-items:center; padding:20px; background:#000b; backdrop-filter:blur(5px); overflow:auto; }
            .wheel-bonus-dialog { box-sizing:border-box; width:340px; max-width:100%; max-height:calc(100dvh - 40px); overflow:auto; padding:22px; background:#191c23; border:1px solid #2a2e37; border-radius:8px; box-shadow:0 24px 80px #0008; color:#969daa; font-family:'Geogrotesque Wide',sans-serif; }
            .wheel-bonus-dialog header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
            .wheel-bonus-dialog h2 { font-size:15px; color:#f5f6fa; margin:0; }
            .wheel-bonus-dialog header button { width:24px; height:24px; border:0; border-radius:50%; background:#353b45; color:#b9bec7; font-size:18px; cursor:pointer; }
            .wheel-bonus-banner { height:74px; display:grid; place-items:center; background:#101319; border-radius:5px; color:#1fd65f; }
            .wheel-bonus-banner svg { width:44px; }
            .wheel-bonus-dialog p { font-size:12px; line-height:1.6; margin:18px 0; }
            .wheel-bonus-dialog p strong { color:#e7eaf0; }
            .wheel-bonus-note { padding:12px; font-size:11px; line-height:1.5; color:#1fd65f; background:#1fd65f0c; border:1px solid #1fd65f55; border-radius:4px; }
            .wheel-bonus-confirm { width:100%; height:40px; margin-top:22px; border:1px solid #303640; background:#252a34; color:#d2d8e2; font-family:inherit; font-weight:700; border-radius:4px; cursor:pointer; }
        `}</style>
    </>;
}
