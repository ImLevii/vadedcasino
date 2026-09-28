import {createEffect, createSignal, For, onCleanup} from 'solid-js';
import RouletteSpinner from '../components/Roulette/roulettespinner';
import RouletteIcon from '../components/Roulette/rouletteicons';
import {useWebsocket} from '../contexts/socketprovider';
import {numberToColor} from '../util/roulettehelpers';
import RouletteBetControls from '../components/Roulette/betcontrols';
import RouletteColor from '../components/Roulette/roulettecolor';
import {subscribeToGame, unsubscribeFromGames} from '../util/socket';
import {Meta, Title} from '@solidjs/meta';
import {playGameSFX, stopSFXChannel, GAME_SOUNDS} from '../util/sound';
import {createNotification} from '../util/api';
import {createRouletteTimeline,timestamp} from '../util/roulette-motion.mjs';
import WheelBonus from '../components/Roulette/wheelbonus';

function Roulette(props) {
    const timeline=createRouletteTimeline();
    const [bets,setBets]=createSignal([]);
    const [bet,setBet]=createSignal(0);
    const [timeLeft,setTimeLeft]=createSignal(0);
    const [config,setConfig]=createSignal({rollTime:5000,betTime:10000});
    const [round,setRound]=createSignal(null);
    const [last10,setLast10]=createSignal([]);
    const [state,setState]=createSignal('CONNECTING');
    const [tripleGreenBonusPot,setTripleGreenBonusPot]=createSignal(0);
    const [bonusStreak,setBonusStreak]=createSignal(0);
    const [stats,setStats]=createSignal({green:0,red:0,black:0,bait:0});
    const [ws]=useWebsocket();
    const seenBonuses=new Set();
    let lastHistory='',landedRound=null,spinSoundRound=null,frame;
    const serverNow=()=>timeline.now(performance.now());
    function accept(data) {
        if(!timeline.accept(data,performance.now())) return;
        setRound(data.round);setConfig(data.config);setBets(data.bets || []);
        setTripleGreenBonusPot(Number(data.tripleGreenBonusPot || 0));
        setBonusStreak(Number(data.tripleGreenStreak || 0));
        const r=data.round;
        if(r.rolledAt && r.id!==spinSoundRound && serverNow()-timestamp(r.rolledAt)<600) {
            spinSoundRound=r.id;
            playGameSFX('roulette-roll',GAME_SOUNDS.rouletteRoll,{channel:'roulette-roll',volume:.48,durationMs:640});
        }
    }
    function updateFrame() {
        const data=timeline.snapshot();
        if(data && ws()?.connected) {
            const r=data.round,now=serverNow();
            const left=r.phase==='BETTING' ? Math.max(0,timestamp(r.bettingClosesAt)-now) : 0;
            setTimeLeft(left);
            const spinning=r.rolledAt && now<timestamp(r.animationEndsAt);
            setState(r.status==='cancelled' ? 'CANCELLED' : r.status==='paused' ? 'PAUSED' : spinning ? 'ROLLING' : r.endedAt ? 'WINNERS' : r.rolledAt ? 'RESOLVING' : r.phase==='BETTING_LOCKED' ? 'LOCKED' : left>0 ? '' : 'LOCKED');
            if(!spinning) {
                const history=JSON.stringify(data.last || []);
                if(history!==lastHistory) {
                    lastHistory=history;setLast10((data.last || []).slice(0,10));
                    const counts={green:0,red:0,black:0,bait:0};
                    for(const result of data.last || []){counts[numberToColor(result)]++;if(result===7 || result===8)counts.bait++;}
                    setStats(counts);
                }
                if(r.endedAt && !r.control?.cancelledAt && r.id!==landedRound) {
                    landedRound=r.id;
                    if(r.id===spinSoundRound) playGameSFX('roulette-land',GAME_SOUNDS.rouletteRoll,{channel:'roulette-land',startTime:5.79,durationMs:800,volume:.62,fadeInMs:80});
                }
            }
        }
        frame=requestAnimationFrame(updateFrame);
    }
    frame=requestAnimationFrame(updateFrame);
    createEffect(()=>{
        const socket=ws();
        if(!socket) return;
        const onDisconnect=()=>{setState('CONNECTING');setTimeLeft(0);stopSFXChannel('roulette-roll');};
        const onBets=incoming=>setBets(previous=>[...new Map([...previous,...incoming].map(b=>[String(b.id),b])).values()]);
        const onUpdate=bet=>setBets(previous=>previous.map(item=>String(item.id)===String(bet.id) ? {...item,amount:bet.amount} : item));
        const onBonus=data=>{
            const id=data.eventId || (data.rounds || []).map(r=>r.roundId).join('-');
            if(!id || seenBonuses.has(id))return;
            seenBonuses.add(id);if(seenBonuses.size>50)seenBonuses.delete(seenBonuses.values().next().value);
            const payout=(data.payouts || []).find(p=>String(p.userId)===String(props.user?.id));
            if(payout?.amount)createNotification('success','Wheel Bonus paid '+Number(payout.amount).toFixed(2)+' coins to your account.');
        };
        socket.on('roulette:set',accept);socket.on('roulette:state',accept);
        socket.on('roulette:bets',onBets);socket.on('roulette:bet:update',onUpdate);
        socket.on('roulette:tripleGreenBonus:won',onBonus);socket.on('disconnect',onDisconnect);
        if(socket.connected){unsubscribeFromGames(socket);subscribeToGame(socket,'roulette');}
        onCleanup(()=>{
            socket.off('roulette:set',accept);socket.off('roulette:state',accept);
            socket.off('roulette:bets',onBets);socket.off('roulette:bet:update',onUpdate);
            socket.off('roulette:tripleGreenBonus:won',onBonus);socket.off('disconnect',onDisconnect);
            unsubscribeFromGames(socket);
        });
    });
    onCleanup(()=>{cancelAnimationFrame(frame);for(const name of ['roulette-roll','roulette-tick','roulette-land'])stopSFXChannel(name);});

    return (
        <>
            <Title>Cosmic Luck | Roulette</Title>
            <Meta name='title' content='Roulette'></Meta>
            <Meta name='description' content='Bet On Roulette And Win Coins on Cosmic Luck! Play red or black for 2x, green for 14x, and bait red or bait black for 7x.'></Meta>

            <div class='roulette-container fadein'>
                <div class='roulette-header'>
                    <div class='recent'>
                        <p class='label'>RECENT ROLLS</p>
                        <div class='lastten'>
                            <For each={last10()}>{(round, index) => <RouletteIcon num={round} size='small'/>}</For>
                        </div>
                    </div>


                    <div class='last100'>
                        <p class='label'>LAST 100</p>
                        <div class='stats'>
                            <div class='stat green'>
                                <RouletteIcon num={0} size='small'/>
                                <p>{stats().green}</p>
                            </div>

                            <div class='stat red'>
                                <RouletteIcon num={1} size='small'/>
                                <p>{stats().red}</p>
                            </div>

                            <div class='stat black'>
                                <RouletteIcon num={14} size='small'/>
                                <p>{stats().black}</p>
                            </div>

                            <div class='stat bait'>
                                <RouletteIcon num={7} size='small'/>
                                <p>{stats().bait}</p>
                            </div>
                        </div>

                    </div>
                    <WheelBonus pot={tripleGreenBonusPot()} streak={bonusStreak()} rate={config().tripleGreenBonusRake} minimum={config().tripleGreenMinimumBet}/>
                </div>

                <RouletteSpinner roll={round()} config={config()} timeLeft={timeLeft()} serverNow={serverNow} state={state()} onTick={()=>playGameSFX('roulette-tick',GAME_SOUNDS.rouletteClick,{channel:'roulette-tick',startTime:1.34,durationMs:110,volume:.35,minIntervalMs:45})}/>
                <RouletteBetControls bet={bet()} setBet={setBet} user={props.user}/>

                <div class='colors'>
                    <RouletteColor color='red' amount={bet()} bets={bets()} round={round()} state={state()}/>

                  <RouletteColor color='green' amount={bet()} bets={bets()} round={round()} state={state()}/>

                    <RouletteColor color='black' amount={bet()} bets={bets()} round={round()} state={state()}/>

                  <RouletteColor color='bait' amount={bet()} bets={bets()} round={round()} state={state()}/>
                </div>
            </div>

            <style jsx>{`
              .roulette-container {
                width: 100%;
                max-width: var(--page-max-width);
                container-type: inline-size;
                height: fit-content;

                padding: 30px 0;
                margin: 0 auto;
              }

              .roulette-header {
                width: 100%;
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto auto;
                align-items: center;
                justify-content: space-between;
                position: relative;
                gap: 16px;
                margin-bottom: 14px;
                padding: 10px 14px;
                --roulette-small-chip-size: 28px;
                --roulette-small-chip-image-size: 24px;
                background: #0c0e14;
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 12px;
              }

              .recent, .last100 {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
              }

              .last100 {
                align-items: flex-end;
              }

              .label {
                color: #4b5563;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 1.5px;
                text-transform: uppercase;
              }

              .lastten {
                display: flex;
                gap: 4px;
              }


              .stats {
                display: flex;
                gap: 6px;
              }

              .stat {
                display: flex;
                align-items: center;
                gap: 6px;

                padding: 3px 8px 3px 4px;
                border-radius: 6px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255, 255, 255, 0.06);

                font-size: 13px;
                font-weight: 800;
              }

              .stat.green { color: #1fd65f; }
              .stat.black { color: #8b92a0; }
              .stat.red { color: #e8455f; }
              .stat.bait { color: #c9a84c; border-color: rgba(201, 168, 76, 0.22); background: rgba(201, 168, 76, 0.07); }

              @container (max-width: 900px) {
                .roulette-header { grid-template-columns: minmax(0, 1fr) auto; gap: 10px 14px; }
                .recent { grid-column: 1 / -1; }
                .last100 { align-items: flex-start; }
              }

              @container (max-width: 520px) {
                .roulette-header { grid-template-columns: minmax(0, 1fr); }
                .lastten { flex-wrap: wrap; }
              }

              .colors {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                width: 100%;
                gap: 16px;
              }

              @media only screen and (max-width: 1000px) {
                .roulette-container {
                  padding-bottom: 90px;
                }
              }

              @media only screen and (max-width: 875px) {
                .colors {
                  grid-template-columns: 1fr;
                  gap: 28px;
                }
              }

              @media only screen and (max-width: 1360px) and (min-width: 876px) {
                .colors {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                }
              }
            `}</style>
        </>
    );
}

export default Roulette;
