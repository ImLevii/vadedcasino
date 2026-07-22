import {createSignal, For} from "solid-js";
import CaseButton from "../Cases/casebutton";
import {getCents} from "../../util/balance";

function AddCases(props) {

  const [search, setSearch] = createSignal('')
  const [sort, setSort] = createSignal('DESCENDING')
  const [filter, setFilter] = createSignal('ALL')

  function sortedCases() {
    if (!Array.isArray(props?.cases)) return []
    let sorted

    if (sort() === "DESCENDING")
      sorted = props?.cases.sort((a, b) => b.price - a.price)
    else
      sorted = props?.cases.sort((a, b) => a.price - b.price)

    sorted = sorted.filter(c => {
      if (filter() === 'OFFICIAL' && c.community) return false
      if (filter() === 'COMMUNITY' && !c.community) return false
      return c?.name?.toLowerCase()?.includes(search().toLowerCase())
    })

    return sorted
  }

  return (
    <>
      <div class='modal fadein' onClick={() => props.close()}>
        <div class='cases-container' onClick={(e) => e.stopPropagation()}>
          <div class='header'>
            <button class='exit bevel-light' onClick={() => props.close()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M3.9497 0.447999L5.21006 1.936L6.45216 0.447999C6.68353 0.149333 6.95752 0 7.27413 0H9.6122C9.79486 0 9.90445 0.0533333 9.94099 0.16C9.9897 0.256 9.95925 0.362666 9.84966 0.48L6.79921 3.968L9.88619 7.52C9.99578 7.63733 10.0262 7.74933 9.97752 7.856C9.94099 7.952 9.83139 8 9.64873 8H6.96361C6.68353 8 6.40954 7.85067 6.14163 7.552L4.863 6.048L3.58438 7.552C3.31647 7.85067 3.04857 8 2.78067 8H0.351272C0.180788 8 0.071191 7.952 0.0224814 7.856C-0.0262283 7.74933 0.00421525 7.63733 0.113812 7.52L3.27385 3.936L0.296473 0.48C0.186876 0.362666 0.150344 0.256 0.186876 0.16C0.235586 0.0533333 0.351272 0 0.533933 0H3.10946C3.42607 0 3.70615 0.149333 3.9497 0.447999Z"
                  fill="#8b92a0"/>
              </svg>
            </button>

            <p class='title'><img src='/assets/icons/battles.svg' height='20' alt=''/>CASE
              SELECTION</p>

            <div class='filter-tabs'>
              <For each={['ALL', 'OFFICIAL', 'COMMUNITY']}>
                {(tab) => (
                  <button class={'filter-tab ' + (filter() === tab ? 'active' : '')}
                          onClick={() => setFilter(tab)}>{tab}</button>
                )}
              </For>
            </div>

            <div class='inputs'>
              <button class={'sort-by tiny ' + (sort() === 'DESCENDING' ? 'flip' : '')}
                      onClick={() => setSort(sort() === 'DESCENDING' ? 'ASCENDING' : 'DESCENDING')}>
                <p>SORT BY: <span class='gold'>{sort()}</span></p>

                <svg class='arrow' width="7" height="5" viewBox="0 0 7 5" fill="none"
                     xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z"
                    fill="#9489DB"/>
                </svg>
              </button>

              <div class='search-container'>
                <input class='search' type='text' placeholder='SEARCH FOR CASES' value={search()}
                       onInput={(e) => setSearch(e.target.value)}/>

                <button class='search-button'>
                  <img src='/assets/icons/search.svg' alt=''/>
                </button>
              </div>

            </div>
          </div>

          <div class='cases'>
            <For each={sortedCases()}>{(c, index) =>
              <CaseButton
                creator={true}
                addCase={() => props.addCase(c, 1)}
                removeCase={() => props.addCase(c, -1)}
                amount={props.getAmount(c.id)}
                c={c}
              />
            }</For>
          </div>

          <div class='footer'>
            <div class='selected info'>
              <p>SELECTED <span class='white'>{props.selected || 0}</span>/50</p>
            </div>

            <div class='info'>
              <p>TOTAL AMOUNT</p>
            </div>

            <div class='cost'>
              <img src='/assets/icons/coin.svg' height='16' alt=''/>
              <p>{Math.floor(props?.total)}<span class='gray'>.{getCents(props?.total)}</span></p>
            </div>

            <div class='bar'/>

            <button class='bevel-gold done' onClick={() => props?.close()}>DONE</button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .filter-tabs {
          display: flex;
          gap: 4px;
          margin-left: 6px;
        }

        .filter-tab {
          height: 25px;
          padding: 0 8px;
          outline: unset;
          border-radius: 4px;
          background: transparent;
          border: 1px solid transparent;
          color: #8b92a0;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 8px;
          font-weight: 800;
          cursor: pointer;
          transition: all .2s;
        }

        .filter-tab:hover {
          color: #d6dde8;
        }

        .filter-tab.active {
          color: #1fd65f;
          border-color: rgba(31, 214, 95, 0.4);
          background: rgba(31, 214, 95, 0.07);
        }

        .modal {
          position: fixed;
          top: 0;
          left: 0;

          width: 100vw;
          height: 100vh;

          background: rgba(5, 7, 12, 0.72);
          backdrop-filter: blur(5px);

          display: flex;
          align-items: center;
          justify-content: center;

          z-index: 1000;
        }

        .cases-container {
          max-width: 940px;
          width: calc(100% - 24px);
          height: calc(100% - 32px);
          max-height: 620px;
          background: #090d13;

          display: flex;
          flex-direction: column;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.45);
          overflow: hidden;
        }

        .header, .footer {
          width: 100%;
          min-height: 54px;

          display: flex;
          align-items: center;
          gap: 10px;

          padding: 0 12px;

          background: #111720;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .footer {
          min-height: 48px;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: unset;
        }

        .info {
          height: 27px;
          padding: 0 8px;

          border-radius: 4px;
          background: linear-gradient(180deg, rgba(31, 214, 95, 0.1), rgba(31, 214, 95, 0.04));
          border: 1px solid rgba(31, 214, 95, 0.12);
          line-height: 27px;

          color: #8b92a0;
          font-size: 9px;
          font-weight: 600;
        }

        .selected {
          margin-right: auto;
        }

        .cost {
          height: 27px;
          padding: 0 7px;
        }

        .done {
          height: 27px;
          width: 82px;
        }

        .bar {
          height: 13px;
          width: 1px;
          background: rgba(255,255,255,0.1);
          margin: 0 10px;
        }

        .exit {
          width: 25px;
          height: 25px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.06);

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .title {
          color: #FFF;
          font-size: 12px;
          font-weight: 700;

          display: flex;
          align-items: center;
          gap: 7px;

          margin-right: auto;
        }

        .cases {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
          grid-gap: 7px;
          flex: 1;
          overflow-y: scroll;
          padding: 9px;
          background: #070a10;
          scrollbar-color: transparent transparent;
        }

        .cases::-webkit-scrollbar {
          display: none;
        }

        .inputs {
          display: flex;
          gap: 6px;
        }

        .search-container {
          width: 168px;
          height: 30px;

          border-radius: 5px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255,255,255,0.06);

          padding: 0 0 0 9px;

          display: flex;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        
        .search-container:focus-within {
          border-color: rgba(31, 214, 95, 0.4);
          background: rgba(31, 214, 95, 0.04);
          box-shadow: 0 0 0 2px rgba(31, 214, 95, 0.1);
        }

        .search {
          width: 100%;
          height: 100%;
          background: unset;
          border: unset;
          outline: unset;

          color: #8b92a0;
          font-size: 9px;
          font-family: Geogrotesque Wide, sans-serif;
          font-weight: 600;
        }

        .search::placeholder {
          color: #8b92a0;
          font-size: 9px;
          font-family: Geogrotesque Wide, sans-serif;
          font-weight: 600;
        }

        .search-button {
          outline: unset;
          border: unset;
          cursor: pointer;

          width: 30px;
          border-radius: 0px 5px 5px 0px;
          background: rgba(31, 214, 95, 0.08);
          transition: background 0.2s ease;
        }
        
        .search-button:hover {
          background: rgba(31, 214, 95, 0.14);
        }

        .sort-by {
          width: 132px;

          font-family: Geogrotesque Wide;
          color: #8b92a0;
          font-size: 9px;
          font-weight: 600;

          outline: unset;
          border: unset;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 5px;
          background: linear-gradient(180deg, rgba(31, 214, 95, 0.09), rgba(255,255,255,0.025));
          border: 1px solid rgba(255,255,255,0.055);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
          cursor: pointer;

          gap: 8px;
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
          .header {
            flex-wrap: wrap;
            padding: 8px 10px;
          }

          .title {
            margin-right: 0;
          }

          .inputs {
            width: 100%;
            order: 3;
          }

          .search-container {
            flex: 1;
          }
        }

        @media only screen and (max-width: 560px) {
          .sort-by {
            display: none;
          }

          .cases-container {
            width: calc(100% - 12px);
            height: calc(100% - 12px);
          }

          .filter-tabs {
            width: 100%;
            margin-left: 0;
            order: 2;
          }

          .filter-tab {
            flex: 1;
          }

          .cases {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .footer {
            flex-wrap: wrap;
            padding: 7px 9px;
          }

          .selected {
            margin-right: 0;
          }

          .footer .bar {
            display: none;
          }

          .done {
            margin-left: auto;
          }
        }
      `}</style>
    </>
  );
}

export default AddCases;
