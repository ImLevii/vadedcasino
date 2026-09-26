import {createEffect, createSignal, onCleanup, Show} from 'solid-js';
import {Portal} from 'solid-js/web';
import {loadHcaptcha} from '../../util/hcaptcha.mjs';

function Captcha(props) {
    let container, closeButton, widget;
    const [error, setError] = createSignal('');
    const [loading, setLoading] = createSignal(false);
    const [attempt, setAttempt] = createSignal(0);
    createEffect(() => {
        if (!props.active) return;
        attempt();
        let cancelled = false;
        const previousFocus = document.activeElement;
        setError('');
        setLoading(true);
        const keydown = event => { if (event.key === 'Escape') props.close(); };
        document.addEventListener('keydown', keydown);
        queueMicrotask(() => closeButton?.focus());
        loadHcaptcha().then(api => {
            if (cancelled) return;
            widget = api.render(container, {
                sitekey: import.meta.env.VITE_HCAPTCHA_SITE_KEY || '5029f0f4-b80b-42a8-8c0e-3eba4e9edc4c',
                theme: 'dark',
                callback: token => { if (!cancelled) props.onVerify(token); },
                'error-callback': () => { if (!cancelled) setError('Captcha could not complete. Please try again.'); },
                'expired-callback': () => { if (!cancelled) setError('Captcha expired. Please try again.'); }
            });
        }).catch(e => { if (!cancelled) setError(e.message || 'Unable to load captcha.'); })
          .finally(() => { if (!cancelled) setLoading(false); });
        onCleanup(() => {
            cancelled = true;
            if (widget !== undefined) window.hcaptcha?.remove?.(widget);
            widget = undefined;
            document.removeEventListener('keydown', keydown);
            previousFocus?.focus();
        });
    });
    return <Show when={props.active}><Portal>
        <div class='captcha-overlay' onClick={e => { if (e.target === e.currentTarget) props.close(); }}>
            <section class='captcha-container' role='dialog' aria-modal='true' aria-labelledby='captcha-title'>
                <button ref={closeButton} class='captcha-close' aria-label='Close captcha' onClick={() => props.close()}>&times;</button>
                <h2 id='captcha-title'>Join the rain</h2>
                <p>Complete the captcha to continue.</p>
                <Show when={loading()}><p role='status'>Loading captcha...</p></Show>
                <div ref={container}/>
                <Show when={error()}><p class='captcha-error' role='alert'>{error()}</p><button class='retry' onClick={() => setAttempt(n => n + 1)}>Try again</button></Show>
            </section>
        </div>
        <style jsx>{`
            .captcha-overlay { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; padding:12px; background:#03070dc9; }
            .captcha-container { position:relative; width:360px; max-width:100%; padding:28px 14px; border:1px solid #2e4939; border-radius:12px; background:#171e25; color:#f1f8f3; display:flex; align-items:center; flex-direction:column; gap:16px; box-shadow:0 18px 70px #0009; }
            h2 { margin:0; font-size:20px; } p { margin:0; text-align:center; font-size:12px; color:#a4b1aa; } .captcha-error { color:#f69e96; }
            .captcha-close { position:absolute; top:8px; right:10px; border:0; background:none; color:#a4b1aa; cursor:pointer; font-size:23px; }
            .retry { border:0; border-radius:5px; padding:10px 22px; background:#1fd65f; color:#05200e; font-weight:700; cursor:pointer; }
        `}</style>
    </Portal></Show>;
}
export default Captcha;
