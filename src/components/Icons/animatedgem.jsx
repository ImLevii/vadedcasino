function AnimatedGem(props) {

    const size = props.size || 96

    return (
        <>
            <div class='gem-wrapper' style={{width: `${size}px`, height: `${size}px`}}>
                <svg class='gem' width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="agTable" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#b8ffd4"/>
                            <stop offset="100%" stop-color="#5df592"/>
                        </linearGradient>
                        <linearGradient id="agCrownL" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#6bf79d"/>
                            <stop offset="100%" stop-color="#1fd65f"/>
                        </linearGradient>
                        <linearGradient id="agCrownR" x1="1" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#3fe377"/>
                            <stop offset="100%" stop-color="#14b04d"/>
                        </linearGradient>
                        <linearGradient id="agStar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#dcffe9"/>
                            <stop offset="100%" stop-color="#7dffab"/>
                        </linearGradient>
                        <linearGradient id="agPav1" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#17bd54"/>
                            <stop offset="100%" stop-color="#0a7a34"/>
                        </linearGradient>
                        <linearGradient id="agPav2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#31e06e"/>
                            <stop offset="100%" stop-color="#0f9440"/>
                        </linearGradient>
                        <linearGradient id="agPav3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#1cca59"/>
                            <stop offset="100%" stop-color="#0b6e2f"/>
                        </linearGradient>
                        <linearGradient id="agPav4" x1="1" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#12a848"/>
                            <stop offset="100%" stop-color="#064d1f"/>
                        </linearGradient>
                        <linearGradient id="agSheen" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
                            <stop offset="45%" stop-color="#ffffff" stop-opacity="0.55"/>
                            <stop offset="55%" stop-color="#ffffff" stop-opacity="0.55"/>
                            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                        </linearGradient>
                        <clipPath id="agGemClip">
                            <polygon points="96,74 160,74 208,120 128,208 48,120"/>
                        </clipPath>
                    </defs>

                    <g class='gem-float'>
                        <g class='gem-body'>
                            {/* crown */}
                            <polygon points="110,102 146,102 160,74 96,74" fill="url(#agTable)"/>
                            <polygon points="96,74 110,102 48,120" fill="url(#agCrownL)"/>
                            <polygon points="160,74 208,120 146,102" fill="url(#agCrownR)"/>
                            {/* star facets under table */}
                            <polygon points="110,102 146,102 128,120" fill="url(#agStar)"/>
                            <polygon points="48,120 110,102 128,120 88,120" fill="#2ade6c"/>
                            <polygon points="208,120 146,102 128,120 168,120" fill="#19b850"/>
                            {/* girdle */}
                            <rect x="48" y="118" width="160" height="4" fill="#0c8a3b" opacity="0.9"/>
                            {/* pavilion */}
                            <polygon points="48,120 88,120 128,208" fill="url(#agPav1)"/>
                            <polygon points="88,120 128,120 128,208" fill="url(#agPav2)"/>
                            <polygon points="128,120 168,120 128,208" fill="url(#agPav3)"/>
                            <polygon points="168,120 208,120 128,208" fill="url(#agPav4)"/>
                            {/* internal light bounce */}
                            <polygon points="112,132 144,132 128,168" fill="#7dffab" opacity="0.28"/>
                            {/* edge highlights */}
                            <polyline points="48,120 96,74 160,74 208,120" stroke="#eafff2" stroke-width="2.5" fill="none" opacity="0.85" stroke-linejoin="round"/>
                            <polyline points="48,120 128,208 208,120" stroke="#a4ffc6" stroke-width="1.8" fill="none" opacity="0.5" stroke-linejoin="round"/>
                            <line x1="48" y1="120" x2="208" y2="120" stroke="#c9ffdd" stroke-width="1.2" opacity="0.55"/>
                            <line x1="128" y1="120" x2="128" y2="208" stroke="#c9ffdd" stroke-width="1" opacity="0.3"/>

                            {/* moving light sweep, clipped to gem silhouette */}
                            <g clip-path="url(#agGemClip)">
                                <rect class='sheen' x="-90" y="40" width="70" height="190" fill="url(#agSheen)" transform="skewX(-18)"/>
                            </g>
                        </g>

                        {/* sparkles: 4-point stars */}
                        <g fill="#ffffff">
                            <path class='sparkle s1' d="M92 66 L95 76 L105 79 L95 82 L92 92 L89 82 L79 79 L89 76 Z"/>
                            <path class='sparkle s2' d="M186 118 L188.5 126 L196 128.5 L188.5 131 L186 139 L183.5 131 L176 128.5 L183.5 126 Z"/>
                            <path class='sparkle s3' d="M124 186 L126 192 L132 194 L126 196 L124 202 L122 196 L116 194 L122 192 Z"/>
                            <path class='sparkle s4' d="M64 108 L66 114 L72 116 L66 118 L64 124 L62 118 L56 116 L62 114 Z"/>
                        </g>
                    </g>

                    {/* ground reflection */}
                    <ellipse class='gem-shadow' cx="128" cy="228" rx="58" ry="9" fill="#1fd65f" opacity="0.18"/>
                </svg>
            </div>

            <style jsx>{`
              .gem-wrapper {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .gem-wrapper:before {
                content: '';
                position: absolute;
                inset: -14%;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(31, 214, 95, 0.5) 0%, rgba(31, 214, 95, 0.12) 45%, rgba(31, 214, 95, 0) 70%);
                animation: gem-glow 2.6s ease-in-out infinite;
                pointer-events: none;
              }

              .gem-float {
                animation: gem-float 4.2s ease-in-out infinite;
              }

              .gem-body {
                transform-origin: 128px 130px;
                animation: gem-rotate 3.6s linear infinite;
              }

              .sheen {
                animation: gem-sheen 3.6s cubic-bezier(.4, 0, .2, 1) infinite;
              }

              .gem-shadow {
                transform-origin: 128px 228px;
                animation: gem-shadow 4.2s ease-in-out infinite;
              }

              .sparkle {
                opacity: 0;
                transform-box: fill-box;
                transform-origin: center;
                animation: gem-sparkle 3.6s ease-in-out infinite;
              }

              .sparkle.s2 {
                animation-delay: 0.9s;
              }

              .sparkle.s3 {
                animation-delay: 1.8s;
              }

              .sparkle.s4 {
                animation-delay: 2.7s;
              }

              @keyframes gem-glow {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.08); }
              }

              @keyframes gem-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-7px); }
              }

              @keyframes gem-rotate {
                0% { transform: scaleX(1); filter: brightness(1); }
                12.5% { transform: scaleX(0.72); filter: brightness(0.92); }
                25% { transform: scaleX(0.05); filter: brightness(0.7); }
                37.5% { transform: scaleX(-0.72); filter: brightness(0.92); }
                50% { transform: scaleX(-1); filter: brightness(1.05); }
                62.5% { transform: scaleX(-0.72); filter: brightness(0.92); }
                75% { transform: scaleX(-0.05); filter: brightness(0.7); }
                87.5% { transform: scaleX(0.72); filter: brightness(0.92); }
                100% { transform: scaleX(1); filter: brightness(1); }
              }

              @keyframes gem-sheen {
                0% { transform: skewX(-18deg) translateX(0); }
                40%, 100% { transform: skewX(-18deg) translateX(360px); }
              }

              @keyframes gem-shadow {
                0%, 100% { opacity: 0.18; transform: scaleX(1); }
                50% { opacity: 0.1; transform: scaleX(0.88); }
              }

              @keyframes gem-sparkle {
                0%, 12%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); }
                6% { opacity: 1; transform: scale(1) rotate(90deg); }
              }
            `}</style>
        </>
    )
}

export default AnimatedGem
