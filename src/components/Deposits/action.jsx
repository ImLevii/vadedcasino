import { Show } from "solid-js";
import { Portal } from "solid-js/web";

// Keep checkout actions outside the panel's scrolling details.
export default function DepositAction(props) {
  return (
    <Show when={props.mount} fallback={<div class="wallet-inline-action">{props.children}</div>} keyed>
      {(mount) => <Portal mount={mount}>{props.children}</Portal>}
    </Show>
  );
}
