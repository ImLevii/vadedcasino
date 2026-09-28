import Loader from './loader';
function LoadingScreen() {
    return <div class='cosmic-loading-screen'>
        <img src='/assets/logo/cosmic-luck-logo.webp' alt='Cosmic Luck' width='224'/>
        <Loader label='Welcome to Cosmic Luck' detail='Loading your account'/>
        <style jsx>{`
            .cosmic-loading-screen { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; background: radial-gradient(ellipse at 50% 40%, #15372a 0, #0b1715 40%, #080e12 80%); }
            img { max-width: 65vw; height: auto; }
        `}</style>
    </div>;
}
export default LoadingScreen;
