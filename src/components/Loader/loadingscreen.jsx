function LoadingScreen(props) {
    return (
        <>
            <div class='loader-container'>
                <div class='logo-wrap'>
                    <img class='logo' src='/assets/logo/cosmic-luck-logo.png' height='90' alt='Cosmic Luck'/>
                </div>

                <div class='progress-track'>
                    <div class='progress-fill'>
                        <div class='progress-sheen'/>
                    </div>
                </div>

                <div class='status'>
                  <p>Initializing secure session</p>
                  <span class='dots'>...</span>
                </div>

                <div className='background'/>
                <div class='vignette'/>
            </div>

            <style jsx>{`
              .loader-container {
                position: relative;
                overflow: hidden;

                height: 100vh;
                width: 100vw;
                padding: 32px;
                
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 34px;

                background: radial-gradient(circle at 50% 28%, #111a24 0%, #0b111a 48%, #080d14 100%);
              }

              .logo-wrap {
                position: relative;
                z-index: 2;
                padding: 18px 28px;
                border-radius: 16px;
                border: 1px solid rgba(127, 239, 175, 0.2);
                background: linear-gradient(145deg, rgba(26, 37, 52, 0.56) 0%, rgba(12, 18, 27, 0.62) 100%);
                backdrop-filter: blur(8px);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 20px 40px rgba(0, 0, 0, 0.4);
              }
              
              .logo {
                display: block;
                animation: logo-in 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
              }
              
              .progress-track {
                position: relative;
                z-index: 2;
                width: min(420px, 86vw);
                height: 14px;
                border-radius: 999px;
                overflow: hidden;

                border: 1px solid rgba(95, 126, 119, 0.5);
                background: linear-gradient(180deg, rgba(8, 14, 20, 0.95) 0%, rgba(17, 24, 33, 0.95) 100%);
                box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.65), 0 0 26px rgba(31, 214, 95, 0.15);
              }

              .progress-fill {
                position: relative;
                width: 100%;
                height: 100%;
                transform-origin: left center;

                background: linear-gradient(90deg, rgba(31, 214, 95, 0.5) 0%, rgba(31, 214, 95, 0.95) 52%, rgba(141, 255, 191, 0.95) 100%);
                animation: load 2.6s ease-in-out infinite;
              }
              
              .progress-sheen {
                position: absolute;
                top: 0;
                left: -40%;
                width: 40%;
                height: 100%;
                background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(214, 255, 231, 0.8) 48%, rgba(255, 255, 255, 0) 100%);
                animation: sheen 1.35s linear infinite;
              }

              .background {
                position: absolute;
                max-width: 1600px;
                width: 100%;
                top: 0;
                left: 50%;
                transform: translateX(-50%);

                height: 100%;
                width: 100%;

                background-image: url("/assets/art/background.png");
                mix-blend-mode: luminosity;
                z-index: 0;
                opacity: 0.34;

                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
                animation: breathe 4.2s ease-in-out infinite;
              }

              .vignette {
                position: absolute;
                inset: 0;
                z-index: 1;
                background:
                  radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0) 36%, rgba(0, 0, 0, 0.62) 100%),
                  radial-gradient(circle at 54% 62%, rgba(31, 214, 95, 0.14) 0%, rgba(31, 214, 95, 0) 45%);
              }

              .status {
                position: relative;
                z-index: 2;
                display: flex;
                align-items: center;
                gap: 6px;
                color: rgba(182, 203, 198, 0.84);
                font-family: Geogrotesque Wide, sans-serif;
                font-size: 12px;
                font-weight: 600;
                letter-spacing: 0.03em;
                text-transform: uppercase;
              }

              .status p {
                margin: 0;
              }

              .dots {
                width: 14px;
                text-align: left;
                animation: dots 1.2s steps(4, end) infinite;
              }

              @keyframes logo-in {
                0% {
                  opacity: 0;
                  transform: translateY(8px) scale(0.97);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }

              @keyframes load {
                0% {
                  transform: scaleX(0.08);
                }
                35% {
                  transform: scaleX(0.42);
                }
                72% {
                  transform: scaleX(0.84);
                }
                100% {
                  transform: scaleX(1);
                }
              }

              @keyframes sheen {
                0% {
                  left: -40%;
                }
                100% {
                  left: 112%;
                }
              }

              @keyframes breathe {
                0%,
                100% {
                  opacity: 0.24;
                  transform: translateX(-50%) scale(1);
                }
                50% {
                  opacity: 0.38;
                  transform: translateX(-50%) scale(1.03);
                }
              }

              @keyframes dots {
                0% {
                  width: 0;
                }
                100% {
                  width: 14px;
                }
              }

              @media (max-width: 640px) {
                .loader-container {
                  gap: 24px;
                  padding: 22px;
                }

                .logo {
                  height: 72px;
                }

                .logo-wrap {
                  padding: 14px 18px;
                }

                .progress-track {
                  height: 12px;
                }

                .status {
                  font-size: 11px;
                }
              }
            `}</style>
        </>
    );
}

export default LoadingScreen;
