import {A, useLocation} from "@solidjs/router";
import {createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {authedAPI, createNotification} from "../util/api";
import Loader from "../components/Loader/loader";
import CaseSpinner from "../components/Cases/casespinner";
import {generateRandomItems} from "../resources/cases";
import {useUser} from "../contexts/usercontextprovider";
import {Title} from "@solidjs/meta";

const CASE_IMAGES = [
    'glass-case', 'cloud-case', 'slime-case', 'jungle-case', 'retro-case',
    'boom-case', 'neon-case', 'pirate-case', 'magic-case', 'frost-case',
    'aztec-case', 'lunar-case', 'goblin-case', 'phoenix-case', 'galaxy-case',
    'hell-case', 'wrath-case', 'zeus-case', 'dream-case', 'alchemy-case'
].map((slug) => `${import.meta.env.VITE_SERVER_URL || ''}/public/cases/${slug}.png`)

function Rewards(props) {

    const location = useLocation()
    const [user, {setBalance}] = useUser()
    const [rewards, {refetch}] = createResource(fetchRewards)
    const [now, setNow] = createSignal(Date.now())

    const SPIN_TIME = 4800
    const ITEM_TIME = 2200

    const [spinning, setSpinning] = createSignal('')
    const [spinnerItems, setSpinnerItems] = createSignal([])
    const [offset, setOffset] = createSignal(0)
    const [winAmount, setWinAmount] = createSignal(0)

    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))

    const isSupercharge = () => location.pathname.includes('supercharge')

    async function fetchRewards() {
        try {
            return await authedAPI('/user/rewards/overview', 'GET', null)
        } catch (e) {
            console.log(e)
            return null
        }
    }

    function coins(amount) {
        return (amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    }

    function tierCooldownLeft(tier) {
        return Math.max(0, (tier?.nextOpenAt || 0) - now())
    }

    function formatDuration(ms) {
        let totalSeconds = Math.floor(ms / 1000)
        let h = Math.floor(totalSeconds / 3600)
        let m = Math.floor((totalSeconds % 3600) / 60)
        return `${h}h ${m}m ${totalSeconds % 60}s`
    }

    function superchargeActive() {
        return rewards()?.supercharge?.active && (rewards()?.supercharge?.expiresAt || 0) > now()
    }

    function getRandomNumber(min, max) {
        const range = max - min + 1
        return Math.floor(Math.random() * range) + min
    }

    async function openRewardCase(endpoint, pool) {
        if (spinning() !== '') return
        setSpinning('loading')

        let res = await authedAPI(endpoint, 'POST', null, true)
        if (!res?.success) {
            setSpinning('')
            return
        }

        let items = generateRandomItems(pool)
        items[50] = res.item

        setOffset(getRandomNumber(-64, 64))
        setSpinnerItems(items)
        setWinAmount(res.amount)
        setSpinning('spinning')

        setTimeout(() => {
            setSpinning('win')
            setBalance(res.balance)
            createNotification('success', `You won ${coins(res.amount)} coins!`)
        }, SPIN_TIME + 500)

        setTimeout(() => {
            setSpinning('')
            refetch()
        }, SPIN_TIME + ITEM_TIME)
    }

    function openDailyTier(tier) {
        if (!tier.canOpen || tierCooldownLeft(tier) > 0) return
        openRewardCase(`/user/rewards/daily-case/${tier.minLevel}/open`, tier.pool)
    }

    function openSupercharge() {
        if (!superchargeActive()) return
        openRewardCase('/user/rewards/supercharge/open', rewards()?.supercharge?.pool || [])
    }

    return (
        <>
            <Title>Cosmic Luck | Rewards</Title>

            <div class='rewards-container fadein'>

                <Show when={spinning() !== '' && spinning() !== 'loading'}>
                    <div class='spinner-overlay'>
                        <div class='spinner-modal'>
                            <p class='spinner-title'>{spinning() === 'win' ? `YOU WON ${coins(winAmount())} COINS!` : 'OPENING CASE...'}</p>
                            <CaseSpinner spinTime={SPIN_TIME} offset={offset()}
                                         items={spinnerItems()}
                                         spinning={spinning()}
                                         position={0}/>
                        </div>
                    </div>
                </Show>

                <div class='pages'>
                    <button class={'page-tab ' + (!isSupercharge() ? 'active' : '')}>
                        Daily Cases
                        <A href='/rewards/daily' class='gamemode-link'></A>
                    </button>
                    <button class={'page-tab ' + (isSupercharge() ? 'active' : '')}>
                        Supercharge Cases
                        <A href='/rewards/supercharge' class='gamemode-link'></A>
                    </button>
                </div>

                <Show when={isSupercharge()}>
                    <div class='info-banner'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#1fd65f"/>
                        </svg>
                        <p>You can unlock your level's Supercharged cases by getting Supercharged. Check out the <span class='green'>Sidebar</span> to know more.</p>
                    </div>
                </Show>

                <Show when={!rewards.loading} fallback={<Loader/>}>
                    <div class='layout'>
                        <div class='grid'>
                            <For each={rewards()?.dailyCase?.tiers || []}>
                                {(tier, index) => (
                                    <div class={'case-card ' + (tier.unlocked ? '' : 'offline')}>
                                        <div class='case-img-wrap'>
                                            <img src={CASE_IMAGES[index() % CASE_IMAGES.length]} alt='' loading='lazy'/>
                                            <Show when={isSupercharge()}>
                                                <svg class='bolt-overlay' xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none">
                                                    <path d="M13 2L4 13h5v9l9-11h-5l0-9z" fill="#ffffff" opacity="0.55"/>
                                                </svg>
                                            </Show>
                                        </div>

                                        <p class='case-type'>{isSupercharge() ? 'Supercharge' : 'Daily'}</p>
                                        <p class='case-level'>
                                            LEVEL {tier.minLevel}+
                                            <Show when={isSupercharge()}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none">
                                                    <path d="M13 2L4 13h5v9l9-11h-5l0-9z" fill="#1fd65f"/>
                                                </svg>
                                            </Show>
                                        </p>

                                        <div class='case-bottom'>
                                            <p class='free'>FREE</p>

                                            <Show when={tier.unlocked} fallback={<span class='pill gray'>OFFLINE</span>}>
                                                <Show when={isSupercharge()} fallback={
                                                    <Show when={tierCooldownLeft(tier) <= 0} fallback={
                                                        <span class='pill gray'>{formatDuration(tierCooldownLeft(tier))}</span>
                                                    }>
                                                        <button class='pill bonus clickable' onClick={() => openDailyTier(tier)}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none">
                                                                <path d="M4 8h16v4h-1v8H5v-8H4V8zm7 4v8h2v-8h-2zm1-10c2 0 3 1 3 3H9c0-2 1-3 3-3z" fill="#1fd65f"/>
                                                            </svg>
                                                            OPEN
                                                        </button>
                                                    </Show>
                                                }>
                                                    <Show when={superchargeActive()} fallback={
                                                        <span class='pill locked'>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="10" viewBox="0 0 24 24" fill="none">
                                                                <path d="M17 9V7a5 5 0 0 0-10 0v2H5v13h14V9h-2zm-8 0V7a3 3 0 0 1 6 0v2H9z" fill="#ff5959"/>
                                                            </svg>
                                                            LOCKED
                                                        </span>
                                                    }>
                                                        <button class='pill bonus clickable' onClick={openSupercharge}>OPEN</button>
                                                    </Show>
                                                </Show>
                                            </Show>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>

                        <div class='sidebar'>
                            <Show when={!isSupercharge()} fallback={
                                <>
                                    <p class='side-title'>Supercharge Details</p>

                                    <p class='side-text'>Reach your deposit goal for your current level and get Supercharged!</p>
                                    <p class='side-text'>Each Supercharge lasts 1 hour and unlocks the following features:</p>

                                    <div class='features'>
                                        <For each={['5% Deposit Bonus', 'Supercharge Cases', 'Lightning icon next to your username']}>
                                            {(feature) => (
                                                <p class='feature'>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15l-5-5 1.4-1.4L10 14.2l7.6-7.6L19 8l-9 9z" fill="#1fd65f"/>
                                                    </svg>
                                                    {feature}
                                                </p>
                                            )}
                                        </For>
                                    </div>

                                    <div class='goal'>
                                        <p class='goal-amount align'>
                                            <img src='/assets/icons/coin.svg' height='12' width='12' alt=''/>
                                            {coins(rewards()?.supercharge?.minDeposit)}
                                        </p>
                                        <p class='side-text'>Deposit to get Supercharged</p>
                                    </div>

                                    <div class='spacer'/>

                                    <div class='streak'>
                                        <For each={[0, 1, 2, 3, 4, 5]}>
                                            {(i) => (
                                                <div class={'streak-bolt ' + ((rewards()?.supercharge?.totalCount || 0) % 6 > i ? 'lit' : '')}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none">
                                                        <path d="M13 2L4 13h5v9l9-11h-5l0-9z" fill="currentColor"/>
                                                    </svg>
                                                </div>
                                            )}
                                        </For>
                                    </div>

                                    <div class='note'>
                                        Every 6 times you get Supercharged you get one for free!
                                    </div>

                                    <Show when={superchargeActive()} fallback={
                                        <button class='action-btn'>
                                            Deposit&nbsp;
                                            <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                                            &nbsp;{coins(rewards()?.supercharge?.minDeposit)}
                                            <A href='/deposit' class='gamemode-link'></A>
                                        </button>
                                    }>
                                        <button class='action-btn' onClick={openSupercharge}>
                                            Open Supercharge Case&nbsp;
                                            <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                                            &nbsp;{coins(rewards()?.supercharge?.bonusAmount)}
                                        </button>
                                    </Show>
                                </>
                            }>
                                <p class='side-title'>Bonus Details</p>

                                <p class='side-text'>
                                    Each of your unlocked daily cases can be opened once every 24 hours. Every opening
                                    is a provably fair roll with rewards ranging from 0.2x up to 16x the case value.
                                </p>
                                <p class='side-text'>
                                    Reach your deposit requirement in the last 30 days for a chance to lower your wager
                                    requirement (WR) for transfer down to zero. The more you have deposited, the higher
                                    your chance of being able to transfer your bonus winnings to your Main Wallet.
                                </p>
                                <p class='side-text'>
                                    If you see a timer you should wait for it to run out before being able to open your
                                    daily cases again.
                                </p>

                                <For each={rewards()?.depositCases?.tiers || []}>
                                    {(tier) => (
                                        <div class='wr-block'>
                                            <p class='wr-amount align'>
                                                <img src='/assets/icons/coin.svg' height='11' width='11' alt=''/>
                                                {coins(tier.depositedToday)}&nbsp;/&nbsp;
                                                <img src='/assets/icons/coin.svg' height='11' width='11' alt=''/>
                                                {coins(tier.minDeposit)}
                                            </p>
                                            <p class='side-text'>Deposit to dailies with {tier.wagerMultiplier}x WR</p>
                                            <div class='wr-bar'>
                                                <div class='wr-fill' style={{width: `${Math.min(100, tier.depositedToday / tier.minDeposit * 100)}%`}}/>
                                            </div>
                                        </div>
                                    )}
                                </For>

                                <div class='spacer'/>

                                <div class='note'>
                                    Daily Cases are a form of bonus and not an investment. Over time the value of these
                                    cases will change and should not be relied on as a form of income. Any form of bonus
                                    abuse can result in your account being closed.
                                </div>
                            </Show>
                        </div>
                    </div>
                </Show>
            </div>

            <style jsx>{`
              .rewards-container {
                width: 100%;
                max-width: 1400px;
                height: fit-content;

                box-sizing: border-box;
                padding: 30px 0;
                margin: 0 auto;

                display: flex;
                flex-direction: column;
                gap: 15px;
              }

              .spinner-overlay {
                position: fixed;
                inset: 0;
                z-index: 100;

                display: flex;
                align-items: center;
                justify-content: center;

                background: rgba(4, 6, 10, 0.82);
                backdrop-filter: blur(3px);
              }

              .spinner-modal {
                width: min(760px, 92vw);

                display: flex;
                flex-direction: column;
                gap: 14px;
              }

              .spinner-title {
                text-align: center;
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 16px;
                font-weight: 700;
                text-shadow: 0 0 14px rgba(31, 214, 95, 0.4);
              }

              .pages {
                display: flex;
                gap: 8px;
              }

              .page-tab {
                display: flex;
                align-items: center;

                height: 36px;
                padding: 0 16px;

                outline: unset;
                border-radius: 5px;
                background: #1a1f29;
                border: 1px solid #2c3340;

                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;

                position: relative;
                cursor: pointer;
                transition: all .2s;
              }

              .page-tab.active {
                color: #1fd65f;
                border-color: rgba(31, 214, 95, 0.35);
                background: rgba(31, 214, 95, 0.08);
              }

              .info-banner {
                display: flex;
                align-items: center;
                gap: 10px;

                border-radius: 5px;
                border: 1px solid rgba(31, 214, 95, 0.4);
                background: rgba(31, 214, 95, 0.07);
                padding: 10px 14px;

                color: #1fd65f;
                font-size: 13px;
                font-weight: 600;
              }

              .green {
                color: #1fd65f;
                text-decoration: underline;
              }

              .layout {
                display: flex;
                gap: 15px;
                align-items: flex-start;
              }

              .grid {
                flex: 1;
                min-width: 0;

                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
                gap: 12px;
              }

              .case-card {
                display: flex;
                flex-direction: column;
                gap: 3px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 14px;

                transition: all .2s;
              }

              .case-card:hover {
                border-color: rgba(31, 214, 95, 0.3);
              }

              .case-card.offline {
                opacity: 0.55;
              }

              .case-card.offline:hover {
                border-color: #2c3340;
              }

              .case-img-wrap {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 130px;
                margin-bottom: 8px;
              }

              .case-img-wrap img {
                max-width: 100%;
                max-height: 130px;
                object-fit: contain;
              }

              .bolt-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
              }

              .case-type {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 600;
              }

              .case-level {
                display: flex;
                align-items: center;
                gap: 5px;

                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .case-bottom {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 6px;
              }

              .free {
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .pill {
                display: flex;
                align-items: center;
                gap: 5px;

                padding: 4px 9px;
                border-radius: 3px;

                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 10px;
                font-weight: 700;
              }

              .pill.bonus {
                background: rgba(31, 214, 95, 0.1);
                border: 1px solid rgba(31, 214, 95, 0.5);
                color: #1fd65f;
              }

              .pill.clickable {
                outline: unset;
                cursor: pointer;
                transition: all .2s;
              }

              .pill.clickable:hover {
                background: rgba(31, 214, 95, 0.25);
              }

              .pill.locked {
                background: rgba(255, 89, 89, 0.1);
                border: 1px solid rgba(255, 89, 89, 0.5);
                color: #ff5959;
              }

              .pill.gray {
                background: #12151c;
                border: 1px solid #2c3340;
                color: #8b92a0;
              }

              .sidebar {
                width: 280px;
                min-width: 280px;
                min-height: 600px;

                display: flex;
                flex-direction: column;
                gap: 12px;

                border-radius: 8px;
                background: #12151c;
                border: 1px solid #2c3340;
                padding: 18px;
                box-sizing: border-box;
              }

              .side-title {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 700;
                margin-bottom: 4px;
              }

              .side-text {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 500;
                line-height: 1.55;
              }

              .align {
                display: flex;
                align-items: center;
                gap: 4px;
              }

              .wr-block {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-top: 6px;
              }

              .wr-amount {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
              }

              .wr-bar {
                width: 100%;
                height: 4px;
                border-radius: 2525px;
                background: #1a1f29;
                border: 1px solid #2c3340;
              }

              .wr-fill {
                height: 100%;
                border-radius: 2525px;
                background: linear-gradient(90deg, #18c255 0%, #45e57f 100%);
                box-shadow: 0 0 6px rgba(31, 214, 95, 0.5);
              }

              .features {
                display: flex;
                flex-direction: column;
                gap: 8px;
              }

              .feature {
                display: flex;
                align-items: center;
                gap: 8px;

                color: #aeb6c5;
                font-size: 12px;
                font-weight: 600;
              }

              .goal {
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding-top: 8px;
                border-top: 1px solid #2c3340;
              }

              .goal-amount {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .spacer {
                flex: 1;
              }

              .streak {
                display: flex;
                gap: 6px;
              }

              .streak-bolt {
                width: 28px;
                height: 28px;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 5px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                color: #3a4250;
              }

              .streak-bolt.lit {
                color: #1fd65f;
                border-color: rgba(31, 214, 95, 0.5);
                background: rgba(31, 214, 95, 0.1);
                box-shadow: 0 0 8px rgba(31, 214, 95, 0.25);
              }

              .note {
                border-radius: 5px;
                border: 1px solid rgba(31, 214, 95, 0.45);
                background: rgba(31, 214, 95, 0.06);
                padding: 10px 12px;

                color: #1fd65f;
                font-size: 11px;
                font-weight: 600;
                line-height: 1.5;
              }

              .action-btn {
                display: flex;
                align-items: center;
                justify-content: center;

                width: 100%;
                height: 42px;

                outline: unset;
                border: unset;
                border-radius: 6px;
                background: #1fd65f;

                color: #04240f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;

                cursor: pointer;
                position: relative;
                transition: all .2s;
              }

              .action-btn:hover {
                background: #45e57f;
                box-shadow: 0 0 18px rgba(31, 214, 95, 0.35);
              }

              @media only screen and (max-width: 1000px) {
                .rewards-container {
                  padding-bottom: 90px;
                }

                .layout {
                  flex-direction: column-reverse;
                }

                .sidebar {
                  width: 100%;
                  min-width: 0;
                  min-height: 0;
                }
              }
            `}</style>
        </>
    );
}

export default Rewards;
