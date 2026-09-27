import {createResource, createSignal, onMount, onCleanup, For, Show} from "solid-js";
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
    const [reducedMotion, setReducedMotion] = createSignal(true)

    onMount(() => {
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
      const updateMotion = () => setReducedMotion(preference.matches)
      updateMotion()
      preference.addEventListener('change', updateMotion)
      onCleanup(() => preference.removeEventListener('change', updateMotion))
    })

    const timer = setInterval(() => {
    setIndex((i) => (i + 1) % (slides()?.length || FALLBACK_SLIDES.length))
    }, 6000)

    onCleanup(() => clearInterval(timer))

    return (
        <>
            <div class='carousel'>
              <div class='header-media'>
                <img class='header-animation' src='/assets/animations/cosmicluck-header-animation.webp' alt='' aria-hidden='true' />
                <Show when={!reducedMotion()}>
                  <video class='header-animation' autoplay muted loop playsinline preload='auto'
                         poster='/assets/animations/cosmicluck-header-animation.webp' aria-hidden='true'>
                    <source src='/assets/animations/cosmicluck-header-animation.mp4' type='video/mp4' />
                  </video>
                </Show>
              </div>
                <div class='track' style={{transform: `translateX(-${index() * 100}%)`}}>
                <For each={slides() || FALLBACK_SLIDES}>{(slide) => (
                  <div
                    class='slide'
                    style={slide.backgroundImage ? { 'background-image': `linear-gradient(125deg, rgba(11,15,22,0.86), rgba(17,22,32,0.76), rgba(13,26,18,0.86)), url(${resolveAsset(slide.backgroundImage)})` } : {}}
                  >
                            <div class='slide-content'>
                                <Show when={slide.tag}>
                                  <div class='slide-tag' style={{ color: slide.accentColor || '#1fd65f', borderColor: `${slide.accentColor || '#1fd65f'}55`, background: `${slide.accentColor || '#1fd65f'}1a` }}>{slide.tag}</div>
                                </Show>
                                <h1>{slide.title}</h1>
                                <Show when={slide.subtitle}><p>{slide.subtitle}</p></Show>
                                <Show when={slide.cta}><div class='cta' style={{ background: `radial-gradient(60% 60% at 50% 50%, ${slide.accentColor || '#1fd65f'} 0%, #18b853 100%)` }}>{slide.cta}</div></Show>
                            </div>

                              <Show when={slide.image}>
                                <div class='slide-image-wrap'>
                                  <img src={resolveAsset(slide.image)} alt={slide.title} />
                                </div>
                              </Show>

                              <Show when={slide.href}>
                                <A href={slide.href} class='gamemode-link' aria-label={slide.cta || slide.title}/>
                              </Show>
                        </div>
                    )}</For>
                </div>

                {/* Dot indicators */}
                <div class='dots'>
                          <For each={slides() || FALLBACK_SLIDES}>{(_, i) => (
                        <button class={'dot ' + (index() === i() ? 'active' : '')}
                                aria-label={`Show slide ${i() + 1}`} aria-current={index() === i() ? 'true' : undefined}
                                onClick={() => setIndex(i())}/>
                    )}</For>
                </div>
            </div>

            <style jsx>{`
              .carousel {
                position: relative;
                width: 100%;
                box-sizing: border-box;
                margin-inline: auto;
                container-type: inline-size;

                border-radius: 12px;
                overflow: hidden;
                background: linear-gradient(110deg, #15332d, #202c34 60%);
                border: 1px solid rgba(91, 220, 153, 0.22);
                box-shadow: 0 12px 28px rgba(0,0,0,0.22);
              }

              .header-media {
                position: relative;
                /* A full-width banner with the video never larger than its source. */
                width: min(100%, 1170px);
                margin-left: auto;
                aspect-ratio: 13 / 3;
                mask-image: linear-gradient(90deg, transparent, #000 22%);
                overflow: hidden;
              }

              .track {
                position: absolute;
                inset: 0;
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

                background-size: cover;
                background-position: center;
                overflow: hidden;
              }

              .header-animation {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                display: block;
                object-fit: contain;
                object-position: center;
                pointer-events: none;
              }

              .slide-content {
                position: relative;
                z-index: 2;
                box-sizing: border-box;
                padding: 20px clamp(24px, 5cqw, 72px) 32px;
                width: 70%;
                pointer-events: none;

                display: flex;
                flex-direction: column;
                gap: clamp(6px, .8cqw, 10px);
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
                font-size: clamp(20px, 2.6cqw, 36px);
                line-height: 1.12;
                color: #fff;
                text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
                letter-spacing: -.5px;
              }

              .slide-content p {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-weight: 600;
                font-size: clamp(11px, 1.1cqw, 15px);
                line-height: 1.45;
                color: #bed1ce;
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

              .slide:has(.gamemode-link:hover) .cta {
                filter: brightness(1.1);
                transform: translateY(-1px);
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

              @container (max-width: 700px) {
                .header-media { mask-image: none; }
                .track {
                  position: relative;
                  inset: auto;
                  height: auto;
                }

                .slide {
                  height: auto;
                  align-items: flex-start;
                  background-color: #202c34;
                }

                .slide-content {
                  padding: 18px 24px 40px;
                  width: 100%;
                  gap: 8px;
                }

                .slide-content h1 { font-size: 22px; }
                .slide-content p { font-size: 12px; }

                .slide-image-wrap { display: none; }

                .cta {
                  font-size: 11px;
                  padding: 9px 16px;
                }

                .dots { bottom: 16px; }
                .dot { width: 18px; }
                .dot.active { width: 28px; }
              }

              @container (max-width: 380px) {
                .slide-content { padding-inline: 18px; }
                .slide-content h1 { font-size: 20px; }
              }

              @media (prefers-reduced-motion: reduce) {
                .track, .dot, .cta { transition: none; }
              }
            `}</style>
        </>
    );
}

export default Carousel;
