import {useSearchParams} from "@solidjs/router";
import {createSignal, For, Show} from "solid-js";
import Method from "../components/Transactions/method";
import CryptoDeposit from "../components/Deposits/crypto";
import GiftcardDeposit from "../components/Deposits/giftcard";
import {authedAPI, createNotification} from "../util/api";
import CreditCardDeposit from "../components/Deposits/creditcard";
import {openSupport} from "../util/support";
import {Title} from "@solidjs/meta";

const METHODS = [
  {name: 'G2A', display: 'G2A', category: 'Other Methods', img: '/assets/icons/g2a.png', tab: 'fiat', badge: 'Buy / Redeem', badgeType: 'neutral'},
  {name: 'KINGUIN', display: 'Kinguin', category: 'Other Methods', img: '/assets/icons/kinguin.png', tab: 'fiat', badge: 'Buy / Redeem', badgeType: 'neutral'},
  {name: 'CREDIT CARD', display: 'Cards', category: 'Real Money', img: '/assets/icons/cards.png', tab: 'fiat', badge: 'Best Option', badgeType: 'good'},
  {name: 'BITCOIN', display: 'BTC', category: 'Cryptocurrency', img: '/assets/icons/bitcoin.png', tab: 'crypto'},
  {name: 'ETHEREUM', display: 'ETH', category: 'Cryptocurrency', img: '/assets/icons/ethereum.png', tab: 'crypto'},
  {name: 'LITECOIN', display: 'LTC', category: 'Cryptocurrency', img: '/assets/icons/litecoin.png', tab: 'crypto'},
  {name: 'BNB', display: 'BNB', category: 'Cryptocurrency', img: '/assets/icons/bnb.png', tab: 'crypto'},
  {name: 'USDC', display: 'USDC', category: 'Cryptocurrency', img: '/assets/icons/usdc.png', tab: 'crypto'},
  {name: 'USDT', display: 'USDT', category: 'Cryptocurrency', img: '/assets/icons/usdt.png', tab: 'crypto'},
  {name: 'DOGECOIN', display: 'DOGE', category: 'Cryptocurrency', img: '/assets/icons/dogecoin.png', tab: 'crypto'}
]

const CATEGORY_ORDER = ['Other Methods', 'Real Money', 'Cryptocurrency']

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'Other']

