import {
  createContext,
  useContext,
  onMount,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";

export const AdminContext = createContext();
export const useAdmin = () => useContext(AdminContext);
export const money = (value) =>
  value === null
    ? "Restricted"
    : Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
export const date = (value) => (value ? new Date(value).toLocaleString() : "—");
export const duration = (value) => {
  const seconds = Math.floor(Math.max(0, Number(value) || 0) / 1000);
  return seconds < 60
    ? seconds + "s"
    : Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
};
export const words = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
const messages = {
  PAYMENT_PROVIDER_REMOVED:
    "This provider has been retired. New payments are unavailable; existing payments can still be reconciled or refunded where eligible.",
  PAYMENT_DIRECTION_UNSUPPORTED:
    "This payment method does not support withdrawals in this integration.",
  PAYOUT_REQUIRES_RECONCILIATION:
    "The provider response is uncertain. Funds remain reserved. Close this dialog and use Reconcile with provider to check the existing transfer.",
  PAYOUT_NOT_CONFIRMED_KEEP_RESERVED:
    "No matching provider record was found. Funds remain reserved; investigate with the provider before any further action.",
  TRANSACTION_NOT_PENDING:
    "This transaction has already changed. Refresh and review its current status.",
  CRYPTO_PROVIDER_UNAVAILABLE:
    "The crypto provider is unavailable or has not been configured.",
  GIFT_CARD_ALREADY_REDEEMED:
    "This gift card has been redeemed. Its value and redemption record cannot be changed.",
  CASHIER_UNAVAILABLE:
    "The cashier request could not be completed. Retry to retrieve the latest result.",
  STALE_GAME_STATE:
    "This game changed. Review the latest state and start a new action.",
  ROUND_ALREADY_COMMITTED:
    "The outcome is already committed. Use recovery to continue the original game.",
  PAYOUT_ALREADY_STARTED:
    "Settlement has already started. A refund would conflict with recorded payouts.",
  USE_SAFE_CASHOUT:
    "Tiles have been revealed. Use settle cash-out to preserve the current result.",
  ACTIVE_GAMES_USE_SETTINGS:
    "Existing games still use these rules. Lock new entries and finish active games before changing settings.",
  ACTION_FAILED:
    "The action rolled back. Close this dialog, review game health, and start a new action.",
  ROUND_ADVANCEMENT_REQUIRED:
    "The betting deadline has passed. Use safe recovery to advance the committed round.",
  OPERATIONS_UNAVAILABLE:
    "Live data could not be loaded. Your last snapshot is preserved.",
  INVALID_2FA: "That verification code was not accepted.",
  FORBIDDEN: "Your role does not have permission for this action.",
  SLOW_DOWN: "Please wait a moment, then retry the same request.",
  RECOVERY_REQUIRES_CURRENT_ROUND:
    "This is an older round. Inspect the current round before starting recovery.",
};
export const explain = (code) =>
  messages[code] || words(code || "Connection unavailable");
export function PageHeader(props) {
  return (
    <header class="adm-page-header">
      <div>
        <span class="adm-eyebrow">{props.eyebrow || "CONTROL CENTER"}</span>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>
      <div class="adm-actions">{props.children}</div>
    </header>
  );
}
export function Badge(props) {
  return (
    <span
      class={
        "adm-badge " + (props.tone || String(props.value || "").toLowerCase())
      }
    >
      <i />
      {props.children || words(props.value)}
    </span>
  );
}
export function Metric(props) {
  return (
    <article class={"adm-metric " + (props.accent ? "accent" : "")}>
      <span>{props.label}</span>
      <strong title={String(props.value)}>{props.value}</strong>
      <small>{props.note}</small>
    </article>
  );
}
export function Empty(props) {
  return (
    <div class="adm-empty">
      <span class="adm-empty-icon" aria-hidden="true">
        ◇
      </span>
      <h3>{props.title || "Nothing here yet"}</h3>
      <p>{props.children}</p>
      {props.action}
    </div>
  );
}
export function Failure(props) {
  return (
    <div class="adm-notice danger" role="alert">
      <div>
        <strong>{props.title || "Unable to complete request"}</strong>
        <p>{explain(props.error)}</p>
      </div>
      <Show when={props.retry}>
        <button class="adm-button" onClick={props.retry}>
          Try again
        </button>
      </Show>
    </div>
  );
}
export function Skeleton() {
  return (
    <div
      class="adm-skeleton"
      role="status"
      aria-label="Loading administration data"
    >
      <div class="adm-metrics">
        <For each={[1, 2, 3, 4]}>{() => <div />}</For>
      </div>
      <div class="adm-skeleton-table" />
      <span class="adm-sr-only">Loading data</span>
    </div>
  );
}
export function Modal(props) {
  let dialog;
  let previous;
  onMount(() => {
    previous = document.activeElement;
    dialog?.focus();
  });
  onCleanup(() => previous?.isConnected && previous.focus());
  const keydown = (e) => {
    if (e.key === "Escape" && !props.busy) {
      e.stopPropagation();
      props.close();
    }
    if (e.key !== "Tab") return;
    const elements = [
      ...dialog.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
      ),
    ].filter((el) => el.getClientRects().length);
    const first = elements[0],
      last = elements.at(-1);
    if (!first) {
      e.preventDefault();
      return;
    }
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === dialog)
    ) {
      e.preventDefault();
      last.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === last || document.activeElement === dialog)
    ) {
      e.preventDefault();
      first.focus();
    }
  };
  return (
    <Portal>
      <div
        class="admin-design adm-overlay"
        onClick={(e) =>
          e.target === e.currentTarget && !props.busy && props.close()
        }
      >
        <section
          ref={dialog}
          class={"adm-modal " + (props.wide ? "wide" : "")}
          role="dialog"
          aria-modal="true"
          aria-label={props.title}
          tabIndex="-1"
          onKeyDown={keydown}
        >
          <header>
            <div>
              <span class="adm-eyebrow">{props.eyebrow || "OPERATIONS"}</span>
              <h2>{props.title}</h2>
            </div>
            <button
              class="adm-button adm-icon-button"
              aria-label="Close dialog"
              disabled={props.busy}
              onClick={props.close}
            >
              ×
            </button>
          </header>
          <div class="adm-modal-body">{props.children}</div>
        </section>
      </div>
    </Portal>
  );
}
