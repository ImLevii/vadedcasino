import {createResource, createSignal, onCleanup, For, Show} from "solid-js";
import {A} from "@solidjs/router";
import {api} from "../../util/api";

const FALLBACK_SLIDES = [
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

async function fetchSlides() {
  const res = await api('/slides', 'GET', null);
  if (!res?.success || !Array.isArray(res.data)) return FALLBACK_SLIDES;
  return res.data;
}

function resolveAsset(path) {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = import.meta.env.VITE_SERVER_URL || '';
  return `${base}${path}`;
}

function Carousel() {

  const [slides] = createResource(fetchSlides)
    const [index, setIndex] = createSignal(0)

    const timer = setInterval(() => {
    setIndex((i) => (i + 1) % (slides()?.length || FALLBACK_SLIDES.length))
    }, 6000)

    onCleanup(() => clearInterval(timer))

    return (
        <>
            <div class='carousel'>
                <div class='track' style={{transform: `translateX(-${index() * 100}%)`}}>
                <For each={slides() || FALLBACK_SLIDES}>{(slide) => (
                  <div
                    class='slide'
                    style={slide.backgroundImage ? { 'background-image': `linear-gradient(125deg, rgba(11,15,22,0.86), rgba(17,22,32,0.76), rgba(13,26,18,0.86)), url(${resolveAsset(slide.backgroundImage)})` } : {}}
                  >
                            {/* Decorative grid lines */}
                            <div class='slide-grid'/>

                            {/* Glow orbs */}
                            <div class='glow-orb orb-1'/>
                            <div class='glow-orb orb-2'/>

                            <div class='slide-content'>
                                <Show when={slide.tag}>
                                  <div class='slide-tag' style={{ color: slide.accentColor || '#1fd65f', borderColor: `${slide.accentColor || '#1fd65f'}55`, background: `${slide.accentColor || '#1fd65f'}1a` }}>{slide.tag}</div>
                                </Show>
                                <h1>{slide.title}</h1>
                                <Show when={slide.subtitle}><p>{slide.subtitle}</p></Show>
                                <Show when={slide.cta}><div class='cta' style={{ background: `radial-gradient(60% 60% at 50% 50%, ${slide.accentColor || '#1fd65f'} 0%, #18b853 100%)` }}>{slide.cta}</div></Show>
                            </div>

                              <Show when={slide.image} fallback={(
                                <div class='slide-art'>
                                  <div class='art-ring ring-1'/>
                                  <div class='art-ring ring-2'/>
                                  <div class='art-ring ring-3'/>
                                  <div class='art-dots'/>
                                </div>
                              )}>
                                <div class='slide-image-wrap'>
                                  <img src={resolveAsset(slide.image)} alt={slide.title} />
                                </div>
                              </Show>

                              <Show when={slide.href}>
                                <A href={slide.href} class='gamemode-link'/>
                              </Show>
                        </div>
                    )}</For>
                </div>

                {/* Dot indicators */}
                <div class='dots'>
                          <For each={slides() || FALLBACK_SLIDES}>{(_, i) => (
                        <button class={'dot ' + (index() === i() ? 'active' : '')}
                                onClick={() => setIndex(i())}/>
                    )}</For>
                </div>
            </div>

            <style jsx>{`
              .carousel {
                position: relative;
                width: 100%;
                height: clamp(230px, 18vw, 286px);

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
                background-size: cover;
                background-position: center;
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

              .slide-image-wrap {
                position: absolute;
                right: 54px;
                top: 50%;
                transform: translateY(-50%);
                width: 260px;
                height: 200px;
                z-index: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
              }

              .slide-image-wrap img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                display: block;
                filter: drop-shadow(0 20px 34px rgba(0,0,0,0.5));
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
                .carousel { height: 192px; border-radius: 10px; }

                .slide-content {
                  padding: 0 20px;
                  max-width: 88%;
                }

                .slide-content h1 { font-size: 22px; }
                .slide-content p { font-size: 12px; }
                .slide-tag { display: none; }

                .slide-art { display: none; }
                .slide-image-wrap { display: none; }

                .cta {
                  font-size: 11px;
                  padding: 9px 16px;
                }

                .dots { bottom: 11px; }
                .dot { width: 18px; }
                .dot.active { width: 28px; }
              }

              @media only screen and (max-width: 420px) {
                .carousel { height: 180px; }
                .slide-content { padding: 0 16px; max-width: 100%; gap: 8px; }
                .slide-content h1 { font-size: 19px; }
                .slide-content p { font-size: 10px; }
                .cta { padding: 8px 13px; font-size: 10px; }
              }
            `}</style>
        </>
    );
}

export default Carousel;
