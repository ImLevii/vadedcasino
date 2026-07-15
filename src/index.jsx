import {render} from 'solid-js/web';

import './fonts.css'
import './index.css';
import App from './App';
import {Router} from '@solidjs/router';

import {WebsocketProvider} from "./contexts/socketprovider";
import {UserProvider} from "./contexts/usercontextprovider";
import {RainProvider} from "./contexts/raincontext";
import {Meta, MetaProvider, Title} from "@solidjs/meta";

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(
        'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got mispelled?',
    );
}

render(() => <>
    <UserProvider>
        <WebsocketProvider>
            <RainProvider>
                <Router>
                    <MetaProvider>
                        <Title>Cosmic Luck | Win Big on the Best Casino Gaming Site</Title>
                        <Meta name='title' content='Cosmic Luck | Win Big on the Best Casino Gaming Site'></Meta>
                        <Meta name='description' content='Cosmic Luck: Play our premium games such as Case Battles, Loot Unboxing, Crash, Roulette, Coinflip and Mines. Win Coins and withdraw crypto instantly!'></Meta>

                        <App/>
                    </MetaProvider>
                </Router>
            </RainProvider>
        </WebsocketProvider>
    </UserProvider>
</>, root);
