import {A, useSearchParams} from '@solidjs/router';
import {Title} from '@solidjs/meta';
import {createEffect, createResource, createSignal, For, on, onCleanup, Show} from 'solid-js';
import {useUser} from '../contexts/usercontextprovider';
import {authedAPI} from '../util/api';
import './rewardshub.css';

const features = [
    {title:'Daily cases', detail:'Your daily rewards', image:'dailycases', href:'/rewards/daily', auth:true},
    {title:'Supercharge cases', detail:'Unlock more bonuses', image:'superchargecases', href:'/rewards/supercharge', auth:true},
    {title:'Rankings', detail:'Explore the leaderboards', image:'rankings', href:'/leaderboard'},
    {title:'Affiliates', detail:'Invite friends and earn', image:'affiliates', href:'/affiliates', auth:true}
];
const tiers = ['instant','daily','weekly','monthly'];

export default function RewardsHub() {
    const [user] = useUser();
    const [params,setParams] = useSearchParams();
    const [rakeback,{refetch}] = createResource(()=>user()?.id,async()=>{
        const data = await authedAPI('/user/rakeback','GET',null);
        return data?.serverTime ? {...data,clockOffset:data.serverTime-Date.now()} : null;
    });
    const [now,setNow] = createSignal(Date.now());
    const timer = setInterval(()=>setNow(Date.now()),1000);
    onCleanup(()=>clearInterval(timer));
    createEffect(on(()=>params.modal,(modal,previous)=>{
        if(previous==='rakeback' && modal!=='rakeback' && user()) refetch();
    }));
    function status(type) {
        if (!user()) return 'Sign in to view';
        if (rakeback.loading) return 'Loading rewards...';
        const item = rakeback()?.[type];
        if (!item) return 'Unavailable';
        if (item.canClaim) return 'Ready to claim';
        const left = new Date(item.canClaimAt).getTime()-now()-(rakeback()?.clockOffset || 0);
        if (left<=0) return item.unclaimedRakeback>=item.min ? 'View reward' : 'No activity';
        const minutes = Math.ceil(left/60000);
        return `${Math.floor(minutes/1440)}d ${Math.floor(minutes%1440/60)}h ${minutes%60}m`;
    }
    function openRewards() {setParams({modal:user() ? 'rakeback' : 'login'});}
    return <main class='rewards-hub'>
        <Title>Cosmic Luck | Rewards</Title>
        <div class='rewards-hub-heading'><div><p>YOUR COSMIC LUCK BENEFITS</p><h1>Rewards</h1></div><button type='button' onClick={openRewards}>{user() ? 'View rakeback' : 'Sign in to claim'}</button></div>
        <section class='rewards-hub-hero' aria-label='Rewards overview'>
            <div><span>MORE WAYS TO GET REWARDED</span><h2>All your bonuses.<br/><strong>One place.</strong></h2><p>Daily cases, supercharge rewards and rakeback.</p></div>
            <img src='/assets/thumbnails/rewards.webp' alt='' fetchpriority='high'/>
        </section>
        <div class='rewards-hub-features'><For each={features}>{feature=><A href={feature.href} onClick={event=>{
            if(feature.auth && !user()){event.preventDefault();setParams({modal:'login'});}
        }}><img src={`/assets/thumbnails/${feature.image}.webp`} alt='' loading='lazy'/><div><h3>{feature.title}</h3><p>{feature.detail}</p><span aria-hidden='true'>&#8250;</span></div></A>}</For></div>
        <section class='rewards-hub-rakeback' aria-labelledby='rakeback-heading'>
            <div class='rewards-hub-section-heading'><h2 id='rakeback-heading'>Your rakeback</h2><button type='button' onClick={openRewards}>View &amp; claim</button></div>
            <Show when={user() && !rakeback.loading && !rakeback()}><p class='rewards-hub-error' role='status'>Rewards could not be loaded. <button type='button' onClick={refetch}>Try again</button></p></Show>
            <div class='rewards-hub-tiers'><For each={tiers}>{type=><article classList={{ready:rakeback()?.[type]?.canClaim}}>
                <h3>{type} rakeback</h3><div class='rewards-hub-symbol'><svg viewBox='0 0 32 32' fill='none' stroke='currentColor' stroke-width='1.4' aria-hidden='true'><path d='M26 11A11 11 0 0 0 8 7L5 10m0-6v6h6M6 21a11 11 0 0 0 18 4l3-3m0 6v-6h-6'/><path d='M20 12h-6a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-6M16 9v18' transform='translate(0 -2)'/></svg></div>
                <p class='rewards-hub-amount'><img src='/assets/icons/coin.svg' alt='Coins' width='16' height='16'/>{(rakeback()?.[type]?.unclaimedRakeback || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
                <p class='rewards-hub-status'>{status(type)}</p>
            </article>}</For></div>
            <details class='rewards-hub-info'><summary>How rakeback works</summary><p>A portion of the house edge from eligible, completed wagers is returned as rakeback. Instant, daily, weekly and monthly rewards each have their own claim schedule and minimum amount. Open your rakeback to see the current requirements and claim available rewards.</p></details>
        </section>
    </main>;
}
