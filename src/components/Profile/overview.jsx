import {createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import {useUser} from "../../contexts/usercontextprovider";
import Loader from "../Loader/loader";

function ProgressRing(props) {
    const radius = 54
    const circumference = 2 * Math.PI * radius

    return (
        <svg width='130' height='130' viewBox='0 0 130 130'>
            <circle cx='65' cy='65' r={radius} fill='none' stroke='#12151c' stroke-width='9'/>
            <circle cx='65' cy='65' r={radius} fill='none' stroke='#1fd65f' stroke-width='9'
                    stroke-linecap='round'
                    stroke-dasharray={circumference}
                    stroke-dashoffset={circumference * (1 - Math.min(1, Math.max(0, props.progress || 0)))}
                    transform='rotate(-90 65 65)'
                    style={{filter: 'drop-shadow(0 0 6px rgba(31, 214, 95, 0.6))', transition: 'stroke-dashoffset .5s'}}/>
        </svg>
    )
}

function Overview(props) {

    const [user, {mutateUser}] = useUser()
    const [rewards, {refetch: refetchRewards}] = createResource(fetchRewards)
    const [affiliate] = createResource(fetchAffiliate)
    const [stats] = createResource(fetchStats)
    const [now, setNow] = createSignal(Date.now())
    const [modal, setModal] = createSignal(null) // '2fa' | 'selflock' | 'tradeurl' | 'apikey'

    // 2FA modal state
    const [twoFaSecret, setTwoFaSecret] = createSignal('')
    const [twoFaCode, setTwoFaCode] = createSignal('')

    // Steam modals state
    const [tradeUrl, setTradeUrl] = createSignal('')
    const [apiKey, setApiKey] = createSignal('')

    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))

    async function fetchRewards() {
        try {
            return await authedAPI('/user/rewards/overview', 'GET', null)
        } catch (e) {
            console.log(e)
            return null
        }
    }

    async function fetchAffiliate() {
        try {
            return await authedAPI('/user/affiliate', 'GET', null)
        } catch (e) {
            console.log(e)
            return null
        }
    }

    async function fetchStats() {
        try {
            return await authedAPI(`/user/${user()?.id}/profile`, 'GET', null)
        } catch (e) {
            console.log(e)
            return null
        }
    }

    function unlockedDailyTiers() {
        return (rewards()?.dailyCase?.tiers || []).filter(t => t.unlocked)
    }

    function anyDailyOpenable() {
        return unlockedDailyTiers().some(t => (t.nextOpenAt || 0) <= now())
    }

    function dailyCooldownLeft() {
        let tiers = unlockedDailyTiers()
        if (!tiers.length) return 0
        let next = Math.min(...tiers.map(t => t.nextOpenAt || 0))
        return Math.max(0, next - now())
    }

    function formatDuration(ms) {
        let totalSeconds = Math.floor(ms / 1000)
        let h = Math.floor(totalSeconds / 3600)
        let m = Math.floor((totalSeconds % 3600) / 60)
        let s = totalSeconds % 60
        return `${h}h ${m}m ${s}s`
    }

    function coins(amount) {
        return (amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    }

    function activeDepositCase() {
        return rewards()?.depositCases?.active?.[0]
    }

    function wagerProgress() {
        let dc = activeDepositCase()
        if (!dc) return 0
        return dc.wagered / Math.max(1, dc.wagerRequired)
    }

    function isSelfLocked() {
        return user()?.selfLockUntil && new Date(user().selfLockUntil).getTime() > now()
    }

    function closeModal() {
        setModal(null)
        setTwoFaSecret('')
        setTwoFaCode('')
        setTradeUrl('')
        setApiKey('')
    }

    async function openDepositCase() {
        let res = await authedAPI('/user/rewards/deposit-cases/open', 'POST', null, true)
        if (res.success) {
            createNotification('success', `You opened a case and won ${res.amount} coins! ${res.casesRemaining} cases remaining.`)
            refetchRewards()
        }
    }

    async function start2faSetup() {
        let res = await authedAPI('/user/2fa/setup', 'POST', null, true)
        if (res.success) {
            setTwoFaSecret(res.secret)
        }
    }

    async function verify2fa() {
        let res = await authedAPI('/user/2fa/verify', 'POST', JSON.stringify({token: twoFaCode()}), true)
        if (res.success) {
            createNotification('success', 'Two factor authentication has been enabled.')
            mutateUser({...user(), has2fa: true})
            closeModal()
        }
    }

    async function disable2fa() {
        let res = await authedAPI('/user/2fa/disable', 'POST', JSON.stringify({token: twoFaCode()}), true)
        if (res.success) {
            createNotification('success', 'Two factor authentication has been disabled.')
            mutateUser({...user(), has2fa: false})
            closeModal()
        }
    }

    async function saveTradeUrl() {
        let res = await authedAPI('/user/steam/trade-url', 'POST', JSON.stringify({url: tradeUrl()}), true)
        if (res.success) {
            createNotification('success', 'Your Steam trade URL has been saved.')
            mutateUser({...user(), hasTradeUrl: !!tradeUrl()})
            closeModal()
        }
    }

    async function saveApiKey() {
        let res = await authedAPI('/user/steam/api-key', 'POST', JSON.stringify({key: apiKey()}), true)
        if (res.success) {
            createNotification('success', 'Your Steam API key has been saved.')
            mutateUser({...user(), hasApiKey: !!apiKey()})
            closeModal()
        }
    }

    async function selfLock(duration) {
        let res = await authedAPI('/user/self-lock', 'POST', JSON.stringify({duration}), true)
        if (res.success) {
            createNotification('success', 'Your account has been locked from gambling.')
            mutateUser({...user(), selfLockUntil: new Date(res.until).toISOString()})
            closeModal()
        }
    }

    async function toggleSetting(setting, current) {
        let res = await authedAPI('/user/settings', 'POST', JSON.stringify({
            setting,
            enable: !current
        }), true)
        if (res.success) {
            let key = setting === 'sound' ? 'soundEnabled' : setting === 'visual' ? 'visualEffects' : 'notificationsEnabled'
            mutateUser({...user(), [key]: !current ? 1 : 0})
            if (setting === 'sound') localStorage.setItem('sound', !current ? 100 : 0)
        }
    }

    return (
        <>
            <div class='overview-container fadein'>

                <Show when={!stats.loading}>
                    <div class='stats'>
                        <div class='stat'>
                            <p class='white align'>
                                <img src='/assets/icons/coin.svg' height='18' width='18' alt=''/>
                                {coins(stats()?.wagered)}
                            </p>
                            <p>WAGERED</p>
                        </div>
                        <div class='stat'>
                            <p class='white align'>
                                <img src='/assets/icons/coin.svg' height='18' width='18' alt=''/>
                                {coins(stats()?.withdraws)}
                            </p>
                            <p>WITHDRAWN</p>
                        </div>
                        <div class='stat'>
                            <p class='white align'>
                                <img src='/assets/icons/coin.svg' height='18' width='18' alt=''/>
                                {coins(stats()?.deposits)}
                            </p>
                            <p>DEPOSITED</p>
                        </div>
                        <div class='stat green-bg'>
                            <p class='white align'>
                                <img src='/assets/icons/coin.svg' height='18' width='18' alt=''/>
                                {coins((stats()?.withdraws - stats()?.deposits) || 0)}
                            </p>
                            <p class='green'>TOTAL PROFIT</p>
                        </div>
                    </div>
                </Show>

                <h2 class='section-title'>Rewards</h2>

                <Show when={!rewards.loading} fallback={<Loader/>}>
                    <div class='rewards'>
                        <div class='reward-card'>
                            <img class='case-img' src={`${import.meta.env.VITE_SERVER_URL || ''}/public/cases/galaxy-case.png`} alt='Daily Case'/>
                            <div class='reward-info'>
                                <p class='label'>Daily</p>
                                <p class='reward-title'>LEVEL {rewards()?.dailyCase?.minLevel || 5}+</p>
                                <div class='reward-bottom'>
                                    <Show when={anyDailyOpenable()} fallback={
                                        <Show when={rewards()?.dailyCase?.amount > 0} fallback={
                                            <span class='pill dark'>Level {rewards()?.dailyCase?.minLevel || 5} Required</span>
                                        }>
                                            <span class='pill dark'>{formatDuration(dailyCooldownLeft())}</span>
                                        </Show>
                                    }>
                                        <button class='claim-btn' onClick={() => window.location.href = '/rewards/daily'}>OPEN</button>
                                        <span class='pill green-pill'>BONUS</span>
                                    </Show>
                                </div>
                            </div>
                        </div>

                        <div class='reward-card center'>
                            <div class='ring-wrapper'>
                                <ProgressRing progress={wagerProgress()}/>
                                <svg class='ring-icon' xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none">
                                    <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L4.96 16.03L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z" fill="#1fd65f"/>
                                </svg>
                            </div>
                            <div class='reward-info centered'>
                                <p class='label'>Daily Cases</p>
                                <p class='reward-title'>Deposit to {rewards()?.depositCases ? '1x' : ''} WR</p>
                                <div class='reward-bottom'>
                                    <p class='balance'>
                                        <img src='/assets/icons/coin.svg' height='14' width='14' alt=''/>
                                        {coins(activeDepositCase() ? activeDepositCase().wagerRequired - activeDepositCase().wagered : rewards()?.depositCases?.minDeposit)}
                                    </p>
                                    <Show when={rewards()?.depositCases?.totalCasesRemaining > 0} fallback={
                                        <span class='pill dark'>Not Active</span>
                                    }>
                                        <Show when={activeDepositCase()?.unlocked} fallback={
                                            <span class='pill green-pill'>{rewards()?.depositCases?.totalCasesRemaining}x Active</span>
                                        }>
                                            <button class='claim-btn' onClick={openDepositCase}>OPEN ({rewards()?.depositCases?.totalCasesRemaining}x)</button>
                                        </Show>
                                    </Show>
                                </div>
                            </div>
                        </div>

                        <div class='reward-card center'>
                            <div class='ring-wrapper'>
                                <ProgressRing progress={rewards()?.supercharge?.active ? 1 : 0}/>
                                <svg class='ring-icon' xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none">
                                    <path d="M13 2L4.09 12.11C3.74 12.51 4.03 13.14 4.56 13.14H10V21.4C10 21.99 10.74 22.25 11.11 21.79L19.91 11.89C20.26 11.49 19.97 10.86 19.44 10.86H14V2.6C14 2.01 13.37 1.54 13 2Z" fill="#1fd65f"/>
                                </svg>
                            </div>
                            <div class='reward-info centered'>
                                <p class='label'>Supercharge</p>
                                <p class='reward-title'>Deposit to get Supercharged</p>
                                <div class='reward-bottom'>
                                    <p class='balance'>
                                        <img src='/assets/icons/coin.svg' height='14' width='14' alt=''/>
                                        {coins(rewards()?.supercharge?.active ? rewards()?.supercharge?.bonusAmount : rewards()?.supercharge?.minDeposit)}
                                    </p>
                                    <Show when={rewards()?.supercharge?.active} fallback={
                                        <span class='pill dark'>Not Active</span>
                                    }>
                                        <button class='claim-btn' onClick={() => window.location.href = '/rewards/supercharge'}>OPEN</button>
                                    </Show>
                                </div>
                            </div>
                        </div>
                    </div>
                </Show>

                <h2 class='section-title'>Actions</h2>

                <div class='grid'>
                    <div class='action-card' onClick={() => window.location.href = '/affiliates'}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M9 13.75C6.66 13.75 2 14.92 2 17.25V19H16V17.25C16 14.92 11.34 13.75 9 13.75ZM4.34 17C5.18 16.42 7.21 15.75 9 15.75C10.79 15.75 12.82 16.42 13.66 17H4.34ZM9 12C10.93 12 12.5 10.43 12.5 8.5C12.5 6.57 10.93 5 9 5C7.07 5 5.5 6.57 5.5 8.5C5.5 10.43 7.07 12 9 12ZM9 7C9.83 7 10.5 7.67 10.5 8.5C10.5 9.33 9.83 10 9 10C8.17 10 7.5 9.33 7.5 8.5C7.5 7.67 8.17 7 9 7ZM16.04 13.81C17.2 14.65 18 15.77 18 17.25V19H22V17.25C22 15.23 18.5 14.08 16.04 13.81ZM15 12C16.93 12 18.5 10.43 18.5 8.5C18.5 6.57 16.93 5 15 5C14.46 5 13.96 5.13 13.5 5.35C14.13 6.24 14.5 7.33 14.5 8.5C14.5 9.67 14.13 10.76 13.5 11.65C13.96 11.87 14.46 12 15 12Z" fill="#1fd65f"/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status balance'>
                                <img src='/assets/icons/coin.svg' height='13' width='13' alt=''/>
                                {coins(affiliate()?.unclaimedEarnings)}
                            </p>
                            <p class='action-label'>Affiliate Wallet</p>
                        </div>
                    </div>

                    <div class='action-card' onClick={() => createNotification('info', user()?.verified ? 'Your account is verified.' : 'Please contact support to complete KYC verification.')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C13.93 4 15.68 4.78 16.95 6.05C15.68 7.35 13.93 8.14 12 8.14C10.07 8.14 8.32 7.35 7.05 6.05C8.32 4.78 10.07 4 12 4ZM12 20C7.59 20 4 16.41 4 12C4 10.34 4.51 8.79 5.38 7.5C6.99 9.12 9.37 10.14 12 10.14C14.63 10.14 17.01 9.12 18.62 7.5C19.49 8.79 20 10.34 20 12C20 16.41 16.41 20 12 20ZM12 12C10.35 12 9 13.35 9 15C9 16.65 10.35 18 12 18C13.65 18 15 16.65 15 15C15 13.35 13.65 12 12 12Z" fill={user()?.verified ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{user()?.verified ? 'Verified' : 'Not Verified'}</p>
                            <p class='action-label'>KYC Verification</p>
                        </div>
                    </div>

                    <div class='action-card' onClick={() => setModal('2fa')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M17.81 4.47C17.73 4.47 17.65 4.45 17.58 4.41C15.66 3.42 14 3 12.01 3C10.03 3 8.15 3.47 6.44 4.41C6.2 4.54 5.9 4.45 5.76 4.21C5.63 3.97 5.72 3.66 5.96 3.53C7.82 2.52 9.86 2 12.01 2C14.14 2 15.99 2.47 18.04 3.52C18.29 3.65 18.38 3.95 18.25 4.19C18.16 4.37 17.99 4.47 17.81 4.47ZM3.5 9.72C3.4 9.72 3.3 9.69 3.21 9.63C2.98 9.47 2.93 9.16 3.09 8.93C4.08 7.53 5.34 6.43 6.84 5.66C9.98 4.04 14 4.03 17.15 5.64C18.65 6.41 19.91 7.5 20.9 8.89C21.06 9.11 21.01 9.43 20.78 9.59C20.55 9.75 20.24 9.7 20.08 9.47C19.18 8.22 18.04 7.23 16.69 6.54C13.82 5.08 10.15 5.08 7.29 6.55C5.93 7.25 4.79 8.25 3.89 9.51C3.8 9.65 3.65 9.72 3.5 9.72ZM9.75 21.79C9.62 21.79 9.49 21.74 9.4 21.64C8.53 20.77 8.06 20.21 7.39 19C6.7 17.77 6.34 16.27 6.34 14.66C6.34 11.69 8.88 9.27 12 9.27C15.12 9.27 17.66 11.69 17.66 14.66C17.66 14.94 17.44 15.16 17.16 15.16C16.88 15.16 16.66 14.94 16.66 14.66C16.66 12.24 14.57 10.27 12 10.27C9.43 10.27 7.34 12.24 7.34 14.66C7.34 16.1 7.66 17.43 8.27 18.51C8.91 19.66 9.35 20.15 10.12 20.93C10.31 21.13 10.31 21.44 10.12 21.64C10.01 21.74 9.88 21.79 9.75 21.79ZM16.92 19.94C15.73 19.94 14.68 19.64 13.82 19.05C12.33 18.04 11.44 16.4 11.44 14.66C11.44 14.38 11.66 14.16 11.94 14.16C12.22 14.16 12.44 14.38 12.44 14.66C12.44 16.07 13.16 17.4 14.38 18.22C15.09 18.7 15.92 18.93 16.92 18.93C17.16 18.93 17.56 18.9 17.96 18.83C18.23 18.78 18.49 18.96 18.54 19.24C18.59 19.51 18.41 19.77 18.13 19.82C17.56 19.93 17.06 19.94 16.92 19.94ZM14.91 22C14.87 22 14.82 21.99 14.78 21.98C13.19 21.54 12.15 20.95 11.06 19.88C9.66 18.49 8.89 16.64 8.89 14.66C8.89 13.04 10.27 11.72 11.97 11.72C13.67 11.72 15.05 13.04 15.05 14.66C15.05 15.73 15.98 16.6 17.13 16.6C18.28 16.6 19.21 15.73 19.21 14.66C19.21 10.89 15.96 7.83 11.96 7.83C9.12 7.83 6.52 9.41 5.35 11.86C4.96 12.67 4.76 13.62 4.76 14.66C4.76 15.44 4.83 16.67 5.43 18.27C5.53 18.53 5.4 18.82 5.14 18.91C4.88 19.01 4.59 18.87 4.5 18.62C4.01 17.31 3.77 16.01 3.77 14.66C3.77 13.46 4 12.37 4.45 11.42C5.78 8.63 8.73 6.82 11.96 6.82C16.51 6.82 20.21 10.33 20.21 14.65C20.21 16.27 18.83 17.59 17.13 17.59C15.43 17.59 14.05 16.27 14.05 14.65C14.05 13.58 13.12 12.71 11.97 12.71C10.82 12.71 9.89 13.58 9.89 14.65C9.89 16.36 10.55 17.96 11.76 19.16C12.71 20.1 13.62 20.62 15.03 21.01C15.3 21.08 15.45 21.36 15.38 21.62C15.32 21.85 15.12 22 14.91 22Z" fill={user()?.has2fa ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{user()?.has2fa ? 'Enabled' : 'Disabled'}</p>
                            <p class='action-label'>2 Factor Authentication</p>
                        </div>
                    </div>

                    <div class='action-card' onClick={() => setModal('selflock')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M18.5 3H6C4.9 3 4 3.9 4 5V12C4 15.87 7.13 19 11 19C14.87 19 18 15.87 18 12V10H18.5C20.43 10 22 8.43 22 6.5C22 4.57 20.43 3 18.5 3ZM16 12C16 14.76 13.76 17 11 17C8.24 17 6 14.76 6 12V5H16V12ZM18.5 8H18V5H18.5C19.33 5 20 5.67 20 6.5C20 7.33 19.33 8 18.5 8ZM4 21H18V23H4V21Z" fill={isSelfLocked() ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{isSelfLocked() ? 'Locked' : 'Disabled'}</p>
                            <p class='action-label'>Self Lockdown</p>
                        </div>
                    </div>

                    <div class='action-card' onClick={() => setModal('tradeurl')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 16.42 4.87 20.17 8.84 21.5L9.34 19.6C6.42 18.5 4.34 15.74 4.11 12.5L8.4 14.28C8.61 15.53 9.7 16.5 11 16.5C12.46 16.5 13.64 15.32 13.64 13.86V13.74L17.5 10.95H17.59C19.54 10.95 21.13 9.36 21.13 7.41C21.13 5.46 19.54 3.87 17.59 3.87C15.64 3.87 14.05 5.46 14.05 7.41V7.5L11.27 11.36H11.14C10.6 11.36 10.1 11.53 9.68 11.81L4.05 9.5C4.85 5.79 8.1 3 12 3C16.96 3 21 7.04 21 12C21 16.96 16.96 21 12 21V22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17.59 5.13C18.85 5.13 19.87 6.15 19.87 7.41C19.87 8.67 18.85 9.69 17.59 9.69C16.33 9.69 15.31 8.67 15.31 7.41C15.31 6.15 16.33 5.13 17.59 5.13ZM11 12.61C11.69 12.61 12.25 13.17 12.25 13.86C12.25 14.55 11.69 15.11 11 15.11C10.31 15.11 9.75 14.55 9.75 13.86C9.75 13.17 10.31 12.61 11 12.61Z" fill={user()?.hasTradeUrl ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{user()?.hasTradeUrl ? 'Entered' : 'Not Entered'}</p>
                            <p class='action-label'>Steam Trade URL</p>
                        </div>
                    </div>

                    <div class='action-card' onClick={() => setModal('apikey')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 16.42 4.87 20.17 8.84 21.5L9.34 19.6C6.42 18.5 4.34 15.74 4.11 12.5L8.4 14.28C8.61 15.53 9.7 16.5 11 16.5C12.46 16.5 13.64 15.32 13.64 13.86V13.74L17.5 10.95H17.59C19.54 10.95 21.13 9.36 21.13 7.41C21.13 5.46 19.54 3.87 17.59 3.87C15.64 3.87 14.05 5.46 14.05 7.41V7.5L11.27 11.36H11.14C10.6 11.36 10.1 11.53 9.68 11.81L4.05 9.5C4.85 5.79 8.1 3 12 3C16.96 3 21 7.04 21 12C21 16.96 16.96 21 12 21V22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17.59 5.13C18.85 5.13 19.87 6.15 19.87 7.41C19.87 8.67 18.85 9.69 17.59 9.69C16.33 9.69 15.31 8.67 15.31 7.41C15.31 6.15 16.33 5.13 17.59 5.13ZM11 12.61C11.69 12.61 12.25 13.17 12.25 13.86C12.25 14.55 11.69 15.11 11 15.11C10.31 15.11 9.75 14.55 9.75 13.86C9.75 13.17 10.31 12.61 11 12.61Z" fill={user()?.hasApiKey ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{user()?.hasApiKey ? 'Entered' : 'Not Entered'}</p>
                            <p class='action-label'>Steam API Key</p>
                        </div>
                    </div>
                </div>

                <h2 class='section-title'>Settings</h2>

                <div class='grid'>
                    <div class='action-card' onClick={async () => {
                        let res = await authedAPI('/user/anon', 'POST', JSON.stringify({enable: !user()?.anon}), true)
                        if (res.success) mutateUser({...user(), anon: !user()?.anon})
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C8.14 2 5 5.14 5 9V16.5C5 16.5 4 21 4 22H6C6 22 6.5 20.5 7.25 20.5C8 20.5 8.5 22 9.5 22C10.5 22 11 20.5 12 20.5C13 20.5 13.5 22 14.5 22C15.5 22 16 20.5 16.75 20.5C17.5 20.5 18 22 18 22H20C20 21 19 16.5 19 16.5V9C19 5.14 15.86 2 12 2ZM9 11.75C8.31 11.75 7.75 11.19 7.75 10.5C7.75 9.81 8.31 9.25 9 9.25C9.69 9.25 10.25 9.81 10.25 10.5C10.25 11.19 9.69 11.75 9 11.75ZM15 11.75C14.31 11.75 13.75 11.19 13.75 10.5C13.75 9.81 14.31 9.25 15 9.25C15.69 9.25 16.25 9.81 16.25 10.5C16.25 11.19 15.69 11.75 15 11.75Z" fill={user()?.anon ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{user()?.anon ? 'Enabled' : 'Disabled'}</p>
                            <p class='action-label'>Anonymous Mode</p>
                        </div>
                    </div>

                    <div class='action-card' onClick={() => toggleSetting('sound', !!user()?.soundEnabled)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M3 9V15H7L12 20V4L7 9H3ZM10 8.83V15.17L7.83 13H5V11H7.83L10 8.83ZM16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill={user()?.soundEnabled ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{user()?.soundEnabled ? 'Enabled' : 'Disabled'}</p>
                            <p class='action-label'>Sound Effects</p>
                        </div>
                    </div>

                    <div class='action-card' onClick={() => toggleSetting('visual', !!user()?.visualEffects)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill={user()?.visualEffects ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{user()?.visualEffects ? 'Enabled' : 'Disabled'}</p>
                            <p class='action-label'>Visual Effects</p>
                        </div>
                    </div>

                    <div class='action-card' onClick={() => toggleSetting('notifications', !!user()?.notificationsEnabled)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill={user()?.notificationsEnabled ? '#1fd65f' : '#8b92a0'}/>
                        </svg>
                        <div class='action-info'>
                            <p class='action-status'>{user()?.notificationsEnabled ? 'Enabled' : 'Disabled'}</p>
                            <p class='action-label'>Notifications</p>
                        </div>
                    </div>
                </div>

                <Show when={modal() === '2fa'}>
                    <div class='modal fadein' onClick={closeModal}>
                        <div class='modal-content' onClick={(e) => e.stopPropagation()}>
                            <p class='modal-title'>2 FACTOR <span class='green'>AUTHENTICATION</span></p>
                            <p class='close bevel-light' onClick={closeModal}>X</p>

                            <Show when={!user()?.has2fa} fallback={
                                <>
                                    <p class='modal-text'>Enter your 6-digit authenticator code to disable 2FA.</p>
                                    <input class='modal-input' type='text' maxLength='6' placeholder='000000' value={twoFaCode()}
                                           onInput={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}/>
                                    <button class='bevel-gold modal-btn' onClick={disable2fa}>DISABLE 2FA</button>
                                </>
                            }>
                                <Show when={twoFaSecret()} fallback={
                                    <>
                                        <p class='modal-text'>Protect your account with a TOTP authenticator app such as Google Authenticator or Authy.</p>
                                        <button class='bevel-gold modal-btn' onClick={start2faSetup}>START SETUP</button>
                                    </>
                                }>
                                    <p class='modal-text'>Add this secret key to your authenticator app, then enter the 6-digit code below to confirm.</p>
                                    <p class='secret'>{twoFaSecret()}</p>
                                    <input class='modal-input' type='text' maxLength='6' placeholder='000000' value={twoFaCode()}
                                           onInput={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}/>
                                    <button class='bevel-gold modal-btn' onClick={verify2fa}>VERIFY & ENABLE</button>
                                </Show>
                            </Show>
                        </div>
                    </div>
                </Show>

                <Show when={modal() === 'selflock'}>
                    <div class='modal fadein' onClick={closeModal}>
                        <div class='modal-content' onClick={(e) => e.stopPropagation()}>
                            <p class='modal-title'>SELF <span class='green'>LOCKDOWN</span></p>
                            <p class='close bevel-light' onClick={closeModal}>X</p>

                            <Show when={!isSelfLocked()} fallback={
                                <p class='modal-text'>Your account is locked from gambling until {new Date(user()?.selfLockUntil).toLocaleString()}.</p>
                            }>
                                <p class='modal-text'>Lock yourself out of all games for a chosen period. <b>This cannot be undone.</b></p>
                                <div class='lock-options'>
                                    <For each={[['24h', '24 Hours'], ['7d', '7 Days'], ['30d', '30 Days'], ['permanent', 'Permanent']]}>
                                        {([duration, label]) => (
                                            <button class='bevel-light lock-btn' onClick={() => {
                                                if (confirm(`Are you sure you want to lock your account from gambling for ${label}? This cannot be undone.`)) {
                                                    selfLock(duration)
                                                }
                                            }}>{label}</button>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>
                    </div>
                </Show>

                <Show when={modal() === 'tradeurl'}>
                    <div class='modal fadein' onClick={closeModal}>
                        <div class='modal-content' onClick={(e) => e.stopPropagation()}>
                            <p class='modal-title'>STEAM <span class='green'>TRADE URL</span></p>
                            <p class='close bevel-light' onClick={closeModal}>X</p>

                            <p class='modal-text'>Enter your Steam trade URL. You can find it in your Steam inventory privacy settings.</p>
                            <input class='modal-input wide' type='text' placeholder='https://steamcommunity.com/tradeoffer/new/?partner=...&token=...'
                                   value={tradeUrl()} onInput={(e) => setTradeUrl(e.target.value)}/>
                            <button class='bevel-gold modal-btn' onClick={saveTradeUrl}>SAVE</button>
                        </div>
                    </div>
                </Show>

                <Show when={modal() === 'apikey'}>
                    <div class='modal fadein' onClick={closeModal}>
                        <div class='modal-content' onClick={(e) => e.stopPropagation()}>
                            <p class='modal-title'>STEAM <span class='green'>API KEY</span></p>
                            <p class='close bevel-light' onClick={closeModal}>X</p>

                            <p class='modal-text'>Enter your Steam Web API key. You can get one at steamcommunity.com/dev/apikey.</p>
                            <input class='modal-input wide' type='text' placeholder='Your 32 character API key'
                                   value={apiKey()} onInput={(e) => setApiKey(e.target.value)}/>
                            <button class='bevel-gold modal-btn' onClick={saveApiKey}>SAVE</button>
                        </div>
                    </div>
                </Show>
            </div>

            <style jsx>{`
              .overview-container {
                width: 100%;
              }

              .stats {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 30px;
              }

              .stat {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 8px;

                flex: 1 1 0;
                min-width: 150px;
                height: 80px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;

                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 17px;
                font-weight: 600;
              }

              .stat p:last-child {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 600;
              }

              .stat.green-bg {
                background: rgba(31, 214, 95, 0.1);
                border: 1px solid rgba(31, 214, 95, 0.25);
              }

              .align {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .green {
                color: #1fd65f !important;
              }

              .section-title {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 18px;
                font-weight: 700;
                margin: 0 0 15px 0;
              }

              .rewards {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin-bottom: 30px;
              }

              .reward-card {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 20px;
                min-height: 260px;
                box-sizing: border-box;
              }

              .reward-card.center {
                align-items: center;
              }

              .case-img {
                width: 170px;
                height: 150px;
                object-fit: contain;
                margin: 0 auto;
                filter: drop-shadow(0 0 20px rgba(31, 214, 95, 0.25));
              }

              .ring-wrapper {
                position: relative;
                width: 130px;
                height: 130px;
                margin: 10px auto 0 auto;
              }

              .ring-icon {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              }

              .reward-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
                width: 100%;
                margin-top: auto;
              }

              .reward-info.centered {
                align-items: center;
                text-align: center;
              }

              .label {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 600;
              }

              .reward-title {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 15px;
                font-weight: 700;
              }

              .reward-bottom {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                width: 100%;
                margin-top: 8px;
              }

              .balance {
                display: flex;
                align-items: center;
                gap: 6px;

                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 700;
              }

              .pill {
                padding: 5px 10px;
                border-radius: 3px;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
              }

              .pill.dark {
                background: #12151c;
                border: 1px solid #2c3340;
                color: #8b92a0;
              }

              .pill.green-pill {
                background: rgba(31, 214, 95, 0.15);
                border: 1px solid rgba(31, 214, 95, 0.4);
                color: #1fd65f;
              }

              .claim-btn {
                outline: unset;
                border: 1px solid rgba(31, 214, 95, 0.4);
                border-radius: 3px;
                background: rgba(31, 214, 95, 0.15);
                color: #1fd65f;

                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
                padding: 6px 14px;
                cursor: pointer;
                transition: all .2s;
              }

              .claim-btn:hover {
                background: rgba(31, 214, 95, 0.3);
              }

              .grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 30px;
              }

              .action-card {
                display: flex;
                align-items: center;
                gap: 14px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 16px;
                cursor: pointer;
                transition: all .2s;
              }

              .action-card:hover {
                border: 1px solid rgba(31, 214, 95, 0.35);
              }

              .action-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
              }

              .action-status {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .action-label {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .modal {
                position: fixed;
                top: 0;
                left: 0;

                width: 100vw;
                height: 100vh;

                background: rgba(5, 7, 12, 0.72);
                backdrop-filter: blur(6px);

                display: flex;
                align-items: center;
                justify-content: center;

                z-index: 1000;
                padding: 20px;
                box-sizing: border-box;
              }

              .modal-content {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;

                width: 100%;
                max-width: 420px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 30px;
                box-sizing: border-box;
              }

              .modal-title {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 18px;
                font-weight: 700;
              }

              .modal-text {
                color: #8b92a0;
                font-size: 13px;
                font-weight: 600;
                text-align: center;
                line-height: 1.5;
              }

              .secret {
                color: #1fd65f;
                font-family: monospace;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 2px;

                background: #12151c;
                border: 1px solid #2c3340;
                border-radius: 5px;
                padding: 10px 15px;
                word-break: break-all;
                text-align: center;
                user-select: all;
              }

              .modal-input {
                outline: unset;
                border: 1px solid #2c3340;
                border-radius: 5px;
                background: #12151c;

                width: 140px;
                height: 40px;
                text-align: center;

                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 16px;
                font-weight: 700;
                letter-spacing: 4px;
              }

              .modal-input.wide {
                width: 100%;
                letter-spacing: 0;
                font-size: 13px;
                padding: 0 12px;
                box-sizing: border-box;
              }

              .modal-btn {
                height: 40px;
                padding: 0 25px;
                font-size: 14px;
              }

              .close {
                position: absolute;
                top: 15px;
                right: 15px;

                width: 26px;
                height: 26px;
                line-height: 26px;
                text-align: center;

                font-weight: 700;
                cursor: pointer;
              }

              .lock-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                width: 100%;
              }

              .lock-btn {
                height: 40px;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              @media only screen and (max-width: 1000px) {
                .rewards {
                  grid-template-columns: 1fr;
                }

                .grid {
                  grid-template-columns: repeat(2, 1fr);
                }
              }

              @media only screen and (max-width: 540px) {
                .grid {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>
        </>
    );
}

export default Overview;
