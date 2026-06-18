import {createEffect, createSignal, For} from "solid-js";
import ChatMessage from "./message";
import SystemMessage from "./systemmessage";
import RainTip from "./raintip";
import {useUser} from "../../contexts/usercontextprovider";
import {addDropdown} from "../../util/api";

const UNICODE_EMOJIS = [
    '😀','😂','🤣','😊','😍','🥰','😎','🤩','😏','🤔',
    '😤','😭','😱','😲','🙄','😴','🥳','🤯','😈','💀',
    '👍','👎','👏','🙏','💪','✌️','🤞','👋','🤝','🫡',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','✨',
    '🔥','⭐','🏆','💎','💰','🎰','🍀','🚀','🎉','💸',
    '😹','🐸','👀','🫂','🫀','🥶','🥵','🤑','😋','🤭',
]

function Chat(props) {

    let sendRef
    let messagesRef
    let chatRef
    let hasLoaded = false

    const [user] = useUser()
    const [text, setText] = createSignal('')

    const [top, setTop] = createSignal(0)
    const [scroll, setScroll] = createSignal(true)

    const [replying, setReplying] = createSignal()

    const [emojisOpen, setEmojisOpen] = createSignal(false)
    addDropdown(setEmojisOpen)

    createEffect(() => {
        if (replying() || !replying()) // just to proc the effect
            sendRef.select()
    })

    createEffect(() => {
        if (!chatRef) return

        chatRef.onscroll = (e) => {
            let maxScroll = e.target.scrollHeight - e.target.clientHeight
            if (e.target.scrollTop >= maxScroll) {
                setScroll(true)
                return
            }

            if (!top()) return setTop(e.target.scrollTop)

            if (e.target.scrollTop < top() - 100) {
                setScroll(false)
                setTop(e.target.scrollTop)
                return
            }
        }
    })

    createEffect(() => {
        if (props.messages.length === 0 || !scroll()) return

        messagesRef.scrollIntoView({block: 'nearest', inline: 'end', behavior: hasLoaded ? 'smooth' : 'instant'})
        setTop(chatRef.scrollTop)
        hasLoaded = true
    })

    function resumeScrolling() {
        setScroll(true)
        messagesRef.scrollIntoView({block: 'nearest', inline: 'end', behavior: 'instant'})
        setTop(chatRef.scrollTop)
    }

    function sendMessage(message) {
        message = message.trim()
        if (message.length < 1) {
            return
        }

        if (replying() && !message.includes('@')) {
            message = `@${getReplyingTo().user.username} ${message}`
        }

        props.ws.emit('chat:sendMessage', message, replying())
        setTimeout(() => {
            setText('')
            setReplying(null)
        }, 1)
    }

    const handleKeyPress = (e, message) => {
        if (e.key === 'Backspace' && message.length === 0) {
            setReplying(null)
        }

        if (e.key === 'Enter' && props.ws) {
            sendMessage(message)
        }
    }

    function getReplyingTo() {
        return props?.messages?.find(msg => msg.id === replying())
    }

    function getRepliedMessage(id) {
        if (!id) return 'Unknown'
        let msg = props?.messages?.find(m => m.id === id)
        return msg?.content || 'Unknown'
    }

    return (
        <>
            <div class='chat-container'>
                <div class='messages' ref={chatRef}>
                    <div class='pusher'/>
                    <For each={props.messages}>{(message, index) =>
                        message?.type === 'rain-end' ? null : message?.type === 'system' ? (
                            <SystemMessage {...message}/>
                        ) : message?.type === 'rain-tip' ? (
                            <RainTip {...message}/>
                        ) : (
                            <ChatMessage {...message} actualUser={user()}
                                         ws={props?.ws} emojis={props?.emojis}
                                         replying={replying()} setReplying={setReplying}
                                         repliedMessage={getRepliedMessage(message.replyTo)}
                            />
                        )}
                    </For>
                    <div ref={messagesRef}/>
                </div>

                <div class='send-message'>
                    <div class='message-wrapper'>
                        {replying() && (
                            <p class='replyto'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="10" viewBox="0 0 12 10" fill="none">
                                    <path d="M5 2.50112V0.375123C5 0.224623 4.9095 0.0886233 4.771 0.0296233C4.633 -0.0288767 4.4715 0.000623226 4.364 0.106123L0.114 4.23112C0.041 4.30162 0 4.39862 0 4.50012C0 4.60162 0.041 4.69862 0.114 4.76912L4.364 8.89412C4.4725 8.99912 4.6335 9.02862 4.771 8.97062C4.9095 8.91162 5 8.77562 5 8.62512V6.50012H5.709C8.027 6.50012 10.164 7.76012 11.2855 9.78612L11.296 9.80512C11.363 9.92712 11.49 10.0001 11.625 10.0001C11.656 10.0001 11.687 9.99662 11.718 9.98862C11.884 9.94612 12 9.79662 12 9.62512C12 5.73812 8.8715 2.56812 5 2.50112Z" fill="#7771C5"/>
                                </svg>
                                @{getReplyingTo().user.username}
                            </p>
                        )}

                        <input type='text' class='send-message-input' placeholder='Send message...'
                               value={text()}
                               ref={sendRef}
                               onChange={(e) => setText(e.target.value)}
                               onKeyDown={(e) => handleKeyPress(e, e.target.value)}/>
                    </div>

                    <div class='emojis-button' onClick={(e) => {
                        setEmojisOpen(!emojisOpen())
                        e.stopPropagation()
                    }}>
                        <img src='/assets/icons/emojis.png' height='20' alt=''/>

                        {emojisOpen() && (
                            <div class='emojis-wrapper' onClick={(e) => e.stopPropagation()}>
                                {props?.emojis?.length > 0 && (
                                    <div class='emojis-section'>
                                        <p class='emojis-label'>CUSTOM</p>
                                        <div class='emojis'>
                                            <For each={props.emojis}>{(emoji) =>
                                                <img src={emoji.url} class='emoji' alt={`:${emoji.name}:`}
                                                     height='24' width='24' title={`:${emoji.name}:`}
                                                     onClick={() => setText(text() + ` :${emoji.name}:`)}/>
                                            }</For>
                                        </div>
                                    </div>
                                )}
                                <div class='emojis-section'>
                                    {props?.emojis?.length > 0 && <p class='emojis-label'>UNICODE</p>}
                                    <div class='emojis'>
                                        <For each={UNICODE_EMOJIS}>{(emoji) =>
                                            <span class='emoji emoji-unicode' title={emoji}
                                                  onClick={() => setText(text() + emoji)}>{emoji}</span>
                                        }</For>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div class='send' onClick={() => sendMessage(text())}>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <path d="M0.5 0.5L10.5 5.5L0.5 10.5V6.5L7.5 5.5L0.5 4.5V0.5Z" fill="white"/>
                        </svg>
                    </div>
                </div>
            </div>

            <style jsx>{`
              .chat-container {
                width: 100%;
                height: 100%;

                padding: 0px 0px 12px 0px;

                display: flex;
                flex-direction: column;
                box-sizing: border-box;

                gap: 5px;
                overflow: hidden;
                position: relative;
              }

              .messages {
                width: 100%;
                height: 100%;

                padding: 0 15px;

                display: flex;
                flex-direction: column;
                position: relative;

                gap: 2px;
                overflow-y: scroll;

                mask-image: linear-gradient(to top, black 80%, rgba(0, 0, 0, 0.25) 99%);
                scrollbar-color: transparent transparent;
              }

              .messages::-webkit-scrollbar {
                display: none;
              }

              .pusher {
                flex: 1 1 auto;
              }

              .send-message {
                background: #1a1f29;

                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 6px;

                min-height: 44px;
                width: calc(100% - 28px);
                padding: 0 10px;
                margin: 0 14px;

                display: flex;
                align-items: center;
                gap: 8px;
              }
              
              .message-wrapper {
                display: flex;
                height: 100%;
                flex: 1;
                gap: 4px;
                align-items: center;
              }

              .send-message-input {
                width: 100%;
                height: 100%;

                background: unset;
                border: unset;
                outline: unset;

                font-family: 'Rubik', sans-serif;
                font-weight: 400;
                font-size: 13px;
                color: #c3cad6;
              }

              .send-message-input::placeholder {
                font-family: 'Rubik', sans-serif;
                font-weight: 400;
                font-size: 13px;
                color: #6b7280;
                user-select: none;
              }

              .send {
                min-height: 30px;
                min-width: 30px;

                display: flex;
                align-items: center;
                justify-content: center;

                background: #2a313d;
                border-radius: 5px;
                cursor: pointer;
                transition: background .2s;
              }

              .send:hover {
                background: #323a48;
              }

              .send svg {
                transition: opacity .2s;
              }
              
              .replyto {
                display: flex;
                align-items: center;
                gap: 4px;
                
                color: #1fd65f;
                font-family: Rubik;
                font-size: 13px;
                font-style: normal;
                font-weight: 400;
                line-height: normal;
              }

              .emojis-button {
                min-width: 30px;
                height: 30px;

                border-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.06);
                background: rgba(255, 255, 255, 0.04);

                display: flex;
                align-items: center;
                justify-content: center;

                cursor: pointer;
                position: relative;
                transition: background .2s;
              }

              .emojis-button:hover {
                background: rgba(255, 255, 255, 0.08);
              }

              .emojis-wrapper {
                width: 240px;
                max-height: 220px;

                position: absolute;
                bottom: calc(100% + 8px);

                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: #1a1f29;
                box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5);

                padding: 10px;
                overflow-y: auto;

                right: 0;
                z-index: 10;
                cursor: initial;
              }

              .emojis-wrapper::-webkit-scrollbar {
                width: 3px;
              }

              .emojis-wrapper::-webkit-scrollbar-track {
                background: transparent;
              }

              .emojis-wrapper::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 3px;
              }

              .emojis-section {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 10px;
              }

              .emojis-section:last-child {
                margin-bottom: 0;
              }

              .emojis-label {
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                color: #6b7280;
                letter-spacing: 0.05em;
              }

              .emojis {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
              }

              .emoji {
                cursor: pointer;
                border-radius: 4px;
                transition: background .15s;
              }

              .emoji:hover {
                background: rgba(255, 255, 255, 0.08);
              }

              .emoji-unicode {
                font-size: 20px;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                cursor: pointer;
                transition: background .15s;
                user-select: none;
              }
            `}</style>
        </>
    );
}

export default Chat;
