import Chat from "../Chat/chat";
import {createEffect, createSignal, onCleanup, For} from "solid-js";
import {useWebsocket} from "../../contexts/socketprovider";
import {useRain} from "../../contexts/raincontext";
import {createNotification, addDropdown, api} from "../../util/api";
import SidebarRain from "./rain";
import {A} from "@solidjs/router";

const ROOM_NAMES = {
  EN: 'ENGLISH',
  TR: 'TURKISH',
  GR: 'GERMAN',
}

const ROOM_SHORT = {
  EN: 'ENG',
  TR: 'TUR',
  GR: 'GER',
}

const ROOM_ICONS = {
  EN: '/assets/icons/english.png',
  TR: '/assets/icons/turkish.png',
  GR: '/assets/icons/german.png',
}

function SideBar(props) {

  let previousState = false
  const [rain, userRain] = useRain()
  const [messages, setMessages] = createSignal([], {equals: false})
  const [room, setRoom] = createSignal('EN')
  const [online, setOnline] = createSignal({
    total: 0,
    channels: {
      VIP: 0,
      EN: 1,
      BEG: 0,
      GR: 0,
      TR: 0
    }
  })
  const [ws] = useWebsocket()
  const [roomDropdown, setRoomDropdown] = createSignal(false)
  const [rulesOpen, setRulesOpen] = createSignal(false)
  const [announcements, setAnnouncements] = createSignal([])
  const [dismissed, setDismissed] = createSignal(new Set())
  addDropdown(setRoomDropdown)
  addDropdown(setRulesOpen)

  const roomOnlineCount = () => online()?.channels?.[room()] ?? 0

  // Load announcements on mount
  api('/announcements/active', 'GET', null, false).then(res => {
    if (res?.data) setAnnouncements(res.data)
  }).catch(() => {})

  createEffect(() => {
    if (ws() && !previousState) {
      ws().emit('chat:join', 'EN')
    }

    if (ws()) {
      // Remove existing listeners before adding new ones to prevent duplicates
      ws().off('chat:pushMessage')
      ws().off('toast')
      ws().off('chat:clear')
      ws().off('misc:onlineUsers')
      ws().off('chat:join')
      ws().off('chat:deleteMessage')

      ws().on('chat:pushMessage', (m) => {
        let newMessages = [...messages(), ...m].slice(-50)
        setMessages(newMessages)

        // Auto-remove rain-end messages after 30 seconds
        m.forEach(msg => {
          if (msg.type === 'rain-end') {
            setTimeout(() => {
              setMessages(prev => prev.filter(x => x.id !== msg.id))
            }, 30000)
          }
        })
      })

      ws().on('toast', (type, content, config = { duration: 3000 }) => {
        createNotification(type, content, config)
      });

      ws().on('chat:clear', () => setMessages([]))
      ws().on('misc:onlineUsers', (data) => setOnline(data))
      ws().on('announcements', (list) => setAnnouncements(list))
      ws().on('chat:join', (response) => {
        if (!response.success) return
        setRoom(response.channel)
        setMessages([])
      })
      ws().on('chat:deleteMessage', (id) => {
        let index = messages().findIndex(message => message.id === +id)
        if (index < 0) return
        setMessages([
          ...messages().slice(0, index),
          ...messages().slice(index + 1)
        ])
      })

    }

    previousState = ws() && ws().connected
  })

  onCleanup(() => {
    if (!ws()) return

    ws().off('chat:pushMessage')
    ws().off('chat:clear')
    ws().off('misc:onlineUsers')
    ws().off('chat:join')
    ws().off('chat:deleteMessage')
  })

  return (
    <>
      <div class={'sidebar-container ' + (props.chat ? 'active' : '')}>
        <div class='top-container'>
          <div class='chat-header'>
            <div class='room-title' style="display: flex; align-items: center;">
              <A href='/' style="display: flex; align-items: center;">
                <img src='/assets/logo/cosmic-luck-logo.png' alt='Cosmic Luck' height='26'/>
              </A>
            </div>
            <button class='menu-dot' aria-label='Chat options'>
              <svg width='4' height='16' viewBox='0 0 4 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <circle cx='2' cy='2' r='2' fill='currentColor'/>
                <circle cx='2' cy='8' r='2' fill='currentColor'/>
                <circle cx='2' cy='14' r='2' fill='currentColor'/>
              </svg>
            </button>
          </div>
          {(rain()?.active || userRain()) && <SidebarRain/>}
        </div>

        <For each={announcements().filter(a => !dismissed().has(a.id))}>{(ann) => {
          const colors = {
            info:    { dot: '#5dade2', bg: 'rgba(93,173,226,0.08)',  border: 'rgba(93,173,226,0.25)',  text: '#5dade2' },
            success: { dot: '#1fd65f', bg: 'rgba(31,214,95,0.08)',   border: 'rgba(31,214,95,0.25)',   text: '#1fd65f' },
            warning: { dot: '#e8a14a', bg: 'rgba(232,161,74,0.08)',  border: 'rgba(232,161,74,0.25)',  text: '#e8a14a' },
            error:   { dot: '#e74c3c', bg: 'rgba(231,76,60,0.08)',   border: 'rgba(231,76,60,0.25)',   text: '#e74c3c' },
          };
          const c = colors[ann.type] || colors.info;
          return (
            <div class='announcement' style={`background:${c.bg};border-color:${c.border};color:${c.text}`}>
              <span class='ann-dot' style={`background:${c.dot};box-shadow:0 0 8px ${c.dot}`}/>
              <p style='flex:1'>{ann.message}{ann.link && <a href={ann.link} target='_blank' rel='noreferrer' style={`color:${c.text};margin-left:6px;text-decoration:underline`}>{ann.linkText || ann.link}</a>}</p>
              {ann.dismissible && (
                <button class='ann-dismiss' style={`color:${c.text}`} onClick={() => setDismissed(d => new Set([...d, ann.id]))}>✕</button>
              )}
            </div>
          );
        }}</For>

        <Chat messages={messages()} ws={ws()}/>

        <div class='bottom-toolbar' onClick={(e) => e.stopPropagation()}>
          <div class='toolbar-left'>
            <a class='toolbar-btn' href='https://twitter.com/cosmicluckcom' target='_blank' rel='noreferrer'>
              <svg width='14' height='12' viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg' fill='currentColor'>
                <path d='M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.1h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66'/>
              </svg>
            </a>
            <a class='toolbar-btn' href='https://discord.gg/cosmicluck' target='_blank' rel='noreferrer'>
              <svg width='15' height='12' viewBox='0 0 24 18' fill='currentColor' xmlns='http://www.w3.org/2000/svg'>
                <path d='M20.317 1.492a19.825 19.825 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 12.278c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z'/>
              </svg>
            </a>
            <button class='toolbar-btn rules-btn' onClick={(e) => {
              setRulesOpen(!rulesOpen())
              e.stopPropagation()
            }}>
              <svg width='14' height='12' viewBox='0 0 14 12' fill='currentColor' xmlns='http://www.w3.org/2000/svg'>
                <path d='M12.1254 8.40318H11.2552V1.78249C11.2552 0.795756 10.4184 0 9.38085 0H1.78308C1.74961 0 1.71614 3.1497e-08 1.68267 0.0159152C0.645093 0.127321 -0.0912549 1.00265 0.00915613 1.98939C0.109567 2.81698 0.795709 3.48541 1.68267 3.5809C1.71614 3.5809 1.74961 3.59682 1.78308 3.59682H1.8835V10.2175V10.2334C1.90023 11.2042 2.73699 12 3.75783 12H11.9915H12.0417H12.1254C13.163 12 13.9998 11.2042 13.9998 10.2175C14.0165 9.19894 13.163 8.40318 12.1254 8.40318ZM1.8835 2.62599V2.61008C1.39818 2.61008 1.01327 2.24403 1.01327 1.78249C1.01327 1.32095 1.39818 0.954907 1.8835 0.954907H7.72407C7.43957 1.48011 7.43957 2.1008 7.72407 2.62599H1.8835ZM9.91638 9.13528H3.05496V8.18037H9.91638V9.13528ZM9.91638 7.22546H3.05496V6.27056H9.91638V7.22546ZM9.91638 5.31565H3.05496V4.36074H9.91638V5.31565ZM12.1422 11.0133C11.6568 11.0133 11.2719 10.6472 11.2719 10.1857V9.35809H12.1422C12.6275 9.35809 13.0124 9.72414 13.0124 10.1857C13.0124 10.6472 12.6275 11.0133 12.1422 11.0133Z'/>
              </svg>

              {rulesOpen() && (
                <div class='rules-popup' onClick={(e) => e.stopPropagation()}>
                  <p class='rules-title'>Chat Rules</p>
                  <ul class='rules-list'>
                    <li>No racism or harassment of any kind is allowed.</li>
                    <li>Any forms of begging is not allowed.</li>
                    <li>Spamming is prohibited and will result in a mute.</li>
                    <li>If you experience technical issues, <a href='/support' class='rules-link'>contact us via support chat.</a></li>
                    <li>No affiliate code, custom cases, or socials promotion in chat.</li>
                  </ul>
                </div>
              )}
            </button>
          </div>

          <div class='room-selector' onClick={(e) => {
            setRoomDropdown(!roomDropdown())
            e.stopPropagation()
          }}>
            <img src={ROOM_ICONS[room()]} height='16' alt=''/>
            <span class='room-name'>{ROOM_SHORT[room()]}</span>
            <span class='room-status'>
              <span class='room-dot'/>
              <span class='room-count'>{roomOnlineCount().toLocaleString()}</span>
            </span>
            <svg class={'room-chevron ' + (roomDropdown() ? 'open' : '')} width='7' height='5' viewBox='0 0 7 5' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M3.50001 0.994671C3.62547 0.994671 3.7509 1.04269 3.84655 1.13852L6.8564 4.15579C7.04787 4.34773 7.04787 4.65892 6.8564 4.85078C6.66501 5.04263 6.5 4.99467 6.16316 4.99467L3.50001 4.99467L1 4.99467C0.5 4.99467 0.335042 5.04254 0.14367 4.85068C-0.0478893 4.65883 -0.0478893 4.34764 0.14367 4.1557L3.15347 1.13843C3.24916 1.04258 3.3746 0.994671 3.50001 0.994671Z' fill='#6b7280'/>
            </svg>

            {roomDropdown() && (
              <div class='room-dropdown' onClick={(e) => e.stopPropagation()}>
                <For each={Object.keys(ROOM_ICONS).filter(k => k !== room())}>{(key) =>
                  <div class='room-option' onClick={() => {
                    if (ws()) ws().emit('chat:join', key)
                    setRoomDropdown(false)
                  }}>
                    <img src={ROOM_ICONS[key]} height='16' alt=''/>
                    <span>{ROOM_NAMES[key]}</span>
                    <span class='opt-count'>{(online()?.channels?.[key] || 0).toLocaleString()}</span>
                  </div>
                }</For>
              </div>
            )}
          </div>

          <button class='toolbar-btn back-btn' onClick={() => props.setChat(false)}>
            <svg width='12' height='10' viewBox='0 0 12 10' fill='currentColor' xmlns='http://www.w3.org/2000/svg'>
              <path d='M5 2.50112V0.375123C5 0.224623 4.9095 0.0886233 4.771 0.0296233C4.633 -0.0288767 4.4715 0.000623226 4.364 0.106123L0.114 4.23112C0.041 4.30162 0 4.39862 0 4.50012C0 4.60162 0.041 4.69862 0.114 4.76912L4.364 8.89412C4.4725 8.99912 4.6335 9.02862 4.771 8.97062C4.9095 8.91162 5 8.77562 5 8.62512V6.50012H5.709C8.027 6.50012 10.164 7.76012 11.2855 9.78612L11.296 9.80512C11.363 9.92712 11.49 10.0001 11.625 10.0001C11.656 10.0001 11.687 9.99662 11.718 9.98862C11.884 9.94612 12 9.79662 12 9.62512C12 5.73812 8.8715 2.56812 5 2.50112Z'/>
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        .sidebar-container {
          min-width: 300px;
          width: 300px;
          height: 100vh;
          max-height: 100vh;

          display: flex;
          flex-direction: column;

          background:
            radial-gradient(100% 55% at 50% 0%, rgba(31, 214, 95, 0.055), transparent 62%),
            linear-gradient(180deg, rgba(12, 17, 24, 0.92), rgba(8, 12, 18, 0.9));
          border-right: 1px solid var(--glass-border);
          box-shadow: inset -1px 0 0 rgba(255,255,255,0.025), 10px 0 30px rgba(0,0,0,0.18);
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
          overflow: hidden;
          transition: left .3s;
        }

        .top-container {
          width: 100%;
          position: relative;
        }

        .chat-header {
          width: 100%;
          height: 60px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 16px;
          box-sizing: border-box;

          background: linear-gradient(180deg, rgba(25, 32, 43, 0.76), rgba(13, 18, 26, 0.62));
          border-bottom: 1px solid var(--glass-border);
          box-shadow: inset 0 1px 0 var(--glass-highlight);
        }

        .room-title {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #fff;
        }

        .room-title span {
          color: #6b7280;
          font-weight: 600;
        }

        .menu-dot {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 28px;
          height: 28px;
          border-radius: 6px;

          outline: unset;
          border: unset;
          background: transparent;
          color: #6b7280;

          cursor: pointer;
          transition: background .2s, color .2s;
        }

        .menu-dot:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #c3cad6;
        }

        .announcement {
          display: flex;
          align-items: center;
          gap: 9px;

          margin: 8px 14px 0 14px;
          padding: 8px 12px;
          border-radius: 8px;

          border: 1px solid;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-weight: 700;
          font-size: 12px;
        }

        .ann-dot {
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
        }

        .ann-dismiss {
          flex-shrink: 0;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          opacity: 0.7;
          line-height: 1;
          transition: opacity .2s;
        }

        .ann-dismiss:hover { opacity: 1; }

        /* ── Bottom toolbar ── */
        .bottom-toolbar {
          width: 100%;
          height: 48px;
          min-height: 48px;

          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;

          background: linear-gradient(180deg, rgba(17, 22, 31, 0.74), rgba(9, 13, 19, 0.88));
          border-top: 1px solid var(--glass-border);
          box-shadow: 0 -10px 28px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03);

          position: relative;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 32px;
          height: 32px;
          border-radius: 6px;

          outline: unset;
          border: 1px solid var(--glass-border);
          background: linear-gradient(180deg, rgba(45, 54, 68, 0.5), rgba(21, 27, 37, 0.62));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          color: #8b92a0;
          text-decoration: none;

          cursor: pointer;
          transition: background .2s, color .2s;
          flex-shrink: 0;
        }

        .toolbar-btn:hover {
          background: #222831;
          color: #c3cad6;
        }

        .room-selector {
          flex: 1;
          height: 32px;

          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 8px;

          background: linear-gradient(180deg, rgba(45, 54, 68, 0.5), rgba(21, 27, 37, 0.66));
          border-radius: 6px;
          border: 1px solid var(--glass-border);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #c3cad6;

          cursor: pointer;
          position: relative;
          user-select: none;
          transition: background .2s;
        }

        .room-selector img {
          width: 18px;
          height: 18px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .room-selector:hover {
          background: #222831;
        }

        .room-name {
          color: #c3cad6;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Geogrotesque Wide', sans-serif;
          line-height: 1;
          flex-shrink: 0;
        }

        .room-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          flex-shrink: 0;
        }

        .room-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1fd65f;
          box-shadow: 0 0 6px rgba(31, 214, 95, 0.75);
          flex-shrink: 0;
        }

        .room-count {
          color: #1fd65f;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Geogrotesque Wide', sans-serif;
          line-height: 1;
          min-width: 1ch;
          text-align: left;
        }

        .room-chevron {
          margin-left: auto;
          transition: transform .2s;
          flex-shrink: 0;
        }

        .room-chevron.open {
          transform: rotate(180deg);
        }

        .room-dropdown {
          position: absolute;
          bottom: calc(100% + 4px);
          left: 0;
          width: 100%;

          background: linear-gradient(180deg, rgba(30, 38, 50, 0.96), rgba(13, 18, 26, 0.97));
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          overflow: hidden;

          display: flex;
          flex-direction: column;
          z-index: 10;
          box-shadow: inset 0 1px 0 var(--glass-highlight), 0 -12px 30px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(16px) saturate(125%);
          -webkit-backdrop-filter: blur(16px) saturate(125%);
        }

        .room-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;

          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #8b92a0;

          cursor: pointer;
          transition: background .15s;
        }

        .room-option:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #c3cad6;
        }

        .opt-count {
          margin-left: auto;
          color: #1fd65f;
          font-size: 11px;
        }

        .rules-btn {
          position: relative;
        }

        .rules-popup {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          width: 230px;

          background: linear-gradient(180deg, rgba(30, 38, 50, 0.96), rgba(13, 18, 26, 0.97));
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 12px 14px;
          z-index: 20;
          box-shadow: inset 0 1px 0 var(--glass-highlight), 0 -12px 30px rgba(0, 0, 0, 0.46);
          backdrop-filter: blur(16px) saturate(125%);
          -webkit-backdrop-filter: blur(16px) saturate(125%);
          cursor: default;
        }

        .rules-title {
          font-family: 'Geogrotesque Wide', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #c3cad6;
          margin-bottom: 10px;
        }

        .rules-list {
          margin: 0;
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .rules-list li {
          font-family: 'Rubik', sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: #8b92a0;
          line-height: 1.4;
        }

        .rules-link {
          color: #1fd65f;
          text-decoration: none;
        }

        .rules-link:hover {
          text-decoration: underline;
        }

        .back-btn {
          flex-shrink: 0;
          display: none;
        }

        @media only screen and (max-width: 1250px) {
          .back-btn {
            display: flex;
          }

          .sidebar-container {
            position: fixed;
            top: 0;
            left: -300px;
            height: calc(100% - 60px);
            z-index: 4;
          }

          .sidebar-container.active {
            top: 0;
            left: 0;
          }
        }
      `}</style>
    </>
  );
}

export default SideBar;
