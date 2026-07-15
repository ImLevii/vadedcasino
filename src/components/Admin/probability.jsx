import {createSignal, onMount, For, Show} from "solid-js";
import {authedAPI} from "../../util/api";

function Probability() {

    const [data, setData] = createSignal(null);
    const [loading, setLoading] = createSignal(true);
    const [error, setError] = createSignal(null);

    onMount(async () => {
        try {
            let res = await authedAPI('/admin/games/probability', 'GET');
            if (res && res.success) {
                setData(res.data);
            } else {
                setError((res && res.error) || 'Failed to load');
            }
        } catch (e) {
            setError('Network error');
        }
        setLoading(false);
    });

    return (
        <>
            <div class='probability-container fadein'>
                <div class='banner'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#1fd65f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                        <path d='M9 11l3 3L22 4'/>
                        <path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'/>
                    </svg>
                    <p>PROBABILITY & FAIRNESS</p>
                    <div class='line'/>
                </div>

                <Show when={loading()} fallback={
                    <Show when={!error()} fallback={<div class='error'>{error()}</div>}>
                        <div class='games-grid'>
                            <For each={Object.entries(data())}>
                                {([game, info]) => (
                                    <div class='game-card'>
                                        <div class='game-title'>{game.toUpperCase()}</div>
                                        <div class='house-edge'>
                                            House Edge: <span class='value'>{info.houseEdge}%</span>
                                        </div>
                                        <p class='desc'>{info.description}</p>

                                        <Show when={game === 'roulette'}>
                                            <div class='colors-table'>
                                                <For each={Object.entries(info.colors)}>
                                                    {([color, c]) => (
                                                        <div class='color-row'>
                                                            <span class='color-name'>{c.name}</span>
                                                            <span class='color-mult'>x{c.multiplier}</span>
                                                            <span class='color-prob'>{c.probability}</span>
                                                            <span class='color-edge'>Edge: {c.houseEdge}</span>
                                                        </div>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>

                                        <Show when={game === 'crash'}>
                                            <div class='crash-info'>{info.crashProbability}</div>
                                        </Show>

                                        <Show when={game === 'mines' && info.samplePayouts}>
                                            <div class='payouts'>
                                                <For each={Object.entries(info.samplePayouts)}>
                                                    {([config, payouts]) => (
                                                        <div class='payout-group'>
                                                            <div class='payout-config'>{config}</div>
                                                            <For each={Object.entries(payouts)}>
                                                                {([reveal, mult]) => (
                                                                    <span class='payout-item'>{reveal}: x{mult}</span>
                                                                )}
                                                            </For>
                                                        </div>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>

                                        <Show when={game === 'coinflip'}>
                                            <div class='win-mult'>Win Multiplier: x{info.winMultiplier.toFixed(2)}</div>
                                        </Show>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                }>
                    <div class='loading'>Loading probability data...</div>
                </Show>

                <div class='note'>
                    All games use provably fair cryptographic seed generation. House edge values shown are current live settings configured in Game Control.
                </div>
            </div>

            <style jsx>{`
                .probability-container {
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

                .loading, .error { color: #6b7280; padding: 40px; text-align: center; }
                .error { color: #ff6060; }

                .games-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 16px;
                }

                .game-card {
                    background: #141821;
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 8px;
                    padding: 18px;
                }

                .game-title {
                    font-size: 16px;
                    font-weight: 800;
                    color: #1fd65f;
                    margin-bottom: 8px;
                }

                .house-edge {
                    font-size: 13px;
                    color: #c3cad6;
                    margin-bottom: 10px;
                }

                .house-edge .value { color: #1fd65f; font-weight: 700; }

                .desc {
                    font-size: 12px;
                    color: #6b7280;
                    line-height: 1.4;
                    margin-bottom: 12px;
                }

                .colors-table {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .color-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr 1fr;
                    font-size: 11px;
                    padding: 6px;
                    background: #0f1218;
                    border-radius: 4px;
                }

                .color-name { font-weight: 700; color: #c3cad6; }
                .color-mult { color: #1fd65f; }
                .color-prob { color: #8b92a0; }
                .color-edge { color: #ffa500; }

                .crash-info, .win-mult, .prize-mult {
                    font-size: 12px;
                    color: #1fd65f;
                    padding: 8px 10px;
                    background: rgba(31,214,95,0.08);
                    border-radius: 4px;
                }

                .payouts {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .payout-group {
                    background: #0f1218;
                    border-radius: 4px;
                    padding: 10px;
                }

                .payout-config {
                    font-size: 12px;
                    font-weight: 700;
                    color: #8b92a0;
                    margin-bottom: 6px;
                }

                .payout-item {
                    display: inline-block;
                    font-size: 11px;
                    color: #c3cad6;
                    margin: 2px 6px 2px 0;
                    padding: 2px 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 3px;
                }

                .note {
                    margin-top: 20px;
                    padding: 14px;
                    border-radius: 6px;
                    background: rgba(31,214,95,0.05);
                    border: 1px solid rgba(31,214,95,0.15);
                    color: #8b92a0;
                    font-size: 12px;
                    line-height: 1.5;
                }
            `}</style>
        </>
    );
}

export default Probability;