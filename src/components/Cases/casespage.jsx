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
            sorted = cases().slice().sort((a, b) => b.price - a.price)
        else
            sorted = cases().slice().sort((a, b) => a.price - b.price)

        sorted = sorted.filter(c => {
            return c.price >= realMin && c.price <= realMax && c?.name?.toLowerCase()?.includes(search().toLowerCase())
        })

        return sorted
    }

    return (
        <>
            <div class='cases-container fadein'>
                <div class='filters'>
                <div class='filter-heading'>
                  <div class='title-wrap'>
                    <span class='title-icon'><img src='/assets/icons/cases_explosion.svg' height='20' alt=''/></span>
                    <div>
                      <p class='eyebrow'>Case Library</p>
                      <h1>Official Cases</h1>
                    </div>
                  </div>

                  <div class='options' aria-label='Case collection'>
                    <button class='option active' type='button'>Official</button>
                    <button class='option community' type='button' onClick={() => navigate('/cases/community')}>
                      Community
                    </button>
                  </div>
                    </div>

                    <div class='inputs'>
                        <div class='search-container'>
                    <input class='number' type='search' placeholder='Search official cases...' value={search()} onInput={(e) => setSearch(e.target.value)}/>

                    <span class='search-button' aria-hidden='true'>
                            <img src='/assets/icons/search.svg' alt=''/>
                    </span>
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

                          <span class='result-count'>{sortedCases().length} cases</span>
                    </div>
                </div>

                <Show when={!cases.loading} fallback={<Loader/>}>
                    <div class='cases'>
                        <For each={sortedCases()}>{(c, index) => <CaseButton creator={false} c={c}/>}</For>
                          <Show when={!sortedCases().length}>
                            <div class='empty-state'>
                              <span class='empty-icon'><img src='/assets/icons/search.svg' height='18' alt=''/></span>
                              <div>
                                <strong>No cases found</strong>
                                <p>Try changing your search or price range.</p>
                              </div>
                            </div>
                          </Show>
                    </div>
                </Show>
            </div>

            <style jsx>{`
              .cases-container {
                width: 100%;
                max-width: 1440px;
                height: fit-content;
                padding: 10px 0 44px;
                margin: 0 auto;
              }

              .filters {
                width: 100%;
                min-height: 124px;
                display: flex;
                flex-direction: column;
                gap: 14px;

                padding: 17px 18px;
                box-sizing: border-box;
                margin: 0 0 22px;

                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.065);
                background: radial-gradient(circle at 8% 0%, rgba(31,214,95,.08), transparent 28%), linear-gradient(145deg, rgba(18, 24, 34, 0.97), rgba(8, 12, 19, 0.98));
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045), 0 14px 38px rgba(0, 0, 0, 0.24);
                position: relative;
                overflow: hidden;
              }

              .filters:before {
                content: '';
                position: absolute;
                inset: 0;
                pointer-events: none;
                background: linear-gradient(110deg, rgba(255,255,255,.025), transparent 32%, rgba(31,214,95,.025));
              }

              .filter-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                position: relative;
                z-index: 1;
              }

              .title-wrap {
                display: flex;
                align-items: center;
                gap: 11px;
                position: relative;
                z-index: 1;
              }

              .title-icon {
                width: 38px;
                height: 38px;
                display: grid;
                place-items: center;
                border-radius: 8px;
                border: 1px solid rgba(31,214,95,.25);
                background: rgba(31,214,95,.08);
              }

              .title-wrap h1 {
                margin: 1px 0 0;
                color: #FFF;
                font-size: 20px;
                font-weight: 800;
                white-space: nowrap;
              }

              .title-icon img {
                filter: drop-shadow(0 0 8px rgba(31, 214, 95, 0.45));
              }

              .eyebrow {
                color: #687284;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .options {
                height: 36px;
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 3px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,.06);
                background: rgba(4,7,12,.48);
                position: relative;
                z-index: 1;
              }

              .option {
                height: 30px;
                padding: 0 13px;
                cursor: pointer;
                outline: unset;
                border: 1px solid transparent;
                border-radius: 6px;
                background: transparent;

                font-family: "Geogrotesque Wide";
                color: #8b92a0;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;

                transition: color .2s, background .2s, border-color .2s;
              }

              .option:hover:not(:disabled) {
                color: #d6dde8;
              }

              .option.community {
                color: #9ea7b6;
              }

              .option.community:hover {
                color: #dce3ec;
                background: rgba(255,255,255,.04);
              }

              .active {
                color: #1fd65f;
                border-color: rgba(31,214,95,.22);
                background: rgba(31,214,95,.1);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
              }

              .cases {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
                gap: 15px;
              }

              .inputs {
                display: flex;
                gap: 10px;
                align-items: center;
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
                border: 1px solid rgba(255, 255, 255, 0.05);
                background: rgba(5, 8, 13, 0.55);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
                transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
              }

              .number-container:focus-within, .search-container:focus-within {
                border-color: rgba(31, 214, 95, 0.42);
                background: rgba(8, 13, 20, 0.78);
                box-shadow: 0 0 0 2px rgba(31, 214, 95, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.04);
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
                flex: 1;
                min-width: 220px;
                height: 38px;

                border-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.05);
                background: rgba(5, 8, 13, 0.55);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);

                padding: 0 0 0 15px;

                display: flex;
                transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
              }

              .search-button {
                width: 38px;
                display: grid;
                place-items: center;
                border-radius: 0px 5px 5px 0px;
                background: rgba(21, 26, 36, 0.9);
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
                filter: brightness(1.1);
                transform: translateY(-1px);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 12px rgba(0, 0, 0, 0.25);
              }

              .gold {
                color: #1fd65f;
              }

              .result-count {
                min-width: 70px;
                color: #697385;
                font-size: 10px;
                font-weight: 800;
                text-align: right;
                text-transform: uppercase;
                white-space: nowrap;
              }

              .empty-state {
                grid-column: 1 / -1;
                min-height: 170px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                border: 1px dashed rgba(255,255,255,.09);
                border-radius: 10px;
                background: rgba(12,16,24,.52);
                color: #dce3ec;
              }

              .empty-icon {
                width: 38px;
                height: 38px;
                display: grid;
                place-items: center;
                border-radius: 8px;
                background: rgba(255,255,255,.045);
                border: 1px solid rgba(255,255,255,.07);
              }

              .empty-state strong { font-size: 13px; }
              .empty-state p { margin-top: 3px; color: #707a8b; font-size: 11px; }
              
              .sort-by.flip svg {
                transform: rotate(180deg);
              }

              .sort-by p {
                margin-top: -2px;
              }

              @media only screen and (max-width: 830px) {
                .small {
                  display: none;
                }

                .filters {
                  padding: 12px;
                }

                .inputs {
                  width: 100%;
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

                .filter-heading { align-items: flex-start; }
                .title-wrap h1 { font-size: 17px; }
                .options { height: 34px; }
                .option { padding: 0 9px; font-size: 9px; }
                .result-count { display: none; }
                .cases { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
              }
            `}</style>
        </>
    );
}

export default Cases;
