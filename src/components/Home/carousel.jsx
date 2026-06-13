import {createSignal, onCleanup, For} from "solid-js";
import {A} from "@solidjs/router";

const SLIDES = [
    {
        title: 'DEPOSIT MATCH BONUSES',
        subtitle: 'FOR NEW AND EXISTING USERS',
        cta: 'DEPOSIT NOW',
        href: '/deposit',
        accentColor: '#1fd65f',
        tag: '🎁 LIMITED OFFER',
    },
    {
        title: 'EVEN BETTER FREE CASES',
        subtitle: 'GET SUPERCHARGED NOW',
        cta: 'OPEN NOW',
        href: '/cases',
        accentColor: '#1fd65f',
        tag: '🎰 DAILY FREE',
    },
    {
        title: 'REFER & EARN REWARDS',
        subtitle: 'INVITE FRIENDS AND EARN COMMISSION',
        cta: 'GET STARTED',
        href: '/affiliates',
        accentColor: '#1fd65f',
        tag: '💰 EARN MORE',
    },
]

function Carousel() {

    const [index, setIndex] = createSignal(0)

    const timer = setInterval(() => {
        setIndex((i) => (i + 1) % SLIDES.length)
    }, 6000)

    onCleanup(() => clearInterval(timer))

    return (
        <>
            <div class='carousel'>
                <div class='track' style={{transform: `translateX(-${index() * 100}%)`}}>
                    <For each={SLIDES}>{(slide) => (
                        <div class='slide'>
                            {/* Decorative grid lines */}
                            <div class='slide-grid'/>

                            {/* Glow orbs */}
                            <div class='glow-orb orb-1'/>
                            <div class='glow-orb orb-2'/>

                            <div class='slide-content'>
                                <div class='slide-tag'>{slide.tag}</div>
                                <h1>{slide.title}</h1>
                                <p>{slide.subtitle}</p>
                                <div class='cta'>{slide.cta}</div>
                            </div>

                            <div class='slide-art'>
                                <div class='art-ring ring-1'/>
                                <div class='art-ring ring-2'/>
                                <div class='art-ring ring-3'/>
                                <div class='art-dots'/>
                            </div>

                            <A href={slide.href} class='gamemode-link'/>
                        </div>
                    )}</For>
                </div>

                {/* Dot indicators */}
                <div class='dots'>
                    <For each={SLIDES}>{(_, i) => (
                        <button class={'dot ' + (index() === i() ? 'active' : '')}
                                onClick={() => setIndex(i())}/>
                    )}</For>
                </div>
            </div>

            <style jsx>{`
              .carousel {
                position: relative;
                width: 100%;
                height: 240px;

                border-radius: 14px;
                overflow: hidden;
                border: 1px solid rgba(31, 214, 95, 0.12);
                box-shadow: 0 0 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
              }

              .track {
                display: flex;
                width: 100%;
                height: 100%;
                transition: transform .65s cubic-bezier(.65, 0, .35, 1);
              }

              .slide {
                position: relative;
                min-width: 100%;
                height: 100%;

                display: flex;
                align-items: center;

                background: linear-gradient(125deg, #0b0f16 0%, #111620 50%, #0d1a12 100%);
                overflow: hidden;
              }

              /* Subtle grid overlay */
              .slide-grid {
                position: absolute;
                inset: 0;
                background-image:
                  linear-gradient(rgba(31,214,95,0.04) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(31,214,95,0.04) 1px, transparent 1px);
                background-size: 40px 40px;
                mask-image: radial-gradient(ellipse 70% 100% at 60% 50%, transparent 30%, black 100%);
              }

              /* Ambient glow orbs */
              .glow-orb {
                position: absolute;
                border-radius: 50%;
                filter: blur(60px);
                pointer-events: none;
              }

              .orb-1 {
                width: 320px;
                height: 320px;
                right: -60px;
                top: -80px;
                background: rgba(31, 214, 95, 0.18);
              }

              .orb-2 {
                width: 200px;
                height: 200px;
                right: 200px;
                bottom: -60px;
                background: rgba(31, 214, 95, 0.08);
              }

              .slide-content {
                position: relative;
                z-index: 2;
                padding: 0 52px;
                max-width: 58%;

                display: flex;
                flex-direction: column;
                gap: 10px;
              }

              .slide-tag {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                width: fit-content;

                padding: 4px 10px;
                border-radius: 20px;
                border: 1px solid rgba(31, 214, 95, 0.3);
                background: rgba(31, 214, 95, 0.1);

                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                color: #1fd65f;
                letter-spacing: .5px;
                text-transform: uppercase;
              }

              .slide-content h1 {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 800;
                font-size: 36px;
                line-height: 1.05;
                color: #fff;
                text-shadow: 0 0 40px rgba(31, 214, 95, 0.4);
                letter-spacing: -.5px;
              }

              .slide-content p {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 600;
                font-size: 14px;
                color: #8b92a0;
                letter-spacing: .3px;
              }

              .cta {
                width: fit-content;
                margin-top: 6px;
                padding: 11px 24px;
                border-radius: 8px;

                background: radial-gradient(60% 60% at 50% 50%, #25e06b 0%, #18b853 100%);
                box-shadow: 0px 2px 0px 0px #16a049, 0px -2px 0px 0px #5ceb90, 0 0 20px rgba(31,214,95,0.3);

                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 800;
                font-size: 13px;
                color: #fff;
                text-decoration: none;
                letter-spacing: .5px;

                transition: filter .2s, transform .15s;
              }

              .cta:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
              }

              /* Decorative rings on the right */
              .slide-art {
                position: absolute;
                right: 80px;
                top: 50%;
                transform: translateY(-50%);
                width: 220px;
                height: 220px;
                z-index: 1;
              }

              .art-ring {
                position: absolute;
                border-radius: 50%;
                border: 1px solid rgba(31, 214, 95, 0.2);
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              }

              .ring-1 {
                width: 220px;
                height: 220px;
                border-color: rgba(31,214,95,0.12);
                animation: pulse-ring 4s ease-in-out infinite;
              }

              .ring-2 {
                width: 160px;
                height: 160px;
                border-color: rgba(31,214,95,0.2);
                animation: pulse-ring 4s ease-in-out infinite .5s;
                background: rgba(31,214,95,0.03);
              }

              .ring-3 {
                width: 90px;
                height: 90px;
                border-color: rgba(31,214,95,0.4);
                background: rgba(31,214,95,0.08);
                animation: pulse-ring 4s ease-in-out infinite 1s;
              }

              .art-dots {
                position: absolute;
                inset: 0;
                background-image: radial-gradient(circle, rgba(31,214,95,0.5) 1px, transparent 1px);
                background-size: 18px 18px;
                border-radius: 50%;
                opacity: 0.4;
                mask-image: radial-gradient(circle, black 40%, transparent 70%);
              }

              /* Dots nav */
              .dots {
                position: absolute;
                bottom: 16px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 3;

                display: flex;
                gap: 6px;
              }

              .dot {
                width: 24px;
                height: 4px;
                border-radius: 99px;
                border: none;
                outline: none;
                padding: 0;

                background: rgba(255, 255, 255, 0.18);
                cursor: pointer;
                transition: background .25s, width .3s;
              }

              .dot.active {
                width: 36px;
                background: #1fd65f;
                box-shadow: 0 0 10px rgba(31, 214, 95, 0.7);
              }

              @keyframes pulse-ring {
                0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
              }

              @media only screen and (max-width: 700px) {
                .carousel { height: 180px; }

                .slide-content {
                  padding: 0 24px;
                  max-width: 78%;
                }

                .slide-content h1 { font-size: 22px; }
                .slide-content p { font-size: 12px; }
                .slide-tag { display: none; }

                .slide-art { display: none; }

                .cta {
                  font-size: 11px;
                  padding: 9px 16px;
                }
              }
            `}</style>
        </>
    );
}

export default Carousel;
