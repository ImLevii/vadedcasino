import {useSearchParams} from "@solidjs/router";
import {createResource, createSignal, For, Show} from "solid-js";
import Method from "../components/Transactions/method";
import {api, authedAPI, createNotification} from "../util/api";
import {openSupport} from "../util/support";
import CryptoWithdraw from "../components/Withdraws/crypto";
import SkinDeckWithdraw from "../components/Withdraws/skindeck";
import KYCModal from "../components/KYC/kyc";
import {Title} from "@solidjs/meta";

const METHODS = [
  {name: 'CRYPTO', display: 'Cryptocurrency', category: 'Withdraw Method', img: '/assets/icons/crypto.svg', tab: 'crypto', badge: 'Instant', badgeType: 'good'},
]

const SKINDECK_METHOD = {name: 'SKINDECK', display: 'CS2 Skins', category: 'Withdraw Method', img: '/assets/icons/cs2-logo.svg', wideImg: true, tab: 'skins', badge: 'Live Inventory', badgeType: 'good'}

const CATEGORY_ORDER = ['Withdraw Method']

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'Other']

function Withdraws(props) {

  const [skinDeckCapabilities] = createResource(async () => api('/trading/skindeck/capabilities', 'GET'))

  const [tab, setTab] = createSignal('all')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedItem, setSelectedItem] = createSignal(null)
  const [refetchMarket, setRefetchMarket] = createSignal(false)
  const [challengeId, setChallengeId] = createSignal(null)
  const [handlingMFA, setHandlingMFA] = createSignal(false)
  const [handlingLimitedBuy, setHandlingLimitedBuy] = createSignal(false)
  const [kyc, setKYC] = createSignal(false)
  const [country, setCountry] = createSignal('United States')

  function switchTabs(newTab) {
    setSearchParams({type: null, market: null, sort: null})
    setTab(newTab)
    setSelectedItem(null)
  }

  function changeType(name) {
    if (searchParams.type === name.toLowerCase()) {
      return setSearchParams({type: null})
    }
    setSearchParams({type: name.toLowerCase(), market: null, sort: null})
  }

  function isTabActive(name) {
    return !searchParams?.type || searchParams?.type?.toLowerCase() === name.toLowerCase()
  }

  function selectLimited(bundle) {
    if (selectedItem()?.id === bundle.id) {
      setSelectedItem(null)
      return
    }

    setSelectedItem(bundle)
  }

  const withdrawComponents = {
    'crypto': () => <CryptoWithdraw setKYC={setKYC}/>,
    'skindeck': () => <SkinDeckWithdraw/>,
  }

  function methodsForCategory(category) {
    const methods = skinDeckCapabilities()?.enabled ? [SKINDECK_METHOD, ...METHODS] : METHODS
    return methods.filter(method => method.category === category)
  }

  return (
    <>
      <Title>Cosmic Luck | Withdraw</Title>

      {kyc() && (
        <KYCModal close={() => setKYC(false)}/>
      )}

      <div class={'withdraws-wrapper'}>
        <div className='withdraws-container'>
          <div className='top-bar'>
            <div className='heading'>
              <h1>Withdraw</h1>
              <p>Select a method below to cash out your Coins.</p>
            </div>

            <div className='country-wrapper'>
              <label>Your Country</label>
              <select value={country()} onChange={(e) => setCountry(e.target.value)}>
                <For each={COUNTRIES}>{(c) => (
                  <option value={c}>{c}</option>
                )}</For>
              </select>
            </div>
          </div>

          <For each={CATEGORY_ORDER}>{(category) => (
            <Show when={methodsForCategory(category).length > 0}>
              <div className='section'>
                <h2>{category}</h2>
                <div className='methods'>
                  <For each={methodsForCategory(category)}>{(method) => (
                    <Method {...method} active={isTabActive(method.name)}
                            click={() => changeType(method.name)}/>
                  )}</For>
                </div>
              </div>
            </Show>
          )}</For>

          <Show when={withdrawComponents[searchParams?.type]} fallback={
            <div className='empty'>
              <p>{searchParams?.type ? 'This payment method is currently disabled' : 'Please select a payment method above.'}</p>
            </div>
          }>
            <div className='selected-method'>
              {withdrawComponents[searchParams?.type]()}
            </div>
          </Show>

          <div className='support-row'>
            <p>Having issues? Contact support here</p>
            <button class='support' onClick={() => openSupport()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="13" viewBox="0 0 12 13" fill="none">
                <path
                  d="M9.66916 8.40078C9.15432 9.10787 8.32036 9.5684 7.38075 9.5684H6.06233C5.60689 9.5684 5.21904 9.27925 5.07217 8.87455C4.89089 8.82048 4.71311 8.75028 4.53964 8.66408C4.17226 8.48155 3.83869 8.23426 3.54504 7.92792C1.6403 8.34637 0.214722 10.0436 0.214722 12.074V12.3394C0.214722 12.7043 0.510487 13 0.875316 13H11.1245C11.4894 13 11.7851 12.7043 11.7851 12.3394V12.074C11.7851 10.5055 10.9343 9.13578 9.66916 8.40078Z"
                  fill="#8b92a0"/>
                <path
                  d="M2.8429 6.56629C3.12681 6.56629 3.37393 6.40893 3.50196 6.17672C3.50533 6.18591 3.50875 6.19504 3.5122 6.20418C3.51322 6.20692 3.51424 6.20966 3.51525 6.21241C3.8156 7.00298 4.40001 7.66573 5.17061 7.9553C5.35699 7.65916 5.68655 7.46221 6.06232 7.46221H7.38074C7.51225 7.46221 7.63465 7.42511 7.74195 7.36512C7.92216 7.26436 8.08421 7.00872 8.16789 6.87323C8.30181 6.6564 8.40557 6.42672 8.49757 6.17632C8.54927 6.27021 8.62036 6.35189 8.70555 6.41589V6.73917C8.70555 7.46968 8.11125 8.06401 7.38071 8.06401H6.06229C5.81305 8.06401 5.61098 8.26608 5.61098 8.51532C5.61098 8.7646 5.81305 8.96664 6.06229 8.96664H7.38071C8.60894 8.96664 9.60817 7.9674 9.60817 6.73917V6.41589C9.79087 6.27864 9.90906 6.0602 9.90906 5.81412V4.45326V3.93141C9.90906 3.68027 9.78589 3.45807 9.59678 3.32144C9.45011 1.46542 7.89294 0 5.99988 0C4.10679 0 2.54965 1.46542 2.40298 3.32141C2.21386 3.45804 2.0907 3.68027 2.0907 3.93138V5.81407C2.0907 6.23068 2.42914 6.56629 2.8429 6.56629ZM5.99988 0.902654C7.40127 0.902654 8.55716 1.97361 8.69226 3.34008C8.60357 3.40985 8.53091 3.49902 8.48085 3.60134C8.05499 2.49028 7.10435 1.71673 5.99985 1.71673C4.87154 1.71673 3.93614 2.51686 3.52051 3.5969C3.51995 3.59837 3.51941 3.59987 3.51885 3.60137C3.46879 3.49904 3.39613 3.40987 3.30744 3.3401C3.44263 1.97361 4.59848 0.902654 5.99988 0.902654Z"
                  fill="#8b92a0"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .withdraws-wrapper {
          width: 100%;
          height: calc(100vh - 130px);
          overflow: hidden;
        }

        .withdraws-wrapper.active {
          padding: 0 235px 0 0;
        }

        .withdraws-container {
          width: 100%;
          max-width: 1175px;
          height: 100%;

          overflow-y: scroll;

          box-sizing: border-box;
          padding: 30px 0 90px 0;
          margin: 0 auto;
          scrollbar-color: transparent transparent;
        }

        .withdraws-container::-webkit-scrollbar {
          display: none;
        }

        .top-bar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;

          margin-bottom: 34px;
        }

        .heading h1 {
          color: #fff;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .heading p {
          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 13px;
          font-weight: 600;
        }

        .country-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .country-wrapper label {
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #8b92a0;
        }

        .country-wrapper select {
          width: 220px;
          height: 38px;

          box-sizing: border-box;
          padding: 0 12px;

          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: #0d0f13;

          color: #fff;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        .section {
          margin-bottom: 30px;
        }

        h2 {
          color: #fff;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 14px 0;
        }

        .bar {
          flex: 1;
          height: 1px;
          min-height: 1px;
          max-height: 1px;

          border-radius: 2525px;
          background: #3A386D;
        }

        .methods {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(225px, 1fr));
          grid-gap: 14px;
        }

        .selected-method {
          margin: 4px 0 30px 0;
        }

        .empty {
          width: 100%;
          min-height: 180px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.06);
          background: rgba(13, 15, 19, 0.4);

          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 15px;
          font-weight: 600;

          margin-bottom: 30px;
        }

        .support-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;

          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 13px;
          font-weight: 600;
        }

        .support {
          width: 28px;
          height: 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          background: #16181f;
          cursor: pointer;
          transition: border-color .18s ease;
        }

        .support:hover {
          border-color: rgba(31, 214, 95, 0.45);
        }

        .tab.active:before {
          border-radius: 3px;
          position: absolute;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
          top: 1px;
          left: 1px;
          content: '';
          background: linear-gradient(0deg, rgba(31, 214, 95, 0.25) 0%, rgba(31, 214, 95, 0.25) 100%), linear-gradient(230deg, #12151c 0%, #1f242e 100%), #2c3340;
          z-index: -1;
        }

        .support-wrapper {
          margin-left: auto;

          display: flex;
          align-items: center;
          gap: 10px;

          color: #8b92a0;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 13px;
          font-weight: 600;
        }

        .support {
          width: 26px;
          height: 26px;
        }

        .methods {
          padding: 0 15px;

          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
          grid-gap: 15px;
        }

        .empty {
          width: 100%;
          min-height: 250px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #8b92a0;
          font-size: 16px;
          font-weight: 700;
        }

        .selected-container {
          min-width: 235px;
          width: 235px;
          height: 100%;

          background: rgba(32, 30, 65, 0.51);

          display: flex;
          flex-direction: column;

          position: absolute;
          right: 0;
          top: 0;

          font-size: 12px;
          font-weight: 700;

          padding: 16px 12px;
        }

        .faded-bar {
          width: 50px;
          height: 1px;
          min-height: 1px;

          border-radius: 15px;
          background: linear-gradient(90deg, #4B4887 0%, rgba(75, 72, 135, 0.00) 100%);

          margin: 15px 0 25px 0;
        }

        .selected {
          display: flex;
          flex-direction: column;

          overflow-y: scroll;

          width: 100%;
          gap: 12px;
          scrollbar-color: transparent transparent;
        }

        .selected::-webkit-scrollbar {
          display: none;
        }

        .select {
          color: #8b92a0;
          font-size: 13px;
          font-weight: 700;

          text-align: center;
          margin: auto 0;
        }

        .depo-amount {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          color: #FFF;
          font-size: 13px;
          font-weight: 700;

          margin: 6px 0 20px 0;
        }

        .center {
          text-align: center;
        }

        .withdraw {
          min-height: 32px;
        }

        @media only screen and (max-width: 1000px) {
          .withdraws-container {
            padding-bottom: 90px;
          }
        }
      `}</style>
    </>
  );
}

export default Withdraws;
