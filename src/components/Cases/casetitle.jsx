function CaseTitle(props) {
    return (
        <>
            <div class={'title ' + (props.full ? 'full' : '')}>
                <p>{props.name}</p>
            </div>

            <style jsx>{`
              .title {
                width: calc(100% - 28px);
                min-height: 29px;
                
                border-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.04);
                background: linear-gradient(180deg, rgba(12, 15, 22, 0.4) 0%, rgba(3, 5, 9, 0.86) 100%);
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.03);

                color: #c7d0de;
                font-size: 12px;
                font-weight: 800;
                
                text-align: center;
                line-height: 29px;
                position: relative;
                z-index: 2;
                overflow: hidden;
              }

              .title p {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding: 0 10px;
              }
              
              .full {
                flex: 1;
              }
              
              .title:before {
                position: absolute;
                left: 1px;
                top: 1px;
                
                z-index: -1;
                height: 27px;
                width: calc(100% - 2px);
                
                content: '';
                border-radius: 5px;
                background: linear-gradient(180deg, rgba(16, 18, 24, 0.36) 0%, rgba(7, 9, 13, 0.92) 100%);
              }
            `}</style>
        </>
    );
}

export default CaseTitle;
