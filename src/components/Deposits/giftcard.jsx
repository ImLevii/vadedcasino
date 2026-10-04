import { createSignal } from "solid-js";
import { authedAPI, createNotification } from "../../util/api";
import DepositAction from "./action";
import { useUser } from "../../contexts/usercontextprovider";
export default function GiftcardDeposit(props) {
  const [, { refreshBalance }] = useUser();
  const [code, setCode] = createSignal(""),
    [busy, setBusy] = createSignal(false);
  async function redeem(e) {
    e.preventDefault();
    if (busy()) return;
    const normalized = code().trim().replace(/[-\s]/g, "").toLowerCase();
    if (!/^[a-z0-9]{16,24}$/.test(normalized))
      return createNotification(
        "error",
        "Enter a valid Cosmic Luck gift-card code.",
      );
    setBusy(true);
    const result = await authedAPI(
      "/trading/deposit/giftcards/redeem",
      "POST",
      JSON.stringify({ code: normalized }),
      true,
    );
    setBusy(false);
    if (result?.success) {
      refreshBalance();
      setCode("");
      createNotification("success", "Your gift card has been redeemed.");
    }
  }
  return (
    <div class="wallet-gift">
      <h3>Redeem your gift card</h3>
      <p class="wallet-caption">
        Enter a Cosmic Luck gift-card code to add its value to your balance.
        Gift cards for other sites are not supported.
      </p>
      <form id="gift-deposit-form" onSubmit={redeem}>
        <label class="wallet-label" for="gift-code">
          Gift-card code
        </label>
        <input
          id="gift-code"
          class="wallet-input"
          autoComplete="off"
          spellcheck="false"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength="32"
          value={code()}
          onInput={(e) => setCode(e.currentTarget.value)}
          disabled={busy()}
          required
        />
      </form>
      <DepositAction mount={props.actionMount}>
        <button form="gift-deposit-form"
          class="wallet-button primary"
          disabled={busy() || !code().trim()}
        >
          {busy() ? "Redeeming…" : "Redeem gift card →"}
        </button>
      </DepositAction>
    </div>
  );
}
