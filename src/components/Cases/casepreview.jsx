import {For, Show} from "solid-js";
import {resolveImageSrc} from "../../util/image";
import IndicatorLine from "../IndicatorLine/indicatorline";

function CasePreview(props) {
    const {case: caseData, onClose} = props

    function getRarityColor(price) {
        if (price < 1000) return '#A9B5D2'
        if (price < 10000) return '#4176FF'
        if (price < 50000) return '#DC5FDE'
        if (price < 250000) return '#FF5141'
        return '#FFB84A'
    }

    function getRarityLabel(price) {
        if (price < 1000) return 'Consumer'
        if (price < 10000) return 'Mil-Spec'
        if (price < 50000) return 'Restricted'
        if (price < 250000) return 'Classified'
        return 'Covert'
    }

    function getExterior(name) {
        if (!name) return null
        const n = name.toLowerCase()
        if (n.includes('factory new') || n.includes('fn)')) return 'FN'
        if (n.includes('minimal wear') || n.includes('mw)')) return 'MW'
        if (n.includes('field-tested') || n.includes('field tested') || n.includes('ft)')) return 'FT'
        if (n.includes('well-worn') || n.includes('well worn') || n.includes('ww)')) return 'WW'
        if (n.includes('battle-scarred') || n.includes('battle scarred') || n.includes('bs)')) return 'BS'
        if (n.includes('souvenir')) return 'SV'
        if (n.includes('stattrak') || n.includes('stat trak')) return 'ST'
        return null
    }

    function getExteriorColor(ext) {
        if (ext === 'FN') return '#4DFFA0'
        if (ext === 'MW') return '#7AB8FF'
        if (ext === 'FT') return '#B8D4FF'
        if (ext === 'WW') return '#FF9E7A'
        if (ext === 'BS') return '#FF6B6B'
        if (ext === 'SV') return '#FFD87A'
        if (ext === 'ST') return '#FF9224'
        return '#8b92a0'
    }

    function coins(amount) {
        return (amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    }

    const sortedItems = () => {
        if (!caseData?.items) return []
        return caseData.items.slice().sort((a, b) => a.probability - b.probability)
    }

    const totalItems = () => caseData?.items?.length || 0

    const highestItem = () => {
        if (!caseData?.items?.length) return 0
        return Math.max(...caseData.items.map(i => i.price))
    }

    const lowestItem = () => {
        if (!caseData?.items?.length) return 0
        return Math.min(...caseData.items.map(i => i.price))
    }

    function getRiskLabel(items) {
        if (!items?.length) return { label: 'Unknown', color: '#8b92a0' }
        const max = Math.max(...items.map(i => i.price))
        const min = Math.min(...items.map(i => i.price))
        const ratio = max / (min || 1)
        if (ratio > 500) return { label: 'Very High', color: '#FF5141' }
        if (ratio > 100) return { label: 'High', color: '#FF9224' }
        if (ratio > 20) return { label: 'Medium', color: '#FFB84A' }
        return { label: 'Low', color: '#1fd65f' }
    }

    // Compute winning ticket ranges (1,000,000 total tickets)
    function getTicketRange(items, index) {
        const sorted = items.slice().sort((a, b) => a.probability - b.probability)
        let start = 0
        for (let i = 0; i < index; i++) {
            start += Math.round(sorted[i].probability * 10000)
        }
        const count = Math.round(sorted[index].probability * 10000)
        const end = start + count - 1
        return {
            start: start.toLocaleString(),
            end: end.toLocaleString()
        }
    }

    return (
        <>
            {/* Overlay */}
            <div class='preview-overlay' onClick={onClose}/>

            {/* Modal */}
            <div class='preview-modal'>
                {/* Header */}
                <div class='preview-header'>
                    <span class='header-title'>Case Inspection</span>
                    <button class='preview-close' onClick={onClose} aria-label='Close'>
                        <svg width='10' height='10' viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'>
                            <path d='M1 1L9 9M9 1L1 9' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'/>
                        </svg>
                    </button>
                </div>

                {/* Body: two-column */}
                <div class='preview-body'>

                    {/* Left column: case card + stats */}
                    <div class='left-col'>
                        {/* Case image card */}
                        <div class='case-card'>
                            <div class='case-img-wrap'>
                                <img
                                    src={resolveImageSrc(caseData?.img, '/public/cases/radiation-case.png')}
                                    alt=''
                                    class='case-img'
                                />
                            </div>
                            <div class='case-meta'>
                                <span class='case-rarity-label'>{getRarityLabel(caseData?.price || 0)}</span>
                                <p class='case-name'>{caseData?.name || 'Case'}</p>
                                <div class='case-price'>
                                    <img src='/assets/icons/coin.svg' height='13' alt=''/>
                                    <span>{coins(caseData?.price)}</span>
                                    <span class='hot-badge'>Hot</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div class='stats-block'>
                            <div class='stat-row'>
                                <span class='stat-key'>Risk Factor</span>
                                <span class='stat-val' style={`color: ${getRiskLabel(caseData?.items).color}`}>
                                    {getRiskLabel(caseData?.items).label}
                                </span>
                            </div>
                            <div class='stat-row'>
                                <span class='stat-key'>Number of Items</span>
                                <span class='stat-val'>{totalItems()}</span>
                            </div>
                            <div class='stat-row'>
                                <span class='stat-key'>Highest Item</span>
                                <span class='stat-val'>
                                    <img src='/assets/icons/coin.svg' height='11' alt=''/>
                                    {coins(highestItem())}
                                </span>
                            </div>
                            <div class='stat-row'>
                                <span class='stat-key'>Lowest Item</span>
                                <span class='stat-val'>
                                    <img src='/assets/icons/coin.svg' height='11' alt=''/>
                                    {coins(lowestItem())}
                                </span>
                            </div>
                        </div>

                        {/* Open button */}
                        <button class='open-case-btn' onClick={onClose}>
                            Open Case Individually
                        </button>
                    </div>

                    {/* Right column: item list */}
                    <div class='right-col'>
                        <For each={sortedItems()}>
                            {(item, index) => {
                                const ext = getExterior(item.name)
                                const rarityColor = getRarityColor(item.price)
                                const rarityLabel = getRarityLabel(item.price)
                                const range = getTicketRange(caseData?.items || [], index())

                                return (
                                    <div class='item-card' style={`--rc: ${rarityColor}`}>
                                        {/* Image box */}
                                        <div class='item-thumb'>
                                            <img
                                                src={resolveImageSrc(item.img)}
                                                alt=''
                                                class='item-img'
                                            />
                                            <IndicatorLine
                                                orientation='horizontal'
                                                length='65%'
                                                thickness='3px'
                                                color={rarityColor}
                                                pulse={false}
                                                style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)' }}
                                            />
                                        </div>

                                        {/* Details */}
                                        <div class='item-details'>
                                            <div class='item-top'>
                                                {ext && (
                                                    <span class='ext-badge' style={`color: ${getExteriorColor(ext)}`}>{ext}</span>
                                                )}
                                                <span class='rarity-label' style={`color: ${rarityColor}`}>{rarityLabel}</span>
                                                <svg class='star-icon' width='14' height='14' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                                    <path d='M12 2L14.4 9.2H22L16 13.6L18.4 20.8L12 16.4L5.6 20.8L8 13.6L2 9.2H9.6L12 2Z' stroke='currentColor' stroke-width='1.8' stroke-linejoin='round'/>
                                                </svg>
                                            </div>
                                            <p class='item-name'>{item.name}</p>
                                            <div class='item-price'>
                                                <img src='/assets/icons/coin.svg' height='12' alt=''/>
                                                <span>{coins(item.price)}</span>
                                            </div>
                                            {/* Chance bar */}
                                            <div class='chance-row'>
                                                <div class='chance-track'>
                                                    <div
                                                        class='chance-fill'
                                                        style={`width: ${Math.min(100, item.probability)}%; background: ${rarityColor}`}
                                                    />
                                                </div>
                                                <span class='chance-pct'>{item.probability}%</span>
                                            </div>
                                            <p class='ticket-range'>
                                                Winning Tickets {range.start} - {range.end}
                                            </p>
                                        </div>
                                    </div>
                                )
                            }}
                        </For>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .preview-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9998;
                    background: rgba(0, 0, 0, 0.72);
                    backdrop-filter: blur(5px);
                    animation: fadeIn 0.2s ease;
                }

                .preview-modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 9999;

                    width: min(92vw, 660px);
                    max-height: 88vh;
                    overflow: hidden;

                    border-radius: 14px;
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    background: #191f2a;
                    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.7);

                    display: flex;
                    flex-direction: column;
                    animation: modalIn 0.22s ease;
                }

                /* Header */
                .preview-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.065);
                    background: #1e2533;
                    flex-shrink: 0;
                }

                .header-title {
                    color: #fff;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 15px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                }

                .preview-close {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    background: rgba(255, 255, 255, 0.06);
                    color: #8b92a0;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all .2s;
                }

                .preview-close:hover {
                    background: rgba(255, 255, 255, 0.14);
                    color: #fff;
                    border-color: rgba(255, 255, 255, 0.2);
                }

                /* Body */
                .preview-body {
                    display: flex;
                    gap: 0;
                    overflow: hidden;
                    flex: 1;
                    min-height: 0;
                }

                /* Left column */
                .left-col {
                    width: 220px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    border-right: 1px solid rgba(255, 255, 255, 0.06);
                    background: #161c26;
                    overflow-y: auto;
                    scrollbar-width: none;
                }

                .left-col::-webkit-scrollbar { display: none; }

                .case-card {
                    padding: 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.055);
                }

                .case-img-wrap {
                    width: 100%;
                    aspect-ratio: 1;
                    max-height: 160px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    background: linear-gradient(135deg, rgba(30, 36, 50, 0.8), rgba(14, 18, 26, 0.9));
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    margin-bottom: 12px;
                    overflow: hidden;
                }

                .case-img {
                    width: 80%;
                    height: 80%;
                    object-fit: contain;
                    filter: drop-shadow(0 8px 18px rgba(0,0,0,0.5));
                }

                .case-meta {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .case-rarity-label {
                    color: #8b92a0;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .case-name {
                    color: #fff;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 13px;
                    font-weight: 800;
                    line-height: 1.3;
                }

                .case-price {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-top: 4px;
                    color: #1fd65f;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 13px;
                    font-weight: 700;
                }

                .hot-badge {
                    margin-left: 4px;
                    padding: 2px 7px;
                    border-radius: 4px;
                    background: #c0392b;
                    color: #fff;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.4px;
                    text-transform: uppercase;
                }

                .stats-block {
                    padding: 14px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 9px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.055);
                }

                .stat-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .stat-key {
                    color: #6b7280;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 10px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .stat-val {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: #c6ccd8;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 11px;
                    font-weight: 700;
                }

                .open-case-btn {
                    margin: 14px 16px;
                    height: 36px;
                    border-radius: 7px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(255, 255, 255, 0.04);
                    color: #c6ccd8;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all .2s;
                }

                .open-case-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.18);
                    color: #fff;
                }

                /* Right column: item list */
                .right-col {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(31, 214, 95, 0.2) transparent;
                }

                .right-col::-webkit-scrollbar { width: 4px; }
                .right-col::-webkit-scrollbar-track { background: transparent; }
                .right-col::-webkit-scrollbar-thumb {
                    background: rgba(31, 214, 95, 0.2);
                    border-radius: 99px;
                }

                /* Item card */
                .item-card {
                    display: flex;
                    gap: 10px;
                    padding: 9px 10px;
                    border-radius: 9px;
                    border: 1px solid rgba(255, 255, 255, 0.055);
                    background: linear-gradient(135deg, rgba(20, 25, 35, 0.9), rgba(14, 18, 26, 0.95));
                    transition: border-color .2s, box-shadow .2s;
                }

                .item-card:hover {
                    border-color: color-mix(in srgb, var(--rc) 35%, transparent);
                    box-shadow: 0 0 16px -4px color-mix(in srgb, var(--rc) 20%, transparent);
                }

                /* Thumb with indicator */
                .item-thumb {
                    position: relative;
                    flex-shrink: 0;
                    width: 72px;
                    height: 72px;
                    border-radius: 7px;
                    background:
                        radial-gradient(70% 55% at 50% 100%, color-mix(in srgb, var(--rc) 18%, transparent), transparent 70%),
                        rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .item-img {
                    width: 58px;
                    height: 58px;
                    object-fit: contain;
                    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
                }

                /* Details */
                .item-details {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .item-top {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .ext-badge {
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    text-shadow: 0 0 8px currentColor;
                }

                .rarity-label {
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 10px;
                    font-weight: 700;
                }

                .star-icon {
                    margin-left: auto;
                    color: #3a4150;
                    flex-shrink: 0;
                    cursor: pointer;
                    transition: color .2s;
                }

                .item-card:hover .star-icon {
                    color: #8b92a0;
                }

                .item-name {
                    color: #d0d7e4;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .item-price {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #1fd65f;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                }

                .chance-row {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 2px;
                }

                .chance-track {
                    flex: 1;
                    height: 4px;
                    border-radius: 99px;
                    background: rgba(255,255,255,0.07);
                    overflow: hidden;
                }

                .chance-fill {
                    height: 100%;
                    border-radius: 99px;
                    min-width: 2px;
                    opacity: 0.85;
                    transition: width 0.4s ease;
                }

                .chance-pct {
                    color: #6b7280;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 9px;
                    font-weight: 700;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .ticket-range {
                    color: #4a5263;
                    font-family: 'Geogrotesque Wide', sans-serif;
                    font-size: 9px;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes modalIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }

                @media only screen and (max-width: 600px) {
                    .preview-modal {
                        width: 96vw;
                        max-height: 92vh;
                    }

                    .preview-body {
                        flex-direction: column;
                    }

                    .left-col {
                        width: 100%;
                        border-right: none;
                        border-bottom: 1px solid rgba(255,255,255,0.06);
                    }
                }
            `}</style>
        </>
    );
}

export default CasePreview;
