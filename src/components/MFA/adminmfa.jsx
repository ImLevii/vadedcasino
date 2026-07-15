import {authedAPI} from "../../util/api";
import {createSignal} from "solid-js";
import {useNavigate} from "@solidjs/router";

function AdminMFA(props) {

    const [token, setToken] = createSignal()
    const navigate = useNavigate()

    return (
        <>
            <div className='modal' onClick={() => navigate('/')}>
                <div className='mfa-container' onClick={(e) => e.stopPropagation()}>
                    <div class='mfa-header'>
                        <p className='close bevel-light' onClick={() => navigate('/')}>X</p>
                        <h1>2FA</h1>
                    </div>

                    <div class='mfa-content'>
                        <div class='code-container'>
                            <input type='number' placeholder='000000' value={token()} onInput={(e) => setToken(e.target.value)}/>
                            <p>ENTER YOUR 2FA CODE</p>
                        </div>

                        <div class='bar'/>

                        <button className='proceed bevel-gold' onClick={async () => {
                            let res = await authedAPI('/admin/2fa', 'POST', JSON.stringify({
                                token: token()
                            }), true)

                            if (res.success) {
                                props?.refetch()
                            }
                        }}>
                            PROCEED
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .modal {
                  position: fixed;
                  top: 0;
                  left: 0;
                  
                  width: 100vw;
                  height: 100vh;

                  background: rgba(6, 8, 12, 0.8);
                  backdrop-filter: blur(4px);
                  
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  
                  z-index: 1000;
                }

                .mfa-container {
                  max-width: 480px;
                  color: white;

                  width: 100%;

                  background: #0e1116;
                  border: 1px solid rgba(255,255,255,0.07);
                  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
                  border-radius: 16px;

                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  font-weight: 700;
                  
                  transition: max-height .3s;
                  position: relative;

                  overflow: hidden;
                }
                
                .mfa-header {
                  width: 100%;
                  height: 56px;
                  background: #12151c;
                  border-bottom: 1px solid rgba(255,255,255,0.06);
                  
                  display: flex;
                  align-items: center;
                  padding: 0 16px;
                  gap: 12px;
                }
                
                .bar {
                  width: 100%;
                  min-height: 1px;
                  height: 100%;
                  background: rgba(255,255,255,0.06);
                }
                
                .mfa-content {
                  width: 100%;
                  padding: 25px;
                  
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  
                  gap: 25px;
                }
                
                .code-container {
                  border-radius: 8px;
                  border: 1px dashed rgba(255,255,255,0.12);
                  background: #1a1f29;
                  
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  
                  width: 100%;
                  height: 90px;

                  color: #8b92a0;
                  font-family: 'Geogrotesque Wide', sans-serif;
                  font-size: 13px;
                  font-weight: 600;
                  
                  padding: 12px;
                  gap: 10px;
                }
                
                .code-container input {
                  height: 100%;
                  
                  background: unset;
                  border: unset;
                  outline: unset;

                  color: #FFF;
                  font-family: Geogrotesque Wide, sans-serif;
                  font-size: 20px;
                  font-weight: 700;
                  
                  text-align: center;
                }

                .code-container input::placeholder {
                  color: rgba(255,255,255,0.25);
                  font-family: Geogrotesque Wide, sans-serif;
                  font-size: 20px;
                  font-weight: 700;
                }
                
                h1 {
                  color: #FFF;
                  font-family: Geogrotesque Wide, sans-serif;
                  font-size: 16px;
                  font-weight: 700;
                }

                .close {
                  width: 28px;
                  height: 28px;

                  background: rgba(255,255,255,0.05);
                  border: 1px solid rgba(255,255,255,0.08);
                  border-radius: 6px;

                  display: flex;
                  align-items: center;
                  justify-content: center;

                  font-size: 11px;
                  font-weight: 700;
                  color: #6b7280;
                  cursor: pointer;
                  transition: background .2s, color .2s;
                }

                .close:hover {
                  background: rgba(255,255,255,0.09);
                  color: #c3cad6;
                }
                
                .proceed {
                  width: 160px;
                  height: 40px;
                }
            `}</style>
        </>
    )
}

export default AdminMFA