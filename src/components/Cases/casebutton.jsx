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

                <button class='preview-btn-case' onClick={openPreview}>
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                        <circle cx='12' cy='12' r='3' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                    </svg>
                    {loadingPreview ? 'LOADING...' : 'PREVIEW'}
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
                height: 286px;

                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.045);
                background: linear-gradient(180deg, rgba(31, 36, 47, 0.82) 0%, rgba(17, 20, 28, 0.98) 66%, rgba(10, 13, 20, 1) 100%);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 14px 34px rgba(0, 0, 0, 0.24);
                
                display: flex;
                align-items: center;
                flex-direction: column;

                padding: 16px 13px 18px;
                position: relative;
                overflow: hidden;
                isolation: isolate;
                transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease, filter .2s ease;
              }

              .case-button:hover {
                border-color: rgba(31, 214, 95, 0.24);
                transform: translateY(-3px);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 20px 42px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(31, 214, 95, 0.035);
              }
              
              .button:not(.creator) {
                width: unset;
                cursor: pointer;
              }
              
              .image {
                width: 92%;
                max-width: 178px;
                height: 130px;
                object-fit: contain;
                margin-top: 4px;
                position: relative;
                z-index: 1;
                filter: drop-shadow(0 20px 16px rgba(0, 0, 0, 0.42));
                transition: transform .22s ease, filter .22s ease;
              }

              .button:hover .image {
                transform: translateY(-5px) scale(1.03);
                filter: drop-shadow(0 22px 18px rgba(31, 214, 95, 0.13)) drop-shadow(0 16px 18px rgba(0, 0, 0, 0.45));
              }
              
              .cost {
                min-width: 116px;
                min-height: 29px;
                padding: 0 15px;
                margin: 9px 0 12px 0;
                
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;

                background: conic-gradient(from 180deg at 50% 50%, #FFDC18 -0.3deg, #B17818 72.1deg, rgba(156, 99, 15, 0.611382) 139.9deg, rgba(126, 80, 12, 0.492874) 180.52deg, rgba(102, 65, 10, 0.61) 215.31deg, #B17818 288.37deg, #FFDC18 359.62deg, #FFDC18 359.7deg, #B17818 432.1deg);
                border-radius: 3px;
                position: relative;
                z-index: 2;
                
                color: white;
                font-weight: 700;
                font-size: 13px;
                text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
              }

              .cost:before {
                position: absolute;
                left: 1px;
                top: 1px;
                z-index: -1;
                content: '';
                
                height: calc(100% - 2px);
                width: calc(100% - 2px);
                border-radius: 3px;
                
                background: linear-gradient(0deg, rgba(31, 214, 95, 0.48), rgba(31, 214, 95, 0.48)), linear-gradient(252.77deg, #12151c -27.53%, #1f242e 175.86%);
              }

              .open-case {
                width: 100%;
                height: 43px;
                margin-top: auto;
                border-radius: 5px;
                background: linear-gradient(180deg, #08d15a 0%, #05b94d 100%);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 4px 0 rgba(0, 104, 45, 0.55), 0 10px 24px rgba(8, 209, 90, 0.12);

                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                z-index: 1;

                color: #fff;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: .2px;
              }

              .favorite {
                position: absolute;
                top: 10px;
                right: 10px;
                width: 22px;
                height: 22px;
                padding: 0;
                border: 0;
                outline: 0;
                background: transparent;
                color: rgba(139, 146, 160, 0.72);
                cursor: pointer;
                z-index: 3;
                transition: color .18s ease, transform .18s ease;
              }

              .favorite:hover {
                color: #1fd65f;
                transform: translateY(-1px);
              }

              .community-badge {
                position: absolute;
                top: 10px;
                left: 10px;
                z-index: 3;

                padding: 3px 7px;
                border-radius: 3px;
                background: rgba(31, 214, 95, 0.1);
                border: 1px solid rgba(31, 214, 95, 0.5);
                color: #1fd65f;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: .4px;
              }

              .rarity-track {
                width: 100%;
                height: 16px;
                margin: 2px 0 13px;
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
              }

              .track-fill {
                position: absolute;
                left: 0;
                right: 0;
                height: 4px;
                border-radius: 99px;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.24), rgba(234, 207, 79, 0.55), rgba(255, 85, 113, 0.9));
                opacity: .82;
              }

              .track-marker {
                position: absolute;
                right: 12%;
                top: 0;
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 6px solid #dce2ec;
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
              }

              .button:hover .open-case {
                filter: brightness(1.12);
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
                bottom: 52px;
                right: 8px;
                z-index: 5;

                display: flex;
                align-items: center;
                gap: 4px;
                height: 24px;
                padding: 0 8px;
                border-radius: 4px;
                border: 1px solid rgba(255,214,88,0.3);
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(4px);
                color: #ffd658;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 9px;
                font-weight: 700;
                cursor: pointer;
                outline: none;
                transition: background .2s, border-color .2s;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
              }

              .button:hover .preview-btn-case,
              .creator:hover .preview-btn-case {
                opacity: 1;
                pointer-events: auto;
              }

              .preview-btn-case:hover {
                background: rgba(255,214,88,0.2);
                border-color: rgba(255,214,88,0.5);
              }

              .bg {
                position: absolute;
                height: 100%;
                width: 100%;
                top: 0;
                left: 0;

                opacity: 0.12;
                background-size: cover;
                background-image: url("/assets/art/casebg.png");
              }

              .bg:after {
                content: '';
                position: absolute;
                inset: 38% 0 38px;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.00), rgba(31, 214, 95, 0.12), rgba(255, 214, 88, 0.10), rgba(31, 214, 95, 0.00));
                opacity: 0;
                transition: opacity .22s ease;
              }

              .button:hover .bg:after {
                opacity: 1;
              }
            `}</style>
        </>
    );
}

export default CaseButton;