import {createResource, createSignal, For, onCleanup, Show} from "solid-js";
import Avatar from "../components/Level/avatar";
import {api} from "../util/api";
import {resolveImageSrc} from "../util/image";
import Loader from "../components/Loader/loader";
import {Meta, Title} from "@solidjs/meta";

function Leaderboard(props) {

    const [period, setPeriod] = createSignal('daily')
    const [placements, setPlacements] = createSignal([])
    const [leaderboard] = createResource(() => period(), fetchLB)
    const [time, setTime] = createSignal(0)

    async function fetchLB(period) {
        try {
            let lb = await api(`/leaderboard/${period}`, 'GET', null)
            if (lb.users) { setPlacements(lb.users) }
            if (lb.endsIn) {
                lb.endsAt = Date.now() + lb.endsIn
                setTime(lb.endsAt - Date.now())
            }

            return lb
        } catch (e) {
            console.log(e)
            return null
        }
    }

    const timer = setInterval(() => {
        if (!leaderboard() || !leaderboard().endsAt) return
        setTime(leaderboard().endsAt - Date.now())
    }, 1000)
    onCleanup(() => clearInterval(timer))

    function formatTimeLeft() {
        const totalSeconds = Math.max(0, Math.floor(time() / 1000))
        const days = Math.floor(totalSeconds / 86400)
        const hours = Math.floor((totalSeconds % 86400) / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
    }

    return (
        <>
            <Title>Cosmic Luck | Leaderboard</Title>
            <Meta name='title' content='Leaderboard'></Meta>
            <Meta name='description' content='Play On Cosmic Luck The Best Casino Platform To Win Coins And Prizes!'></Meta>

            <main class='leaderboard-container fadein'>
              <section class='leaderboard-banner'>
                <div class='banner-copy'>
                  <div class='eyebrow'>
                    <img src='/assets/logo/cosmic-luck-logo.png' alt='' />
                    <span>Cosmic Luck Rankings</span>
                  </div>
                  <h1>THE CLASH</h1>
                  <p>Compete for the top daily and weekly positions. Every wager moves you closer to the prize pool.</p>
                </div>

                <div class='banner-actions'>
                  <span class='period-label'>Ranking period</span>
                  <div class='periods' role='group' aria-label='Leaderboard period'>
                    <button class={'period ' + (period() === 'daily' ? 'active' : '')} onClick={() => setPeriod('daily')}>Daily</button>
                    <button class={'period ' + (period() === 'weekly' ? 'active' : '')} onClick={() => setPeriod('weekly')}>Weekly</button>
                  </div>
                </div>

                <img class='banner-chip chip-one' src='/assets/chips/chip-green-clover.png' alt='' />
                <img class='banner-chip chip-two' src='/assets/chips/chip-white-clover.png' alt='' />
              </section>

                <Show when={!leaderboard.loading} fallback={<Loader/>}>
                    <>
                  <div class='leaderboard-status'>
                    <div>
                      <span class='status-dot'/>
                      <span>{period() === 'daily' ? 'Daily' : 'Weekly'} competition live</span>
                    </div>
                    <div class='time'>
                      <img src='/assets/icons/timer.svg' width='16' height='18' alt=''/>
                      <span>Resets in</span>
                      <strong>{formatTimeLeft()}</strong>
                    </div>
                        </div>

                  <div class='podium-container'>
                    <For each={[
                      {placement: 1, class: 'second', label: '2nd'},
                      {placement: 0, class: 'first', label: '1st'},
                      {placement: 2, class: 'third', label: '3rd'}
                    ]}>{(position) => {
                      const player = () => placements()[position.placement]
                      return (
                        <article class={'podium ' + position.class}>
                          <span class='tag'>{position.label}</span>
                          <div class='avatar-wrap'>
                            <Avatar id={player()?.id || '?'} height='68' xp={position.class === 'first' ? 'gold' : position.class === 'second' ? 'silver' : 'bronze'}/>
                          </div>
                          <strong class='username'>{player()?.username || 'Open position'}</strong>
                          <div class='metric'>
                            <span>Wagered</span>
                            <strong>{(player()?.wagered || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                          </div>
                          <div class='prize'>
                            <div class='prize-art'>
                              <Show when={player()?.item} fallback={<img src='/assets/chips/chip-green.png' alt=''/>}>
                                <img src={resolveImageSrc(player()?.item)} alt='Prize'/>
                              </Show>
                            </div>
                            <div>
                              <span>Prize</span>
                              <strong>{(player()?.reward || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                            </div>
                          </div>
                        </article>
                      )
                    }}</For>
                        </div>

                  <section class='rankings-table'>
                    <div class='section-heading'>
                      <div>
                        <span>Standings</span>
                        <h2>Top competitors</h2>
                      </div>
                      <span>{placements().length} ranked players</span>
                    </div>

                    <div class='table-header'>
                      <span>Place</span><span>Player</span><span>Wagered</span><span>Reward</span>
                    </div>

                    <Show when={placements().length > 3} fallback={<div class='empty-state'>No additional rankings yet.</div>}>
                      <For each={placements().slice(3)}>{(placement, index) => (
                        <div class='table-data'>
                          <strong class='place'>#{index() + 4}</strong>
                          <div class='player'>
                            <Avatar id={placement?.id} height='32'/>
                            <strong>{placement?.username || 'Anonymous'}</strong>
                          </div>
                          <div class='value' data-label='Wagered'>
                            <img src='/assets/chips/chip-green.png' alt=''/>
                            <span>{(placement?.wagered || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                          <div class='value reward' data-label='Reward'>
                            <span>{(placement?.reward || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                        </div>
                      )}</For>
                    </Show>
                  </section>
                    </>
                </Show>
            </main>

            <style jsx>{`
              .leaderboard-container {
                width: 100%;
                max-width: 1175px;
                box-sizing: border-box;
                padding: 30px 18px 96px;
                margin: 0 auto;
              }

              .leaderboard-banner {
                position: relative;
                width: 100%;
                min-height: 210px;
                padding: 34px 38px;
                box-sizing: border-box;
                overflow: hidden;

                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, .07);
                background: radial-gradient(70% 140% at 100% 50%, rgba(31, 214, 95, .13), transparent 64%), linear-gradient(135deg, rgba(20, 25, 34, .96), rgba(9, 12, 18, .98));
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, .045), 0 18px 50px rgba(0, 0, 0, .24);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 30px;
              }

              .leaderboard-banner::before {
                content: '';
                position: absolute;
                inset: 0;
                pointer-events: none;
                background-image: linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
                background-size: 26px 26px;
                mask-image: linear-gradient(90deg, #000, transparent 75%);
              }

              .banner-copy, .banner-actions {
                position: relative;
                z-index: 2;
              }

              .banner-copy {
                max-width: 650px;
              }

              .eyebrow {
                display: flex;
                align-items: center;
                gap: 9px;
                margin-bottom: 12px;
                color: #8e98a8;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .eyebrow img {
                width: 24px;
                height: 24px;
                object-fit: contain;
              }

              h1, h2, p {
                margin: 0;
              }

              h1 {
                color: #fff;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 38px;
                font-weight: 800;
                line-height: 1;
              }

              .banner-copy > p {
                max-width: 580px;
                margin-top: 14px;
                color: #9099a8;
                font-size: 14px;
                font-weight: 500;
                line-height: 1.55;
              }

              .banner-actions {
                min-width: 220px;
                padding: 14px;
                border: 1px solid rgba(255,255,255,.065);
                border-radius: 8px;
                background: rgba(7, 10, 15, .62);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
              }

              .period-label {
                display: block;
                margin: 0 0 9px 2px;
                color: #737d8c;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .periods {
                height: 38px;
                padding: 3px;
                display: flex;
                gap: 3px;
                border-radius: 6px;
                background: rgba(255,255,255,.04);
              }

              .period {
                flex: 1;
                border: 0;
                border-radius: 5px;
                outline: 0;
                background: transparent;
                color: #818a99;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                transition: .2s ease;
              }

              .period.active {
                background: #1fd65f;
                color: #06170c;
                box-shadow: 0 5px 16px rgba(31,214,95,.22);
              }

              .banner-chip {
                position: absolute;
                z-index: 1;
                width: 74px;
                opacity: .33;
                filter: drop-shadow(0 14px 20px rgba(0,0,0,.5));
                pointer-events: none;
              }

              .chip-one { right: 292px; bottom: -28px; transform: rotate(20deg); }
              .chip-two { right: 255px; top: -27px; transform: rotate(-22deg); }

              .leaderboard-status {
                min-height: 50px;
                margin: 16px 0 26px;
                padding: 0 16px;
                border: 1px solid rgba(255,255,255,.055);
                border-radius: 8px;
                background: rgba(14, 18, 25, .72);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                color: #8a94a3;
                font-size: 12px;
                font-weight: 700;
              }

              .leaderboard-status > div, .time {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .status-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #1fd65f;
                box-shadow: 0 0 12px rgba(31,214,95,.75);
              }

              .time strong {
                color: #fff;
                font-variant-numeric: tabular-nums;
              }

              .podium-container {
                width: 100%;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                align-items: end;
                gap: 14px;
              }

              .podium {
                position: relative;
                min-height: 285px;
                padding: 28px 22px 20px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,.07);
                border-radius: 8px;
                background: radial-gradient(80% 55% at 50% 100%, var(--podium-glow), transparent), linear-gradient(180deg, rgba(22,27,36,.94), rgba(11,14,20,.98));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 12px 35px rgba(0,0,0,.2);
                color: #fff;
                font-family: "Geogrotesque Wide", sans-serif;
              }

              .podium.first {
                min-height: 310px;
                --podium-accent: #1fd65f;
                --podium-glow: rgba(31,214,95,.17);
                border-color: rgba(31,214,95,.32);
              }

              .podium.second { --podium-accent: #b9c2ce; --podium-glow: rgba(185,194,206,.11); }
              .podium.third { --podium-accent: #bf8063; --podium-glow: rgba(191,128,99,.13); }

              .podium::after {
                content: '';
                position: absolute;
                left: 24px;
                right: 24px;
                bottom: 0;
                height: 2px;
                background: var(--podium-accent);
                box-shadow: 0 0 18px var(--podium-accent);
              }

              .tag {
                position: absolute;
                top: 13px;
                left: 13px;
                min-width: 38px;
                height: 24px;
                display: grid;
                place-items: center;
                border: 1px solid color-mix(in srgb, var(--podium-accent) 42%, transparent);
                border-radius: 5px;
                background: color-mix(in srgb, var(--podium-accent) 10%, transparent);
                color: var(--podium-accent);
                font-size: 10px;
                font-weight: 800;
              }

              .avatar-wrap { margin-top: 13px; }
              .username { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }

              .metric {
                width: 100%;
                padding: 10px 12px;
                box-sizing: border-box;
                display: flex;
                justify-content: space-between;
                gap: 10px;
                border: 1px solid rgba(255,255,255,.05);
                border-radius: 6px;
                background: rgba(4,7,11,.42);
                font-size: 11px;
              }

              .metric span, .prize span { color: #747e8d; }
              .metric strong { color: #dce2e9; font-variant-numeric: tabular-nums; }

              .prize {
                width: 100%;
                margin-top: auto;
                display: flex;
                align-items: center;
                gap: 11px;
              }

              .prize-art {
                width: 62px;
                height: 50px;
                flex: 0 0 62px;
                display: grid;
                place-items: center;
                border-radius: 6px;
                background: rgba(255,255,255,.035);
              }

              .prize-art img { max-width: 56px; max-height: 44px; object-fit: contain; }
              .prize > div:last-child { min-width: 0; display: flex; flex-direction: column; gap: 4px; font-size: 10px; }
              .prize strong { color: #1fd65f; font-size: 13px; font-variant-numeric: tabular-nums; }

              .rankings-table {
                margin-top: 28px;
                padding: 20px;
                border: 1px solid rgba(255,255,255,.06);
                border-radius: 8px;
                background: linear-gradient(180deg, rgba(18,22,30,.88), rgba(10,13,18,.94));
                box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
              }

              .section-heading {
                display: flex;
                align-items: end;
                justify-content: space-between;
                gap: 15px;
                margin-bottom: 18px;
              }

              .section-heading span { color: #6f7988; font-size: 10px; font-weight: 700; text-transform: uppercase; }
              .section-heading h2 { margin-top: 4px; color: #fff; font-family: "Geogrotesque Wide", sans-serif; font-size: 18px; }

              .table-header, .table-data {
                display: grid;
                grid-template-columns: 90px minmax(180px, 1.4fr) minmax(140px, 1fr) minmax(120px, .8fr);
                align-items: center;
              }

              .table-header {
                min-height: 34px;
                padding: 0 15px;
                color: #657080;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
              }

              .table-header span:last-child { text-align: right; }

              .table-data {
                min-height: 58px;
                margin-top: 7px;
                padding: 0 15px;
                border: 1px solid rgba(255,255,255,.045);
                border-radius: 7px;
                background: rgba(255,255,255,.025);
                color: #a4adba;
                font-size: 12px;
                transition: .18s ease;
              }

              .table-data:hover {
                transform: translateY(-1px);
                border-color: rgba(31,214,95,.16);
                background: rgba(31,214,95,.025);
              }

              .place { color: #727c8b; }

              .player, .value {
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 9px;
              }

              .player strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d7dde5; }
              .value img { width: 17px; height: 17px; object-fit: contain; }
              .value span { font-variant-numeric: tabular-nums; }
              .reward { justify-content: flex-end; color: #1fd65f; font-weight: 700; }

              .empty-state {
                min-height: 90px;
                display: grid;
                place-items: center;
                border: 1px dashed rgba(255,255,255,.07);
                border-radius: 7px;
                color: #737d8c;
                font-size: 12px;
              }

              @media only screen and (max-width: 820px) {
                .leaderboard-banner { align-items: flex-start; flex-direction: column; padding: 28px; }
                .banner-actions { width: 100%; box-sizing: border-box; }
                .banner-chip { display: none; }
                .podium-container { grid-template-columns: 1fr; align-items: stretch; }
                .podium, .podium.first { min-height: 250px; }
                .podium.first { order: -1; }
              }

              @media only screen and (max-width: 620px) {
                .leaderboard-container { padding: 18px 12px 90px; }
                .leaderboard-banner { min-height: 0; padding: 24px 20px; }
                h1 { font-size: 30px; }
                .leaderboard-status { align-items: flex-start; flex-direction: column; padding: 12px 14px; }
                .rankings-table { padding: 14px; }
                .section-heading { align-items: flex-start; flex-direction: column; }
                .table-header { display: none; }
                .table-data {
                  grid-template-columns: 42px minmax(0, 1fr) auto;
                  min-height: 76px;
                  padding: 10px 12px;
                }
                .value { display: none; }
                .reward { display: flex; }
                .reward::before { content: attr(data-label); color: #667180; font-size: 9px; text-transform: uppercase; }
              }
            `}</style>
        </>
    );
}

export default Leaderboard;
