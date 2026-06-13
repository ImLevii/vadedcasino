import {createEffect, createSignal} from "solid-js";

function RouletteNumbers(props) {

    let num
    const [type, setType] = createSignal('green')

    createEffect(() => {
        switch(props.num) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                return setType('green')
            case 14:
            case 13:
            case 12:
            case 11:
            case 10:
            case 9:
            case 8:
                return setType('red')
            case 0:
            default:
                return setType('gold')
        }
    })

    createEffect(() => {
        if (typeof props.roll?.result === 'number') {
            rollSpinner(props.roll?.result)
        }
    })

    function rollSpinner(number) {
        if (number === props.num) return

        num.animate([
            { filter: 'grayscale(0%)', offset: 0 },
            { filter: 'grayscale(100%)', offset: 0.05 },
            { filter: 'grayscale(100%)', offset: 0.9 },
            { filter: 'grayscale(0%)', offset: 0.95 },
            { filter: 'grayscale(0%)', offset: 1}
        ], {
            iterations: 1,
            duration: 2000,
            delay: props.config?.rollTime
        })
    }

    return (
        <>
            <div ref={num} class={'spinner-number ' + (type())}>
                <p>{props.num}</p>
            </div>

            <style jsx>{`
              .spinner-number {
                min-width: 80px;
                width: 80px;
                height: 25px;
                
                display: flex;
                align-items: center;
                justify-content: center;

                font-size: 14px;
                font-family: Geogrotesque Wide;
                font-weight: 600;
              }
              
              .gold {
                border-radius: 4px;
                background: rgba(245, 166, 35, 0.12);
                border: 1px solid rgba(245, 166, 35, 0.45);
                
                color: #f5a623;
              }
              
              .red {
                border-radius: 4px;
                border: 1px solid rgba(232, 69, 95, 0.4);
                background: rgba(232, 69, 95, 0.1);

                color: #e8455f;
              }
              
              .green {
                border-radius: 4px;
                border: 1px solid rgba(31, 214, 95, 0.4);
                background: rgba(31, 214, 95, 0.1);

                color: #1fd65f;
              }
            `}</style>
        </>
    );
}

export default RouletteNumbers;
