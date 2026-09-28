import { A, useSearchParams } from "@solidjs/router";
import {
  createResource,
  createSignal,
  For,
  Show,
  Switch,
  Match,
} from "solid-js";
import { Title } from "@solidjs/meta";
import { useUser } from "../contexts/usercontextprovider";
import { api, authedAPI, createNotification } from "../util/api";
import { openSupport } from "../util/support";
import CryptoDeposit from "../components/Deposits/crypto";
import GiftcardDeposit from "../components/Deposits/giftcard";
import CreditCardDeposit from "../components/Deposits/creditcard";
import SkinDeckDeposit from "../components/Deposits/skindeck";
import "../components/Deposits/deposit.css";
const methods = [
  {
    key: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    id: "BTC",
    network: "Bitcoin",
    icon: "bitcoin.png",
  },
  {
    key: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    id: "ETH",
    network: "Ethereum",
    icon: "ethereum.png",
  },
  {
    key: "litecoin",
    name: "Litecoin",
    symbol: "LTC",
    id: "LTC",
    network: "Litecoin",
    icon: "litecoin.png",
  },
  {
    key: "usdt",
    name: "Tether",
    symbol: "USDT",
    id: "USDT.ERC20",
    network: "Ethereum · ERC20",
    icon: "usdt.png",
  },
  {
    key: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    id: "USDC",
    network: "Ethereum · ERC20",
    icon: "usdc.png",
  },
  {
    key: "bnb",
    name: "BNB",
    symbol: "BNB",
    id: "BNB.BSC",
    network: "BNB Smart Chain",
    icon: "bnb.png",
  },
  {
    key: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    id: "DOGE",
    network: "Dogecoin",
    icon: "dogecoin.png",
  },
];
export default function Deposits() {
  const [user] = useUser(),
    [params, setParams] = useSearchParams();
  const [catalog, { refetch }] = createResource(() =>
    api("/trading/crypto/deposit", "GET"),
  );
  const [category, setCategory] = createSignal("all"),
    [code, setCode] = createSignal(""),
    [busy, setBusy] = createSignal(false);
  const selected = () =>
    ["g2a", "kinguin"].includes(params.type)
      ? "giftcard"
      : String(params.type || "bitcoin").toLowerCase();
  const method = () => methods.find((m) => m.key === selected());
  const signedIn = () => !!user()?.id;
  function chooseMethod(type) {
    setParams({ type });
    if (window.matchMedia("(max-width: 1050px)").matches) {
      requestAnimationFrame(() =>
        document
          .querySelector(".wallet-payment")
          ?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
            block: "start",
          }),
      );
    }
  }
  async function redeem(e) {
    e.preventDefault();
    if (busy() || !code().trim()) return;
    setBusy(true);
    const result = await authedAPI(
      "/user/promo",
      "POST",
      JSON.stringify({ code: code().trim() }),
      true,
    );
    setBusy(false);
    if (result?.success) {
      setCode("");
      createNotification("success", "Promo code applied.");
    }
  }
  return (
    <div class="wallet-page">
      <Title>Deposit | Cosmic Luck</Title>
      <div class="wallet-content">
        <header class="wallet-heading">
          <div>
            <span class="wallet-eyebrow">YOUR WALLET</span>
            <h1>Add funds</h1>
            <p>Choose a payment method to top up your Cosmic Luck balance.</p>
          </div>
          <div class="wallet-balance">
            <span>Available balance</span>
            <strong>
              <img src="/assets/chips/chip-green-clover.png" alt="Coins" />
              {Number(user()?.balance || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
            <A href="/withdraw">
              Withdraw funds <span aria-hidden="true">↗</span>
            </A>
          </div>
        </header>
        <div class="wallet-layout">
          <section class="wallet-methods">
            <div class="wallet-section-title">
              <h2>Payment method</h2>
              <span>01</span>
            </div>
            <div class="wallet-tabs" aria-label="Payment categories">
              <For
                each={[
                  ["all", "All methods"],
                  ["crypto", "Crypto"],
                  ["other", "More options"],
                ]}
              >
                {([key, label]) => (
                  <button
                    classList={{ active: category() === key }}
                    aria-pressed={category() === key}
                    onClick={() => setCategory(key)}
                  >
                    {label}
                  </button>
                )}
              </For>
            </div>
            <Show when={category() !== "other"}>
              <div class="wallet-method-grid">
                <For each={methods}>
                  {(m) => (
                    <button
                      class="wallet-method"
                      classList={{ selected: selected() === m.key }}
                      aria-pressed={selected() === m.key}
                      onClick={() => chooseMethod(m.key)}
                    >
                      <img src={"/assets/icons/" + m.icon} alt="" />
                      <div>
                        <strong>
                          {m.name}
                          <small>{m.symbol}</small>
                        </strong>
                        <span>{m.network}</span>
                      </div>
                      <i aria-hidden="true">
                        {selected() === m.key ? "✓" : "›"}
                      </i>
                    </button>
                  )}
                </For>
              </div>
            </Show>
            <Show when={category() !== "crypto"}>
              <div class="wallet-other-methods">
                <For
                  each={[
                    ["giftcard", "Gift card", "Redeem a Cosmic Luck code", "✦"],
                    [
                      "skindeck",
                      "CS2 skins",
                      "Deposit from your inventory",
                      "◇",
                    ],
                    [
                      "credit card",
                      "Credit card",
                      "Check card availability",
                      "▣",
                    ],
                  ]}
                >
                  {([key, title, sub, icon]) => (
                    <button
                      class="wallet-method"
                      classList={{ selected: selected() === key }}
                      aria-pressed={selected() === key}
                      onClick={() => chooseMethod(key)}
                    >
                      <span class="wallet-method-icon">{icon}</span>
                      <div>
                        <strong>{title}</strong>
                        <span>{sub}</span>
                      </div>
                      <i aria-hidden="true">{selected() === key ? "✓" : "›"}</i>
                    </button>
                  )}
                </For>
              </div>
            </Show>
            <div class="wallet-help">
              <span>Need a hand with a deposit?</span>
              <button class="wallet-text-button" onClick={openSupport}>
                Contact support ↗
              </button>
            </div>
          </section>
          <section class="wallet-payment">
            <div class="wallet-section-title">
              <h2>Deposit details</h2>
              <span>02</span>
            </div>
            <Show
              when={signedIn()}
              fallback={
                <div class="wallet-empty">
                  <img
                    src="/assets/logo/cosmic-luck-logo.png"
                    alt="Cosmic Luck"
                  />
                  <h3>Your next session starts here</h3>
                  <p>
                    Sign in to see your deposit details and transaction history.
                  </p>
                  <button
                    class="wallet-button primary"
                    onClick={() => setParams({ modal: "login" })}
                  >
                    Sign in to continue →
                  </button>
                </div>
              }
            >
              <Switch
                fallback={
                  <div class="wallet-empty">
                    <h3>Choose a payment method</h3>
                    <p>Select a currency, gift card, or skins to continue.</p>
                  </div>
                }
              >
                <Match when={method()}>
                  <Show when={method()} keyed>
                    {(m) => (
                      <CryptoDeposit
                        currency={m.id}
                        img={"/assets/icons/" + m.icon}
                        catalog={catalog()}
                        catalogLoading={catalog.loading}
                        retryCatalog={refetch}
                      />
                    )}
                  </Show>
                </Match>
                <Match when={selected() === "giftcard"}>
                  <GiftcardDeposit />
                </Match>
                <Match when={selected() === "credit card"}>
                  <CreditCardDeposit />
                </Match>
                <Match when={selected() === "skindeck"}>
                  <SkinDeckDeposit />
                </Match>
              </Switch>
            </Show>
          </section>
        </div>
        <Show when={signedIn()}>
          <form class="wallet-promo" onSubmit={redeem}>
            <div>
              <strong>Have a promo code?</strong>
              <p>Apply a referral or promotional code to your account.</p>
            </div>
            <div>
              <input
                aria-label="Promo code"
                placeholder="Enter your code"
                maxLength="64"
                value={code()}
                onInput={(e) => setCode(e.currentTarget.value)}
                disabled={busy()}
              />
              <button class="wallet-button" disabled={busy() || !code().trim()}>
                {busy() ? "Applying…" : "Apply code"}
              </button>
            </div>
          </form>
        </Show>
      </div>
    </div>
  );
}
