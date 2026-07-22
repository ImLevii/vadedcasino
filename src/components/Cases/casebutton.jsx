import {createSignal, Show} from "solid-js";
import {A} from "@solidjs/router";
import CaseTitle from "./casetitle";
import CasePreview from "./casepreview";
import {resolveImageSrc} from "../../util/image";
import {authedAPI} from "../../util/api";

function CaseButton(props) {
    const [showPreview, setShowPreview] = createSignal(false)
    const [previewData, setPreviewData] = createSignal(null)
    const [loadingPreview, setLoadingPreview] = createSignal(false)

    async function openPreview(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!props?.c?.slug) return;
        
        // If case data already has items, use it directly
        if (props?.c?.items && props.c.items.length > 0) {
            setPreviewData(props.c);
            setShowPreview(true);
            return;
        }
        
        // Otherwise fetch full case data
        setLoadingPreview(true);
        try {
            const res = await authedAPI(`/cases/${props.c.slug}`, 'GET', null);
            if (res) {
                setPreviewData(res);
                setShowPreview(true);
            }
        } catch (err) {
            console.error('Failed to fetch case preview:', err);
        } finally {
            setLoadingPreview(false);
        }
    }

    function closePreview() {
        setShowPreview(false);
        setPreviewData(null);
    }

    return (
        <>
            <div class={'case-button ' + (props?.creator ? 'creator' : 'button')}>
              {!props.creator && (
                <button class='favorite' aria-label='Favorite case' type='button'>
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path d='M12 3.6L14.6 8.87L20.42 9.72L16.21 13.82L17.2 19.62L12 16.88L6.8 19.62L7.79 13.82L3.58 9.72L9.4 8.87L12 3.6Z' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/>
                  </svg>
                </button>
              )}

              {props?.c?.community && (
                <span class='community-badge'>COMMUNITY</span>
              )}

                <CaseTitle name={props?.c?.name || 'Unknown'}/>

                <div class='cost'>
                    <img src='/assets/icons/coin.svg' height='13' alt='' loading="lazy"/>
                    <p>{props?.c?.price?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 0}</p>
                </div>

                <img class='image' src={resolveImageSrc(props?.c?.img, '/public/cases/radiation-case.png')} alt='' height={props?.creator ? '80' : '120'}/>

                {!props.creator && (
                  <div class='rarity-track'>
                    <span class='track-fill'/>
                    <span class='track-marker'/>
                  </div>
                )}

                {!props.creator && (
                  <div class='open-case'>OPEN CASE</div>
                )}

                {!props.creator && (
                    <A href={`/cases/${props?.c?.slug}`} class='gamemode-link' draggable={false}></A>
                )}

                <button class='preview-btn-case' onClick={openPreview} aria-label='Preview case'>
                    <svg width='11' height='11' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                        <circle cx='12' cy='12' r='3' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                    </svg>
                </button>

                {props?.creator && props?.amount > 0 && (
                    <div class='controls'>
                        <button class='adder bevel-light' onClick={props?.removeCase}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="3" viewBox="0 0 9 3" fill="none">
                                <path
                                    d="M0.723861 0H8.27614C8.75871 0 9 0.205882 9 0.617647V2.36029C9 2.78676 8.75871 3 8.27614 3H0.723861C0.241287 3 0 2.78676 0 2.36029V0.617647C0 0.205882 0.241287 0 0.723861 0Z"
                                    fill="#8b92a0"/>
                            </svg>
                        </button>

                        <p>{props?.amount || 0}</p>

                        <button class='adder bevel-light' onClick={props?.addCase}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                                <path
                                    d="M3.26627 8.41177V5.82353H0.532544C0.177515 5.82353 0 5.63399 0 5.2549V3.7451C0 3.37909 0.177515 3.19608 0.532544 3.19608H3.26627V0.588235C3.26627 0.196078 3.43195 0 3.76331 0H5.20118C5.54438 0 5.71598 0.196078 5.71598 0.588235V3.19608H8.46745C8.82248 3.19608 9 3.37909 9 3.7451V5.2549C9 5.63399 8.82248 5.82353 8.46745 5.82353H5.71598V8.41177C5.71598 8.80392 5.54438 9 5.20118 9H3.76331C3.43195 9 3.26627 8.80392 3.26627 8.41177Z"
                                    fill="#8b92a0"/>
                            </svg>
                        </button>
                    </div>
                )}

                {props?.creator && !props?.amount && (
                    <div class='controls'>
                        <button class='add bevel-light' onClick={props?.addCase}>
                            Add Case
                        </button>
                    </div>
                )}

                <div class='bg'/>
            </div>

            {/* ── Case Preview Modal ── */}
            <Show when={showPreview() && previewData()}>
                <CasePreview case={previewData()} onClose={closePreview}/>
            </Show>

            <style jsx>{`
              .case-button {
                min-height: 330px;
                box-sizing: border-box;

                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.07);
                background: radial-gradient(circle at 50% 38%, rgba(31,214,95,.08), transparent 40%), linear-gradient(180deg, rgba(18, 24, 34, 0.95) 0%, rgba(9, 13, 19, 0.98) 60%, rgba(5, 8, 13, 1) 100%);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 14px 38px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(31, 214, 95, 0.03);
                
                display: flex;
                align-items: center;
                flex-direction: column;

                padding: 20px 16px 16px;
                position: relative;
                overflow: hidden;
                isolation: isolate;
                transition: border-color .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease;
              }

              .case-button:hover {
                border-color: rgba(31, 214, 95, 0.35);
                transform: translateY(-4px) scale(1.01);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 22px 48px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(31, 214, 95, 0.08), 0 0 30px rgba(31, 214, 95, 0.06);
              }

              .case-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(31, 214, 95, 0.15), transparent);
                opacity: 0;
                transition: opacity .25s ease;
              }

              .case-button:hover::before {
                opacity: 1;
              }
              
              .button:not(.creator) {
                width: unset;
                cursor: pointer;
              }
              
              .image {
                width: 92%;
                max-width: 182px;
                height: 142px;
                object-fit: contain;
                margin-top: 6px;
                position: relative;
                z-index: 1;
                filter: drop-shadow(0 20px 18px rgba(0, 0, 0, 0.5));
                transition: transform .25s cubic-bezier(.34,1.56,.64,1), filter .25s ease;
              }

              .button:hover .image {
                transform: translateY(-6px) scale(1.06);
                filter: drop-shadow(0 28px 24px rgba(31, 214, 95, 0.18)) drop-shadow(0 18px 22px rgba(0, 0, 0, 0.5));
              }
              
              .cost {
                min-width: 118px;
                min-height: 32px;
                padding: 0 16px;
                margin: 10px 0 8px;
                
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;

                background: linear-gradient(180deg, rgba(18,84,49,.95), rgba(9,57,32,.98));
                border: 1px solid rgba(31,214,95,.5);
                border-radius: 7px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 8px 20px rgba(0,0,0,.25), 0 0 12px rgba(31,214,95,.06);
                position: relative;
                z-index: 2;
                
                color: white;
                font-weight: 700;
                font-size: 13px;
                text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
                transition: border-color .2s ease, box-shadow .2s ease;
              }

              .case-button:hover .cost {
                border-color: rgba(31,214,95,.65);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 8px 22px rgba(0,0,0,.3), 0 0 18px rgba(31,214,95,.1);
              }

              .open-case {
                width: 100%;
                height: 42px;
                margin-top: auto;
                border-radius: 8px;
                background: linear-gradient(180deg, #1fd65f 0%, #0db950 100%);
                border: 1px solid rgba(75,242,137,.4);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 8px 22px rgba(8, 209, 90, 0.15), 0 2px 0 rgba(0,0,0,0.2);

                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                z-index: 1;

                color: #fff;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: .3px;
                transition: filter .2s ease, transform .2s ease;
              }

              .case-button:hover .open-case {
                filter: brightness(1.12);
                transform: translateY(-1px);
              }

              .favorite {
                position: absolute;
                top: 10px;
                right: 10px;
                width: 26px;
                height: 26px;
                padding: 0;
                border: 0;
                outline: 0;
                border-radius: 6px;
                background: rgba(0,0,0,0.3);
                backdrop-filter: blur(6px);
                display: flex;
                align-items: center;
                justify-content: center;
                color: rgba(139, 146, 160, 0.72);
                cursor: pointer;
                z-index: 3;
                transition: color .18s ease, transform .18s ease, background .18s ease;
              }

              .favorite:hover {
                color: #1fd65f;
                background: rgba(31, 214, 95, 0.15);
                transform: translateY(-1px) scale(1.05);
              }

              .community-badge {
                position: absolute;
                top: 10px;
                left: 10px;
                z-index: 3;

                padding: 4px 8px;
                border-radius: 4px;
                background: rgba(31, 214, 95, 0.12);
                border: 1px solid rgba(31, 214, 95, 0.5);
                color: #1fd65f;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: .5px;
                backdrop-filter: blur(4px);
              }

              .rarity-track {
                width: 100%;
                height: 18px;
                margin: 5px 0 14px;
                position: relative;
                z-index: 1;
                display: flex;
                align-items: center;
              }

              .rarity-track:before {
                content: '';
                width: 100%;
                height: 4px;
                border-radius: 99px;
                background: rgba(48, 59, 49, 0.75);
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
              }

              .track-fill {
                position: absolute;
                left: 0;
                right: 0;
                height: 4px;
                border-radius: 99px;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.4), rgba(234, 207, 79, 0.7), rgba(255, 85, 113, 0.95));
                opacity: .92;
                box-shadow: 0 0 8px rgba(31, 214, 95, 0.5), 0 0 16px rgba(234, 207, 79, 0.25);
              }

              .track-marker {
                position: absolute;
                right: 12%;
                top: -1px;
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 6px solid #dce2ec;
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
                transition: right .3s ease;
              }

              .case-button:hover .track-marker {
                right: 10%;
              }
              
              .controls {
                display: flex;
                align-items: center;
                gap: 25px;

                color: #FFF;
                font-size: 16px;
                font-weight: 700;
                
                margin-top: auto;
                z-index: 1;
              }
              
              .add {
                width: 108px;
                height: 31px;

                color: #8b92a0;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 13px;
                font-weight: 700;
              }
              
              .adder {
                width: 30px;
                height: 30px;
                
                display: flex;
                align-items: center;
                justify-content: center;
                
                cursor: pointer;
              }

              .preview-btn-case {
                position: absolute;
                bottom: 64px;
                right: 12px;
                z-index: 5;

                width: 32px;
                height: 32px;
                padding: 0;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(10, 14, 22, 0.8);
                backdrop-filter: blur(12px) saturate(130%);
                -webkit-backdrop-filter: blur(12px) saturate(130%);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 6px 18px rgba(0, 0, 0, 0.35);
                color: #8b92a0;
                cursor: pointer;
                outline: none;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all .2s ease;
                opacity: 0;
                pointer-events: none;
              }

              .button:hover .preview-btn-case,
              .creator:hover .preview-btn-case {
                opacity: 1;
                pointer-events: auto;
              }

              .preview-btn-case:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
                color: #fff;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 8px 22px rgba(0, 0, 0, 0.4);
                transform: translateY(-1px);
              }

              .preview-btn-case svg {
                width: 12px;
                height: 12px;
              }

              .bg {
                position: absolute;
                height: 100%;
                width: 100%;
                top: 0;
                left: 0;

                opacity: 0.1;
                background-size: cover;
                background-image: url("/assets/art/casebg.png");
                transition: opacity .25s ease;
              }

              .case-button:hover .bg {
                opacity: 0.15;
              }

              .bg:after {
                content: '';
                position: absolute;
                inset: 35% 0 38px;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.00), rgba(31, 214, 95, 0.16), rgba(255, 214, 88, 0.14), rgba(31, 214, 95, 0.00));
                opacity: 0;
                transition: opacity .25s ease;
              }

              .case-button:hover .bg:after {
                opacity: 1;
              }

              .case-button.creator {
                min-height: 172px;
                height: 172px;
                padding: 10px 8px 8px;
                border-radius: 6px;
                background: #111720;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
              }

              .creator:hover {
                transform: translateY(-1px);
                border-color: rgba(31,214,95,.28);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
              }

              .creator .image {
                width: 92px;
                height: 68px;
                margin-top: 1px;
              }

              .creator .cost {
                min-width: 82px;
                min-height: 23px;
                margin: 5px 0 3px;
                padding: 0 8px;
                border-radius: 4px;
                font-size: 9px;
              }

              .creator .controls {
                gap: 12px;
                font-size: 10px;
              }

              .creator .add {
                width: 88px;
                height: 25px;
                font-size: 9px;
              }

              .creator .adder {
                width: 25px;
                height: 25px;
              }

              .creator .preview-btn-case {
                right: 6px;
                bottom: 38px;
                width: 24px;
                height: 24px;
                border-radius: 4px;
              }

              .creator .community-badge {
                top: 5px;
                left: 5px;
                padding: 2px 4px;
                font-size: 6px;
              }
            `}</style>
        </>
    );
}

export default CaseButton;