function Deposits(props) {

  const [tab, setTab] = createSignal('all')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedItems, setSelectedItems] = createSignal([])
  const [percents, setPercents] = createSignal([], {equals: false})
  const [refetch, setRefetch] = createSignal(false)
  const [challengeId, setChallengeId] = createSignal(null)
  const [handlingMFA, setHandlingMFA] = createSignal(false)
  const [handlingLimitedSell, setHandlingLimitedSell] = createSignal(false)
  const [code, setCode] = createSignal('')
  const [country, setCountry] = createSignal('United States')

  function switchTabs(newTab) {
    setSearchParams({type: null})
    setTab(newTab)
    setSelectedItems([])
    setPercents([])
  }

  function changeType(name) {
    if (searchParams.type === name.toLowerCase()) {
      return setSearchParams({type: null})
    }
    setSearchParams({type: name.toLowerCase()})
  }

  function isTabActive(name) {
    return !searchParams?.type || searchParams?.type?.toLowerCase() === name.toLowerCase()
  }

  function selectLimited(item) {
    if (!selectedItems()) return
    let index = selectedItems().findIndex(i => item.userAssetId === i.userAssetId)

    if (index < 0) {
      setSelectedItems([
        ...selectedItems(),
        item
      ])
      setPercents([...percents(), {
        userAssetId: item.userAssetId,
        discount: 11
      }])
      return
    }

    setSelectedItems([
      ...selectedItems().slice(0, index),
      ...selectedItems().slice(index + 1)
    ])
    removePercent(item?.userAssetId)
  }

  function getPercent(userAssetId) {
    return percents()?.find(percent => percent.userAssetId === userAssetId)?.discount || 11
  }

  function removePercent(userAssetId) {
    let index = percents()?.findIndex(p => p.userAssetId === userAssetId)
    if (index < 0) return

    setPercents([
      ...percents().slice(0, index),
      ...percents().slice(index + 1)
    ])
  }

  function setPercent(userAssetId, percent) {
    let index = percents()?.findIndex(p => p.userAssetId === userAssetId)
    let percentObj = {
      userAssetId: userAssetId,
      discount: percent
    }

    if (index < 0) {
      setPercents([...percents(), percentObj])
      return
    }

    setPercents([
      ...percents().slice(0, index),
      percentObj,
      ...percents().slice(index + 1)
    ])
  }

  function adjustedPercents() {
    return percents().map(p => {
      return { ...p, discount: -p.discount + 11 }
    })
  }

  function sumItems() {
    return selectedItems()?.reduce((pv, item) => {
      let percent = getPercent(item.userAssetId)
      let modifier = 1 + (percent - 11) / 100
      return pv + item.price * modifier
    }, 0)
  }

  const depositComponent = {
    'credit card': () => <CreditCardDeposit/>,
    'g2a': () => <GiftcardDeposit type='g2a' name='G2A GIFT CARDS'/>,
    'kinguin': () => <GiftcardDeposit type='kinguin' name='KINGUIN GIFT CARDS'/>,
    'bitcoin': () => <CryptoDeposit currency='BTC' img='/assets/icons/bitcoin.png'/>,
    'ethereum': () => <CryptoDeposit currency='ETH' img='/assets/icons/ethereum.png'/>,
    'litecoin': () => <CryptoDeposit currency='LTC' img='/assets/icons/litecoin.png'/>,
    'bnb': () => <CryptoDeposit currency='BNB.BSC' img='/assets/icons/bnb.png'/>,
    'usdc': () => <CryptoDeposit currency='USDC' img='/assets/icons/usdc.png'/>,
    'usdt': () => <CryptoDeposit currency='USDT.ERC20' img='/assets/icons/usdt.png'/>,
    'dogecoin': () => <CryptoDeposit currency='DOGE' img='/assets/icons/dogecoin.png'/>,
    // 'busd': () => <CryptoDeposit currency='BUSD.' img='/assets/icons/busd.png'/>,
  }

  function methodsForCategory(category) {
    return METHODS.filter(method => method.category === category)
  }

  async function redeemCode() {
    if (code().length < 1) return

    let res = await authedAPI('/user/promo', 'POST', JSON.stringify({
      code: code()
    }), true)

    if (res.success) {
      createNotification('success', `Successfully redeemed code ${code()}.`)
      setCode('')
    }
  }

  return (
    <>
      <Title>Cosmic Luck | Deposit</Title>

      <div class={'deposits-wrapper'}>
        <div className='deposits-container'>
          <div className='top-bar'>
            <div className='code-wrapper'>
              <label>Referral or Promo or Gift Code</label>
              <div className='code-input'>
                <input type='text' placeholder='Enter code...' value={code()}
                       onInput={(e) => setCode(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && redeemCode()}/>
                <button className='confirm' onClick={() => redeemCode()}>Confirm</button>
              </div>
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

          <Show when={depositComponent[searchParams?.type]} fallback={
            <div className='empty'>
              <p>{searchParams?.type ? 'This payment method will be supported soon' : 'Please select a payment method above.'}</p>
            </div>
          }>
            <div className='selected-method'>
              {depositComponent[searchParams?.type]()}
            </div>
          </Show>

          <div className='support-row'>
            <p>Having issues? Contact support here</p>
            <button class='support' onClick={() => openSupport()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="13" viewBox="0 0 12 13" fill="none">
                <path d="M9.66916 8.40078C9.15432 9.10787 8.32036 9.5684 7.38075 9.5684H6.06233C5.60689 9.5684 5.21904 9.27925 5.07217 8.87455C4.89089 8.82048 4.71311 8.75028 4.53964 8.66408C4.17226 8.48155 3.83869 8.23426 3.54504 7.92792C1.6403 8.34637 0.214722 10.0436 0.214722 12.074V12.3394C0.214722 12.7043 0.510487 13 0.875316 13H11.1245C11.4894 13 11.7851 12.7043 11.7851 12.3394V12.074C11.7851 10.5055 10.9343 9.13578 9.66916 8.40078Z" fill="#8984C5"/>
                <path d="M2.8429 6.56629C3.12681 6.56629 3.37393 6.40893 3.50196 6.17672C3.50533 6.18591 3.50875 6.19504 3.5122 6.20418C3.51322 6.20692 3.51424 6.20966 3.51525 6.21241C3.8156 7.00298 4.40001 7.66573 5.17061 7.9553C5.35699 7.65916 5.68655 7.46221 6.06232 7.46221H7.38074C7.51225 7.46221 7.63465 7.42511 7.74195 7.36512C7.92216 7.26436 8.08421 7.00872 8.16789 6.87323C8.30181 6.6564 8.40557 6.42672 8.49757 6.17632C8.54927 6.27021 8.62036 6.35189 8.70555 6.41589V6.73917C8.70555 7.46968 8.11125 8.06401 7.38071 8.06401H6.06229C5.81305 8.06401 5.61098 8.26608 5.61098 8.51532C5.61098 8.7646 5.81305 8.96664 6.06229 8.96664H7.38071C8.60894 8.96664 9.60817 7.9674 9.60817 6.73917V6.41589C9.79087 6.27864 9.90906 6.0602 9.90906 5.81412V4.45326V3.93141C9.90906 3.68027 9.78589 3.45807 9.59678 3.32144C9.45011 1.46542 7.89294 0 5.99988 0C4.10679 0 2.54965 1.46542 2.40298 3.32141C2.21386 3.45804 2.0907 3.68027 2.0907 3.93138V5.81407C2.0907 6.23068 2.42914 6.56629 2.8429 6.56629ZM5.99988 0.902654C7.40127 0.902654 8.55716 1.97361 8.69226 3.34008C8.60357 3.40985 8.53091 3.49902 8.48085 3.60134C8.05499 2.49028 7.10435 1.71673 5.99985 1.71673C4.87154 1.71673 3.93614 2.51686 3.52051 3.5969C3.51995 3.59837 3.51941 3.59987 3.51885 3.60137C3.46879 3.49904 3.39613 3.40987 3.30744 3.3401C3.44263 1.97361 4.59848 0.902654 5.99988 0.902654Z" fill="#8984C5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .deposits-wrapper {
          width: 100%;
          height: calc(100vh - 130px);
          overflow: hidden;
        }

        .deposits-wrapper.active {
          padding: 0 235px 0 0;
        }

        .deposits-container {
          width: 100%;
          max-width: 1175px;
          height: 100%;

          overflow-y: scroll;

          box-sizing: border-box;
          padding: 30px 0 90px 0;
          margin: 0 auto;
          scrollbar-color: transparent transparent;
        }

        .deposits-container::-webkit-scrollbar {
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

        .code-wrapper, .country-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .top-bar label {
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #8b92a0;
        }

        .code-input {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .code-input input {
          width: 200px;
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
          transition: border-color .18s ease;
        }

        .code-input input:focus {
          border-color: rgba(31, 214, 95, 0.5);
        }

        .code-input input::placeholder {
          color: #5b626f;
        }

        .confirm {
          height: 38px;
          padding: 0 20px;

          border: unset;
          border-radius: 6px;
          background: var(--gold);

          color: #0c2e18;
          font-family: Geogrotesque Wide, sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: filter .18s ease, transform .18s ease;
        }

        .confirm:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
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

        .deposit {
          min-height: 32px;
        }

        @media only screen and (max-width: 1000px) {
          .deposits-wrapper {
            height: calc(100vh - 135px);;
          }

          .deposits-container {
            padding-bottom: 90px;
          }
        }
      `}</style>
    </>
  );
}

export default Deposits;
