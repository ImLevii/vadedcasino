import {A, Outlet, useLocation} from "@solidjs/router";

function Docs(props) {

    const location = useLocation()

    function isActive(page) {
        return location?.pathname?.includes(page)
    }

    return (
        <>
            <div class='docs-container'>
                <div class='info-container'>
                    <div class='pages'>
                        <div class='bar'/>

                        <button class={'page bevel ' + (isActive('faq') ? 'active' : '')}>
                            <A href='/docs/faq' class='gamemode-link'></A>
                            FAQ
                        </button>

                        <button class={'page bevel ' + (isActive('provably') ? 'active' : '')}>
                            <A href='/docs/provably' class='gamemode-link'></A>
                            Provably Fair
                        </button>

                        <button class={'page bevel ' + (isActive('tos') ? 'active' : '')}>
                            <A href='/docs/tos' class='gamemode-link'></A>
                            Terms Of Service
                        </button>

                        <button className={'page bevel ' + (isActive('aml') ? 'active' : '')}>
                            <A href='/docs/aml' class='gamemode-link'></A>
                            AML
                        </button>

                        <button class={'page bevel ' + (isActive('privacy') ? 'active' : '')}>
                            <A href='/docs/privacy' class='gamemode-link'></A>
                            Privacy Policy
                        </button>
                    </div>

                    <Outlet/>
                </div>
            </div>

            <style jsx>{`
              .docs-container {
                width: 100%;
                max-width: 1175px;
                height: fit-content;
                
                box-sizing: border-box;
                padding: 30px 0;
                margin: 0 auto;
              }
              
              .info-container {
                width: 100%;
                height: fit-content;

                border-radius: 15px;
                border: 1px solid rgba(195, 222, 207, 0.18);
                background:
                  radial-gradient(circle at 12% 4%, rgba(31, 214, 95, 0.15), rgba(31, 214, 95, 0) 30%),
                  linear-gradient(140deg, rgba(33, 41, 53, 0.74) 0%, rgba(17, 22, 29, 0.82) 100%);
                backdrop-filter: blur(18px) saturate(130%);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 18px 35px rgba(5, 9, 13, 0.35);
                
                display: flex;
                flex-direction: column;
                gap: 10px;
                
                box-sizing: border-box;
                padding: 25px;
              }
              
              .pages {
                width: 100%;
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 8px;
              }
              
              .page {
                height: 30px;
                padding: 0 10px;
                font-weight: 700;
                cursor: pointer;
                position: relative;
                color: #b9c3d2;
                border-radius: 7px;
                border: 1px solid rgba(131, 147, 168, 0.26);
                background: linear-gradient(145deg, rgba(44, 52, 67, 0.62) 0%, rgba(23, 29, 39, 0.76) 100%);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
                
                transition: color .25s, border-color .25s, background-color .25s, box-shadow .25s;
              }

              .page:hover {
                color: #edf6ff;
                border-color: rgba(31, 214, 95, 0.35);
                background: linear-gradient(145deg, rgba(53, 63, 81, 0.7) 0%, rgba(24, 31, 43, 0.82) 100%);
              }
              
              .bar {
                border-radius: 555px;
                background: linear-gradient(90deg, rgba(31, 214, 95, 0.35) 0%, rgba(164, 177, 198, 0.2) 35%, rgba(164, 177, 198, 0) 100%);
                height: 1px;
                flex: 1;
              }
              
              .page.active {
                box-shadow: unset;
                
                border-radius: 7px;
                border: 1px solid rgba(31, 214, 95, 0.62);
                background: linear-gradient(145deg, rgba(53, 73, 60, 0.62) 0%, rgba(20, 29, 26, 0.8) 100%);
                box-shadow: inset 0 1px 0 rgba(162, 237, 192, 0.3), 0 0 0 1px rgba(31, 214, 95, 0.15);
                
                color: white;
              }
              
              @media only screen and (max-width: 1000px) {
                .docs-container {
                  padding-bottom: 90px;
                }
              }
            `}</style>
        </>
    );
}

export default Docs;
