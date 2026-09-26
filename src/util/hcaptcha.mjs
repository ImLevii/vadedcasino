let pending;

export function loadHcaptcha(timeout = 10000) {
    if (window.hcaptcha?.render) return Promise.resolve(window.hcaptcha);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        let timer;
        const finish = error => {
            clearTimeout(timer);
            delete window.cosmicCaptchaReady;
            if (error) { script.remove(); reject(error); }
            else resolve(window.hcaptcha);
        };
        window.cosmicCaptchaReady = () => finish(window.hcaptcha?.render ? null : new Error('Captcha unavailable'));
        script.src = 'https://js.hcaptcha.com/1/api.js?onload=cosmicCaptchaReady&render=explicit';
        script.async = true;
        script.dataset.hcaptcha = 'true';
        script.onerror = () => finish(new Error('Captcha could not load. Please check your connection and try again.'));
        timer = setTimeout(() => finish(new Error('Captcha took too long to load. Please try again.')), timeout);
        document.head.appendChild(script);
    }).finally(() => { pending = null; });
    return pending;
}
