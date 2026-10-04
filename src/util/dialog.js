import {onCleanup, onMount} from 'solid-js';

// Keep keyboard navigation inside the active case dialog and restore its trigger.
export function useDialog(element, close) {
  let previous;
  const keydown = event => {
    const dialog = element();
    if (!dialog || dialog !== [...document.querySelectorAll('[data-case-dialog]')].at(-1)) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); dialog.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  };
  onMount(() => {
    previous = document.activeElement;
    element()?.querySelector('button')?.focus();
    document.addEventListener('keydown', keydown);
  });
  onCleanup(() => {
    document.removeEventListener('keydown', keydown);
    if (previous?.isConnected) previous.focus();
  });
}
