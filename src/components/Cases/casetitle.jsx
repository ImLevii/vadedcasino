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
                border: 1px solid rgba(255, 255, 255, 0.035);
                background: linear-gradient(180deg, rgba(12, 15, 22, 0.36) 0%, rgba(3, 5, 9, 0.82) 100%);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.025);

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
                background: linear-gradient(180deg, rgba(16, 18, 24, 0.32) 0%, rgba(7, 9, 13, 0.88) 100%);
              }
            `}</style>
        </>
    );
}

export default CaseTitle;
