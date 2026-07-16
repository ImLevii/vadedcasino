function SystemMessage(props) {
    const isDrop = props?.content?.includes('🎁');
    return (
        <>
            <div class='chatmessage-container'>
                <div class='user'>
                    <div class='avatar'>
                        {isDrop ? (
                            <span class='drop-gift-icon'>🎁</span>
                        ) : (
                            <img src='/assets/icons/coin.svg' alt='' height='25'/>
                        )}
                    </div>

                    <p class='username' classList={{'drop-username': isDrop}}>{isDrop ? 'HIGH TICKET DROP' : 'BOT'}</p>
                    <p class='time'>{new Date(props?.createdAt)?.toLocaleTimeString()}</p>
                </div>

                <p class='message' classList={{'drop-message': isDrop}}>{props?.content}</p>
            </div>

            <style jsx>{`
              .chatmessage-container {
                width: 100%;
                height: fit-content;
              }
              
              .user {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
              }
              
              .avatar img {
                border-radius: 3px;
                position: relative;
              }
              
              .avatar {
                position: relative;
                padding: 1px;
                box-sizing: content-box;
              }
              
              .drop-gift-icon {
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 27px;
                height: 27px;
                border-radius: 4px;
                background: rgba(31, 214, 95, 0.1);
                border: 1px solid rgba(31, 214, 95, 0.2);
              }
              
              .username {
                font-weight: 600;
                font-size: 14px;
                font-family: "Geogrotesque Wide", sans-serif;
                font-style: normal;
                color: #F97339;
                margin-top: -2px;
              }
              
              .drop-username {
                color: #1fd65f;
                font-size: 11px;
                letter-spacing: 0.4px;
              }
              
              .message {
                font-weight: 500;
                font-size: 14px;
                color: #F97339;
                background: rgba(249, 115, 57, 0.15);
                border-radius: 3px;

                padding: 12px;
              }
              
              .drop-message {
                color: #dce3ec;
                background: rgba(31, 214, 95, 0.08);
                border: 1px solid rgba(31, 214, 95, 0.12);
                font-weight: 600;
              }
              
              .time {
                font-family: 'Geogrotesque Wide';
                font-weight: 600;
                font-size: 11px;
                margin-left: auto;

                color: #8b92a0;
              }
            `}</style>
        </>
    );
}

export default SystemMessage;
