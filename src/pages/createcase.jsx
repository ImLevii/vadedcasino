import {useNavigate} from "@solidjs/router";
import {createResource, createSignal, For, Show, onMount} from "solid-js";
import {authedAPI, createNotification} from "../util/api";
import {resolveImageSrc} from "../util/image";
import Loader from "../components/Loader/loader";

const COMMISSION_OPTIONS = [0.5, 1, 2, 3, 5]
const HOUSE_EDGE = 0.05
const MAX_ITEMS = 20
const PAGE_SIZE = 60

function CreateCase(props) {

    const navigate = useNavigate()

    const [name, setName] = createSignal('')
    const [imgIndex, setImgIndex] = createSignal(0)
    const [commission, setCommission] = createSignal(1)
    const [selected, setSelected] = createSignal([])
    const [creating, setCreating] = createSignal(false)

    const [search, setSearch] = createSignal('')
    const [sort, setSort] = createSignal('asc')
    const [allItems, setAllItems] = createSignal([])
    const [loadingMore, setLoadingMore] = createSignal(false)
    const [hasMore, setHasMore] = createSignal(true)
    const [totalItems, setTotalItems] = createSignal(0)
    const [showScrollTop, setShowScrollTop] = createSignal(false)

    const [images] = createResource(fetchImages)

    let itemsContainerRef

    onMount(() => {
        loadMoreItems()
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    })

    function handleScroll() {
        setShowScrollTop(window.scrollY > 600)
    }

    function scrollToTop() {
        window.scrollTo({top: 0, behavior: 'smooth'})
    }

    async function fetchImages() {
        try {
            return await authedAPI('/cases/community/images', 'GET', null)
        } catch (e) {
            console.log(e)
            return []
        }
    }

    async function loadMoreItems() {
        if (loadingMore() || !hasMore()) return
        setLoadingMore(true)

        try {
            const offset = allItems().length
            const res = await authedAPI(`/cases/community/items?search=${encodeURIComponent(search())}&sort=${sort()}&offset=${offset}`, 'GET', null)
            if (res) {
                setAllItems([...allItems(), ...(res.items || [])])
                setTotalItems(res.total || 0)
                if (!res.items || res.items.length < PAGE_SIZE) {
                    setHasMore(false)
                }
            }
        } catch (e) {
            console.log(e)
        } finally {
            setLoadingMore(false)
        }
    }

    function handleSearchInput(e) {
        setSearch(e.target.value)
        setAllItems([])
        setHasMore(true)
        loadMoreItems()
    }

    function handleSortToggle() {
        setSort(sort() === 'asc' ? 'desc' : 'asc')
        setAllItems([])
        setHasMore(true)
        loadMoreItems()
    }

    function handleItemsScroll(e) {
        const el = e.target
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
            loadMoreItems()
        }
    }

    function coins(amount) {
        return (amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    }

    function totalPct() {
        return selected().reduce((total, item) => total + (Number(item.probability) || 0), 0)
    }

    function ev() {
        return selected().reduce((total, item) => total + item.price * ((Number(item.probability) || 0) / 100), 0)
    }

    function casePrice() {
        return ev() * (1 + HOUSE_EDGE + commission() / 100)
    }

    function earnPerUnbox() {
        return casePrice() * (commission() / 100)
    }

    function isSelected(item) {
        return selected().some(e => e.id === item.id)
    }

    function toggleItem(item) {
        if (isSelected(item)) {
            setSelected(selected().filter(e => e.id !== item.id))
            return
        }

        if (selected().length >= MAX_ITEMS) return createNotification('error', `You can select up to ${MAX_ITEMS} items.`)
        setSelected([...selected(), {...item, probability: ''}])
    }

    function setProbability(id, value) {
        setSelected(selected().map(e => e.id === id ? {...e, probability: value} : e))
    }

    function handleProbabilityInput(id, e) {
        let val = e.target.value
        // Allow typing "." by handling it as a string
        if (val === '.' || val === '') {
            setProbability(id, val)
            return
        }
        // Only allow valid decimal numbers
        if (/^\d*\.?\d*$/.test(val)) {
            setProbability(id, val)
        }
    }

    function handleProbabilityBlur(id, e) {
        let val = e.target.value
        if (val === '' || val === '.') {
            setProbability(id, '')
            return
        }
        // Format to max 3 decimal places
        let num = Number(val)
        if (!isNaN(num)) {
            setProbability(id, num.toFixed(3))
        }
    }

    async function createCase() {
        if (creating()) return

        if (name().trim().length < 10) return createNotification('error', 'Case name should be at least 10 characters long.')
        if (selected().length < 2) return createNotification('error', 'Select at least 2 items.')
        if (Math.abs(totalPct() - 100) > 0.01) return createNotification('error', 'Drop chances must add up to exactly 100%.')

        setCreating(true)

        try {
            let res = await authedAPI('/cases/community/create', 'POST', JSON.stringify({
                name: name().trim(),
                img: images()?.[imgIndex()],
                commissionPct: commission(),
                items: selected().map(e => ({id: e.id, probability: Number(e.probability)}))
            }), true)

            if (res?.success) {
                createNotification('success', `Case created! Opening for ${coins(res.price)} coins.`)
                navigate(`/cases/${res.slug}`)
            }
        } finally {
            setCreating(false)
        }
    }

    return (
        <>
            <div class='create-case-container fadein'>

                <div class='header'>
                    <button class='back-btn' onClick={() => navigate('/cases/community')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="5" height="8" viewBox="0 0 5 8" fill="none">
                            <path d="M0.4976 4.00267C0.4976 3.87722 0.545618 3.75178 0.641454 3.65613L3.65872 0.646285C3.85066 0.454819 4.16185 0.454819 4.35371 0.646285C4.54556 0.837673 4.4976 1.00269 4.4976 1.33952L4.4976 4.00267L4.4976 6.50269C4.4976 7.00269 4.54547 7.16764 4.35361 7.35902C4.16175 7.55057 3.85056 7.55057 3.65863 7.35902L0.641361 4.34921C0.545509 4.25352 0.4976 4.12808 0.4976 4.00267Z" fill="currentColor"/>
                        </svg>
                    </button>
                    <h1>Create Your Own Case</h1>
                </div>

                <div class='row'>
                    <div class='panel name-panel'>
                        <p class='step-title'><span class='step'>1</span> Your Case Name</p>
                        <input type='text' placeholder='Enter a name...' value={name()} maxLength='32'
                               onInput={(e) => setName(e.target.value)}/>
                        <ul class='rules'>
                            <li>Name must not <b>have been used</b></li>
                            <li>Should be at least <b>10 characters long</b></li>
                            <li>Should not include <b>profanities/slurs</b></li>
                        </ul>
                    </div>

                    <div class='panel img-panel'>
                        <p class='step-title'><span class='step'>2</span> Select Case Image</p>
                        <div class='img-strip'>
                            <Show when={!images.loading} fallback={<Loader/>}>
                                <For each={images() || []}>
                                    {(img, index) => (
                                        <button class={'img-option ' + (imgIndex() === index() ? 'active' : '')}
                                                onClick={() => setImgIndex(index())}>
                                            <img src={resolveImageSrc(`/public/cases/${img}`)} alt='' loading='lazy'/>
                                        </button>
                                    )}
                                </For>
                            </Show>
                        </div>
                    </div>
                </div>

                <div class='row'>
                    <div class='panel items-panel'>
                        <p class='step-title'><span class='step'>3</span> Select up to {MAX_ITEMS} items</p>

                        <div class='items-controls'>
                            <input type='text' placeholder='Search for items...' value={search()}
                                   onInput={handleSearchInput}/>
                            <button class='sort-btn' onClick={handleSortToggle}>
                                Price {sort() === 'asc' ? 'Ascending' : 'Descending'}
                            </button>
                        </div>

                        <div class='items-grid scroll-items' ref={itemsContainerRef} onScroll={handleItemsScroll}>
                            <For each={allItems()}>
                                {(item) => (
                                    <button class={'item-card ' + (isSelected(item) ? 'selected' : '')}
                                            onClick={() => toggleItem(item)}>
                                        <img src={item.img} alt='' loading='lazy'/>
                                        <p class='item-type'>{item.type || 'Item'}</p>
                                        <p class='item-name'>{item.name}</p>
                                        <p class='item-price align'>
                                            <img src='/assets/icons/coin.svg' height='10' width='10' alt=''/>
                                            {coins(item.price)}
                                        </p>
                                    </button>
                                )}
                            </For>
                            <Show when={loadingMore()}>
                                <div class='scroll-loader'>
                                    <Loader/>
                                </div>
                            </Show>
                            <Show when={!hasMore() && allItems().length > 0}>
                                <p class='end-text'>Showing all {totalItems().toLocaleString()} items</p>
                            </Show>
                            <Show when={!loadingMore() && allItems().length === 0}>
                                <p class='empty-text'>No items found.</p>
                            </Show>
                        </div>
                    </div>

                    <div class='panel chances-panel'>
                        <p class='step-title'>
                            <span class='step'>4</span> Set Drop Chances
                            <span class={'total-pct ' + (Math.abs(totalPct() - 100) <= 0.01 ? 'ok' : '')}>{totalPct().toFixed(2)}%</span>
                        </p>

                        <div class='selected-list'>
                            <For each={selected()}>
                                {(item) => (
                                    <div class='selected-item'>
                                        <div class='selected-info'>
                                            <img src={item.img} alt=''/>
                                            <div>
                                                <p class='item-type'>{item.type || 'Item'}</p>
                                                <p class='item-name'>{item.name}</p>
                                                <p class='item-price align'>
                                                    <img src='/assets/icons/coin.svg' height='10' width='10' alt=''/>
                                                    {coins(item.price)}
                                                </p>
                                            </div>
                                            <button class='remove-btn' onClick={() => toggleItem(item)}>✕</button>
                                        </div>
                                        <div class='chance-row'>
                                            <div class='chance-input'>
                                                <span class='pct-icon'>%</span>
                                                <input type='text' inputmode='decimal' min='0.001' max='99.999'
                                                       value={item.probability}
                                                       placeholder='0.00'
                                                       onInput={(e) => handleProbabilityInput(item.id, e)}
                                                       onBlur={(e) => handleProbabilityBlur(item.id, e)}/>
                                            </div>
                                            <div class='chance-value align'>
                                                +&nbsp;
                                                <img src='/assets/icons/coin.svg' height='10' width='10' alt=''/>
                                                &nbsp;{coins(item.price * ((Number(item.probability) || 0) / 100))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </For>

                            <Show when={!selected().length}>
                                <p class='empty'>Pick items from the list to configure their drop chances.</p>
                            </Show>
                        </div>
                    </div>
                </div>

                <div class='finish-bar'>
                    <p class='step-title'><span class='step'>5</span> Finish Case Creation</p>

                    <div class='finish-right'>
                        <div class='price-box align'>
                            Case Price&nbsp;
                            <img src='/assets/icons/coin.svg' height='12' width='12' alt=''/>
                            &nbsp;{coins(casePrice())}
                        </div>

                        <div class='earn-box align'>
                            You earn&nbsp;
                            <select value={commission()} onChange={(e) => setCommission(Number(e.target.value))}>
                                <For each={COMMISSION_OPTIONS}>
                                    {(pct) => <option value={pct}>{pct}%</option>}
                                </For>
                            </select>
                            &nbsp;=&nbsp;
                            <img src='/assets/icons/coin.svg' height='12' width='12' alt=''/>
                            &nbsp;{coins(earnPerUnbox())} per unbox
                        </div>

                        <button class='create-btn' disabled={creating()} onClick={createCase}>
                            {creating() ? 'Creating...' : 'Create Case'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Scroll to top button */}
            <Show when={showScrollTop()}>
                <button class='scroll-top-btn' onClick={scrollToTop}>
                    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M12 20V4M12 4L6 10M12 4L18 10' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>
                    </svg>
                </button>
            </Show>

            <style jsx>{`
              .create-case-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 10px 0 40px;
                display: flex;
                flex-direction: column;
                gap: 14px;
              }

              .header {
                display: flex;
                align-items: center;
                gap: 12px;
              }

              .header h1 {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 22px;
                font-weight: 700;
              }

              .back-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 34px;
                height: 34px;
                outline: unset;
                border-radius: 5px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                color: #8b92a0;
                cursor: pointer;
                transition: all .2s;
              }

              .back-btn:hover {
                color: #FFF;
              }

              .row {
                display: flex;
                gap: 14px;
                align-items: stretch;
              }

              .panel {
                border-radius: 8px;
                background: #12151c;
                border: 1px solid #2c3340;
                padding: 16px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 12px;
              }

              .name-panel {
                width: 320px;
                min-width: 320px;
              }

              .img-panel {
                flex: 1;
                min-width: 0;
              }

              .items-panel {
                flex: 1;
                min-width: 0;
              }

              .chances-panel {
                width: 320px;
                min-width: 320px;
                max-height: 640px;
              }

              .step-title {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .step {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border-radius: 4px;
                background: rgba(31, 214, 95, 0.12);
                border: 1px solid rgba(31, 214, 95, 0.5);
                color: #1fd65f;
                font-size: 11px;
              }

              .total-pct {
                margin-left: auto;
                color: #ff5959;
                font-size: 13px;
              }

              .total-pct.ok {
                color: #1fd65f;
              }

              input[type='text'] {
                height: 38px;
                padding: 0 12px;
                outline: unset;
                border-radius: 5px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 600;
              }

              input[type='text']::placeholder {
                color: #5c6474;
              }

              .rules {
                display: flex;
                flex-direction: column;
                gap: 5px;
                padding-left: 16px;
                color: #8b92a0;
                font-size: 12px;
                font-weight: 500;
              }

              .rules b {
                color: #c6ccd8;
              }

              .img-strip {
                display: flex;
                gap: 8px;
                overflow-x: auto;
                padding-bottom: 4px;
              }

              .img-option {
                min-width: 110px;
                height: 100px;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: unset;
                border-radius: 6px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                cursor: pointer;
                transition: all .2s;
              }

              .img-option img {
                max-height: 84px;
                max-width: 96px;
                object-fit: contain;
              }

              .img-option.active {
                border-color: #1fd65f;
                box-shadow: 0 0 10px rgba(31, 214, 95, 0.25);
              }

              .items-controls {
                display: flex;
                gap: 8px;
              }

              .items-controls input {
                flex: 1;
                min-width: 0;
              }

              .sort-btn {
                height: 38px;
                padding: 0 14px;
                outline: unset;
                border-radius: 5px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                color: #8b92a0;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
              }

              .items-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 8px;
                max-height: 460px;
                overflow-y: auto;
              }

              .scroll-items {
                scroll-behavior: smooth;
              }

              .scroll-loader {
                grid-column: 1 / -1;
                display: flex;
                justify-content: center;
                padding: 16px;
              }

              .end-text {
                grid-column: 1 / -1;
                text-align: center;
                color: #5c6474;
                font-size: 12px;
                font-weight: 600;
                padding: 12px;
              }

              .empty-text {
                grid-column: 1 / -1;
                text-align: center;
                color: #5c6474;
                font-size: 12px;
                font-weight: 600;
                padding: 24px;
              }

              .item-card {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 3px;

                outline: unset;
                border-radius: 6px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 10px;
                cursor: pointer;
                text-align: left;
                transition: all .15s;
              }

              .item-card:hover {
                border-color: rgba(31, 214, 95, 0.4);
              }

              .item-card.selected {
                border-color: #1fd65f;
                background: rgba(31, 214, 95, 0.06);
              }

              .item-card img {
                height: 64px;
                max-width: 100%;
                object-fit: contain;
                align-self: center;
              }

              .item-type {
                color: #5c6474;
                font-size: 10px;
                font-weight: 600;
              }

              .item-name {
                color: #c6ccd8;
                font-size: 11px;
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
              }

              .item-price {
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 11px;
                font-weight: 700;
              }

              .align {
                display: flex;
                align-items: center;
                gap: 3px;
              }

              .selected-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                overflow-y: auto;
              }

              .selected-item {
                display: flex;
                flex-direction: column;
                gap: 8px;
                border-radius: 6px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 10px;
              }

              .selected-info {
                display: flex;
                align-items: center;
                gap: 10px;
              }

              .selected-info img {
                height: 44px;
                width: 44px;
                object-fit: contain;
              }

              .selected-info > div {
                flex: 1;
                min-width: 0;
              }

              .remove-btn {
                outline: unset;
                border: unset;
                background: transparent;
                color: #5c6474;
                font-size: 13px;
                cursor: pointer;
              }

              .remove-btn:hover {
                color: #ff5959;
              }

              .chance-row {
                display: flex;
                gap: 8px;
              }

              .chance-input {
                flex: 1;
                display: flex;
                align-items: center;

                border-radius: 5px;
                background: #12151c;
                border: 1px solid #2c3340;
                padding: 0 10px;
                height: 34px;
              }

              .pct-icon {
                color: #1fd65f;
                font-size: 12px;
                font-weight: 700;
                margin-right: 6px;
              }

              .chance-input input {
                width: 100%;
                outline: unset;
                border: unset;
                background: transparent;
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
              }

              .chance-value {
                display: flex;
                align-items: center;

                border-radius: 5px;
                background: rgba(31, 214, 95, 0.06);
                border: 1px solid rgba(31, 214, 95, 0.45);
                padding: 0 10px;
                height: 34px;
                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                white-space: nowrap;
              }

              .empty {
                color: #8b92a0;
                font-size: 12px;
                font-weight: 500;
                line-height: 1.5;
              }

              .finish-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
                flex-wrap: wrap;

                border-radius: 8px;
                background: #12151c;
                border: 1px solid #2c3340;
                padding: 14px 16px;
              }

              .finish-right {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
              }

              .price-box, .earn-box {
                height: 38px;
                padding: 0 14px;
                border-radius: 5px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                color: #c6ccd8;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
              }

              .earn-box {
                color: #1fd65f;
                border-color: rgba(31, 214, 95, 0.4);
                background: rgba(31, 214, 95, 0.05);
              }

              .earn-box select {
                outline: unset;
                border: unset;
                border-radius: 4px;
                background: #1fd65f;
                color: #04240f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 12px;
                font-weight: 700;
                padding: 3px 4px;
                cursor: pointer;
              }

              .create-btn {
                height: 38px;
                padding: 0 18px;
                outline: unset;
                border: unset;
                border-radius: 5px;
                background: #1fd65f;
                color: #04240f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all .2s;
              }

              .create-btn:hover {
                background: #45e57f;
              }

              .create-btn:disabled {
                opacity: 0.6;
                cursor: default;
              }

              /* Scroll to top button */
              .scroll-top-btn {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 9999;

                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 1px solid rgba(31, 214, 95, 0.4);
                background: rgba(18, 21, 28, 0.92);
                backdrop-filter: blur(8px);
                color: #1fd65f;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                transition: all .2s;
                animation: fadeInUp 0.3s ease;
              }

              .scroll-top-btn:hover {
                background: rgba(31, 214, 95, 0.15);
                border-color: #1fd65f;
                transform: translateY(-2px);
                box-shadow: 0 6px 24px rgba(31, 214, 95, 0.2);
              }

              @keyframes fadeInUp {
                from {
                  opacity: 0;
                  transform: translateY(12px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              @media only screen and (max-width: 1000px) {
                .row {
                  flex-direction: column;
                }

                .name-panel, .chances-panel {
                  width: 100%;
                  min-width: 0;
                }
              }
            `}</style>
        </>
    );
}

export default CreateCase;