import {For, Show} from "solid-js";
import {resolveImageSrc} from "../../util/image";

function CasePreview(props) {
    const {case: caseData, onClose} = props

    function getRarityColor(price) {
        if (price < 1000) return '#A9B5D2'
        if (price < 10000) return '#4176FF'
        if (price < 50000) return '#DC5FDE'
        if (price < 250000) return '#FF5141'
        return '#1fd65f'
    }

    function getRarityLabel(price) {
        if (price < 1000) return 'Common'
        if (price < 10000) return 'Uncommon'
        if (price < 50000) return 'Rare'
        if (price < 250000) return 'Epic'
        return 'Legendary'
    }

    function coins(amount) {
        return (amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    }

    // Sort items by probability descending for the visual breakdown
    const sortedItems = () => {
        if (!caseData?.items) return []
        return caseData.items.slice().sort((a, b) => b.probability - a.probability)
    }

    // Calculate total EV
    const totalEV = () => {
        if (!caseData?.items) return 0
        return caseData.items.reduce((sum, item) => sum + item.price * (item.probability / 100), 0)
    }

    // Calculate house edge
    const houseEdge = () => {
        if (!caseData?.price || !totalEV()) return 0
        return ((caseData.price - totalEV()) / caseData.price * 100)
    }

    return (
        <>
            {/* Overlay */}
            <div class='preview-overlay' onClick={onClose}/>

            {/* Modal */}
            <div class='preview-modal'>
                {/* Header */}
                <div class='preview-header'>
                    <div class='preview-header-left'>
                        <img src={resolveImageSrc(caseData?.img, '/public/cases/radiation-case.png')} alt='' class='preview-case-img'/>
                        <div>
                            <p class='preview-case-name'>{caseData?.name || 'Case'}</p>
                            <p class='preview-case-price'>
                                <img src='/assets/icons/coin.svg' height='12' alt=''/>
                                {coins(caseData?.price)} per open
                            </p>
                        </div>
                    </div>
                    <button class='preview-close' onClick={onClose}>
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                            <path d='M18 6L6 18M6 6l12 12' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>
                        </svg>
                    </button>
                </div>

                {/* Stats row */}
                <div class='preview-stats'>
                    <div class='stat-box'>
                        <span class='stat-label'>Items</span>
                        <span class='stat-value'>{caseData?.items?.length || 0}</span>
                    </div>
                    <div class='stat-box'>
                        <span class='stat-label'>Expected Value</span>
                        <span class='stat-value'>
                            <img src='/assets/icons/coin.svg' height='11' alt=''/>
                            {coins(totalEV())}
                        </span>
                    </div>
                    <div class='stat-box'>
                        <span class='stat-label'>House Edge</span>
                        <span class='stat-value' style={`color: ${houseEdge() > 0 ? '#ff5959' : '#1fd65f'}`}>
                            {houseEdge().toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* Visual probability breakdown */}
                <div class='preview-breakdown'>
                    <p class='breakdown-title'>Drop Chance Breakdown</p>
                    <div class='breakdown-bars'>
                        <For each={sortedItems()}>
                            {(item) => (
                                <div class='breakdown-row'>
                                    <div class='breakdown-bar-track'>
                                        <div class='breakdown-bar-fill'
                                             style={`
                                                 width: ${item.probability}%;
                                                 background: ${getRarityColor(item.price)};
                                             `}/>
                                    </div>
                                    <div class='breakdown-info'>
                                        <img src={resolveImageSrc(item.img)} alt='' class='breakdown-item-img'/>
                                        <div class='breakdown-item-details'>
                                            <p class='breakdown-item-name'>{item.name}</p>
                                            <p class='breakdown-item-price'>
                                                <img src='/assets/icons/coin.svg' height='9' alt=''/>
                                                {coins(item.price)}
                                            </p>
                                        </div>
                                        <div class='breakdown-pct'>{item.probability}%</div>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>

                {/* All items grid */}
                <div class='preview-items-section'>
                    <p class='breakdown-title'>All Items</p>
                    <div class='preview-items-grid'>
                        <For each={sortedItems()}>
                            {(item) => (
                                <div class='preview-item-card' style={`--rarity-color: ${getRarityColor(item.price)}`}>
                                    <div class='preview-item-img-box'>
                                        <img src={resolveImageSrc(item.img)} alt='' class='preview-item-img'/>
                                    </div>
                                    <p class='preview-item-name'>{item.name}</p>
                                    <div class='preview-item-bottom'>
                                        <span class='preview-item-rarity'>{getRarityLabel(item.price)}</span>
                                        <span class='preview-item-chance'>{item.probability}%</span>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .preview-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9998;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.2s ease;
                }

                .preview-modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 9999;

                    width: min(90vw, 680px);
                    max-height: 85vh;
                    overflow-y: auto;

                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.065);
                    background: linear-gradient(180deg, rgba(16, 20, 26, 0.98), rgba(10, 13, 18, 0.98));
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 80px rgba(0, 0, 0, 0.65);

                    padding: 0;
                    animation: modalIn 0.25s ease;
                }

                .preview-modal::-webkit-scrollbar {
                    width: 6px;
                }

                .preview-modal::-webkit-scrollbar-track {
                    background: transparent;
                }

                .preview-modal::-webkit-scrollbar-thumb {
                    background: rgba(31, 214, 95, 0.22);
                    border-radius: 999px;
                }

                .preview-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 18px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.055);
                    position: sticky;
                    top: 0;
                    background: linear-gradient(180deg, rgba(16, 20, 26, 0.98), rgba(14, 18, 24, 0.98));
                    backdrop-filter: blur(8px);
                    z-index: 1;
                }

                .preview-header-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .preview-case-img {
                    width: 52px;
                    height: 52px;
                    object-fit: contain;
                }

                .preview-case-name {
                    color: #fff;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 16px;
                    font-weight: 700;
                }

                .preview-case-price {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #1fd65f;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    margin-top: 2px;
                }

                .preview-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(255, 255, 255, 0.04);
                    color: #8b92a0;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all .2s;
                    flex-shrink: 0;
                }

                .preview-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }

                .preview-stats {
                    display: flex;
                    gap: 8px;
                    padding: 14px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    background: rgba(31, 214, 95, 0.018);
                }

                .stat-box {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 10px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.035);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
                }

                .stat-label {
                    color: #5c6474;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .stat-value {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: #c6ccd8;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                }

                .preview-breakdown {
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                }

                .breakdown-title {
                    color: #8b92a0;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 12px;
                }

                .breakdown-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .breakdown-row {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .breakdown-bar-track {
                    width: 100%;
                    height: 6px;
                    border-radius: 99px;
                    background: rgba(31, 36, 47, 0.65);
                    overflow: hidden;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.35);
                }

                .breakdown-bar-fill {
                    height: 100%;
                    border-radius: 99px;
                    transition: width 0.4s ease;
                    min-width: 2px;
                    box-shadow: 0 0 8px currentColor;
                }

                .breakdown-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .breakdown-item-img {
                    width: 24px;
                    height: 24px;
                    object-fit: contain;
                }

                .breakdown-item-details {
                    flex: 1;
                    min-width: 0;
                }

                .breakdown-item-name {
                    color: #c6ccd8;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .breakdown-item-price {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    color: #1fd65f;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 10px;
                    font-weight: 700;
                }

                .breakdown-pct {
                    color: #8b92a0;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .preview-items-section {
                    padding: 16px 20px 20px;
                }

                .preview-items-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 8px;
                }

                .preview-item-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 8px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: border-color .2s;
                }

                .preview-item-card:hover {
                    border-color: var(--rarity-color);
                }

                .preview-item-img-box {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .preview-item-img {
                    max-width: 44px;
                    max-height: 44px;
                    object-fit: contain;
                }

                .preview-item-name {
                    color: #c6ccd8;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 10px;
                    font-weight: 600;
                    text-align: center;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 100%;
                }

                .preview-item-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    width: 100%;
                }

                .preview-item-rarity {
                    color: #5c6474;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 8px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .preview-item-chance {
                    color: var(--rarity-color);
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 9px;
                    font-weight: 700;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes modalIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }

                @media only screen and (max-width: 600px) {
                    .preview-modal {
                        width: 96vw;
                        max-height: 90vh;
                    }

                    .preview-items-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .preview-stats {
                        flex-direction: column;
                    }
                }
            `}</style>
        </>
    );
}

export default CasePreview;