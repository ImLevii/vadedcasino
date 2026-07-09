import {A, Outlet, useLocation, useSearchParams} from "@solidjs/router";
import {useUser} from "../contexts/usercontextprovider";

const URL_TO_PAGE = {
    '/admin': 'DASHBOARD',
    '/admin/users': 'USERS',
    '/admin/user': 'USERS',
    '/admin/statistics': 'STATISTICS',
    '/admin/filter': 'FILTER',
    '/admin/cashier': 'CASHIER',
    '/admin/rain': 'RAIN',
    '/admin/announcements': 'ANNOUNCEMENTS',
    '/admin/cases': 'CASES',
    '/admin/rewards': 'REWARDS',
    '/admin/slides': 'SLIDER',
    '/admin/statsbook': 'STATSBOOK',
    '/admin/settings': 'SETTINGS'
}

function Admin(props) {

    const location = useLocation()
    const [user] = useUser()
    const [params, setParams] = useSearchParams()

    return (
        <>
            <div class='admin-container fadein'>

                <div class='banner'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#1fd65f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'/></svg>
                    <p>ADMIN PANEL</p>
                    <div class='line'/>
                </div>

                <div class='user-info'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="19" viewBox="0 0 16 19" fill="none">
                        <path d="M7.99971 0.104492C5.35299 0.104492 3.19971 2.25777 3.19971 4.90449C3.19971 7.55121 5.35299 9.70449 7.99971 9.70449C10.6464 9.70449 12.7997 7.55121 12.7997 4.90449C12.7997 2.25777 10.6464 0.104492 7.99971 0.104492Z" fill="#8b92a0"/>
                        <path d="M13.9721 12.8403C12.658 11.506 10.9159 10.7712 9.06667 10.7712H6.93333C5.08416 10.7712 3.34201 11.506 2.02788 12.8403C0.720178 14.1681 0 15.9208 0 17.7756C0 18.0702 0.238791 18.309 0.533333 18.309H15.4667C15.7612 18.309 16 18.0702 16 17.7756C16 15.9208 15.2798 14.1681 13.9721 12.8403Z" fill="#8b92a0"/>
                    </svg>

                    <p>
                        ADMIN USER -
                        &nbsp;<span class='gold id'>ACCOUNT ID</span>
                        &nbsp;<span class='id gray'>{user()?.id}</span>
                    </p>

                    <div class='pages-container'>
                        {URL_TO_PAGE[location?.pathname] === 'CASHIER' && (
                            <div className='pages bevel-light' onClick={(e) => e.currentTarget.classList.toggle('active')}>
                                <p>{params?.type || 'COINS'}</p>

                                <div className='pages-dropdown' onClick={(e) => e.stopPropagation()}>
                                    <p onClick={() => setParams({ type: null })}>COINS</p>
                                    <p onClick={() => setParams({ type: 'crypto' })}>CRYPTO</p>
                                </div>
                            </div>
                        )}

                        <div class='pages bevel-light' onClick={(e) => e.currentTarget.classList.toggle('active')}>
                            <p>{URL_TO_PAGE[location?.pathname]}</p>

                            <div class='pages-dropdown' onClick={(e) => e.stopPropagation()}>
                                <A href='/admin' class='admin-link'>DASHBOARD</A>
                                <A href='/admin/users' class='admin-link'>USERS</A>
                                <A href='/admin/statistics' class='admin-link'>STATISTICS</A>
                                <A href='/admin/filter' class='admin-link'>FILTER</A>
                                <A href='/admin/cashier' class='admin-link'>CASHIER</A>
                                <A href='/admin/rain' class='admin-link'>RAIN</A>
                                <A href='/admin/announcements' class='admin-link'>ANNOUNCEMENTS</A>
                                <A href='/admin/cases' class='admin-link'>CASES</A>
                                <A href='/admin/rewards' class='admin-link'>REWARDS</A>
                                <A href='/admin/slides' class='admin-link'>SLIDER</A>
                                <A href='/admin/statsbook' class='admin-link'>STATSBOOK</A>
                                <A href='/admin/settings' class='admin-link'>SETTINGS</A>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='bar' style={{margin: '25px 0 30px 0'}}/>

                <Outlet/>
            </div>

            <style jsx>{`
              .admin-container {
                width: 100%;
                max-width: 1175px;
                height: fit-content;

                box-sizing: border-box;
                padding: 30px 0;
                margin: 0 auto;
              }

              .bar {
                width: 100%;
                height: 1px;
                min-height: 1px;
                background: rgba(255,255,255,0.06);
              }
              
              .user-info {
                display: flex;
                gap: 10px;
                align-items: center;

                color: #c3cad6;
                font-size: 14px;
                font-weight: 700;
              }
              
              .pages-container {
                margin-left: auto;
                display: flex;
                gap: 10px;
              }
              
              .pages {
                display: flex;
                gap: 8px;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 700;
                position: relative;
                user-select: none;
                width: 130px;
                height: 36px;
                border-radius: 6px;
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.07);
                color: #c3cad6;
              }
              
              .pages-dropdown {
                display: none;
                position: absolute;
                z-index: 10;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid rgba(255,255,255,0.07);
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                
                flex-direction: column;
                
                width: 100%;
                top: 42px;
                
                padding: 6px;
                gap: 2px;
              }
              
              .pages {
                text-transform: uppercase;
              }
              
              .pages-dropdown a {
                color: #6b7280;
                font-size: 11px;
                font-weight: 700;
                padding: 6px 10px;
                border-radius: 4px;
                transition: background .15s, color .15s;
                text-decoration: none;
              }
              
              .pages-dropdown a:hover {
                background: rgba(255,255,255,0.06);
                color: #c3cad6;
              }
              
              .active .pages-dropdown {
                display: flex;
              }
              
              .id {
                font-size: 14px;
              }
              
              .id.gray {
                color: #6b7280;
                font-weight: 500;
              }
              
              .banner {
                outline: unset;
                border: unset;
                border-left: 3px solid rgba(31,214,95,0.5);

                width: 100%;
                height: 44px;

                border-radius: 0 6px 6px 0;
                background: linear-gradient(90deg, rgba(31,214,95,0.08) 0%, rgba(18,21,28,0) 60%);

                padding: 0 16px;
                display: flex;
                align-items: center;
                gap: 10px;

                color: #c3cad6;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 0.05em;
                
                margin-bottom: 24px;
              }

              .line {
                flex: 1;
                height: 1px;

                background: linear-gradient(90deg, rgba(31,214,95,0.2) 0%, transparent 100%);
              }

              @media only screen and (max-width: 1000px) {
                .admin-container {
                  padding-bottom: 90px;
                }
              }
            `}</style>
        </>
    );
}

export default Admin
