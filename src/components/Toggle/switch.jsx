function Switch(props) {

    function colorScheme() {
        if (props?.ultradark) return 'ultra'
        if (props?.dark) return 'dark'
        return ''
    }

    return (
        <>
            <div class={'switch ' + (props.active ? 'active ' : '') + colorScheme()} onClick={() => props.toggle()}>
                <div class='dot'/>
            </div>

            <style jsx>{`
                .switch {
                  width: 31px;
                  height: 11px;

                  border-radius: 3px;
                  background: rgba(58, 66, 80, 0.45);
                  
                  display: flex;
                  align-items: center;
                  
                  cursor: pointer;
                  position: relative;
                }
                
                .dark {
                  background: #2c3340;
                }
                
                .ultra {
                  background: #12151c;
                }
                
                .dark.active, .ultra.active {
                  background: rgba(31, 214, 95, 0.25);
                }
                
                .dark.active .dot, .ultra.active .dot {
                  background: #1fd65f;
                }
                
                .dot {
                  width: 17px;
                  height: 17px;
                  
                  border-radius: 3px;
                  background: #3a4250;
                  
                  position: absolute;
                  transition: left .3s;
                  left: 0;
                }
                
                .switch.active .dot {
                  left: 50%;
                }
            `}</style>
        </>
    )
}

export default Switch