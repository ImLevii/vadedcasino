import {createSignal, onCleanup, Show} from 'solid-js';

export default function Loader(props) {
    const compact = () => props.small || props.type === 'small';
    const [slow, setSlow] = createSignal(false);
    const timer = setTimeout(() => setSlow(true), 7000);
    onCleanup(() => clearTimeout(timer));
    return <div class='cosmic-loader' classList={{'cosmic-loader-compact':compact()}} role='status' aria-live='polite' aria-busy='true'>
        <div class='cosmic-loader-panel'>
            <div class='cosmic-loader-brand' aria-hidden='true'>
                <img src='/assets/logo/cosmic-luck-logo.webp' alt='' width='240' height='55'/>
            </div>
            <div class='cosmic-loader-track' aria-hidden='true'><span/></div>
            <Show when={!compact()}>
                <div class='cosmic-loader-caption'><span class='cosmic-loader-status-dot'/><span>{props.label || 'Loading your experience'}</span></div>
                <p class='cosmic-loader-detail'>{slow() ? 'Still connecting. This is taking longer than usual.' : (props.detail || 'Everything will be ready in a moment.')}</p>
            </Show>
            <Show when={compact()}><span class='cosmic-loader-sr'>Loading</span></Show>
        </div>
    </div>;
}
