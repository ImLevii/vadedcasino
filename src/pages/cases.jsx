import {Outlet} from "@solidjs/router";
import {Meta, Title} from "@solidjs/meta";

function Cases(props) {
    return (
        <>
            <Title>Cosmic Luck | Cases</Title>
            <Meta name='title' content='Cases'></Meta>
            <Meta name='description' content='Win Coins on Cosmic Luck With The Loot Cases!'></Meta>

            <div class='cases-base-container'>
                <Outlet/>
            </div>

            <style jsx>{`
              .cases-base-container {
                width: 100%;
                max-width: 2048px;
                height: fit-content;

                box-sizing: border-box;
                padding: 22px 0 46px;
                margin: 0 auto;
                position: relative;
                isolation: isolate;
              }

              .cases-base-container:before {
                content: '';
                position: absolute;
                inset: 0 0 auto;
                height: 180px;
                pointer-events: none;
                z-index: -1;
                background: linear-gradient(180deg, rgba(31, 36, 47, 0.22), rgba(9, 12, 18, 0));
                border-top: 1px solid rgba(255, 255, 255, 0.035);
              }
              
              @media only screen and (max-width: 1000px) {
                .cases-base-container {
                  padding-bottom: 90px;
                }
              }
            `}</style>
        </>
    );
}

export default Cases;
