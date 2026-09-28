import {createSignal, onMount, onCleanup, Show} from 'solid-js';
import {useSearchParams} from '@solidjs/router';
import {api, authedAPI, fetchUser} from '../../util/api';
import {resolveServerUrl} from '../../util/server-url.mjs';
import {useUser} from '../../contexts/usercontextprovider';
import {SteamIcon, GoogleIcon} from './providericons';
import './signin.css';

const messages = {
    INVALID_CREDENTIALS: 'The email, username, or password is incorrect.',
    INVALID_EMAIL: 'Enter a valid email address.',
    EMAIL_IN_USE: 'This email is already registered. Sign in to your account.',
    USERNAME_IN_USE: 'This username is taken. Please choose another.',
    INVALID_SIGNUP_USERNAME: 'Use 3–20 letters, numbers, or underscores for your username.',
    INVALID_SIGNUP_PASSWORD: 'Use at least 8 characters, up to 72 bytes, for your password.',
    INVALID_USERNAME: 'Enter your email or username.', INVALID_PASSWORD: 'Enter a valid password.',
    TERMS_REQUIRED: 'Please accept the Terms & Conditions to create an account.',
    SLOW_DOWN: 'Too many attempts. Please wait before trying again.',
    google_unavailable: 'Google sign-in is not available yet. Use Steam or email to continue.',
    auth_expired: 'Your sign-in session expired. Please start again.',
    steam_denied: 'Steam sign-in was cancelled. You can try again.',
    google_denied: 'Google sign-in was cancelled. You can try again.',
    steam_invalid: 'Steam could not verify this sign-in. Please try again.',
    steam_error: 'Steam sign-in could not be completed. Please try again.',
    google_invalid: 'Google could not verify this sign-in. Please try again.',
    google_error: 'Google sign-in could not be completed. Please try again.'
};

