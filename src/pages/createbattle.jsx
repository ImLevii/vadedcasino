import {useNavigate} from "@solidjs/router";
import {resolveImageSrc} from "../util/image";
import CasePreview from "../components/Cases/casepreview";
import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {authedAPI} from "../util/api";

import {Portal} from "solid-js/web";
import {Title} from "@solidjs/meta";

function OptionIcon(props) {
    return <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' aria-hidden='true'>
        {props.kind==='swords'?<><path d='m3 3 5 1 12 13-3 3L4 8ZM21 3l-5 1-4 5m-3 3-5 5 3 3 4-4M2 22l4-4m12 0 4 4M3 15l6 6m6-18 6 6'/></>:props.kind==='case'?<><rect x='3' y='7' width='18' height='14' rx='2'/><path d='M8 7V3h8v4M3 12h18m-12-2v5m6-5v5'/></>:props.kind==='bot'?<><rect x='4' y='8' width='16' height='12' rx='2'/><path d='M12 8V3M9 3h6M8 13v3m8-3v3M1 12v5m22-5v5'/></>:props.kind==='private'?<><rect x='5' y='10' width='14' height='11' rx='2'/><path d='M8 10V7a4 4 0 018 0v3m-4 5v3'/></>:<><circle cx='12' cy='12' r='4'/><path d='M12 1v4m0 14v4M1 12h4m14 0h4M4 4l3 3m10 10 3 3M4 20l3-3M17 7l3-3'/></>}
    </svg>
}

