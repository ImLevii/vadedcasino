function Loader(props) {
    return (
        <>
            <div class={'loader-container ' + (props?.type === 'small' ? 'small' : '')}>
                <div class='loader' style={{ 'max-height': props?.max || 'unset' }} />
            </div>

            <style jsx>{`
              .loader-container {
                display: flex;
                height: 100%;
                width: 100%;
                align-items: center;
                justify-content: center;
                padding: 15px 0;
              }

              .loader {
                height: clamp(4rem, 12vw, 8rem);
                aspect-ratio: 1;
                border-radius: 50%;
                border: 3px solid rgba(31, 214, 95, 0.2);
                border-top-color: #1fd65f;
                animation: spin 0.9s linear infinite;
              }
              
              .small {
                height: 100%;
                width: unset;
                aspect-ratio: 1;
                padding: unset;
                padding: 10px;
              }
              
              .small .loader {
                aspect-ratio: 1;
                height: 100%;
                min-height: 1.4rem;
              }

              @keyframes spin {
                0% {
                  transform: rotate(0deg);
                }
                100% {
                  transform: rotate(360deg);
                }
              }
            `}</style>
        </>
    );
}

export default Loader;
