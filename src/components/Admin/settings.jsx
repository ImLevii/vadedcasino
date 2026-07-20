import {createResource, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import AdminMFA from "../MFA/adminmfa";
import Switch from "../Toggle/switch";

function formatFeatureName(id) {
    const map = {
        'battles': 'Battles',
        'coinflip': 'Coinflip',
        'crash': 'Crash',
        'roulette': 'Roulette',
        'mines': 'Mines',
        'blackjack': 'Blackjack',
        'slots': 'Slots',
        'chat': 'Chat',
        'rain': 'Rain',
        'leaderboard': 'Leaderboard',
        'rakeback': 'Rakeback',
        'promoCodes': 'Promo Codes',
        'affiliates': 'Affiliates',
        'surveys': 'Surveys',
        'cryptoDeposits': 'Crypto Deposits',
        'cryptoWithdrawals': 'Crypto Withdrawals',
        'skindeck': 'SkinDeck',
        'rainCaptcha': 'Rain Captcha',
        'rainDailyDepositRequirement': 'Rain Daily Deposit Requirement'
    };
    return map[id] || id?.toUpperCase();
}

function AdminSettings(props) {

    const [settings, {mutate: mutateSettings, refetch: refetchSettings}] = createResource(fetchSettings)

    async function fetchSettings() {
        try {
            let settingsRes = await authedAPI(`/admin/features`, 'GET', null)
            if (settingsRes.error && settingsRes.error === '2FA_REQUIRED') {
                return mutateSettings({mfa: true})
            }

            return mutateSettings(settingsRes)
        } catch (e) {
            console.log(e)
            return mutateSettings(null)
        }
    }

    async function handleToggle(id, value) {
        let res = await authedAPI(`/admin/features/${id}`, 'POST', JSON.stringify({
            enable: value
        }), true)

        if (res?.success) {
            createNotification('success', 'Setting updated.')
        } else {
            createNotification('error', res?.error || 'Failed to update.')
        }
    }

    return (
        <>
            {settings()?.mfa && (
                <AdminMFA refetch={() => refetchSettings()}/>
            )}

            <Show when={!settings.loading} fallback={<Loader/>}>
                <div class='settings'>
                    <For each={Object.entries(settings() || {})}>{(entry) =>
                        <Show when={entry[0] !== 'mfa'}>
                            <div class='setting'>
                                <p class='setting-label'>{formatFeatureName(entry[0])}</p>
                                <Switch dark={true} active={entry[1]} toggle={(v) => handleToggle(entry[0], v)}/>
                            </div>
                        </Show>
                    }</For>
                </div>
            </Show>

            <style jsx>{`
              .settings {
                display: flex;
                flex-direction: column;
                gap: 4px;
                width: 100%;
                min-width: 0;
              }

              .setting {
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 48px;
                background: #12151c;
                border-radius: 6px;
                padding: 0 16px;
                color: #8b92a0;
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 3px;
              }

              .setting:nth-of-type(2n) {
                background: rgba(255,255,255,0.02);
              }

              .setting-label {
                color: #c3cad6;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .content {
                display: flex;
                gap: 35px;
                width: 100%;
                min-width: 0;
              }

              @media only screen and (max-width: 768px) {
                .content {
                  flex-direction: column;
                }
              }
            `}</style>
        </>
    );
}

export default AdminSettings;