function CreateBattle(props) {

    const navigate = useNavigate()
    const [players, setPlayers] = createSignal('1v1')
    const [gamemode, setGamemode] = createSignal('standard')
    const [isPrivate, setIsPrivate] = createSignal(false)
    const [cosmicSpin, setCosmicSpin] = createSignal(false)
    const [minLevel, setMinLevel] = createSignal(0, {equals: false})
    const [discount, setDiscount] = createSignal(0)

    const [addedCases, setAddedCases] = createSignal([])
    const [groupedCases, setGroupedCases] = createSignal([])
    const [total, setTotal] = createSignal(0)


    const [cases, {mutate}] = createResource(fetchCases)
    async function fetchCases() {
        try {
            let [official, community] = await Promise.all([
                authedAPI('/cases', 'GET', null),
                authedAPI('/cases/community', 'GET', null)
            ])

            let communityCases = (community?.cases || []).map(c => ({...c, community: true}))
            return mutate([...(Array.isArray(official) ? official : []), ...communityCases])
        } catch (e) {
            console.log(e)
            return mutate([])
        }
    }

    function parseNumber(num, setFunction) {
        if (typeof num !== 'number' || isNaN(num)) return setFunction(0)
        if (num >= 100) return setFunction(100)
        if (num <= 0) return setFunction(0)
        setFunction(num)
    }

    function addCase(caseToAdd, num) {
        if (num > 0 && addedCases().length >= 50) return
        if (num < 0) {
            let index = addedCases().findIndex(c => c.id === caseToAdd.id)
            if (index < 0) return

            setAddedCases([...addedCases().slice(0, index), ...addedCases().slice(index + 1)])
            setTotal(addedCases()?.reduce((pv, c) => pv + Number(c.price), 0))
            return setGroupedCases(groupByIdAndSumAmount(addedCases()))
        }
        setAddedCases([...addedCases(), caseToAdd])
        setTotal(addedCases()?.reduce((pv, c) => pv + Number(c.price), 0))
        return setGroupedCases(groupByIdAndSumAmount(addedCases()))
    }

    function groupByIdAndSumAmount(objects) {
        const groupedObjects = {}
        const orderOfIds = []

        objects.forEach(obj => {
            if (!groupedObjects[obj.id]) {
                groupedObjects[obj.id] = { ...obj, amount: 1 }
                orderOfIds.push(obj.id)
            } else {
                groupedObjects[obj.id].amount += 1
            }
        });

        return orderOfIds.map(id => groupedObjects[id])
    }

    function getAmount(id) {
        return groupedCases()?.find(c => c.id === id)?.amount || 0
    }

    function numberOfTeams() {
        if (players() === '2v2') { return 2 }
        if (players() === '1v1v1v1') { return 4 }
        if (players() === '1v1v1') { return 3 }
        if (players() === '1v1') { return 2 }
    }

    function getPlayersPerTeam() {
        if (players() === '2v2') { return 2 }
        return 1
    }

    function changePlayers(newPlayers) {
        if (newPlayers === '2v2' && gamemode() === 'group') setGamemode('standard')
        setPlayers(newPlayers)
    }

    function changeGamemode(newGamemode) {
        if (newGamemode === 'group' && players() === '2v2') return
        setGamemode(newGamemode)
    }

    function entryPrice() {
        return total() - (total() * (discount() / 100))
    }

    function realCost() {
        let fundingAmount = total() * (discount() / 100) * ((numberOfTeams() * getPlayersPerTeam()) - 1)
        return total() + fundingAmount

    }


    const [search, setSearch] = createSignal('')
    const [category, setCategory] = createSignal('official')
    const [priceLimit, setPriceLimit] = createSignal('all')
    const [catalogOrder, setCatalogOrder] = createSignal('featured')
    const [openingOrder, setOpeningOrder] = createSignal('low')
    const [playBots, setPlayBots] = createSignal(false)
    const [creating, setCreating] = createSignal(false)
    const [preview, setPreview] = createSignal(null)
    const [previewLoading, setPreviewLoading] = createSignal(null)
    async function inspectCase(c) {
        if (previewLoading()) return
        if (c.items?.length) return setPreview(c)
        if (!c.slug) return
        setPreviewLoading(c.id)
        try {
            const result = await authedAPI(`/cases/${encodeURIComponent(c.slug)}`, 'GET', null, true)
            if (result && !result.error) setPreview(result)
        } finally { setPreviewLoading(null) }
    }
    function loadFavorites() {
        try { const saved=JSON.parse(localStorage.getItem('battle-favorite-cases')||'[]'); return Array.isArray(saved)?saved:[] } catch { return [] }
    }
    const [favorites, setFavorites] = createSignal(loadFavorites())
    function toggleFavorite(id) {
        const next=favorites().includes(id)?favorites().filter(item=>item!==id):[...favorites(),id]
        setFavorites(next)
        try { localStorage.setItem('battle-favorite-cases',JSON.stringify(next)) } catch {}
    }
    function catalog() {
        let list=(cases()||[]).filter(c=>(category()==='all'||category()==='favorites'&&favorites().includes(c.id)||category()==='official'&&!c.community||category()==='community'&&c.community)
            &&(priceLimit()==='all'||Number(c.price)<=Number(priceLimit()))
            &&String(c.name||'').toLowerCase().includes(search().toLowerCase()))
        if(catalogOrder()==='low') list.sort((a,b)=>Number(a.price)-Number(b.price))
        if(catalogOrder()==='high') list.sort((a,b)=>Number(b.price)-Number(a.price))
        return list
    }
    function orderedIds() {
        const selected=[...addedCases()]
        if(openingOrder()!=='selected') selected.sort((a,b)=>openingOrder()==='low'?Number(a.price)-Number(b.price):Number(b.price)-Number(a.price))
        return selected.map(c=>c.id)
    }
    async function createBattle() {
        if(creating()||!addedCases().length) return
        setCreating(true)
        try {
            let teams=numberOfTeams(), playersPerTeam=getPlayersPerTeam()
            if(gamemode()==='group') { playersPerTeam=teams; teams=1 }
            const result=await authedAPI('/battles/create','POST',JSON.stringify({cases:orderedIds(),teams,playersPerTeam,gamemode:gamemode(),funding:discount(),minLvl:minLevel(),isPrivate:isPrivate(),cosmicSpin:cosmicSpin()}),true,30000)
            if(!result?.success) return
            if(playBots()) {
                for(let slot=2;slot<=teams*playersPerTeam;slot++) {
                    const bot=await authedAPI(`/battles/${result.battleId}/bot`,'POST',JSON.stringify({slot,privKey:result.privKey}),true)
                    if(!bot?.success) break
                    if(slot<teams*playersPerTeam) await new Promise(resolve=>setTimeout(resolve,350))
                }
            }
            navigate(`/battle/${result.battleId}${result.privKey?`?pk=${encodeURIComponent(result.privKey)}`:''}`)
        } finally { setCreating(false) }
    }
    const [pickerOpen,setPickerOpen]=createSignal(false)
    let picker, selectionBefore=[]
    const modes=[
        {id:'standard',name:'Normal Mode',description:'Unbox the most to win',icon:'swords'},
        {id:'group',name:'Group Mode',description:'Play together in one team',icon:'bot'},
        {id:'crazy',name:'Crazy Mode',description:'The lowest total wins',icon:'spin'},
        {id:'casual',name:'Case Mode',description:'A case battle with friends',icon:'case'}
    ]
    function replaceSelection(next) {
        setAddedCases(next);setGroupedCases(groupByIdAndSumAmount(next));setTotal(next.reduce((sum,c)=>sum+Number(c.price),0))
    }
    function openPicker() { selectionBefore=[...addedCases()];setPickerOpen(true) }
    function closePicker(confirm=false) { if(!confirm)replaceSelection(selectionBefore);setPickerOpen(false) }
    function removeCase(c) { replaceSelection(addedCases().filter(item=>item.id!==c.id)) }
    function addRandomCase() { const list=catalog();if(list.length)addCase(list[Math.floor(Math.random()*list.length)],1) }
    createEffect(()=>{
        if(!pickerOpen())return
        const previousFocus=document.activeElement, overflow=document.body.style.overflow
        document.body.style.overflow='hidden'
        queueMicrotask(()=>picker?.querySelector('input')?.focus())
        const keydown=e=>{
            if(preview())return
            if(e.key==='Escape'){e.preventDefault();closePicker()}
            if(e.key==='Tab'){
                const controls=[...picker.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')]
                const first=controls[0],last=controls[controls.length-1]
                if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
                else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
            }
        }
        document.addEventListener('keydown',keydown)
        onCleanup(()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);previousFocus?.focus()})
    })
    function price(value) { return Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) }
    function coin(value) { return <span class='coin-value'><img src='/assets/icons/coin.svg' width='15' height='15' alt=''/>{price(value)}</span> }
    function quantity(c) { return <div class='quantity'><button aria-label={`Remove one ${c.name}`} disabled={!getAmount(c.id)} onClick={()=>addCase(c,-1)}>&minus;</button><strong>x{getAmount(c.id)}</strong><button aria-label={`Add one ${c.name}`} disabled={addedCases().length>=50} onClick={()=>addCase(c,1)}>+</button></div> }
    function renderCard(c,selected=false) {
        return <article class='case-card' classList={{selected:getAmount(c.id)>0}}>
            <Show when={getAmount(c.id)>0}><button class='remove-case icon-button' aria-label={`Remove all ${c.name}`} onClick={()=>removeCase(c)}><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7'/></svg></button></Show>
            <button class='inspect-case icon-button' aria-label={`Inspect ${c.name}`} disabled={previewLoading()===c.id} onClick={()=>inspectCase(c)}><svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='10' cy='10' r='6'/><path d='m15 15 6 6'/></svg></button>
            <button class='case-art' aria-label={`Preview ${c.name}`} onClick={()=>inspectCase(c)}><img src={resolveImageSrc(c.img,'/assets/art/testcase.png')} alt={c.name} loading='lazy'/></button>
            <strong class='case-name'>{c.name}</strong>
            <span class='price-badge'>{coin(c.price)}</span>
            <Show when={!selected}><button class='favorite' classList={{active:favorites().includes(c.id)}} aria-label={`Favorite ${c.name}`} aria-pressed={favorites().includes(c.id)} onClick={()=>toggleFavorite(c.id)}>{favorites().includes(c.id)?'Saved to favorites':'Save to favorites'}</button></Show>
            <div class='case-accent'/>
            <Show when={getAmount(c.id)>0} fallback={<button class='primary add-case' disabled={addedCases().length>=50} onClick={()=>addCase(c,1)}>Add case</button>}>{quantity(c)}</Show>
        </article>
    }
    return <>
        <Title>Cosmic Luck | Create a Battle</Title>
        <Show when={preview()}><CasePreview case={preview()} onClose={()=>setPreview(null)}/></Show>
        <div class='create-battle-container'>
            <div class='builder-toolbar'>
                <button class='secondary exit' onClick={()=>navigate('/battles')}>&lsaquo; Exit</button>
                <div class='builder-options'>
                    <button class='secondary toggle' classList={{enabled:cosmicSpin()}} aria-pressed={cosmicSpin()} onClick={()=>setCosmicSpin(!cosmicSpin())}><OptionIcon kind='spin'/>Cosmic Spin<span class='switch'/></button>
                    <button class='secondary toggle' classList={{enabled:playBots()}} aria-pressed={playBots()} onClick={()=>setPlayBots(!playBots())}><OptionIcon kind='bot'/>Play Bots<span class='switch'/></button>
                    <button class='secondary toggle' classList={{enabled:isPrivate()}} aria-pressed={isPrivate()} onClick={()=>setIsPrivate(!isPrivate())}><OptionIcon kind='private'/>Private<span class='switch'/></button>
                </div>
            </div>
            <div class='mode-grid'><For each={modes}>{mode=><button class='mode-card' classList={{active:gamemode()===mode.id}} aria-pressed={gamemode()===mode.id} disabled={mode.id==='group'&&players()==='2v2'} onClick={()=>changeGamemode(mode.id)}><OptionIcon kind={mode.icon}/><strong>{mode.name}</strong><span>{mode.description}</span></button>}</For></div>
            <section class='selected-grid' aria-label='Selected cases'>
                <button class='add-cases-tile' onClick={openPicker}><span class='plus'>+</span><strong>Add cases</strong><span>Build your next battle</span></button>
                <For each={groupedCases()}>{c=>renderCard(c,true)}</For>
                <For each={Array.from({length:Math.max(0,5-groupedCases().length)})}>{()=> <div class='empty-slot' aria-hidden='true'><OptionIcon kind='case'/></div>}</For>
            </section>
            <div class='battle-setup'>
                <div><span class='field-label'>Players</span><div class='segmented'><For each={[['1v1','1v1'],['1v1v1','3-way'],['1v1v1v1','4-way']]}>{([value,label])=><button classList={{active:players()===value}} aria-pressed={players()===value} onClick={()=>changePlayers(value)}>{label}</button>}</For></div></div>
                <div><span class='field-label'>Teams</span><div class='segmented'><button classList={{active:players()==='2v2'}} aria-pressed={players()==='2v2'} disabled={gamemode()==='group'} onClick={()=>changePlayers('2v2')}>2v2</button></div></div>
                <label>Opening order<select value={openingOrder()} onChange={e=>setOpeningOrder(e.currentTarget.value)}><option value='low'>Lowest price first</option><option value='high'>Highest price first</option><option value='selected'>Selected order</option></select></label>
                <details class='settings'><summary class='secondary'>Battle settings</summary><div class='advanced'><label>Minimum level<input type='number' min='0' max='100' value={minLevel()} onInput={e=>parseNumber(Math.round(e.currentTarget.valueAsNumber),setMinLevel)}/></label><label>Owner funding %<input type='number' min='0' max='100' value={discount()} onInput={e=>parseNumber(Math.round(e.currentTarget.valueAsNumber),setDiscount)}/></label><span>Other players pay {price(entryPrice())}</span></div></details>
            </div>
            <div class='creation-summary'><span><strong>{addedCases().length}</strong> / 50 rounds</span><span class='summary-total'>{coin(realCost())}</span><button class='primary create-button' disabled={!addedCases().length||creating()} onClick={createBattle}><OptionIcon kind='swords'/>{creating()?'Creating...':'Create Battle'}</button></div>
        </div>
        <Show when={pickerOpen()}><Portal>
            <div class='picker-backdrop' onClick={e=>{if(e.target===e.currentTarget)closePicker()}}>
                <section class='case-picker' ref={picker} role='dialog' aria-modal='true' aria-labelledby='picker-title'>
                    <header class='picker-header'><h2 id='picker-title'>Select cases</h2><span class='selected-price'>{coin(total())}</span><button class='icon-button close-picker' aria-label='Close case selection' onClick={()=>closePicker()}>&times;</button></header>
                    <div class='picker-filters'>
                        <div class='catalog-search input-shell'><img src='/assets/icons/search.svg' width='16' alt=''/><input type='search' aria-label='Search cases' placeholder='Search for cases' value={search()} onInput={e=>setSearch(e.currentTarget.value)}/></div>
                        <select aria-label='Sort cases' value={catalogOrder()} onChange={e=>setCatalogOrder(e.currentTarget.value)}><option value='featured'>Featured</option><option value='low'>Price: low to high</option><option value='high'>Price: high to low</option></select>
                        <select aria-label='Case price limit' value={priceLimit()} onChange={e=>setPriceLimit(e.currentTarget.value)}><option value='all'>All prices</option><option value='1'>Up to 1</option><option value='10'>Up to 10</option><option value='100'>Up to 100</option></select>
                    </div>
                    <nav class='catalog-tabs' aria-label='Case categories'><For each={[['official','Official'],['community','Community'],['favorites','Favorites'],['all','All cases']]}>{([value,label])=><button classList={{active:category()===value}} aria-pressed={category()===value} onClick={()=>setCategory(value)}>{label}</button>}</For></nav>
                    <div class='picker-scroll'><Show when={!cases.loading} fallback={<p class='empty'>Loading cases...</p>}><div class='catalog-grid'>
                        <Show when={catalog().length}><article class='case-card random-card'><span class='random-symbol'>?</span><strong class='case-name'>Random case</strong><p>Add a random case from<br/>your current filters</p><button class='primary add-case' disabled={addedCases().length>=50} onClick={addRandomCase}>Add case</button></article></Show>
                        <For each={catalog()}>{c=>renderCard(c)}</For>
                    </div><Show when={!catalog().length}><p class='empty'>No cases available for these filters.</p></Show></Show></div>
                    <footer class='picker-footer'><span>{addedCases().length} Rounds</span><span>{coin(total())}</span><button class='primary' onClick={()=>closePicker(true)}>Confirm selection</button></footer>
                </section>
            </div>
        </Portal></Show>
        <style jsx>{`
            .create-battle-container { width:100%; max-width:1600px; margin:auto; padding:8px 0 60px; color:#969dab; }
            button,input,select { font:inherit; } button { cursor:pointer; } button:disabled { opacity:.4; cursor:not-allowed; }
            button:focus-visible,summary:focus-visible { outline:2px solid #1fd65f; outline-offset:3px; }
            .builder-toolbar,.builder-options { display:flex; align-items:center; gap:12px; } .builder-toolbar { justify-content:space-between; margin-bottom:18px; } .builder-options { flex-wrap:wrap; }
            .secondary { display:flex; align-items:center; justify-content:center; gap:9px; height:38px; padding:0 14px; border:1px solid #282e37; border-radius:5px; background:#20242d; color:#a3aaba; font-size:13px; font-weight:600; cursor:pointer; }
            .toggle.enabled { color:#e9fff0; background:#163423; border-color:#238b42; } .switch { width:28px; height:16px; border-radius:20px; background:#12171d; padding:2px; } .switch:after { content:''; display:block; width:12px; height:12px; border-radius:50%; background:#87919f; transition:transform .2s; } .enabled .switch:after { background:#1fd65f; transform:translateX(12px); }
            .mode-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:18px; } .mode-card { min-height:125px; padding:18px 10px; border:2px solid #252a32; border-radius:8px; background:#15191f; color:#929baa; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; } .mode-card strong { font-size:15px; color:#d5dbe4; } .mode-card span { font-size:12px; } .mode-card.active { border-color:#1fd65f; background:radial-gradient(ellipse at top,#1d3526,#14191f 80%); color:#1fd65f; } .mode-card.active strong { color:#f0fff5; }
            .selected-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:8px; margin-bottom:20px; } .add-cases-tile,.empty-slot { min-height:290px; border:2px solid #242b32; background:#11151b; border-radius:7px; } .add-cases-tile { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:14px; border-bottom-color:#1fd65f; color:#f1f7f3; background:radial-gradient(ellipse at top,#1d2822,#11151b 80%); } .add-cases-tile>span:last-child { font-size:11px; color:#87988d; } .plus { width:54px; height:54px; border:1px solid #25894a; background:#1fd65f0a; display:grid; place-items:center; border-radius:50%; font-size:32px; font-weight:400; } .empty-slot { display:grid; place-items:center; color:#1e242c; } .empty-slot :global(svg) { width:65px; height:65px; }
            .case-card { position:relative; min-width:0; display:flex; align-items:center; flex-direction:column; padding:12px; background:radial-gradient(ellipse at top,#272d2b 0%,#181c23 60%); border:1px solid #262c33; border-radius:6px; overflow:hidden; } .selected-grid .case-card { border-bottom:2px solid #1fd65f; } .case-card.selected { background:radial-gradient(ellipse at top,#23382b,#181c23 65%); }
            .icon-button { display:grid; place-items:center; width:34px; height:34px; border:0; border-radius:5px; background:#2b313d; color:#a7b0bf; } .inspect-case,.remove-case { position:absolute; top:8px; z-index:1; } .inspect-case { right:8px; } .remove-case { left:8px; }
            .case-art { width:100%; height:155px; padding:12px 4px; background:none; border:0; } .case-art img { width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 10px 14px #0006); transition:transform .2s; } .case-art:hover img { transform:translateY(-4px) scale(1.04); } .case-name { display:block; width:100%; text-align:center; color:#f3f6fb; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:8px 0; } .price-badge { display:inline-flex; padding:8px; border-radius:4px; background:#22272f; }
            .coin-value { display:inline-flex; align-items:center; justify-content:center; gap:4px; font-size:13px; font-weight:700; color:#f4fff8; white-space:nowrap; } .favorite { background:none; border:0; color:#7f8997; font-size:10px; padding:9px 0 0; } .favorite.active { color:#1fd65f; } .case-accent { height:3px; width:100%; background:linear-gradient(90deg,#125c31,#1fd65f,#7af0a3); border-radius:4px; margin:12px 0; opacity:.65; }
            .quantity { display:flex; align-items:center; justify-content:space-between; height:40px; width:100%; margin-top:auto; background:#10151b; border-radius:4px; overflow:hidden; } .quantity button { height:100%; width:40px; border:0; color:#b0b8c4; background:#242a33; font-size:18px; } .quantity strong { color:#f4fff8; font-size:13px; }
            .primary { display:flex; align-items:center; justify-content:center; gap:8px; height:41px; padding:0 18px; background:#1fd65f; color:#05190d; border:1px solid #25e16a; border-radius:5px; font-weight:700; font-size:13px; } .primary:hover:not(:disabled) { background:#39e779; } .add-case { width:100%; margin-top:auto; }
            .battle-setup { display:flex; flex-wrap:wrap; align-items:flex-end; gap:24px; margin:20px 0; } .field-label,label { font-size:12px; font-weight:600; color:#919bab; } .field-label { display:block; margin-bottom:10px; } label { display:flex; flex-direction:column; gap:8px; } .segmented { display:flex; gap:2px; } .segmented button { height:40px; background:#222731; color:#939dad; border:0; padding:0 18px; border-radius:3px; font-weight:700; } .segmented button.active { background:#1c3f29; color:#65ef93; }
            select { min-height:40px; padding:0 14px; border:1px solid #2a3039; background:#191e26; color:#d6dce5; border-radius:5px; font-size:12px; } .settings { position:relative; margin-left:auto; } .advanced { position:absolute; bottom:48px; right:0; width:270px; padding:18px; background:#20262f; border:1px solid #39424c; box-shadow:0 12px 35px #0008; border-radius:6px; z-index:4; display:grid; gap:14px; font-size:12px; } .advanced input { background:#13191f; border:1px solid #39424c; color:#fff; padding:10px; width:100%; }
            .creation-summary { display:flex; align-items:center; gap:12px; padding:16px 0; border-top:1px solid #242d31; font-size:13px; } .summary-total { margin-left:auto; background:#202730; padding:12px; border-radius:4px; }
            .picker-backdrop { position:fixed; inset:0; z-index:1500; background:#03070cd9; backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:20px; } .case-picker { width:min(960px,100%); max-height:92vh; max-height:92dvh; display:flex; flex-direction:column; min-height:0; background:#14181e; border:1px solid #303740; border-radius:10px; box-shadow:0 24px 100px #0009; overflow:hidden; color:#a3adba; }
            .picker-header { display:flex; align-items:center; gap:20px; padding:16px 20px; background:#1a1f27; } h2 { margin:0; color:#f3f6fb; font-size:20px; } .selected-price { margin-left:auto; padding:10px; border:1px solid #1fd65f; border-radius:4px; } .close-picker { font-size:26px; height:40px; width:40px; }
            .picker-filters { display:flex; gap:12px; padding:20px 18px 12px; } .catalog-search { display:flex; align-items:center; gap:10px; flex:1; min-width:0; background:#0e1319; border:1px solid #2b3139; padding:0 12px; border-radius:6px; } .catalog-search input { min-width:0; width:100%; height:40px; background:transparent; color:#e7eff6; border:0; font-size:13px; outline:none; }
            .catalog-tabs { display:flex; gap:5px; margin:0 18px 18px; padding:5px; border-radius:5px; background:#20252e; align-self:center; } .catalog-tabs button { border:0; border-radius:4px; padding:8px 16px; background:none; color:#a4aebe; font-size:13px; font-weight:600; } .catalog-tabs button.active { background:#254231; color:#65ef93; }
            .picker-scroll { overflow-y:auto; min-height:0; padding:0 18px 18px; overscroll-behavior:contain; scrollbar-color:#34543f #15191f; } .catalog-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:2px; } .catalog-grid .case-card { border-radius:0; border-color:#14181e; min-height:300px; } .random-symbol { display:grid; place-items:center; height:155px; color:#e3ffec; text-shadow:0 0 28px #1fd65f; font-size:90px; font-weight:800; } .random-card p { margin:0 0 18px; text-align:center; font-size:12px; line-height:1.5; }
            .picker-footer { display:flex; align-items:center; gap:12px; padding:16px 18px; background:#1b2028; box-shadow:0 -10px 24px #10141a; } .picker-footer>span { padding:12px 10px; background:#252b34; border-radius:4px; color:#e4eee8; white-space:nowrap; font-size:13px; font-weight:700; } .picker-footer .primary { flex:1; } .empty { text-align:center; padding:70px 15px; font-size:13px; }
            @media(max-width:1200px) { .selected-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
            @media(max-width:700px) { .builder-toolbar { align-items:flex-start; } .builder-options { justify-content:flex-end; gap:6px; } .secondary { font-size:11px; padding:0 9px; } .toggle :global(svg) { display:none; } .mode-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; } .mode-card { min-height:110px; } .mode-card span { font-size:10px; } .selected-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .empty-slot { display:none; } .selected-grid .case-card,.add-cases-tile { min-height:280px; } .battle-setup { gap:16px; } .settings { margin-left:0; } .advanced { right:auto; left:0; } .creation-summary { flex-wrap:wrap; } .create-button { flex:1; }
                .picker-backdrop { padding:8px; } .case-picker { max-height:96dvh; } .picker-header { padding:12px; gap:10px; } h2 { font-size:17px; } .picker-filters { flex-wrap:wrap; padding:12px; gap:8px; } .catalog-search { flex-basis:100%; } .picker-filters select { flex:1; min-width:0; padding:0 6px; } .catalog-tabs { width:calc(100% - 24px); margin:0 12px 12px; gap:0; } .catalog-tabs button { flex:1; padding:8px 4px; font-size:11px; } .picker-scroll { padding:0 10px 10px; } .catalog-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .case-card { padding:9px; } .case-art { height:135px; } .picker-footer { padding:10px; gap:6px; flex-wrap:wrap; } .picker-footer>span { flex:1; text-align:center; } .picker-footer .primary { flex-basis:100%; } }
            @media(prefers-reduced-motion:reduce) { .case-art img,.switch:after { transition:none; } }
        `}</style>
    </>
}
export default CreateBattle;
