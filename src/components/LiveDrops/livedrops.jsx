import {createEffect, createSignal, For} from "solid-js";
import LiveDrop from "./livedrop";
import {useWebsocket} from "../../contexts/socketprovider";
import LiveDot from "./livedot";

function LiveDrops(props) {

    let hasConnected = false
    const [ws] = useWebsocket()
    const [open, setOpen] = createSignal(true)
    const [option, setOption] = createSignal('live')

    const [top, setTop] = createSignal([])
    const [live, setLive] = createSignal([])

    createEffect(() => {
        if (ws() && ws().connected && !hasConnected) {
            ws().emit('cases:subscribe')
            ws().on('cases:drops:all', (drops) => {
                setLive(drops.slice(0,20))
            })
            ws().on('cases:drops:top', (drops) => {
                setTop(drops.slice(0,20))
            })
            ws().on('cases:drops', (drop) => {
                let newLive = [...drop, ...live()].slice(0, 20)
                setLive(newLive)

                if (drop.top) {
                    let newTop = [...drop, ...top()].slice(0, 20)
                    setTop(newTop)
                }
            })
        }

        hasConnected = !!ws()?.connected
    })

    return (
        <>
            <div class='case-drops-container'>
                <div class='drops-header'>
                    <div class='options'>
                        <button class={'bevel-light option ' + (option() === 'live' ? 'active' : '')} onClick={() => setOption('live')}>
                            <LiveDot type='green'/>
                            LIVE DROPS
                        </button>

                        <button class={'bevel-light option ' + (option() === 'top' ? 'active' : '')} onClick={() => setOption('top')}>
                            <LiveDot type='gold'/>
                            TOP DROPS
                        </button>
                    </div>

                    <div class='bar'/>

                    <svg class={'arrow ' + (!open() ? 'active' : '')} xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none" onClick={() => setOpen(!open())}>
                        <path d="M4.99998 6C4.82076 6 4.64157 5.92807 4.50493 5.78451L0.205142 1.26463C-0.0683806 0.977107 -0.0683806 0.510942 0.205142 0.223538C0.478554 -0.0638665 0.714286 0.00798196 1.19548 0.00798455H4.99998L8.57143 0.00798564C9.28572 0.00798564 9.52137 -0.0637267 9.79476 0.223677C10.0684 0.511081 10.0684 0.977246 9.79476 1.26477L5.49504 5.78465C5.35834 5.92823 5.17914 6 4.99998 6Z" fill="#8b92a0"/>
                    </svg>
                </div>

                <div class={'drops-container ' + (open() ? 'active' : '')}>
                    <For each={option() === 'live' ? live() : top()}>{(drop, index) => <LiveDrop {...drop}/>}</For>
                </div>
            </div>

            <style jsx>{`
                .case-drops-container {
                    width: 100%;
                    position: relative;
                    margin-bottom: 34px;
                    padding: 0 0 16px;
                    border-radius: 10px;
                    background: linear-gradient(180deg, rgba(16, 21, 31, 0.42), rgba(8, 11, 18, 0.08));
                    border: 1px solid rgba(255, 255, 255, 0.035);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 16px 42px rgba(0, 0, 0, 0.18);
                    overflow: hidden;
                }

                .case-drops-container:before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 90px;
                    pointer-events: none;
                    background: radial-gradient(90% 80% at 0% 35%, rgba(31, 214, 95, 0.07), rgba(31, 214, 95, 0));
                }

                .case-drops-container:after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 1px;
                    background: linear-gradient(90deg, rgba(31, 214, 95, 0), rgba(31, 214, 95, 0.28), rgba(255, 184, 74, 0.16), rgba(58, 66, 80, 0));
                }

                .drops-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-height: 48px;
                    padding: 5px 12px;
                    border-bottom: 1px solid rgba(58, 66, 80, 0.48);
                    background: linear-gradient(180deg, rgba(15, 20, 30, 0.9), rgba(10, 14, 22, 0.68));
                }

                .options {
                    display: flex;
                    gap: 6px;
                }

                .option {
                    width: 116px;
                    height: 36px;
                    font-weight: 800;
                    font-size: 11px;
                    display: flex;

                    gap: 7px;
                    align-items: center;
                    justify-content: center;
                    border-radius: 5px;
                    color: #8b92a0;
                    border: 1px solid rgba(255, 255, 255, 0.035);
                    background: linear-gradient(180deg, rgba(35, 42, 56, 0.76), rgba(20, 25, 35, 0.9));
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.055), 0 8px 18px rgba(0, 0, 0, 0.18);
                    transition: color .18s ease, border-color .18s ease, transform .18s ease, filter .18s ease, box-shadow .18s ease;
                }

                .option:hover {
                    color: #c7cfdb;
                    transform: translateY(-1px);
                    border-color: rgba(255, 255, 255, 0.075);
                }

                .option.active {
                    border: 1px solid rgba(31, 214, 95, 0.38);
                    background: linear-gradient(180deg, rgba(31, 48, 42, 0.96), rgba(20, 32, 30, 0.98));
                    color: white;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.075), 0 0 0 1px rgba(31, 214, 95, 0.06), 0 0 18px rgba(31, 214, 95, 0.08), 0 10px 24px rgba(0, 0, 0, 0.2);
                }

                .option:nth-child(2).active {
                    border-color: rgba(255, 184, 74, 0.38);
                    background: linear-gradient(180deg, rgba(54, 42, 24, 0.96), rgba(31, 27, 19, 0.98));
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.075), 0 0 0 1px rgba(255, 184, 74, 0.06), 0 0 18px rgba(255, 184, 74, 0.08), 0 10px 24px rgba(0, 0, 0, 0.2);
                }

                .bar {
                    flex: 1;
                    height: 1px;

                    background: transparent;
                }

                .arrow {
                    cursor: pointer;
                    margin-left: auto;
                    transition: transform .18s ease, opacity .18s ease;
                    opacity: .85;
                    padding: 10px;
                    box-sizing: content-box;
                }

                .arrow:hover {
                    opacity: 1;
                }

                .arrow.active {
                    transform: rotate(180deg);
                }

                .drops-container {
                    max-height: 0;
                    overflow: hidden;
                    display: flex;
                    transition: max-height .3s;
                    gap: 12px;
                    overflow-x: scroll;
                    margin-top: 0;
                    padding: 14px 12px 2px;
                    scrollbar-color: transparent transparent;
                }

                .drops-container::-webkit-scrollbar {
                    display: none;
                }

                .drops-container.active {
                    max-height: 156px;
                }
            `}</style>
        </>
    );
}

export default LiveDrops;
