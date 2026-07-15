import {createResource, createSignal, For, Show} from 'solid-js';
import {authedAPI, createNotification} from '../../util/api';
import Loader from '../Loader/loader';

function AdminRewards(props) {

    const [resource] = createResource(fetchConfig);
    const [config, setConfig] = createSignal(null);
    const [stats, setStats] = createSignal(null);
    const [saving, setSaving] = createSignal(false);

    async function fetchConfig() {
        const res = await authedAPI('/admin/rewards', 'GET', null, true);
        if (res?.success) {
            setConfig(JSON.parse(JSON.stringify(res.config)));
            setStats(res.stats);
        }
        return res;
    }

    function setField(section, key, value) {
        setConfig((prev) => ({
            ...prev,
            [section]: {...prev[section], [key]: value}
        }));
    }

    function setTierField(index, key, value) {
        setConfig((prev) => {
            const tiers = prev.depositCases.tiers.map((tier, i) => i === index ? {...tier, [key]: value} : tier);
            return {...prev, depositCases: {...prev.depositCases, tiers}};
        });
    }

    function addTier() {
        setConfig((prev) => ({
            ...prev,
            depositCases: {...prev.depositCases, tiers: [...prev.depositCases.tiers, {minDeposit: 100, wagerMultiplier: 1}]}
        }));
    }

    function removeTier(index) {
        setConfig((prev) => ({
            ...prev,
            depositCases: {...prev.depositCases, tiers: prev.depositCases.tiers.filter((_, i) => i !== index)}
        }));
    }

    async function save() {
        if (saving()) return;
        setSaving(true);

        // Coerce all numeric fields
        const cfg = JSON.parse(JSON.stringify(config()), (key, value) => {
            if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) return Number(value);
            return value;
        });

        const res = await authedAPI('/admin/rewards', 'POST', JSON.stringify({config: cfg}), true);
        setSaving(false);

        if (res?.success) {
            setConfig(JSON.parse(JSON.stringify(res.config)));
            createNotification('success', 'Rewards configuration saved and applied.');
        }
    }

    function NumberField(fieldProps) {
        return (
            <div class='field'>
                <p class='field-label'>{fieldProps.label}</p>
                <input type='number' step='any' value={fieldProps.value}
                       onInput={(e) => fieldProps.onChange(e.target.valueAsNumber)}/>
            </div>
        );
    }

    return (
        <>
            <div class='rewards-admin fadein'>
                <Show when={!resource.loading && config()} fallback={<Loader/>}>

                    <div class='stats-row'>
                        <div class='stat'>
                            <p class='stat-value'>{stats()?.dailyClaims24h ?? 0}</p>
                            <p class='stat-label'>Daily claims (24h)</p>
                        </div>
                        <div class='stat'>
                            <p class='stat-value'>{(stats()?.dailyClaimed24h ?? 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                            <p class='stat-label'>Coins claimed (24h)</p>
                        </div>
                        <div class='stat'>
                            <p class='stat-value'>{stats()?.activeDepositCases ?? 0}</p>
                            <p class='stat-label'>Active deposit cases</p>
                        </div>
                        <div class='stat'>
                            <p class='stat-value'>{stats()?.activeSupercharges ?? 0}</p>
                            <p class='stat-label'>Active supercharges</p>
                        </div>
                        <div class='stat'>
                            <p class='stat-value'>{(stats()?.superchargePaid24h ?? 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                            <p class='stat-label'>Supercharge paid (24h)</p>
                        </div>
                    </div>

                    <div class='panel'>
                        <p class='panel-title'>DAILY CASES</p>
                        <div class='fields'>
                            <NumberField label='Cooldown (hours)' value={config().dailyCase.cooldownHours}
                                         onChange={(v) => setField('dailyCase', 'cooldownHours', v)}/>
                            <NumberField label='Tier step (levels)' value={config().dailyCase.tierStep}
                                         onChange={(v) => setField('dailyCase', 'tierStep', v)}/>
                            <NumberField label='Max level' value={config().dailyCase.maxLevel}
                                         onChange={(v) => setField('dailyCase', 'maxLevel', v)}/>
                            <NumberField label='Coins per level' value={config().dailyCase.amountPerLevel}
                                         onChange={(v) => setField('dailyCase', 'amountPerLevel', v)}/>
                        </div>
                        <p class='hint'>
                            Generates a case every {config().dailyCase.tierStep} levels up to level {config().dailyCase.maxLevel}.
                            A level {config().dailyCase.maxLevel} case pays {(config().dailyCase.maxLevel * config().dailyCase.amountPerLevel).toLocaleString(undefined, {maximumFractionDigits: 2})} coins.
                            Claim-all pays the sum of every unlocked tier once per cooldown.
                        </p>
                    </div>

                    <div class='panel'>
                        <p class='panel-title'>DEPOSIT CASES</p>
                        <div class='fields'>
                            <NumberField label='Cases per deposit' value={config().depositCases.casesTotal}
                                         onChange={(v) => setField('depositCases', 'casesTotal', v)}/>
                            <NumberField label='Duration (hours)' value={config().depositCases.durationHours}
                                         onChange={(v) => setField('depositCases', 'durationHours', v)}/>
                            <NumberField label='Case reward min (% of deposit)' value={config().depositCases.rewardMinPct}
                                         onChange={(v) => setField('depositCases', 'rewardMinPct', v)}/>
                            <NumberField label='Case reward max (% of deposit)' value={config().depositCases.rewardMaxPct}
                                         onChange={(v) => setField('depositCases', 'rewardMaxPct', v)}/>
                        </div>

                        <p class='sub-title'>Deposit thresholds (highest matching tier applies)</p>
                        <For each={config().depositCases.tiers}>
                            {(tier, index) => (
                                <div class='tier-row'>
                                    <div class='field'>
                                        <p class='field-label'>Min deposit</p>
                                        <input type='number' step='any' value={tier.minDeposit}
                                               onInput={(e) => setTierField(index(), 'minDeposit', e.target.valueAsNumber)}/>
                                    </div>
                                    <div class='field'>
                                        <p class='field-label'>Wager requirement (x)</p>
                                        <input type='number' step='any' value={tier.wagerMultiplier}
                                               onInput={(e) => setTierField(index(), 'wagerMultiplier', e.target.valueAsNumber)}/>
                                    </div>
                                    <button class='remove-btn' onClick={() => removeTier(index())}>Remove</button>
                                </div>
                            )}
                        </For>
                        <button class='add-btn' onClick={addTier}>+ Add threshold</button>
                    </div>

                    <div class='panel'>
                        <p class='panel-title'>SUPERCHARGE</p>
                        <div class='fields'>
                            <NumberField label='Min deposit to activate' value={config().supercharge.minDeposit}
                                         onChange={(v) => setField('supercharge', 'minDeposit', v)}/>
                            <NumberField label='Bonus (% of deposit)' value={config().supercharge.bonusPct}
                                         onChange={(v) => setField('supercharge', 'bonusPct', v)}/>
                            <NumberField label='Duration (minutes)' value={config().supercharge.durationMinutes}
                                         onChange={(v) => setField('supercharge', 'durationMinutes', v)}/>
                        </div>
                        <p class='hint'>
                            A {config().supercharge.minDeposit}-coin deposit grants a {config().supercharge.bonusPct}% bonus
                            ({(config().supercharge.minDeposit * config().supercharge.bonusPct / 100).toLocaleString(undefined, {maximumFractionDigits: 2})} coins minimum),
                            claimable for {config().supercharge.durationMinutes} minutes.
                        </p>
                    </div>

                    <button class='save-btn' onClick={save} disabled={saving()}>
                        {saving() ? 'Saving...' : 'Save & Apply'}
                    </button>
                </Show>
            </div>

            <style jsx>{`
              .rewards-admin {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 14px;
                padding: 10px 0 40px 0;
              }

              .stats-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 10px;
              }

              .stat {
                display: flex;
                flex-direction: column;
                gap: 4px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 14px;
              }

              .stat-value {
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 17px;
                font-weight: 700;
              }

              .stat-label {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 600;
              }

              .panel {
                display: flex;
                flex-direction: column;
                gap: 12px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 18px;
              }

              .panel-title {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 14px;
                font-weight: 700;
              }

              .sub-title {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 700;
                margin-top: 4px;
              }

              .fields {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
                gap: 10px;
              }

              .field {
                display: flex;
                flex-direction: column;
                gap: 5px;
              }

              .field-label {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 700;
              }

              .field input {
                height: 38px;
                padding: 0 10px;

                outline: unset;
                border-radius: 5px;
                background: #12151c;
                border: 1px solid #2c3340;

                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 600;
              }

              .field input:focus {
                border-color: rgba(31, 214, 95, 0.4);
              }

              .hint {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 500;
                line-height: 1.5;

                border-radius: 5px;
                background: rgba(31, 214, 95, 0.05);
                border: 1px solid rgba(31, 214, 95, 0.2);
                padding: 10px 12px;
              }

              .tier-row {
                display: flex;
                align-items: flex-end;
                gap: 10px;
              }

              .tier-row .field {
                flex: 1;
              }

              .remove-btn {
                height: 38px;
                padding: 0 14px;

                outline: unset;
                border-radius: 5px;
                background: rgba(255, 89, 89, 0.1);
                border: 1px solid rgba(255, 89, 89, 0.4);

                color: #ff5959;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;

                cursor: pointer;
              }

              .add-btn {
                align-self: flex-start;
                height: 34px;
                padding: 0 14px;

                outline: unset;
                border-radius: 5px;
                background: #2c3340;
                border: 1px solid #3a4250;

                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;

                cursor: pointer;
                transition: all .2s;
              }

              .add-btn:hover {
                color: #FFF;
              }

              .save-btn {
                align-self: flex-start;
                height: 42px;
                padding: 0 28px;

                outline: unset;
                border: unset;
                border-radius: 6px;
                background: #1fd65f;

                color: #04240f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;

                cursor: pointer;
                transition: all .2s;
              }

              .save-btn:hover:not(:disabled) {
                background: #45e57f;
                box-shadow: 0 0 18px rgba(31, 214, 95, 0.35);
              }

              .save-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
              }
            `}</style>
        </>
    );
}

export default AdminRewards;
