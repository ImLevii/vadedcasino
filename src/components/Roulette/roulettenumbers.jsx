import {createEffect, createSignal} from "solid-js";
import {numberToColor} from "../../util/roulettehelpers";

function RouletteNumbers(props) {

    let num
    const [type, setType] = createSignal('green')

    createEffect(() => setType(numberToColor(props.num)))

return (
        <>
            <div ref={num} style={{filter:props.landed && props.roll?.result!==props.num ? 'grayscale(1)' : 'none'}} class={'spinner-number ' + (type())}>
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
              
                            .black {
                border-radius: 4px;
                                background: rgba(139, 146, 160, 0.12);
                                border: 1px solid rgba(139, 146, 160, 0.45);
                
                                color: #c3cad6;
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
