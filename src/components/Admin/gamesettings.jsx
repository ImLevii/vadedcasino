import {createSignal, createEffect, For, Show} from "solid-js";
import {authedAPI} from "../../util/api";

const GAME_LABELS = {
    'crash': 'Crash',
    'mines': 'Mines',
    'roulette': 'Roulette',
    'coinflip': 'Coinflip',
    'jackpot': 'Jackpot',
    'blackjack': 'Blackjack',
    'cases': 'Cases',
    'battles': 'Battles'
};

function GameSettings(props) {

    const [settings, setSettings] = createSignal({});
    const [loading, setLoading] = createSignal(true);
    const [saving, setSaving] = createSignal(false);
    const [activeGame, setActiveGame] = createSignal('crash');
    const [message, setMessage] = createSignal(null);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            let res = await authedAPI('/admin/games/settings', 'GET');
            if (res.success) {
                setSettings(res.data || {});
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    createEffect(() => {
        fetchSettings();
    });

    const updateSetting = async (game, key, value) => {
        setSaving(true);
        setMessage(null);
        try {
            let res = await authedAPI(`/admin/games/settings/${game}`, 'POST', JSON.stringify({ key, value }), true);
            if (res.success) {
                setMessage({ type: 'success', text: `Updated ${game}.${key} successfully` });
                // Update local state
                setSettings(prev => ({
                    ...prev,
                    [game]: {
                        ...prev[game],
                        [key]: { ...prev[game]?.[key], value }
                    }
                }));
            } else {
                setMessage({ type: 'error', text: res.error || 'Failed to update' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Network error' });
        }
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
    };

    const games = () => Object.keys(settings());

    const gameSettings = () => settings()[activeGame()] || {};

    const onInput = (key, e) => {
        const setting = gameSettings()[key];
        let value = e.target.value;
        if (setting.type === 'number') value = Number(value);
        if (setting.type === 'boolean') value = e.target.checked;
        if (setting.type === 'json') {
            try { value = JSON.parse(value); } catch (err) { return; }
        }
        updateSetting(activeGame(), key, value);
    };

    return (
        <>
            <div class='gamesettings-container fadein'>
                <div class='banner'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#1fd65f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                        <polyline points='22 12 18 12 15 21 9 3 6 12 2 12'/>
                    </svg>
                    <p>GAME CONTROL & FAIRNESS</p>
                    <div class='line'/>
                </div>

                <Show when={message()}>
                    <div class={`message ${message().type}`}>{message().text}</div>
                </Show>

                <div class='games-tabs'>
                    <For each={games()}>
                        {(game) => (
                            <button
                                class={`game-tab ${activeGame() === game ? 'active' : ''}`}
                                onClick={() => setActiveGame(game)}
                            >
                                {GAME_LABELS[game] || game}
                            </button>
                        )}
                    </For>
                </div>

                <Show when={!loading()} fallback={<div class='loading'>Loading game settings...</div>}>
                    <div class='settings-grid'>
                        <For each={Object.entries(gameSettings())}>
                            {([key, setting]) => (
                                <div class='setting-card'>
                                    <div class='setting-header'>
                                        <span class='setting-key'>{key}</span>
                                        <span class='setting-type'>{setting.type}</span>
                                    </div>
                                    <p class='setting-label'>{setting.label || key}</p>
                                    <Show when={setting.description}>
                                        <p class='setting-desc'>{setting.description}</p>
                                    </Show>

                                    <Show when={setting.type === 'boolean'}>
                                        <label class='toggle'>
                                            <input
                                                type='checkbox'
                                                checked={setting.value}
                                                onchange={(e) => onInput(key, e)}
                                                disabled={saving()}
                                            />
                                            <span class='toggle-slider'/>
                                        </label>
                                    </Show>

                                    <Show when={setting.type === 'number'}>
                                        <div class='number-input'>
                                            <input
                                                type='number'
                                                value={setting.value}
                                                min={setting.min ?? undefined}
                                                max={setting.max ?? undefined}
                                                step={setting.step ?? 'any'}
                                                onchange={(e) => onInput(key, e)}
                                                disabled={saving()}
                                            />
                                            <Show when={key === 'houseEdge'}>
                                                <span class='percent'>%</span>
                                            </Show>
                                        </div>
                                        <Show when={setting.min !== null && setting.max !== null}>
                                            <input
                                                type='range'
                                                min={setting.min}
                                                max={setting.max}
                                                step={setting.step || 0.1}
                                                value={setting.value}
                                                oninput={(e) => onInput(key, e)}
                                                disabled={saving()}
                                                class='slider'
                                            />
                                        </Show>
                                    </Show>

                                    <Show when={setting.type === 'string'}>
                                        <input
                                            type='text'
                                            value={setting.value}
                                            onchange={(e) => onInput(key, e)}
                                            disabled={saving()}
                                            class='text-input'
                                        />
                                    </Show>

                                    <Show when={setting.type === 'json'}>
                                        <textarea
                                            class='json-input'
                                            value={JSON.stringify(setting.value, null, 2)}
                                            onchange={(e) => onInput(key, e)}
                                            disabled={saving()}
                                        />
                                    </Show>

                                    <Show when={key === 'houseEdge'}>
                                        <div class='rtp-info'>
                                            RTP: {(100 - Number(setting.value)).toFixed(2)}% |
                                            House Edge: {Number(setting.value).toFixed(2)}%
                                        </div>
                                    </Show>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>

                <div class='probability-link'>
                    <a href='/admin/games/probability' class='btn'>View Probability & Fairness Tables</a>
                </div>
            </div>

            <style jsx>{`
                .gamesettings-container {
                    width: 100%;
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: 20px 0;
                }

                .banner {
                    outline: unset;
                    border: unset;
                    border-left: 3px solid rgba(31,214,95,0.5);
                    width: 100%;
                    height: 44px;
                    border-radius: 0 6px 6px 0;
                    background: linear-gradient(90deg, rgba(31,214,95,0.08) 0%, rgba(18,21,28,0) 60%);
                    padding: 0 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #c3cad6;
                    font-size: 15px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    margin-bottom: 20px;
                }

                .line {
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(90deg, rgba(31,214,95,0.2) 0%, transparent 100%);
                }

                .message {
                    padding: 10px 16px;
                    border-radius: 6px;
                    margin-bottom: 16px;
                    font-size: 13px;
                    font-weight: 600;
                }

                .message.success { background: rgba(31,214,95,0.1); color: #1fd65f; border: 1px solid rgba(31,214,95,0.3); }
                .message.error { background: rgba(255,80,80,0.1); color: #ff6060; border: 1px solid rgba(255,80,80,0.3); }

                .games-tabs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 20px;
                }

                .game-tab {
                    padding: 8px 16px;
                    border-radius: 6px;
                    background: #1a1f29;
                    border: 1px solid rgba(255,255,255,0.07);
                    color: #6b7280;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .game-tab:hover { color: #c3cad6; border-color: rgba(31,214,95,0.3); }
                .game-tab.active { background: rgba(31,214,95,0.12); color: #1fd65f; border-color: rgba(31,214,95,0.4); }

                .loading { color: #6b7280; padding: 40px; text-align: center; }

                .settings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 16px;
                }

                .setting-card {
                    background: #141821;
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 8px;
                    padding: 16px;
                }

                .setting-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .setting-key {
                    font-family: monospace;
                    font-size: 12px;
                    color: #1fd65f;
                    font-weight: 700;
                }

                .setting-type {
                    font-size: 10px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.06);
                    color: #6b7280;
                    text-transform: uppercase;
                }

                .setting-label {
                    font-size: 14px;
                    font-weight: 700;
                    color: #c3cad6;
                    margin-bottom: 4px;
                }

                .setting-desc {
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 12px;
                    line-height: 1.4;
                }

                .number-input {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .number-input input {
                    flex: 1;
                    padding: 8px 12px;
                    border-radius: 6px;
                    background: #0f1218;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #c3cad6;
                    font-size: 14px;
                }

                .percent { color: #6b7280; font-weight: 700; }

                .slider {
                    width: 100%;
                    accent-color: #1fd65f;
                }

                .text-input {
                    width: 100%;
                    padding: 8px 12px;
                    border-radius: 6px;
                    background: #0f1218;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #c3cad6;
                    font-size: 14px;
                }

                .json-input {
                    width: 100%;
                    min-height: 100px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    background: #0f1218;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #c3cad6;
                    font-size: 12px;
                    font-family: monospace;
                    resize: vertical;
                }

                .toggle {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }

                .toggle input { opacity: 0; width: 0; height: 0; }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: #2a2f3a;
                    border-radius: 24px;
                    transition: 0.2s;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px; width: 18px;
                    left: 3px; bottom: 3px;
                    background: #c3cad6;
                    border-radius: 50%;
                    transition: 0.2s;
                }
                .toggle input:checked + .toggle-slider { background: #1fd65f; }
                .toggle input:checked + .toggle-slider:before { transform: translateX(20px); background: #fff; }

                .rtp-info {
                    margin-top: 10px;
                    padding: 6px 10px;
                    border-radius: 4px;
                    background: rgba(31,214,95,0.08);
                    color: #1fd65f;
                    font-size: 11px;
                    font-weight: 700;
                }

                .probability-link {
                    margin-top: 24px;
                    text-align: center;
                }

                .btn {
                    display: inline-block;
                    padding: 10px 24px;
                    border-radius: 6px;
                    background: rgba(31,214,95,0.12);
                    border: 1px solid rgba(31,214,95,0.3);
                    color: #1fd65f;
                    font-size: 13px;
                    font-weight: 700;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .btn:hover { background: rgba(31,214,95,0.2); }
            `}</style>
        </>
    );
}

export default GameSettings;