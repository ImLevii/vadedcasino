import {createNotification} from "../../util/api";
import {Show} from "solid-js";

function Method(props) {

    function getState() {
        if (props?.disabled) return ' disabled'
        if (props?.active) return ' active'
        return ''
    }

    return (
        <>
            <div class={'method-container' + getState()} onClick={() => {
                if (props?.disabled) return createNotification('error', 'This payment method is currently disabled')
                props?.click()
            }} aria-disabled={!!props?.disabled}>
                <div class='icon'>
                    <img src={props?.img} alt={props?.display || props?.name}/>
                </div>

                <div class='info'>
                    <span class='label'>{props?.category || 'Payment Method'}</span>
                    <span class='name'>{props?.display || props?.name}</span>
                    <Show when={props?.badge}>
                        <span class={'badge ' + (props?.badgeType || 'neutral')}>{props?.badge}</span>
                    </Show>
                </div>
            </div>

            <style jsx>{`
              .method-container {
                display: flex;
                align-items: center;
                gap: 14px;

                height: 80px;
                box-sizing: border-box;
                padding: 12px 14px;

                border-radius: 8px;
                background: #16181f;
                border: 1px solid rgba(255, 255, 255, 0.05);

                cursor: pointer;
                position: relative;
                transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease;
              }

              .method-container:not(.disabled):hover {
                border-color: rgba(31, 214, 95, 0.45);
                background: #1a1d25;
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
              }

              .method-container.active {
                border-color: var(--gold);
                background: #1a1d25;
                box-shadow: 0 0 0 1px rgba(31, 214, 95, 0.35), 0 6px 18px rgba(0, 0, 0, 0.35);
              }

              .method-container.disabled {
                filter: grayscale(1);
                opacity: 0.45;
                cursor: default;
              }

              .icon {
                width: 56px;
                height: 56px;
                min-width: 56px;

                border-radius: 7px;
                background: #0d0f13;
                border: 1px solid rgba(255, 255, 255, 0.04);

                display: flex;
                align-items: center;
                justify-content: center;
              }

              .icon img {
                max-width: 34px;
                max-height: 34px;
                object-fit: contain;
                transition: transform .25s ease;
              }

              .method-container:not(.disabled):hover .icon img {
                transform: scale(1.08);
              }

              .info {
                display: flex;
                flex-direction: column;
                gap: 3px;
                overflow: hidden;
              }

              .label {
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 11px;
                font-weight: 600;
                color: #6b7280;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .name {
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 15px;
                font-weight: 700;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .badge {
                width: fit-content;
                margin-top: 2px;
                padding: 2px 8px;

                border-radius: 4px;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 11px;
                font-weight: 700;
                line-height: 16px;
                letter-spacing: 0.2px;
              }

              .badge.good {
                color: var(--gold);
                background: rgba(31, 214, 95, 0.12);
              }

              .badge.neutral {
                color: #9aa3b2;
                background: rgba(255, 255, 255, 0.06);
              }
            `}</style>
        </>
    );
}

export default Method;
