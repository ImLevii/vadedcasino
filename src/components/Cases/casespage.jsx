import {createResource, createSignal, For, Show} from "solid-js";
import {useNavigate} from "@solidjs/router";
import CaseButton from "./casebutton";
import Loader from "../Loader/loader";
import {authedAPI} from "../../util/api";

function Cases(props) {

    const navigate = useNavigate()
    const [cases, {mutate}] = createResource(fetchCases)

    const [search, setSearch] = createSignal('')
    const [min, setMin] = createSignal(NaN)
    const [max, setMax] = createSignal(NaN)
    const [option, setOption] = createSignal('ALL')
    const [sort, setSort] = createSignal('DESCENDING')

    async function fetchCases() {
        try {
            let cases = await authedAPI('/cases', 'GET', null)
            return mutate(cases)
        } catch (e) {
            console.log(e)
            return mutate([])
        }
    }

    function sortedCases() {
        if (!Array.isArray(cases())) return []
        let sorted
        let realMax = isNaN(max()) ? Number.MAX_VALUE : max()
        let realMin = isNaN(min()) ? 0 : Math.max(0, min())

        if (sort() === "DESCENDING")
            sorted = cases().sort((a, b) => b.price - a.price)
        else
            sorted = cases().sort((a, b) => a.price - b.price)

        sorted = sorted.filter(c => {
            return c.price >= realMin && c.price <= realMax && c?.name?.toLowerCase()?.includes(search().toLowerCase())
        })

        return sorted
    }

    return (
        <>
            <div class='cases-container fadein'>
                <div class='filters'>
                  <div class='title-wrap'>
                    <p class='title'><img src='/assets/icons/cases_explosion.svg' height='20' alt=''/>CASES</p>
                  </div>

                    <div class='options'>
                        <button class={'option hide ' + (option() === 'ALL' ? 'active' : '')}
                                onClick={() => setOption('ALL')}>
                            ALL
                        </button>

                        <button class={'option hide ' + (option() === 'FEATURED' ? 'active' : '')}
                                onClick={() => setOption('FEATURED')} disabled={true}>
                            FEATURED
                        </button>

                        <button class={'option hide ' + (option() === 'NEW' ? 'active' : '')}
                                onClick={() => setOption('NEW')} disabled={true}>
                            NEW
                        </button>

                        <button class={'option hide ' + (option() === 'PARTNERS' ? 'active' : '')}
                                onClick={() => setOption('PARTNERS')} disabled={true}>
                            PARTNERS
                        </button>

                        <button class={'option hide ' + (option() === 'TRENDING' ? 'active' : '')}
                                onClick={() => setOption('TRENDING')} disabled={true}>
                            TRENDING
                        </button>

                        <button class='option community'
                                onClick={() => navigate('/cases/community')}>
                            COMMUNITY
                        </button>
                    </div>

                    <div class='inputs'>
                        <div class='search-container'>
                          <input class='number' type='text' placeholder='SEARCH FOR CASES' value={search()} onInput={(e) => setSearch(e.target.value)}/>

                          <button class='search-button'>
                            <img src='/assets/icons/search.svg' alt=''/>
                          </button>
                        </div>

                        <div class='number-container small'>
                            <img src='/assets/icons/coin.svg' height='13' alt=''/>
                            <input class='number' type='number' placeholder='MIN PRICE...' value={min()} onInput={(e) => setMin(e.target.valueAsNumber)}/>
                        </div>

                        <div class='number-container small'>
                            <img src='/assets/icons/coin.svg' height='13' alt=''/>
                            <input class='number' type='number' placeholder='MAX PRICE...' value={max()} onInput={(e) => setMax(e.target.valueAsNumber)}/>
                        </div>

                        <button class={'sort-by tiny ' + (sort() === 'DESCENDING' ? 'flip' : '')}
                                onClick={() => setSort(sort() === 'DESCENDING' ? 'ASCENDING' : 'DESCENDING')}>
                            <p>SORT BY: <span class='gold'>{sort()}</span></p>

                            <svg class='arrow' width="7" height="5" viewBox="0 0 7 5" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z"
                                    fill="#8b92a0"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <Show when={!cases.loading} fallback={<Loader/>}>
                    <div class='cases'>
                        <For each={sortedCases()}>{(c, index) => <CaseButton creator={false} c={c}/>}</For>
                    </div>
                </Show>
            </div>

            <style jsx>{`
              .cases-container {
                width: 100%;
                height: fit-content;
                padding-bottom: 30px;
              }

              .filters {
                width: 100%;
                min-height: 66px;

                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 18px;

                padding: 10px 12px 10px 18px;
                margin: 0 0 28px 0;

                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.045);
                background: linear-gradient(180deg, rgba(20, 25, 34, 0.98), rgba(13, 17, 25, 0.98));
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 14px 36px rgba(0, 0, 0, 0.2);
                position: relative;
                overflow: hidden;
              }

              .filters:before {
                content: '';
                position: absolute;
                inset: 0;
                pointer-events: none;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.04), rgba(255, 255, 255, 0.00) 34%, rgba(139, 146, 160, 0.035));
              }

              .title-wrap {
                min-width: 220px;
                display: flex;
                align-items: center;
                position: relative;
                z-index: 1;
              }

              .title {
                color: #FFF;
                font-size: 22px;
                font-weight: 800;

                display: flex;
                align-items: center;
                gap: 12px;
                white-space: nowrap;
              }

              .title img {
                filter: drop-shadow(0 0 8px rgba(31, 214, 95, 0.45));
              }

              .options {
                height: 100%;
                display: flex;
                gap: 20px;
                position: relative;
                z-index: 1;
              }

              .option {
                line-height: 36px;
                cursor: pointer;
                height: 100%;

                background: unset;
                outline: unset;
                border: unset;

                font-family: "Geogrotesque Wide";
                color: #8b92a0;
                font-size: 12px;
                font-weight: 800;

                transition: color .2s, opacity .2s;
              }

              .option:hover:not(:disabled) {
                color: #d6dde8;
              }

              .option:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              .option.community {
                color: #1fd65f;
                text-shadow: 0 0 14px rgba(31, 214, 95, 0.22);
              }

              .option.community:hover {
                color: #45e57f;
              }

              .active {
                color: #1fd65f;
                border-bottom: 3px solid #1fd65f;
                text-shadow: 0 0 14px rgba(31, 214, 95, 0.22);
              }

              .cases {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
                grid-gap: 16px;
              }

              .inputs {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-left: auto;
                position: relative;
                z-index: 1;
              }

              .number-container {
                width: 132px;
                height: 36px;

                display: flex;
                align-items: center;
                gap: 10px;
                padding: 0 12px;

                border-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.045);
                background: rgba(5, 8, 13, 0.5);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
                transition: border-color .18s ease, background .18s ease;
              }

              .number-container:focus-within, .search-container:focus-within {
                border-color: rgba(31, 214, 95, 0.36);
                background: rgba(8, 13, 20, 0.72);
              }

              .number {
                width: 100%;
                height: 100%;
                background: unset;
                border: unset;
                outline: unset;

                color: #c4ccd8;
                font-size: 12px;
                font-family: Geogrotesque Wide;
                font-weight: 600;
              }

              .number::placeholder {
                color: #8b92a0;
                font-size: 12px;
                font-family: Geogrotesque Wide;
                font-weight: 600;
              }

              .search-container {
                width: 250px;
                height: 36px;

                border-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.045);
                background: rgba(5, 8, 13, 0.5);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);

                padding: 0 0 0 15px;

                display: flex;
              }

              .search-button {
                outline: unset;
                border: unset;
                cursor: pointer;

                width: 38px;
                border-radius: 0px 5px 5px 0px;
                background: rgba(21, 26, 36, 0.82);
                transition: filter .18s ease;
              }

              .search-button:hover {
                filter: brightness(1.18);
              }

              .sort-by {
                width: 160px;
                height: 36px;

                font-family: Geogrotesque Wide;
                color: #8b92a0;
                font-size: 12px;
                font-weight: 600;

                outline: unset;
                border: unset;

                display: flex;
                align-items: center;
                justify-content: center;

                border-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.045);
                background: linear-gradient(180deg, #2b3340, #202632);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045), 0 1px 0 rgba(0, 0, 0, 0.45);
                cursor: pointer;

                gap: 8px;
                transition: filter .18s ease, transform .18s ease;
              }

              .sort-by:hover {
                filter: brightness(1.08);
                transform: translateY(-1px);
              }

              .gold {
                color: #1fd65f;
              }
              
              .sort-by.flip svg {
                transform: rotate(180deg);
              }

              .sort-by p {
                margin-top: -2px;
              }

              @media only screen and (max-width: 1500px) {
                .hide {
                  display: none;
                }
              }

              @media only screen and (max-width: 830px) {
                .small {
                  display: none;
                }

                .filters {
                  flex-wrap: wrap;
                  padding: 12px;
                }

                .inputs {
                  width: 100%;
                  margin-left: 0;
                }

                .search-container {
                  flex: 1;
                  width: unset;
                }
              }

              @media only screen and (max-width: 560px) {
                .sort-by {
                  display: none;
                }
              }
            `}</style>
        </>
    );
}

export default Cases;
