import {createSignal, onCleanup, Show} from 'solid-js';
import './loader.css';

function Loader(props) {
    const compact = () => props.small || props.type === 'small';
    const [slow, setSlow] = createSignal(false);
    const timer = setTimeout(() => setSlow(true), 6000);
    onCleanup(() => clearTimeout(timer));

    return (
        <div class='cosmic-loader' classList={{'cosmic-loader-compact': compact()}} role='status' aria-live='polite' aria-busy='true'>
            <div class='cosmic-loader-mark' style={{'max-height': props.max}} aria-hidden='true'>
                <div class='cosmic-loader-orbit'/>
                <img src='/assets/logo/cosmic-luck-logo.webp' alt='' width='210'/>
                <span class='cosmic-loader-spark'/>
            </div>
            <Show when={!compact()}>
                <div class='cosmic-loader-copy'>
                    <span class='cosmic-loader-eyebrow'>COSMIC LUCK</span>
                    <p>{props.label || 'Getting things ready'}</p>
                    <span class='cosmic-loader-detail'>{slow() ? 'Taking a little longer. Thanks for waiting.' : (props.detail || 'Your next round is on its way.')}</span>
                </div>
                <div class='cosmic-loader-pips' aria-hidden='true'><i/><i/><i/></div>
            </Show>
            <Show when={compact()}><span class='cosmic-loader-sr'>Loading</span></Show>
        </div>
    );
}
export default Loader;
