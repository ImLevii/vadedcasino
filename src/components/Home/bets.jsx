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
                  border: 1px solid rgba(255, 255, 255, 0.055);
                  background: linear-gradient(180deg, #0d1018 0%, #0b0e14 100%);
                  overflow: hidden;
                }
              
                .bets-options {
                  width: 100%;
                  display: flex;
                  gap: 4px;
                  padding: 10px 12px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                  background: rgba(255, 255, 255, 0.025);
                }
                
                .option {
                  height: 32px;
                  padding: 0 14px;
                  border-radius: 6px;
                  background: transparent;

                  color: #7a8294;
                  font-size: 12px;
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 700;
                  letter-spacing: .3px;
                  
                  outline: unset;
                  border: 1px solid transparent;
                  position: relative;
                  cursor: pointer;
                  
                  transition: background .18s, color .18s, border-color .18s;
                }

                .option:hover {
                  color: #c3cad6;
                  background: rgba(255, 255, 255, 0.045);
                  border-color: rgba(255, 255, 255, 0.08);
                }
                
                .option.active {
                  color: #1fd65f;
                  background: rgba(31, 214, 95, 0.1);
                  border-color: rgba(31, 214, 95, 0.28);
                  box-shadow: 0 0 12px rgba(31, 214, 95, 0.08);
                }

                .bets-table {
                  width: 100%;
                  border-collapse: collapse;
                }
                
                .bets-header {
                  width: 100%;
                  height: 36px;
                  background: rgba(0, 0, 0, 0.18);
                  border-bottom: 1px solid rgba(255, 255, 255, 0.045);

                  color: #515a6b;
                  font-size: 11px;
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 700;
                  letter-spacing: .6px;
                  text-transform: uppercase;
                  
                  text-align: left;
                }

                th {
                  padding: 0 10px;
                }
                
                .bet {
                  background: transparent;
                  height: 44px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.028);

                  color: #7a8294;
                  font-size: 13px;
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-weight: 600;

                  transition: background .14s;
                  cursor: default;
                }

                .bet:last-child {
                  border-bottom: none;
                }
                
                .bet:hover {
                  background: rgba(255, 255, 255, 0.024);
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
                  opacity: 0.4;
                  color: #8b92a0;
                }
                
                .caps {
                  text-transform: uppercase;
                }
                
                .user {
                  gap: 10px;
                }
                
                td:first-child, th:first-child {
                  padding: 0 0 0 18px;
                }

                td:last-child, th:last-child {
                  padding: 0 18px 0 0;
                }

                td {
                  padding: 0 10px;
                }
                
                .cents {
                  color: #4a5162;
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
