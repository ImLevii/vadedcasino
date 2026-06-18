function CaseTitle(props) {
    return (
        <>
            <div class={'title ' + (props.full ? 'full' : '')}>
                <p>{props.name}</p>
            </div>

            <style jsx>{`
              .title {
                width: 166px;
                min-height: 30px;
                
                border-radius: 5px;
                background: linear-gradient(185deg, rgba(18, 21, 28, 0), rgba(18, 21, 28, 0) 15%, rgba(18, 21, 28, 0.051) 20%, rgba(18, 21, 28, 1) 100%);

                color: #8b92a0;
                font-size: 13px;
                font-weight: 600;
                
                text-align: center;
                line-height: 30px;
                position: relative;
                z-index: 0;
              }
              
              .full {
                flex: 1;
              }
              
              .title:before {
                position: absolute;
                left: 1px;
                top: 1px;
                
                z-index: -1;
                height: 28px;
                width: calc(100% - 2px);
                
                content: '';
                border-radius: 5px;
                background: linear-gradient(0deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.4) 100%), linear-gradient(222deg, rgba(26, 31, 41, 0.65) 0%, rgba(18, 21, 28, 0.00) 100%);
              }
            `}</style>
        </>
    );
}

export default CaseTitle;
