import { A, useSearchParams } from "@solidjs/router";
import { createSignal, Show, Switch, Match } from "solid-js";
import { Title } from "@solidjs/meta";
import { useUser } from "../contexts/usercontextprovider";
import { authedAPI, createNotification } from "../util/api";
import { openSupport } from "../util/support";
import GiftcardDeposit from "../components/Deposits/giftcard";
import SkinDeckDeposit from "../components/Deposits/skindeck";
import ProviderPayment from "../components/Deposits/provider";
import Method from "../components/Transactions/method";
import DepositAction from "../components/Deposits/action";
import "../components/Deposits/deposit.css";

function PaymentMethod(props) {
  return (
    <button
      class="wallet-method"
      classList={{ selected: props.active }}
      type="button"
      aria-label={props.name}
      aria-pressed={props.active}
      onClick={props.onClick}
    >
      <Method
        name={props.name}
        display={props.display || props.name}
        category={props.category || "Deposit Method"}
        img={props.img}
        wideImg={props.wideImg}
        active={props.active}
        badge={props.badge}
        badgeType="neutral"
      />
    </button>
  );
}

export default function Deposits() {
  const [user] = useUser();
  const [params, setParams] = useSearchParams();
  const [code, setCode] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [actionMount, setActionMount] = createSignal(null);
  const selected = () =>
    ["g2a", "kinguin"].includes(params.type)
      ? "giftcard"
      : String(params.type || "").toLowerCase();
  const signedIn = () => !!user()?.id;
  const selectionName = () =>
    ({
      giftcard: "Gift cards",
      skindeck: "CS2 skins",
      paypal: "PayPal",
      stripe: "Stripe",
      applepay: "Apple Pay",
      cashapp: "Cash App Pay",
    })[selected()] || "Payment method";
  const panelName = selectionName;
  const selectionIcon = () =>
    ({
      giftcard: "/assets/icons/gift-card.svg",
      skindeck: "/assets/icons/cs2-logo.svg",
      paypal: "/assets/icons/paypal.png",
      stripe: "/assets/icons/stripe.svg",
      applepay: "/assets/icons/apple-pay.svg",
      cashapp: "/assets/icons/cash-app.svg",
    })[selected()] || "/assets/icons/wallet.svg";

  function scrollToSection(selector) {
    const target = document.querySelector(selector);
    const scroller = document.querySelector(
      document.querySelector(".wallet-page")?.clientWidth > 760
        ? ".wallet-content"
        : ".wallet-page",
    );
    if (!target || !scroller) return;
    scroller.scrollTo({
      top:
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        12,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  function chooseMethod(type) {
    setParams({ type, payment: null, checkout: null });
    if (document.querySelector(".wallet-page")?.clientWidth > 760) return;
    requestAnimationFrame(() =>
      scrollToSection(
        type === "skindeck" && signedIn()
          ? "#deposit-inventory"
          : ".wallet-payment",
      ),
    );
  }

  async function redeem(e) {
    e.preventDefault();
    if (busy() || !code().trim()) return;
    if (!signedIn()) return setParams({ modal: "login" });
    setBusy(true);
    try {
      const result = await authedAPI(
        "/user/promo",
        "POST",
        JSON.stringify({ code: code().trim() }),
        true,
      );
      if (result?.success) {
        setCode("");
        createNotification("success", "Promo code applied.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Show
      when={signedIn() && selected() === "skindeck"}
      fallback={
        <div class="wallet-page">
          <Title>Buy Coins | Cosmic Luck</Title>
          <div class="wallet-content">
            <header class="wallet-heading">
              <div>
                <h1>Deposit</h1>
                <p>Select a method below to add Coins to your balance.</p>
              </div>
              <Show when={signedIn()}>
                <div class="wallet-balance">
                  <span>Your balance</span>
                  <strong>
                    <img
                      src="/assets/chips/chip-green-clover.png"
                      alt="Coins"
                    />
                    {Number(user()?.balance || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                  <A href="/withdraw">Withdraw ↗</A>
                </div>
              </Show>
            </header>

            <section class="wallet-methods" aria-label="Payment methods">
              <section
                class="wallet-method-section"
                aria-labelledby="wallet-skins-heading"
              >
                <h2 id="wallet-skins-heading">Deposit Method</h2>
                <div class="wallet-method-grid">
                  <PaymentMethod
                    name="CS2 skins"
                    img="/assets/icons/cs2-logo.svg"
                    wideImg
                    badge="Inventory"
                    active={selected() === "skindeck"}
                    onClick={() => chooseMethod("skindeck")}
                  />
                  <PaymentMethod
                    name="Gift cards"
                    img="/assets/icons/gift-card.svg"
                    badge="Redeem code"
                    active={selected() === "giftcard"}
                    onClick={() => chooseMethod("giftcard")}
                  />
                  <PaymentMethod
                    name="PayPal"
                    img="/assets/icons/paypal.png"
                    badge="Deposit"
                    active={selected() === "paypal"}
                    onClick={() => chooseMethod("paypal")}
                  />
                  <PaymentMethod
                    name="Stripe"
                    img="/assets/icons/stripe.svg"
                    badge="Checkout"
                    active={selected() === "stripe"}
                    onClick={() => chooseMethod("stripe")}
                  />
                  <PaymentMethod
                    name="Apple Pay"
                    img="/assets/icons/apple-pay.svg"
                    wideImg
                    badge="Checkout"
                    active={selected() === "applepay"}
                    onClick={() => chooseMethod("applepay")}
                  />
                  <PaymentMethod
                    name="Cash App Pay"
                    display="Cash App"
                    img="/assets/icons/cash-app.svg"
                    badge="Checkout"
                    active={selected() === "cashapp"}
                    onClick={() => chooseMethod("cashapp")}
                  />
                </div>
              </section>
            </section>

            <form class="wallet-promo" onSubmit={redeem}>
              <div>
                <strong>Have a promo code?</strong>
                <p>Enter your referral or promotional code below.</p>
              </div>
              <div>
                <input
                  aria-label="Promo code"
                  placeholder="Enter your code"
                  autoComplete="off"
                  maxLength="64"
                  value={code()}
                  onInput={(e) => setCode(e.currentTarget.value)}
                  disabled={busy()}
                />
                <button
                  class="wallet-button"
                  disabled={busy() || !code().trim()}
                >
                  {busy() ? "Applying…" : "Apply code"}
                </button>
              </div>
            </form>
            <div class="wallet-help">
              <span>Having issues? Contact support here</span>
              <button
                class="wallet-support"
                aria-label="Contact support"
                type="button"
                onClick={openSupport}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 14v-3a8 8 0 0 1 16 0v3M20 16v2a3 3 0 0 1-3 3h-4" />
                  <rect x="2" y="10" width="4" height="7" rx="2" />
                  <rect x="18" y="10" width="4" height="7" rx="2" />
                </svg>
              </button>
            </div>
          </div>

          <aside
            id="deposit-details"
            class="wallet-payment"
            classList={{ "wallet-payment-empty": !selected() }}
            aria-labelledby="wallet-details-heading"
          >
            <div class="wallet-section-title">
              <h2 id="wallet-details-heading">
                {selected() ? "Deposit with " + panelName() : "Deposit details"}
              </h2>
              <Show when={selected()}>
                <button
                  class="wallet-text-button"
                  aria-label="Change method"
                  type="button"
                  onClick={() => {
                    setParams({ type: null, payment: null, checkout: null });
                    scrollToSection(".wallet-methods");
                  }}
                >
                  ×
                </button>
              </Show>
            </div>
            <div class="wallet-panel-body">
              <div class="wallet-method-hero" aria-hidden="true">
                <img src={selectionIcon()} alt="" />
              </div>
              <Show
                when={selected()}
                fallback={
                  <div class="wallet-empty">
                    <span class="wallet-empty-eyebrow">
                      ADD TO YOUR BALANCE
                    </span>
                    <h3>Choose a payment method</h3>
                    <p>
                      Select a method on the left to view your deposit details.
                    </p>
                    <ol class="wallet-checkout-steps">
                      <li>
                        <span>1</span>
                        <div>
                          <strong>Select your method</strong>
                          <p>Skins, gift cards or wallet checkout</p>
                        </div>
                      </li>
                      <li>
                        <span>2</span>
                        <div>
                          <strong>Enter your deposit details</strong>
                          <p>Review the amount before continuing</p>
                        </div>
                      </li>
                      <li>
                        <span>3</span>
                        <div>
                          <strong>Complete your deposit</strong>
                          <p>Follow your selected payment method</p>
                        </div>
                      </li>
                    </ol>
                  </div>
                }
              >
                <Show
                  when={signedIn()}
                  fallback={
                    <div class="wallet-empty">
                      <h3>Sign in to buy coins</h3>
                      <p>
                        Continue with {selectionName().toLowerCase()} to add
                        coins to your Cosmic Luck balance.
                      </p>
                      <DepositAction mount={actionMount()}>
                        <button
                          class="wallet-button primary"
                          type="button"
                          onClick={() => setParams({ modal: "login" })}
                        >
                          Sign in to continue →
                        </button>
                      </DepositAction>
                    </div>
                  }
                >
                  <Switch
                    fallback={
                      <div class="wallet-empty">
                        <h3>Payment method removed</h3>
                        <p>Choose one of the available methods above.</p>
                      </div>
                    }
                  >
                    <Match when={selected() === "giftcard"}>
                      <GiftcardDeposit actionMount={actionMount()} />
                    </Match>
                    <Match
                      when={[
                        "paypal",
                        "stripe",
                        "applepay",
                        "cashapp",
                      ].includes(selected())}
                    >
                      <Show when={selected()} keyed>
                        {(provider) => (
                          <ProviderPayment
                            provider={provider}
                            direction="deposit"
                            actionMount={actionMount()}
                          />
                        )}
                      </Show>
                    </Match>
                  </Switch>
                </Show>
              </Show>
            </div>
            <footer class="wallet-panel-footer">
              <button class="wallet-panel-support" type="button" aria-label="Contact payment support" onClick={openSupport}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="15" rx="4" fill="currentColor" />
                  <path d="M7 19v3l5-3" fill="currentColor" />
                  <path d="M7 9h10M7 13h7" stroke="#00e991" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </button>
              <div class="wallet-action-mount" ref={setActionMount} />
            </footer>
          </aside>
        </div>
      }
    >
      <Title>Deposit CS2 Skins | Cosmic Luck</Title>
      <SkinDeckDeposit onBack={() => setParams({ type: null })} />
    </Show>
  );
}
