import {A, useNavigate} from "@solidjs/router";
import CaseButton from "../components/Cases/casebutton";
import {createResource, createSignal, For, Show} from "solid-js";
import {authedAPI} from "../util/api";
import AddCases from "../components/Battles/addcases";
import {Title} from "@solidjs/meta";

function CreateBattle(props) {

    let slider
    const navigate = useNavigate()
    const [players, setPlayers] = createSignal('1v1')
    const [gamemode, setGamemode] = createSignal('standard')
    const [isPrivate, setIsPrivate] = createSignal(false)
    const [cosmicSpin, setCosmicSpin] = createSignal(false)
    const [minLevel, setMinLevel] = createSignal(0, {equals: false})
    const [discount, setDiscount] = createSignal(0)

    const [addCases, setAddCases] = createSignal(false)
    const [addedCases, setAddedCases] = createSignal([])
    const [groupedCases, setGroupedCases] = createSignal([])
    const [total, setTotal] = createSignal(0)

    const [dragIndex, setDragIndex] = createSignal(null)
    const [dragOverIndex, setDragOverIndex] = createSignal(null)

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

    function createTrail() {
        let value = (slider.value - 0) / 100 * 100
      slider.style.background = 'linear-gradient(to right, #1fd65f 0%, #1fd65f ' + value + '%, #131a24 ' + value + '%, #131a24 100%)'
    }

    function addCase(caseToAdd, num) {
        if (num > 0 && addedCases().length >= 50) return
        if (num < 0) {
            let index = addedCases().findIndex(c => c.id === caseToAdd.id)
            if (index < 0) return

            setAddedCases([...addedCases().slice(0, index), ...addedCases().slice(index + 1)])
            setTotal(addedCases()?.reduce((pv, c) => pv + c.price, 0))
            return setGroupedCases(groupByIdAndSumAmount(addedCases()))
        }
        setAddedCases([...addedCases(), caseToAdd])
        setTotal(addedCases()?.reduce((pv, c) => pv + c.price, 0))
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

    function reorderCases(fromIndex, toIndex) {
        if (fromIndex === null || fromIndex === toIndex) return
        const newGrouped = [...groupedCases()]
        const [moved] = newGrouped.splice(fromIndex, 1)
        newGrouped.splice(toIndex, 0, moved)
        // Rebuild flat addedCases from the reordered grouped list
        const newAdded = newGrouped.flatMap(c => Array(c.amount).fill(c))
        setAddedCases(newAdded)
        setGroupedCases(newGrouped)
    }

    function groupedCasesToIDArray() {
        let cases = []
        for (let c of groupedCases()) {
            let ids = new Array(c.amount).fill(c.id)
            cases.push(...ids)
        }
        return cases
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

    return (
        <>
            <Title>Cosmic Luck | Create a Battle</Title>

            <Show when={!cases.loading} fallback={<></>}>
                {addCases() && (
                    <AddCases total={total()} selected={addedCases().length} cases={cases()} getAmount={getAmount} addedCases={addedCases()} close={() => setAddCases(false)} addCase={addCase}/>
                )}
            </Show>

            <div class='create-battle-container fadein'>
                <div class='header'>
                    <div class='header-section'>
                        <button class='back bevel-light'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="5" height="8" viewBox="0 0 5 8" fill="none">
                                <path
                                    d="M0.4976 4.00267C0.4976 3.87722 0.545618 3.75178 0.641454 3.65613L3.65872 0.646285C3.85066 0.454819 4.16185 0.454819 4.35371 0.646285C4.54556 0.837673 4.4976 1.00269 4.4976 1.33952L4.4976 4.00267L4.4976 6.50269C4.4976 7.00269 4.54547 7.16764 4.35361 7.35902C4.16175 7.55057 3.85056 7.55057 3.65863 7.35902L0.641361 4.34921C0.545509 4.25352 0.4976 4.12808 0.4976 4.00267Z"
                                    fill="#8b92a0"/>
                            </svg>
                            <p>BACK</p>
                            <A href='/battles' class='gamemode-link'></A>
                        </button>

                        <p class='title'>
                            <img src='/assets/icons/battles.svg' height='18' alt=''/>
                            BATTLE CREATION
                        </p>
                    </div>

                    <div class='header-section'>
                        <p class='state'>{props?.battle ? 'Waiting for Players...' : ''}</p>
                    </div>

                    <div class='header-section'>
                        <div class='num-cases'>
                            <img src='/assets/icons/cases_explosion.svg' height='16' alt=''/>
                            <p>{addedCases()?.length || 0} <span>CASES</span></p>
                        </div>

                        <div class='cost'>
                            <img src='/assets/icons/coin.svg' height='16' alt=''/>
                            <span>
                                {realCost()?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <button class='bevel-gold create' onClick={async () => {

                            let teams = numberOfTeams()
                            let playersPerTeam = getPlayersPerTeam()

                            if (gamemode() === 'group') {
                                playersPerTeam = teams
                                teams = 1
                            }

                            let res = await authedAPI('/battles/create', 'POST', JSON.stringify({
                                cases: groupedCasesToIDArray(),
                                teams: teams,
                                playersPerTeam: playersPerTeam,
                                gamemode: gamemode(),
                                funding: discount(),
                                minLvl: minLevel(),
                                isPrivate: isPrivate(),
                                cosmicSpin: cosmicSpin()
                            }), true)

                            if (res.success) {
                                let link = `/battle/${res?.battleId}`
                                if (res?.privKey) {
                                    link += `?pk=${res?.privKey}`
                                }
                                navigate(link)
                            }
                        }}>CREATE CASE</button>
                    </div>
                </div>

                <div class='bar'/>

                <div class='cases'>
                    <button class='add-case' onClick={() => setAddCases(!addCases())}>
                        <div class='plus'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="14" viewBox="0 0 17 14"
                                 fill="none">
                                <path
                                    d="M6.16963 13.085V9.05882H1.00592C0.335306 9.05882 0 8.76398 0 8.17429V5.82571C0 5.25635 0.335306 4.97168 1.00592 4.97168H6.16963V0.915032C6.16963 0.305011 6.48258 0 7.10848 0H9.82446C10.4727 0 10.7968 0.305011 10.7968 0.915032V4.97168H15.9941C16.6647 4.97168 17 5.25635 17 5.82571V8.17429C17 8.76398 16.6647 9.05882 15.9941 9.05882H10.7968V13.085C10.7968 13.695 10.4727 14 9.82446 14H7.10848C6.48258 14 6.16963 13.695 6.16963 13.085Z"
                                    fill="white"/>
                            </svg>
                        </div>

                        <p>ADD CASE</p>
                    </button>

                    <For each={groupedCases()}>{(c, index) => (
                        <div
                            class={'case-drag-wrapper' + (dragOverIndex() === index() && dragIndex() !== index() ? ' drag-over' : '') + (dragIndex() === index() ? ' dragging' : '')}
                            draggable={true}
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragIndex(index()) }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIndex(index()) }}
                            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverIndex(null) }}
                            onDrop={(e) => { e.preventDefault(); reorderCases(dragIndex(), index()); setDragIndex(null); setDragOverIndex(null) }}
                            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
                        >
                            <div class='drag-handle' title='Drag to reorder'>
                                <svg width='10' height='14' viewBox='0 0 10 14' fill='none'>
                                    <circle cx='2.5' cy='2.5' r='1.5' fill='#8b92a0'/>
                                    <circle cx='7.5' cy='2.5' r='1.5' fill='#8b92a0'/>
                                    <circle cx='2.5' cy='7' r='1.5' fill='#8b92a0'/>
                                    <circle cx='7.5' cy='7' r='1.5' fill='#8b92a0'/>
                                    <circle cx='2.5' cy='11.5' r='1.5' fill='#8b92a0'/>
                                    <circle cx='7.5' cy='11.5' r='1.5' fill='#8b92a0'/>
                                </svg>
                            </div>
                            <CaseButton creator={true} addCase={() => addCase(c, 1)} removeCase={() => addCase(c, -1)} amount={c?.amount || 0} c={c}/>
                        </div>
                    )}</For>
                </div>

                <div class='bar'/>

                <div class='settings-section'>
                    <div class='settings-title'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="15" viewBox="0 0 20 15" fill="none">
                            <path
                                d="M20 13.6364C20 13.8775 19.9042 14.1087 19.7337 14.2792C19.5632 14.4497 19.332 14.5455 19.0909 14.5455H8.18182C7.94071 14.5455 7.70948 14.4497 7.53899 14.2792C7.36851 14.1087 7.27273 13.8775 7.27273 13.6364C7.27273 12.1897 7.8474 10.8023 8.87033 9.77942C9.89325 8.75649 11.2806 8.18182 12.7273 8.18182H14.5455C15.9921 8.18182 17.3795 8.75649 18.4024 9.77942C19.4253 10.8023 20 12.1897 20 13.6364ZM13.6364 0C12.9172 0 12.2141 0.213269 11.6161 0.612838C11.0181 1.01241 10.552 1.58033 10.2768 2.24479C10.0016 2.90925 9.92956 3.6404 10.0699 4.34578C10.2102 5.05117 10.5565 5.69911 11.0651 6.20766C11.5736 6.71622 12.2216 7.06255 12.9269 7.20286C13.6323 7.34317 14.3635 7.27115 15.0279 6.99593C15.6924 6.7207 16.2603 6.25462 16.6599 5.65662C17.0595 5.05862 17.2727 4.35557 17.2727 3.63636C17.2727 2.67194 16.8896 1.74702 16.2077 1.06507C15.5257 0.383116 14.6008 0 13.6364 0ZM5.45455 0C4.73534 0 4.03229 0.213269 3.43429 0.612838C2.83629 1.01241 2.37021 1.58033 2.09498 2.24479C1.81976 2.90925 1.74774 3.6404 1.88805 4.34578C2.02836 5.05117 2.37469 5.69911 2.88325 6.20766C3.3918 6.71622 4.03974 7.06255 4.74513 7.20286C5.45051 7.34317 6.18166 7.27115 6.84612 6.99593C7.51058 6.7207 8.0785 6.25462 8.47807 5.65662C8.87764 5.05862 9.09091 4.35557 9.09091 3.63636C9.09091 2.67194 8.70779 1.74702 8.02584 1.06507C7.34389 0.383116 6.41897 0 5.45455 0ZM5.45455 13.6364C5.45319 12.6815 5.64132 11.7358 6.00804 10.8541C6.37475 9.97243 6.91277 9.17228 7.59091 8.5C7.03594 8.29047 6.44775 8.18269 5.85455 8.18182H5.05455C3.71473 8.18422 2.43049 8.71752 1.4831 9.66492C0.535706 10.6123 0.00240325 11.8966 0 13.2364V13.6364C0 13.8775 0.0957789 14.1087 0.266267 14.2792C0.436754 14.4497 0.667985 14.5455 0.909091 14.5455H5.61818C5.51234 14.2539 5.457 13.9465 5.45455 13.6364Z"
                                fill="#1fd65f"/>
                        </svg>

                        <p>PLAYERS</p>
                    </div>

                    <button class={'setting ' + (players() === '1v1' ? 'active' : '')}
                            onClick={() => changePlayers('1v1')}>
                        1v1
                    </button>
                    <button class={'setting ' + (players() === '1v1v1' ? 'active' : '')}
                            onClick={() => changePlayers('1v1v1')}>
                        1v1v1
                    </button>
                    <button class={'setting ' + (players() === '1v1v1v1' ? 'active' : '')}
                            onClick={() => changePlayers('1v1v1v1')}>
                        1v1v1v1
                    </button>

                    <button disabled={gamemode() === 'group'} class={'setting ' + (players() === '2v2' ? 'active' : '')}
                            onClick={() => changePlayers('2v2')}>
                        2v2
                    </button>
                </div>

                <div class='settings-section'>
                    <div class='settings-title'>
                        <img src='/assets/icons/cube.svg' height='19' width='17'/>

                        <p>GAMEMODE</p>
                    </div>

                    <button class={'setting ' + (gamemode() === 'standard' ? 'active' : '')}
                            onClick={() => changeGamemode('standard')}>
                        STANDARD
                    </button>
                    <button class={'setting ' + (gamemode() === 'crazy' ? 'active' : '')}
                            onClick={() => changeGamemode('crazy')}>
                        CRAZY MODE
                    </button>
                    <button disabled={players() === '2v2'} class={'setting ' + (gamemode() === 'group' ? 'active' : '')}
                            onClick={() => changeGamemode('group')}>
                        GROUP MODE
                    </button>

                    <button class={'setting ' + (cosmicSpin() ? 'active' : '')}
                            onClick={() => setCosmicSpin(!cosmicSpin())}>
                        <img src='/assets/icons/cosmic-gem.png' height='16' alt=''/>
                        &nbsp;COSMIC SPIN
                    </button>
                </div>

                <div class='settings-section'>
                    <div class='settings-title'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="15" viewBox="0 0 20 15" fill="none">
                            <path
                                d="M20 13.6364C20 13.8775 19.9042 14.1087 19.7337 14.2792C19.5632 14.4497 19.332 14.5455 19.0909 14.5455H8.18182C7.94071 14.5455 7.70948 14.4497 7.53899 14.2792C7.36851 14.1087 7.27273 13.8775 7.27273 13.6364C7.27273 12.1897 7.8474 10.8023 8.87033 9.77942C9.89325 8.75649 11.2806 8.18182 12.7273 8.18182H14.5455C15.9921 8.18182 17.3795 8.75649 18.4024 9.77942C19.4253 10.8023 20 12.1897 20 13.6364ZM13.6364 0C12.9172 0 12.2141 0.213269 11.6161 0.612838C11.0181 1.01241 10.552 1.58033 10.2768 2.24479C10.0016 2.90925 9.92956 3.6404 10.0699 4.34578C10.2102 5.05117 10.5565 5.69911 11.0651 6.20766C11.5736 6.71622 12.2216 7.06255 12.9269 7.20286C13.6323 7.34317 14.3635 7.27115 15.0279 6.99593C15.6924 6.7207 16.2603 6.25462 16.6599 5.65662C17.0595 5.05862 17.2727 4.35557 17.2727 3.63636C17.2727 2.67194 16.8896 1.74702 16.2077 1.06507C15.5257 0.383116 14.6008 0 13.6364 0ZM5.45455 0C4.73534 0 4.03229 0.213269 3.43429 0.612838C2.83629 1.01241 2.37021 1.58033 2.09498 2.24479C1.81976 2.90925 1.74774 3.6404 1.88805 4.34578C2.02836 5.05117 2.37469 5.69911 2.88325 6.20766C3.3918 6.71622 4.03974 7.06255 4.74513 7.20286C5.45051 7.34317 6.18166 7.27115 6.84612 6.99593C7.51058 6.7207 8.0785 6.25462 8.47807 5.65662C8.87764 5.05862 9.09091 4.35557 9.09091 3.63636C9.09091 2.67194 8.70779 1.74702 8.02584 1.06507C7.34389 0.383116 6.41897 0 5.45455 0ZM5.45455 13.6364C5.45319 12.6815 5.64132 11.7358 6.00804 10.8541C6.37475 9.97243 6.91277 9.17228 7.59091 8.5C7.03594 8.29047 6.44775 8.18269 5.85455 8.18182H5.05455C3.71473 8.18422 2.43049 8.71752 1.4831 9.66492C0.535706 10.6123 0.00240325 11.8966 0 13.2364V13.6364C0 13.8775 0.0957789 14.1087 0.266267 14.2792C0.436754 14.4497 0.667985 14.5455 0.909091 14.5455H5.61818C5.51234 14.2539 5.457 13.9465 5.45455 13.6364Z"
                                fill="#1fd65f"/>
                        </svg>

                        <p>PRIVACY</p>
                    </div>

                    <button class={'setting ' + (!isPrivate() ? 'active' : '')} onClick={() => setIsPrivate(false)}>
                        PUBLIC
                    </button>
                    <button class={'setting ' + (isPrivate() ? 'active' : '')} onClick={() => setIsPrivate(true)}>
                        PRIVATE
                    </button>
                    <div class='input-setting'>
                        <p>MIN LVL</p>
                        <input type='number' value={minLevel()}
                               onChange={(e) => parseNumber(e.target.valueAsNumber, setMinLevel)}/>
                    </div>
                </div>

                <div class='settings-section'>
                    <div class='settings-title'>
                        <img src='/assets/icons/coin.svg' height='17' width='17'/>

                        <p>FUNDING</p>
                    </div>

                    <input ref={slider} type='range' class='range' value={discount()}
                           onInput={(e) => {
                               setDiscount(e.target.valueAsNumber)
                               createTrail()
                           }}
                    />

                    <p class='coin-text'>
                        YOU PAY
                        <img src='/assets/icons/coin.svg' height='15' width='15' alt=''/>
                        <span class='white'>
                            {realCost()?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </p>

                    <p class='coin-text'>
                        OTHERS PAY
                        <img src='/assets/icons/coin.svg' height='15' width='15' alt=''/>
                        <span class='white'>
                            {entryPrice()?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </p>

                    <div class='input-setting'>
                        <p>DISCOUNT</p>
                        <span>
                            <input type='number' value={discount()}
                                   onChange={(e) => {
                                       parseNumber(e.target.valueAsNumber, setDiscount)
                                       createTrail()
                                   }}
                                   max="100" min="0" step="1"/>
                            <p class='white'>%</p>
                        </span>
                    </div>
                </div>
            </div>

            <style jsx>{`
              .create-battle-container {
                --cb-panel: #121b28;
                --cb-panel-soft: #1a2434;
                --cb-border: rgba(147, 166, 191, 0.24);
                --cb-text: #e6eefb;
                --cb-text-dim: #99a8be;

                width: 100%;
                max-width: 1175px;
                height: fit-content;

                display: flex;
                flex-direction: column;
                gap: 25px;

                box-sizing: border-box;
                padding: 30px 0;
                margin: 0 auto;
                position: relative;
              }

              .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 14px;
                border-radius: 14px;
                border: 1px solid var(--cb-border);
                background: linear-gradient(180deg, rgba(24, 34, 49, 0.88), rgba(14, 21, 32, 0.94));
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 34px rgba(0,0,0,0.3);
              }

              .header-section {
                display: flex;
                align-items: center;
                gap: 15px;
                justify-content: center;
              }

              .title {
                color: var(--cb-text);
                font-size: 18px;
                font-weight: 700;

                display: flex;
                align-items: center;
                gap: 8px;
              }

              .header-section:first-child {
                justify-content: flex-start;
              }

              .header-section:last-child {
                justify-content: flex-end;
              }

              .back {
                height: 30px;
                padding: 0 10px;
                font-weight: 700;
                font-family: Geogrotesque Wide;
                position: relative;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                background: linear-gradient(180deg, rgba(39,47,60,0.68), rgba(23,30,42,0.68));
                display: flex;
                align-items: center;
              }

              .back p {
                margin-top: -3px;
              }

              .back svg {
                margin-right: 6px;
              }

              .total {
                color: #8b92a0;
                font-size: 15px;
                font-weight: 700;
              }

              .num-cases {
                height: 30px;
                padding: 0 10px;
                border-radius: 8px;
                background: linear-gradient(180deg, rgba(31, 214, 95, 0.13), rgba(31, 214, 95, 0.06));
                border: 1px solid rgba(31, 214, 95, 0.34);

                display: flex;
                align-items: center;
                gap: 6px;

                color: #FFF;
                font-size: 14px;
                font-weight: 600;
              }

              .num-cases span {
                color: #8b92a0;
                font-size: 11px;
                font-weight: 600;
              }

              .create {
                height: 30px;
                width: 130px;
                border-radius: 8px;
              }

              .cost {
                height: 30px;
                font-size: 14px;
                padding: 0 10px;
                min-width: 100px;
                gap: 6px;
                font-variant-numeric: tabular-nums;
                border-radius: 8px;
                background: linear-gradient(180deg, rgba(31, 214, 95, 0.13), rgba(31, 214, 95, 0.06));
                border: 1px solid rgba(31, 214, 95, 0.34);
              }

              .cost p {
                margin-top: -2px;
              }

              .bar {
                width: 100%;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
              }

              .cases {
                min-height: 262px;
                padding: 16px;
                background: radial-gradient(80% 55% at 50% 0%, rgba(31, 214, 95, 0.042), rgba(31, 214, 95, 0)), linear-gradient(180deg, rgba(11, 15, 22, 0.94), rgba(7, 10, 16, 0.98));
                border-radius: 14px;
                border: 1px solid var(--cb-border);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 36px rgba(0,0,0,0.24);

                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                grid-gap: 12px;
              }

              .case-drag-wrapper {
                position: relative;
                cursor: grab;
                border-radius: 9px;
                transition: opacity 0.15s ease, transform 0.15s ease, outline-color 0.1s ease;
                outline: 2px solid transparent;
              }

              .case-drag-wrapper:active {
                cursor: grabbing;
              }

              .case-drag-wrapper.dragging {
                opacity: 0.45;
                transform: scale(0.97);
              }

              .case-drag-wrapper.drag-over {
                outline: 2px solid rgba(31, 214, 95, 0.7);
                transform: scale(1.03);
                box-shadow: 0 0 18px rgba(31, 214, 95, 0.18);
              }

              .drag-handle {
                position: absolute;
                top: 5px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10;
                opacity: 0;
                transition: opacity 0.15s ease;
                pointer-events: none;
                background: rgba(10, 14, 20, 0.75);
                border-radius: 4px;
                padding: 3px 5px;
              }

              .case-drag-wrapper:hover .drag-handle {
                opacity: 1;
              }

              .add-case {
                outline: unset;
                border: unset;
                cursor: pointer;

                height: 230px;
                background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012));
                border: 1px solid rgba(31, 214, 95, 0.14);
                border-radius: 10px;

                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 10px;

                color: #8b92a0;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 13px;
                font-weight: 600;
                z-index: 0;

                position: relative;
                overflow: hidden;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
                transition: transform .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease;
              }

              .add-case:before {
                width: 100%;
                height: 100%;
                position: absolute;
                content: '';
                background: radial-gradient(80% 60% at 50% 48%, rgba(31,214,95,0.09), rgba(31,214,95,0) 70%), #0b0f17;
                top: 0;
                left: 0;
                border-radius: 10px;
                z-index: -1;
              }

              .add-case:hover {
                transform: translateY(-2px);
                color: #fff;
                border-color: rgba(31, 214, 95, 0.4);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.045), 0 0 32px rgba(31,214,95,0.14);
              }

              .plus {
                width: 70px;
                height: 70px;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 10px;
                background: linear-gradient(180deg, rgba(31,214,95,0.2), rgba(31,214,95,0.07));
                border: 1px solid rgba(31,214,95,0.2);
                position: relative;
                z-index: 0;
              }

              .plus:before {
                width: 100%;
                height: 100%;
                position: absolute;
                content: '';
                background: radial-gradient(90% 80% at 50% 50%, rgba(31,214,95,0.14), rgba(31,214,95,0)), rgba(0, 0, 0, 0.24);
                top: 0;
                left: 0;
                border-radius: 10px;
                z-index: -1;
              }

              .settings-section {
                outline: unset;
                border: unset;

                width: 100%;
                height: 45px;

                border-radius: 12px;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.12) -30%, rgba(17, 23, 34, 0.94) 18%, rgba(7, 10, 16, 0.32) 100%);
                border: 1px solid var(--cb-border);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);

                color: #8b92a0;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 15px;
                font-weight: 600;
                border-bottom: 2px solid transparent;

                padding: 0 15px;
                display: flex;
                align-items: center;
                gap: 20px;
                transition: border-color 0.2s ease;
              }

              .settings-section:hover {
                border-color: rgba(31,214,95,0.36);
              }
              
              .nomargin {
                margin-right: unset !important;
              }

              .settings-title {
                display: flex;
                align-items: center;
                gap: 12px;

                color: var(--cb-text);
                font-size: 18px;
                font-weight: 700;

                margin-right: auto;
              }

              .setting {
                border: unset;
                outline: unset;
                background: unset;

                height: 100%;
                padding: unset;
                cursor: pointer;

                color: var(--cb-text-dim);
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 15px;
                font-weight: 600;
                border-bottom: 2px solid transparent;

                transition: color .2s, border-color .2s, text-shadow .2s;
              }
              
              .setting:hover:not(:disabled) {
                color: #d3deef;
              }
              
              .setting:disabled {
                opacity: 0.5;
                cursor: default;
              }

              .input-setting {
                display: flex;
                gap: 8px;

                color: var(--cb-text-dim);
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 15px;
                font-weight: 600;
              }

              .input-setting span {
                display: flex;
                align-items: center;
                gap: 0;
              }

              .input-setting input {
                border: unset;
                outline: unset;
                background: unset;

                height: 100%;
                max-width: 30px;
                padding: unset;

                color: #f1f6ff;
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 15px;
                font-weight: 600;
                text-align: right;

                transition: color .2s;
              }
              
              .input-setting input:focus {
                color: #1fd65f;
              }

              .setting.active {
                color: #1fd65f;
                border-bottom: 2px solid #1fd65f;
                text-shadow: 0 0 14px rgba(31,214,95,0.28);
              }

              .range {
                -webkit-appearance: none;
                appearance: none;

                border-radius: 25px;
                background: linear-gradient(to right, #1fd65f 0%, #1fd65f 0%, #131a24 0%, #131a24 100%);
                max-width: 190px;
                height: 9px;
                border: 1px solid rgba(255,255,255,0.045);
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
                transition: border-color 0.2s ease;
              }
              
              .range:hover {
                border-color: rgba(31, 214, 95, 0.2);
              }

              .range::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 13px;
                height: 13px;
                background: white;
                cursor: pointer;
                border-radius: 50%;
                box-shadow: 0 0 0 3px rgba(31,214,95,0.12), 0 2px 4px rgba(0,0,0,0.3);
                transition: transform 0.15s ease;
              }
              
              .range::-webkit-slider-thumb:hover {
                transform: scale(1.1);
                box-shadow: 0 0 0 4px rgba(31,214,95,0.2), 0 3px 6px rgba(0,0,0,0.35);
              }

              .range::-moz-range-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 13px;
                height: 13px;
                background: white;
                cursor: pointer;
                border-radius: 50%;
                box-shadow: 0 0 0 3px rgba(31,214,95,0.08);
              }

              .coin-text {
                display: flex;
                align-items: center;
                gap: 6px;
                font-variant-numeric: tabular-nums;
              }

              @media only screen and (max-width: 1000px) {
                .create-battle-container {
                  padding-bottom: 90px;
                }
              }

              @media only screen and (max-width: 540px) {
                .battles-header {
                  justify-content: center;
                  flex-direction: column;
                  align-items: center;
                  gap: 25px;
                }
              }
            `}</style>
        </>
    );
}

export default CreateBattle;
