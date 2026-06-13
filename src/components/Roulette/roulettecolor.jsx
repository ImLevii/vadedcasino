import Avatar from "../Level/avatar";
import {authedAPI, createNotification} from "../../util/api";
import {createEffect, createSignal, For} from "solid-js";

const iconName = {
    'red': 'roulette-red.svg',
    'green': 'roulette-green.svg',
    'gold': 'roulette-gold.svg'
}

const COLORS = {
    'gold': 0,
    'green': 1,
    'red': 2,
}

function RouletteColor(props) {

    const [bets, setBets] = createSignal([])

    createEffect(() => {
        setBets(getBetForColor())
    })

    function getBetForColor() {
        let colorNum = COLORS[props?.color]
        return props?.bets?.filter(bet => bet.color === colorNum)?.sort((a,b) => b.amount - a.amount)
    }

    function isGrayed() {
        if (props?.state !== 'WINNERS') return ''
        if (props?.round?.color === COLORS[props?.color]) return ''
        return 'gray'
    }

    function getWonAmount(amount) {
        let prefix = numberPrefix()
        if (prefix === '') return amount
        if (prefix === '-') return amount
        if (props?.color === 'gold') return amount * 14
        return amount * 2
    }

    function numberPrefix() {
        if (props?.state !== 'WINNERS') return ''
        if (props?.round?.color === COLORS[props?.color]) return '+'
        return '-'
    }

    return (
        <>
            <div class={'bet-column ' + (isGrayed())}>
                <button class={'color ' + props.color} onClick={async () => {
                    if (props?.amount < 1) return

                    let res = await authedAPI('/roulette/bet', 'POST', JSON.stringify({
                        color: COLORS[props?.color],
                        amount: props?.amount || 0,
                    }), true)

                    if (res.success) {
                        createNotification('success', `Successfully placed a bet on ${props?.color} for ${props?.amount} robux.`)
                    }
                }}>
                    <span class='multi'>x{props?.color === 'gold' ? '14' : '2'}</span>
                    <span class='cname'>{props.color.toUpperCase()}</span>
                    <img src={`assets/icons/${iconName[props.color]}`} alt='' height='34'/>
                </button>

                <div class='bets-header'>
                    <p>{bets()?.length} PLAYERS</p>

                    <p class='total gold'>
                        <img src='/assets/icons/coin.svg' height='15' alt=''/>
                        {numberPrefix()}
                        {getWonAmount(bets()?.reduce((pv, bet) => pv + bet.amount, 0))?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div class='bets'>
                    <For each={bets()}>{(bet, index) => (
                        <div class={'bet ' + (props?.color + '-') + (index() === 0 ? 'top' : '')}>
                            <div class='user'>
                                <Avatar id={bet?.user?.id} xp={bet?.user?.xp} height={30}/>
                                <p>{bet?.user?.username}</p>

                                {index() === 0 && (
                                    <p class='top-bet'>TOP BET</p>
                                )}
                            </div>

                            <p class='total'>
                                <img src='/assets/icons/coin.svg' height='15' alt=''/>
                                {numberPrefix()}
                                {getWonAmount(bet?.amount)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    )}</For>
                </div>
            </div>

            <style jsx>{`
              .bet-column {
                flex: 1;
                display: flex;
                flex-direction: column;
                transition: opacity .3s;
              }

              .gray {
                opacity: 0.45;
                mix-blend-mode: luminosity;
              }

              .color {
                color: #FFF !important;
                font-size: 15px;
                font-family: Geogrotesque Wide;
                font-weight: 700;

                outline: unset;
                width: unset;
                border: unset;

                min-height: 64px;
                max-height: 64px;
                padding: 0 20px;

                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;

                border-radius: 10px;
                cursor: pointer;
                transition: filter .15s ease, transform .15s ease;
              }

              .color:hover {
                filter: brightness(1.12);
                transform: translateY(-1px);
              }

              .color .multi {
                font-size: 20px;
                font-weight: 800;
              }

              .color .cname {
                font-size: 15px;
                font-weight: 700;
                letter-spacing: .5px;
                opacity: .9;
              }

              .color img {
                margin-left: auto;
              }

              .color.green {
                border: 1px solid rgba(31, 214, 95, 0.55);
                background: linear-gradient(180deg, rgba(31, 214, 95, 0.28) 0%, rgba(31, 214, 95, 0.12) 100%);
              }

              .color.gold {
                border: 1px solid rgba(245, 166, 35, 0.55);
                background: linear-gradient(180deg, rgba(245, 166, 35, 0.28) 0%, rgba(245, 166, 35, 0.12) 100%);
              }

              .color.red {
                border: 1px solid rgba(232, 69, 95, 0.55);
                background: linear-gradient(180deg, rgba(232, 69, 95, 0.28) 0%, rgba(232, 69, 95, 0.12) 100%);
              }

              .color.red img {
                filter: drop-shadow(0 0 12px rgba(232, 69, 95, 0.7));
              }

              .color.green img {
                filter: drop-shadow(0 0 12px rgba(31, 214, 95, 0.7));
              }

              .color.gold img {
                filter: drop-shadow(0 0 12px rgba(245, 166, 35, 0.7));
              }

              .bets-header {
                margin-top: 14px;
                min-height: 34px;
                border-radius: 8px 8px 0 0;
                background: #16181f;
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-bottom: none;

                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 14px;

                color: #6b7280;
                font-size: 13px;
                font-weight: 700;
              }

              .total {
                display: flex;
                align-items: center;
                gap: 5px;
              }

              .bet {
                background: #11141b;
                border-left: 1px solid rgba(255, 255, 255, 0.05);
                border-right: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 14px;

                min-height: 48px;

                color: #c3cad6;
                font-size: 14px;
                font-family: Geogrotesque Wide;
                font-weight: 700;
              }

              .bets > div:last-child {
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 0 0 8px 8px;
              }

              .green-top {
                background: rgba(31, 214, 95, 0.08);
              }

              .gold-top {
                background: rgba(245, 166, 35, 0.08);
              }

              .red-top {
                background: rgba(232, 69, 95, 0.08);
              }

              .green-top .total {
                color: #1fd65f;
              }

              .gold-top .total {
                color: #f5a623;
              }

              .red-top .total {
                color: #e8455f;
              }

              .green-top .top-bet {
                color: #1fd65f;
                text-shadow: 0px 0px 15px #1fd65f;
              }

              .gold-top .top-bet {
                color: #f5a623;
                text-shadow: 0px 0px 15px #f5a623;
              }

              .red-top .top-bet {
                color: #e8455f;
                text-shadow: 0px 0px 15px #e8455f;
              }

              .top-bet {
                font-size: 10px;
                font-weight: 700;
              }

              .user {
                display: flex;
                gap: 10px;
                align-items: center;
              }

              .win {
                margin-left: auto;
              }

              .green {
                color: #1fd65f;
              }

              .gold {
                color: var(--gold);
              }

              .red {
                color: #C53852;
              }

              @media only screen and (max-width: 875px) {
                .bets-header {
                  margin-top: 16px !important;
                }
              }
            `}</style>
        </>
    );
}

export default RouletteColor;
