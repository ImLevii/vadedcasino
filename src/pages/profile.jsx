import {A, Outlet, useLocation} from "@solidjs/router";
import {useUser} from "../contexts/usercontextprovider";
import Level from "../components/Level/level";
import {getUserLevel, getUserNextLevel, progressToNextLevel, xpForLevel} from "../resources/levels";
import Avatar from "../components/Level/avatar";
import {Title} from "@solidjs/meta";

function Profile(props) {

    const location = useLocation()
    const [user] = useUser()

    function isActive(page) {
        if (page === '') return location?.pathname === '/profile' || location?.pathname === '/profile/'
        return location?.pathname?.includes(page)
    }

    return (
        <>
            <Title>Cosmic Luck | Profile</Title>

            <div class='profile-container fadein'>

                <div class='pages'>
                    <button class={'page ' + (isActive('') ? 'active' : '')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 19" fill="none">
                            <path d="M7.99971 0.104492C5.35299 0.104492 3.19971 2.25777 3.19971 4.90449C3.19971 7.55121 5.35299 9.70449 7.99971 9.70449C10.6464 9.70449 12.7997 7.55121 12.7997 4.90449C12.7997 2.25777 10.6464 0.104492 7.99971 0.104492Z" fill="currentColor"/>
                            <path d="M13.9721 12.8403C12.658 11.506 10.9159 10.7712 9.06667 10.7712H6.93333C5.08416 10.7712 3.34201 11.506 2.02788 12.8403C0.720178 14.1681 0 15.9208 0 17.7756C0 18.0702 0.238791 18.309 0.533333 18.309H15.4667C15.7612 18.309 16 18.0702 16 17.7756C16 15.9208 15.2798 14.1681 13.9721 12.8403Z" fill="currentColor"/>
                        </svg>
                        Profile
                        <A href='/profile' class='gamemode-link'></A>
                    </button>
                    <button class={'page ' + (isActive('transactions') ? 'active' : '')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4ZM4 8V10H20V8H4ZM4 14H12V16H4V14Z" fill="currentColor"/>
                        </svg>
                        Transactions
                        <A href='/profile/transactions' class='gamemode-link'></A>
                    </button>
                    <button class={'page ' + (isActive('history') ? 'active' : '')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L4.96 16.03L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z" fill="currentColor"/>
                        </svg>
                        History
                        <A href='/profile/history' class='gamemode-link'></A>
                    </button>
                    <button class={'page ' + (isActive('settings') ? 'active' : '')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M19.14 12.94C19.18 12.64 19.2 12.33 19.2 12C19.2 11.68 19.18 11.36 19.13 11.06L21.16 9.48C21.34 9.34 21.39 9.07 21.28 8.87L19.36 5.55C19.24 5.33 18.99 5.26 18.77 5.33L16.38 6.29C15.88 5.91 15.35 5.59 14.76 5.35L14.4 2.81C14.36 2.57 14.16 2.4 13.92 2.4H10.08C9.84 2.4 9.65 2.57 9.61 2.81L9.25 5.35C8.66 5.59 8.12 5.92 7.63 6.29L5.24 5.33C5.02 5.25 4.77 5.33 4.65 5.55L2.74 8.87C2.62 9.08 2.66 9.34 2.86 9.48L4.89 11.06C4.84 11.36 4.8 11.69 4.8 12C4.8 12.31 4.82 12.64 4.87 12.94L2.84 14.52C2.66 14.66 2.61 14.93 2.72 15.13L4.64 18.45C4.76 18.67 5.01 18.74 5.23 18.67L7.62 17.71C8.12 18.09 8.65 18.41 9.24 18.65L9.6 21.19C9.65 21.43 9.84 21.6 10.08 21.6H13.92C14.16 21.6 14.36 21.43 14.39 21.19L14.75 18.65C15.34 18.41 15.88 18.09 16.37 17.71L18.76 18.67C18.98 18.75 19.23 18.67 19.35 18.45L21.27 15.13C21.39 14.91 21.34 14.66 21.15 14.52L19.14 12.94ZM12 15.6C10.02 15.6 8.4 13.98 8.4 12C8.4 10.02 10.02 8.4 12 8.4C13.98 8.4 15.6 10.02 15.6 12C15.6 13.98 13.98 15.6 12 15.6Z" fill="currentColor"/>
                        </svg>
                        Settings
                        <A href='/profile/settings' class='gamemode-link'></A>
                    </button>
                </div>

                <div class='header-cards'>
                    <div class='user-card'>
                        <Avatar id={user()?.id} xp={user()?.xp} height='70'/>
                        <div class='user-card-info'>
                            <p class='username'>{user()?.username}</p>
                            <p class='label'>Coins</p>
                            <p class='balance'>
                                <img src='/assets/icons/coin.svg' height='15' width='15' alt=''/>
                                {(user()?.balance || 0)?.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </p>
                        </div>
                    </div>

                    <div class='xp-card'>
                        <Level xp={xpForLevel(user()?.xp || 0)}/>
                        <div class='xp-info'>
                            <p class='xp-amount'>{Math.floor(user()?.xp || 0)?.toLocaleString()} XP</p>
                            <p class='label'>Remaining XP to Level {getUserLevel(user()?.xp || 0) + 1}</p>
                            <div class='level-container'>
                                <div class='xp-bar' style={{width: `${Math.max(1, 100 - progressToNextLevel(user()?.xp || 0))}%`}}/>
                            </div>
                        </div>
                        <Level xp={getUserNextLevel(user()?.xp || 0)}/>
                    </div>
                </div>

                <Outlet/>
            </div>

            <style jsx>{`
              .profile-container {
                width: 100%;
                max-width: 1175px;
                height: fit-content;

                box-sizing: border-box;
                padding: 30px 0;
                margin: 0 auto;
              }

              .pages {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 25px;
              }

              .page {
                display: flex;
                align-items: center;
                gap: 8px;

                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 13px;
                font-weight: 700;

                padding: 0 15px;
                height: 36px;

                outline: unset;
                border-radius: 5px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                color: #8b92a0;

                position: relative;
                cursor: pointer;
                transition: all .2s;
              }

              .page:hover {
                color: #FFF;
              }

              .page.active {
                color: #1fd65f;
                border: 1px solid rgba(31, 214, 95, 0.35);
                background: rgba(31, 214, 95, 0.08);
              }

              .header-cards {
                display: flex;
                gap: 12px;
                margin-bottom: 30px;
              }

              .user-card {
                display: flex;
                align-items: center;
                gap: 18px;

                flex: 1 1 320px;
                min-width: 280px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 20px;
              }

              .user-card-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }

              .username {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 16px;
                font-weight: 700;
              }

              .label {
                color: #8b92a0;
                font-size: 13px;
                font-weight: 600;
              }

              .balance {
                display: flex;
                align-items: center;
                gap: 6px;

                color: #1fd65f;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 15px;
                font-weight: 700;
              }

              .xp-card {
                display: flex;
                align-items: center;
                gap: 20px;

                flex: 2 1 500px;

                border-radius: 8px;
                background: #1a1f29;
                border: 1px solid #2c3340;
                padding: 20px;
              }

              .xp-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 6px;
              }

              .xp-amount {
                color: #FFF;
                font-family: "Geogrotesque Wide", sans-serif;
                font-size: 16px;
                font-weight: 700;
              }

              .level-container {
                width: 100%;
                height: 10px;
                border-radius: 2525px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.07);
                padding: 2px;
                box-sizing: border-box;
              }

              .xp-bar {
                height: 100%;
                background: linear-gradient(90deg, #18c255 0%, #1fd65f 60%, #45e57f 100%);
                border-radius: 2525px;
                box-shadow: 0 0 10px rgba(31, 214, 95, 0.5);
              }

              @media only screen and (max-width: 1000px) {
                .profile-container {
                  padding-bottom: 90px;
                }

                .header-cards {
                  flex-direction: column;
                }
              }
            `}</style>
        </>
    );
}

export default Profile;

