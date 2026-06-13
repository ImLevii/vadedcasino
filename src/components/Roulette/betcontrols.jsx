function RouletteBetControls(props) {

    function changeBetAmount(num) {
        let baseValue = isNaN(props.bet) ? 0 : props.bet
        props.setBet(Math.abs(Math.floor((baseValue + num) * 100)) / 100)
    }

    return (
        <>
            <div class='bet-container'>
                <div class='bet-amount-wrapper'>
                    <img src='/assets/icons/coin.svg' height='18' alt=''/>
                    <input class='bet-amount' type='number' placeholder='0.00' value={props.bet}
                           onChange={(e) => props.setBet(Math.abs(e.target.valueAsNumber))}/>
                </div>

                <div class='controls'>
                    <button class='control' onClick={() => props.setBet(0)}>
                        Clear
                    </button>

                    <button class='control' onClick={() => changeBetAmount(props.bet / -2)}>
                        1/2
                    </button>

                    <button class='control' onClick={() => changeBetAmount(props.bet)}>
                        x2
                    </button>

                    <button class='control' onClick={() => props.setBet(1)}>
                        Min
                    </button>

                    <button class='control max' onClick={() => props.setBet(props?.user?.balance || 0)}>
                        Max
                    </button>
                </div>
            </div>

            <style jsx>{`
              .bet-container {
                min-height: 64px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.06);
                background: #11141b;

                margin: 22px 0;

                display: flex;
                align-items: center;
                gap: 12px;

                color: #c3cad6;
                font-size: 14px;
                font-weight: 700;

                padding: 11px 12px;
              }

              .bet-amount-wrapper {
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.07);
                background: #0c0e13;

                display: flex;
                align-items: center;

                flex: 1;
                height: 42px;

                gap: 10px;
                padding: 0 14px;
              }

              .bet-amount {
                width: 100%;
                height: 100%;
                border: unset;
                outline: unset;
                background: unset;

                color: #FFF;
                font-size: 15px;
                font-family: Geogrotesque Wide;
                font-weight: 700;
              }

              .controls {
                display: flex;
                align-items: center;
                gap: 8px;
              }

              .control {
                height: 42px;
                min-width: 56px;
                padding: 0 16px;

                border: 1px solid rgba(255, 255, 255, 0.06);
                outline: unset;
                cursor: pointer;

                display: flex;
                align-items: center;
                justify-content: center;

                color: #c3cad6;
                font-size: 14px;
                font-family: Geogrotesque Wide;
                font-weight: 700;

                border-radius: 8px;
                background: #1a1f29;
                transition: background .15s ease, color .15s ease, border-color .15s ease;
              }

              .control:hover {
                background: #222834;
                color: #fff;
              }

              .control.max {
                color: #0c0e13;
                background: #1fd65f;
                border-color: #1fd65f;
              }

              .control.max:hover {
                background: #2be76d;
                color: #0c0e13;
              }

              @media only screen and (max-width: 700px) {
                .bet-container {
                  flex-wrap: wrap;
                }

                .controls {
                  width: 100%;
                  justify-content: space-between;
                }

                .control {
                  flex: 1;
                  min-width: 0;
                  padding: 0 8px;
                }
              }
            `}</style>
        </>
    );
}

export default RouletteBetControls;
