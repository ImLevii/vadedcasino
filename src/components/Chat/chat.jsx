import {createEffect, createMemo, createSignal, For, Show} from "solid-js";
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
    const [emojiTab, setEmojiTab] = createSignal('custom')
    const [emojiSearch, setEmojiSearch] = createSignal('')
    addDropdown(setEmojisOpen)

    const customEmojis = createMemo(() => {
      const query = emojiSearch().trim().toLowerCase()
      return (props?.emojis || []).filter(emoji => {
        if (emojiTab() === 'gif' && !emoji.animated) return false
        if (emojiTab() === 'custom' && emoji.animated) return false
        return !query || emoji.name.toLowerCase().includes(query)
      })
    })

    const unicodeEmojis = createMemo(() => {
      const query = emojiSearch().trim()
      return query ? UNICODE_EMOJIS.filter(emoji => emoji.includes(query)) : UNICODE_EMOJIS
    })

    const animatedCount = createMemo(() => (props?.emojis || []).filter(emoji => emoji.animated).length)

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

    function insertEmoji(value) {
      const separator = text() && !text().endsWith(' ') ? ' ' : ''
      setText(`${text()}${separator}${value}`)
      requestAnimationFrame(() => sendRef?.focus())
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
                             maxLength='300'
                               value={text()}
                               ref={sendRef}
                             onInput={(e) => setText(e.target.value)}
                               onKeyDown={(e) => handleKeyPress(e, e.target.value)}/>
                    </div>

                    <div class='emojis-button' onClick={(e) => {
                        setEmojisOpen(!emojisOpen())
                        e.stopPropagation()
                    }}>
                        <img src='/assets/icons/emojis.png' height='20' alt=''/>

                        {emojisOpen() && (
                            <div class='emojis-wrapper' onClick={(e) => e.stopPropagation()}>
                            <div class='picker-header'>
                              <div>
                                <p class='picker-title'>Emojis</p>
                                <p class='picker-subtitle'>Add a reaction to your message</p>
                              </div>
                              <button class='picker-close' aria-label='Close emoji picker' onClick={() => setEmojisOpen(false)}>
                                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'>
                                  <path d='M18 6L6 18M6 6l12 12'/>
                                </svg>
                              </button>
                            </div>

                            <div class='emoji-search-wrap'>
                              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
                                <circle cx='11' cy='11' r='8'/><path d='m21 21-4.35-4.35'/>
                              </svg>
                              <input value={emojiSearch()} onInput={(e) => setEmojiSearch(e.target.value)} placeholder='Search emojis'/>
                            </div>

                            <div class='emoji-tabs'>
                              <button class={emojiTab() === 'custom' ? 'active' : ''} onClick={() => setEmojiTab('custom')}>Custom</button>
                              <button class={emojiTab() === 'gif' ? 'active' : ''} onClick={() => setEmojiTab('gif')}>
                                GIF <span>{animatedCount()}</span>
                              </button>
                              <button class={emojiTab() === 'unicode' ? 'active' : ''} onClick={() => setEmojiTab('unicode')}>Unicode</button>
                            </div>

                            <div class='emoji-content'>
                              <Show when={emojiTab() !== 'unicode'}>
                                <Show when={props?.emojis !== null} fallback={
                                  <div class='emoji-empty loading'>
                                    <span class='emoji-loader'/>
                                    <p>Loading server emojis</p>
                                  </div>
                                }>
                                  <div class='emojis'>
                                    <For each={customEmojis()}>{(emoji) =>
                                      <button class='emoji-tile' title={`:${emoji.name}:`} onClick={() => insertEmoji(`:${emoji.name}:`)}>
                                        <img src={emoji.url} class='emoji-image' alt={`:${emoji.name}:`}
                                             loading={emoji.animated ? 'eager' : 'lazy'}/>
                                        <Show when={emoji.animated}><span class='gif-badge'>GIF</span></Show>
                                      </button>
                                    }</For>
                                  </div>
                                </Show>
                                <Show when={props?.emojis !== null && customEmojis().length === 0}>
                                  <div class='emoji-empty'>
                                    <span>{emojiTab() === 'gif' ? 'GIF' : 'Aa'}</span>
                                    <p>{emojiTab() === 'gif' ? 'No animated emojis found' : 'No custom emojis found'}</p>
                                  </div>
                                </Show>
                              </Show>

                              <Show when={emojiTab() === 'unicode'}>
                                <div class='emojis'>
                                  <For each={unicodeEmojis()}>{(emoji) =>
                                    <button class='emoji-tile emoji-unicode' title={emoji} onClick={() => insertEmoji(emoji)}>{emoji}</button>
                                  }</For>
                                </div>
                                <Show when={unicodeEmojis().length === 0}>
                                  <div class='emoji-empty'><span>?</span><p>No emojis found</p></div>
                                </Show>
                              </Show>
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
                background: linear-gradient(180deg, rgba(35,43,56,0.72), rgba(18,24,33,0.82));

                border: 1px solid var(--glass-border);
                border-radius: 8px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 22px rgba(0,0,0,0.18);

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

                background: linear-gradient(180deg, rgba(67,78,96,0.8), rgba(39,47,61,0.9));
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 6px;
                cursor: pointer;
                transition: background .2s;
              }

              .send:hover {
                background: linear-gradient(180deg, rgba(31,214,95,0.84), rgba(21,160,72,0.9));
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
                background: linear-gradient(180deg, rgba(52,62,78,0.58), rgba(27,34,45,0.68));

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
                box-sizing: border-box;
                width: min(276px, calc(100vw - 24px));
                height: min(390px, calc(100vh - 170px));
                min-height: 260px;

                position: absolute;
                bottom: calc(100% + 8px);

                border-radius: 10px;
                border: 1px solid var(--glass-border);
                background:
                  radial-gradient(100% 80% at 0 0, rgba(31,214,95,0.07), transparent 62%),
                  linear-gradient(160deg, rgba(29,37,49,0.98), rgba(12,17,24,0.99));
                box-shadow: inset 0 1px 0 var(--glass-highlight), 0 -16px 38px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(18px) saturate(125%);
                -webkit-backdrop-filter: blur(18px) saturate(125%);

                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                overflow: hidden;

                right: -41px;
                z-index: 20;
                cursor: initial;
              }

              .picker-header {
                min-height: 34px;
                display: flex;
                align-items: center;
                justify-content: space-between;
              }

              .picker-title {
                color: #f1f5f9;
                font-size: 13px;
                font-weight: 800;
              }

              .picker-subtitle {
                margin-top: 2px;
                color: #6f7888;
                font-family: 'Rubik', sans-serif;
                font-size: 10px;
              }

              .picker-close {
                width: 26px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 6px;
                background: rgba(255,255,255,0.035);
                color: #7f8999;
                cursor: pointer;
              }

              .picker-close:hover {
                color: #dbe2ec;
                background: rgba(255,255,255,0.07);
              }

              .emoji-search-wrap {
                height: 34px;
                display: flex;
                align-items: center;
                gap: 7px;
                padding: 0 10px;
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 7px;
                background: rgba(5,8,13,0.46);
                color: #687284;
              }

              .emoji-search-wrap:focus-within {
                border-color: rgba(31,214,95,0.34);
                box-shadow: 0 0 0 2px rgba(31,214,95,0.07);
              }

              .emoji-search-wrap input {
                width: 100%;
                border: 0;
                outline: 0;
                background: transparent;
                color: #d8dee8;
                font-family: 'Rubik', sans-serif;
                font-size: 12px;
              }

              .emoji-tabs {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 3px;
                padding: 3px;
                border-radius: 7px;
                background: rgba(4,7,11,0.42);
              }

              .emoji-tabs button {
                height: 28px;
                border: 0;
                border-radius: 5px;
                background: transparent;
                color: #707a8b;
                font-family: 'Geogrotesque Wide', sans-serif;
                font-size: 10px;
                font-weight: 700;
                cursor: pointer;
              }

              .emoji-tabs button.active {
                color: #baffd1;
                background: rgba(31,214,95,0.12);
                box-shadow: inset 0 0 0 1px rgba(31,214,95,0.18);
              }

              .emoji-tabs span {
                color: #1fd65f;
              }

              .emoji-content {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding-right: 2px;
              }

              .emoji-content::-webkit-scrollbar {
                width: 3px;
              }

              .emoji-content::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.14);
                border-radius: 3px;
              }

              .emojis {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(31px, 1fr));
                gap: 4px;
              }

              .emoji-tile {
                width: 100%;
                min-width: 0;
                aspect-ratio: 1;
                padding: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                border: 1px solid transparent;
                border-radius: 6px;
                background: transparent;
                cursor: pointer;
                transition: background .15s, border-color .15s, transform .15s;
              }

              .emoji-tile:hover {
                background: rgba(31,214,95,0.09);
                border-color: rgba(31,214,95,0.2);
                transform: translateY(-1px);
              }

              .emoji-image {
                width: min(24px, 100%);
                height: min(24px, 100%);
                object-fit: contain;
              }

              .gif-badge {
                position: absolute;
                right: -1px;
                bottom: -1px;
                padding: 1px 2px;
                border-radius: 3px;
                background: #1fd65f;
                color: #06140b;
                font-size: 6px;
                font-weight: 900;
              }

              .emoji-unicode {
                font-size: 20px;
                user-select: none;
              }

              .emoji-empty {
                height: 100%;
                min-height: 100px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                color: #687284;
                font-family: 'Rubik', sans-serif;
                font-size: 11px;
              }

              .emoji-empty span {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 8px;
                background: rgba(255,255,255,0.035);
                color: #8c96a6;
                font-size: 11px;
                font-weight: 800;
              }

              .emoji-empty .emoji-loader {
                width: 28px;
                height: 28px;
                border: 2px solid rgba(255,255,255,.08);
                border-top-color: var(--gold);
                border-radius: 50%;
                background: transparent;
                animation: emoji-spin .8s linear infinite;
              }

              @keyframes emoji-spin {
                to { transform: rotate(360deg); }
              }

              @media only screen and (max-height: 560px) {
                .emojis-wrapper {
                  height: min(310px, calc(100vh - 130px));
                  min-height: 220px;
                }

                .picker-subtitle {
                  display: none;
                }
              }

              @media only screen and (max-width: 340px) {
                .emojis-wrapper {
                  right: -39px;
                  width: calc(100vw - 16px);
                  padding: 10px;
                }

                .emoji-tabs button {
                  font-size: 9px;
                }
              }
            `}</style>
        </>
    );
}

export default Chat;