export default function SignIn(props) {
    const [params, setParams] = useSearchParams();
    const [register, setRegister] = createSignal(false);
    const [identity, setIdentity] = createSignal('');
    const [username, setUsername] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [showPassword, setShowPassword] = createSignal(false);
    const [agree, setAgree] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [error, setError] = createSignal(messages[params.error] || '');
    const [, {mutateUser}] = useUser();
    const providerUrl = provider => `${resolveServerUrl(import.meta.env, window.location.origin)}/auth/${provider}`;
    let dialog;
    const close = () => setParams({modal:null, error:null}, {replace:true});
    function switchMode(next) { setRegister(next); setError(''); }
    onMount(() => {
        const previous = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.focus();
        onCleanup(() => { document.body.style.overflow = overflow; previous?.focus?.(); });
    });
    function handleKey(event) {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key !== 'Tab') return;
        const elements = [...dialog.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled)')].filter(el => el.getClientRects().length);
        const first = elements[0], last = elements[elements.length-1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    async function submit(event) {
        event.preventDefault();
        if (busy()) return;
        setError(''); setBusy(true);
        try {
            const body = register() ? {email:identity().trim(), username:username().trim(), password:password(), agree:agree()} : {username:identity().trim(), password:password()};
            const data = await api(register() ? '/auth/register' : '/auth/login', 'POST', JSON.stringify(body));
            if (!data?.token) { setError(messages[data?.error] || 'Unable to sign in right now. Please try again.'); return; }
            const expires = new Date(Date.now() + data.expiresIn * 1000).toUTCString();
            document.cookie = `jwt=${encodeURIComponent(data.token)}; Path=/; SameSite=Lax; ${location.protocol === 'https:' ? 'Secure;' : ''} Expires=${expires}`;
            props.ws?.()?.emit('auth', data.token);
            const user = await fetchUser();
            if (!user) { setError('You are signed in, but your account could not load. Please retry.'); return; }
            mutateUser(user);
            const code = localStorage.getItem('aff');
            if (code) { await authedAPI('/user/affiliate', 'POST', JSON.stringify({code})); localStorage.removeItem('aff'); }
            close();
        } catch { setError('Unable to complete sign-in. Please try again.'); }
        finally { setBusy(false); }
    }
    return <div class='auth-overlay' onClick={event => {if(event.target === event.currentTarget) close();}}>
        <section class='auth-dialog' role='dialog' aria-modal='true' aria-labelledby='auth-title' tabIndex='-1' ref={dialog} onKeyDown={handleKey}>
            <button class='auth-close' type='button' aria-label='Close sign in' onClick={close}>×</button>
            <div class='auth-main'>
                <header class='auth-heading'>
                    <span class='auth-eyebrow'>{register() ? 'YOUR NEXT CHAPTER' : 'WELCOME BACK'}</span>
                    <h1 id='auth-title'>{register() ? 'Create your account' : 'Sign in to'}<Show when={!register()}> <span>CosmicLuck</span></Show></h1>
                    <p>{register() ? 'One account. All your favorite games.' : 'Your games, rewards, and next big moment.'}</p>
                </header>
                <div class='auth-tabs' aria-label='Account access'>
                    <button type='button' classList={{active:!register()}} aria-pressed={!register()} onClick={()=>switchMode(false)}>Sign in</button>
                    <button type='button' classList={{active:register()}} aria-pressed={register()} onClick={()=>switchMode(true)}>Create account</button>
                </div>
                <div class='auth-providers'>
                    <a class='auth-provider auth-steam' href={providerUrl('steam')}><SteamIcon/>Continue with Steam</a>
                    <a class='auth-provider auth-google' href={providerUrl('google')}><GoogleIcon/>Continue with Google</a>
                </div>
                <div class='auth-divider'><span/>{register() ? 'or sign up with email' : 'or use your email'}<span/></div>
                <form class='auth-form' onSubmit={submit}>
                    <Show when={register()}><label class='auth-field' for='auth-username'>Username<input id='auth-username' name='username' autocomplete='nickname' placeholder='Choose your player name' required pattern='[A-Za-z0-9_]{3,20}' maxLength='20' value={username()} onInput={e=>setUsername(e.currentTarget.value)}/></label></Show>
                    <label class='auth-field' for='auth-identity'>{register() ? 'Email address' : 'Email or username'}<input id='auth-identity' name={register() ? 'email' : 'username'} type={register() ? 'email' : 'text'} autocomplete={register() ? 'email' : 'username'} placeholder={register() ? 'you@example.com' : 'Enter your email or username'} required maxLength='254' value={identity()} onInput={e=>setIdentity(e.currentTarget.value)}/></label>
                    <div class='auth-field'><label for='auth-password'>Password</label><div class='auth-password-wrap'><input id='auth-password' name='password' type={showPassword() ? 'text' : 'password'} autocomplete={register() ? 'new-password' : 'current-password'} placeholder={register() ? 'At least 8 characters' : 'Enter your password'} required minLength={register() ? 8 : 4} maxLength='72' value={password()} onInput={e=>setPassword(e.currentTarget.value)}/><button type='button' aria-label={showPassword() ? 'Hide password' : 'Show password'} onClick={()=>setShowPassword(!showPassword())}>{showPassword() ? 'Hide' : 'Show'}</button></div></div>
                    <Show when={register()}><label class='auth-terms'><input type='checkbox' required checked={agree()} onChange={e=>setAgree(e.currentTarget.checked)}/><span>I am 18 or older and agree to the <a href='/docs/tos' target='_blank' rel='noopener noreferrer'>Terms & Conditions</a>.</span></label></Show>
                    <Show when={error()}><p class='auth-error' role='alert'>{error()}</p></Show>
                    <button class='auth-submit' type='submit' disabled={busy()} aria-busy={busy()}>{busy() ? 'Please wait…' : register() ? 'Create account' : 'Sign in'}<span aria-hidden='true'>→</span></button>
                </form>
                <p class='auth-switch'>{register() ? 'Already have an account?' : 'New to CosmicLuck?'} <button type='button' onClick={()=>switchMode(!register())}>{register() ? 'Sign in' : 'Create an account'}</button></p>
                <p class='auth-legal'>18+ only. Play responsibly. By continuing, you accept our <a href='/docs/tos'>Terms & Conditions</a>.</p>
            </div>
            <aside class='auth-art' aria-hidden='true'>
                <img class='auth-brand' src='/assets/logo/cosmic-luck-logo.webp' alt=''/>
                <div class='auth-art-orbit'><img src='/assets/logo/cosmic-luck-chip.svg' alt='' draggable={false}/></div>
                <div class='auth-art-copy'><span>WELCOME TO YOUR ORBIT</span><h2>A little luck.<br/>A whole new world.</h2><p>All your games. One CosmicLuck account.</p></div>
            </aside>
        </section>
    </div>;
}
