import {createEffect, createResource, createSignal, For} from "solid-js";
import {api} from "../../util/api";
import {useWebsocket} from "../../contexts/socketprovider";
import Avatar from "../Level/avatar";
import {getCents} from "../../util/balance";

const tempBets = [0,0,0,0,0,0,0,0]

const gameToImage = {
    'case': '/assets/icons/cases.svg',
    'battle': '/assets/icons/battles.svg',
    'roulette': '/assets/icons/roulette.svg',
    'crash': '/assets/icons/crash.svg',
    'coinflip': '/assets/icons/coinflip.svg',
    'slot': '/assets/icons/slot.svg',
    'mines': '/assets/icons/mines.svg'
}

function Bets(props) {

    let prevWs
    let hasEmittedMe = false
    const [ws] = useWebsocket()
    const [option, setOption] = createSignal('user')
    const [bets, setBets] = createSignal([])

    createEffect(() => {
        if (ws()?.connected && !prevWs?.connected) {
            ws().emit('bets:subscribe', 'all')
        }

        if (ws()) {
            ws().on('bets', (type, bets) => {
                if (type !== option()) {
                    ws().emit('bets:unsubscribe', option())
                    setBets([])
                }

                setOption(type)
                setBets((b) => [...bets, ...b].slice(0, 10))
            })
        }

        prevWs = ws()
    })

    createEffect(() => {
        if (!hasEmittedMe && props.user && ws()) {
            ws().emit('bets:subscribe', 'me')
            hasEmittedMe = true
        }
    })

    function changeBetChannel(channel) {
        ws().emit('bets:subscribe', channel)
    }

    return (
        <>
            <div class='bets-container'>
                <div class='bets-options'>
                    {props?.user && (
                        <button class={'option ' + (option() === 'me' ? 'active' : '')} onClick={() => changeBetChannel('me')}>MY BETS</button>
                    )}

                    <button class={'option ' + (option() === 'all' ? 'active' : '')} onClick={() => changeBetChannel('all')}>ALL BETS</button>
                    <button class={'option ' + (option() === 'high' ? 'active' : '')} onClick={() => changeBetChannel('high')}>HIGH BETS</button>
                    <button class={'option ' + (option() === 'lucky' ? 'active' : '')} onClick={() => changeBetChannel('lucky')}>LUCKY WINS</button>
                </div>

                <table class='bets-table' cellSpacing={0}>
                    <thead class='bets-header'>
                        <tr>
                            <th>GAME</th>
                            <th>USER</th>
                            <th class='large'>PLAY AMOUNT</th>
                            <th>MULTI</th>
                            <th>PAYOUT</th>
                            <th class='large'>TIME</th>
                        </tr>
                    </thead>

                    <tbody>
                        <For each={bets().filter(b => b?.amount > 0 && b?.payout > 0)}>{(bet, index) => (
                            <tr class='bet'>
                                <td>
                                    <div class='image-data white caps'>
                                        <img src={gameToImage[bet.game]} alt='' height='17'/>
                                        {bet.game}
                                    </div>
                                </td>

                                <td>
                                    <div class='image-data user'>
                                        <Avatar id={bet?.user?.id} xp={bet?.user?.xp || 0} height={30}/>
                                        {bet?.user?.username || 'Anonymous'}
                                    </div>
                                </td>

                                <td class='large'>
                                    <div class='image-data white'>
                                        <img src='/assets/icons/coin.svg' alt='' height='17'/>
                                        <p>{Math.floor(bet?.amount || 0)}<span class='cents'>.{getCents(bet?.amount || 0)}</span></p>
                                    </div>
                                </td>

                                <td class={((bet?.payout / bet?.amount) > 1 ? 'green' : '')}>
                                    {(bet?.payout / bet?.amount).toFixed(2)}x
                                </td>

                                <td>
                                    <div class={'image-data ' + ((bet?.payout / bet?.amount) > 1 ? 'gold' : 'lum')}>
                                        <img src='/assets/icons/coin.svg' alt='' height='17'/>
                                        {(bet?.payout / bet?.amount > 1) ? '+' : ''} <p>{Math.floor(bet?.payout || 0)}<span class='cents'>.{getCents(bet?.payout || 0)}</span></p>
                                    </div>
                                </td>

                                <td class='large'>{new Date(bet?.createdAt).toLocaleTimeString()}</td>
                            </tr>
                        )}</For>
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .bets-container {
                  border-radius: 12px;
                  border: 1px solid rgba(255, 255, 255, 0.06);
                  background: #0e1116;
                  overflow: hidden;
                }
              
                .bets-options {
                  width: 100%;
                  display: flex;
                  gap: 4px;
                  padding: 10px 12px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                  background: #11141b;
                }
                
                .option {
                  height: 32px;
                  padding: 0 14px;
                  border-radius: 6px;
                  background: transparent;

                  color: #8b92a0;
                  font-size: 12px;
                  font-family: Geogrotesque Wide;
                  font-weight: 700;
                  letter-spacing: .3px;
                  
                  outline: unset;
                  border: 1px solid transparent;
                  position: relative;
                  cursor: pointer;
                  
                  transition: background .2s, color .2s, border-color .2s;
                }

                .option:hover {
                  color: #c3cad6;
                  background: rgba(255, 255, 255, 0.04);
                  border-color: rgba(255,255,255,0.07);
                }
                
                .option.active {
                  color: #1fd65f;
                  background: rgba(31, 214, 95, 0.12);
                  border-color: rgba(31, 214, 95, 0.3);
                }

                .bets-table {
                  width: 100%;
                  border-collapse: collapse;
                }
                
                .bets-header {
                  width: 100%;
                  height: 42px;
                  background: transparent;

                  color: #6b7280;
                  font-size: 12px;
                  font-family: Geogrotesque Wide;
                  font-weight: 700;
                  letter-spacing: .5px;
                  
                  text-align: left;
                }
                
                .bet {
                  background: unset;
                  height: 46px;

                  color: #8b92a0;
                  font-size: 13px;
                  font-family: Geogrotesque Wide;
                  font-weight: 600;
                }
                
                .bet:nth-child(2n - 1) {
                  background: rgba(255, 255, 255, 0.02);
                }
                
                .image-data {
                  display: flex;
                  align-items: center;
                  gap: 5px;
                }

                .green {
                  color: #1fd65f;
                  font-weight: 700;
                }

                .gold {
                  color: #1fd65f;
                }

                .white {
                  color: #c3cad6;
                }
                
                .lum {
                  mix-blend-mode: luminosity;
                  color: #6b7280;
                }
                
                .caps {
                  text-transform: uppercase;
                }
                
                .user {
                  gap: 10px;
                }
                
                td:first-child, th:first-child {
                  padding: 0 0 0 22px;
                }

                td:last-child, th:last-child {
                  padding: 0 22px 0 0;
                }
                
                .cents {
                  color: #6b7280;
                }
                
                .gold .cents {
                  color: #16a049;
                }

                @media only screen and (max-width: 850px) {
                  .large {
                    display: none;
                  }
                }
            `}</style>
        </>
    );
}

export default Bets;
