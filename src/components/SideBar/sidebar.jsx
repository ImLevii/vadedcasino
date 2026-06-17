import Chat from "../Chat/chat";
import Chats from "./chats";
import TipRain from "./tiprain";
import ChatRules from "./chatrules";
import {createEffect, createSignal, onCleanup} from "solid-js";
import {useWebsocket} from "../../contexts/socketprovider";
import GreenCount from "../Count/greencount";
import {useRain} from "../../contexts/raincontext";
import {createNotification} from "../../util/api";
import SidebarRain from "./rain";
import {A} from "@solidjs/router";

const ROOM_NAMES = {
  EN: 'ENGLISH',
  TR: 'TURKISH',
  GR: 'GERMAN',
  BEG: 'BEGGING',
  VIP: 'WHALE LOUNGE',
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
  const [emojis, setEmojis] = createSignal([])
  const [ws] = useWebsocket()

  createEffect(() => {
    if (ws() && !previousState) {
      ws().emit('chat:join', 'EN')
    }

    if (ws()) {
      // Remove existing listeners before adding new ones to prevent duplicates
      ws().off('chat:pushMessage')
      ws().off('toast')
      ws().off('chat:emojis')
      ws().off('chat:clear')
      ws().off('misc:onlineUsers')
      ws().off('chat:join')
      ws().off('chat:deleteMessage')

      ws().on('chat:pushMessage', (m) => {
        let newMessages = [...messages(), ...m].slice(-50)
        setMessages(newMessages)
      })

      ws().on('toast', (type, content, config = { duration: 3000 }) => {
        createNotification(type, content, config)
      });

      ws().on('chat:emojis', (emojis) => setEmojis(emojis))
      ws().on('chat:clear', () => setMessages([]))
      ws().on('misc:onlineUsers', (data) => setOnline(data))
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
          {!rain()?.active && !userRain() ? (
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
          ) : (
            <SidebarRain/>
          )}
        </div>

        <div class='announcement'>
          <span class='ann-dot'/>
          <p>Sol withdrawals are now live</p>
        </div>

        <div class='options'>
          <Chats online={online()} ws={ws()} room={room()}/>

          <div class='split'>
            <ChatRules/>
            <GreenCount active={true} number={online()?.total} css={{'flex': '1'}}/>
          </div>

          <TipRain/>
        </div>

        <Chat messages={messages()} ws={ws()} emojis={emojis()}/>
      </div>

      <style jsx>{`
        .sidebar-container {
          min-width: 300px;
          width: 300px;
          height: 100vh;
          max-height: 100vh;

          display: flex;
          flex-direction: column;

          background: #0e1116;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
          transition: left .3s;
        }

        .options {
          padding: 12px 14px;

          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .split {
          display: flex;
          gap: 10px;
        }

        .split > * {
          flex: 1;
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

          background: #12151c;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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

          margin: 12px 14px 0 14px;
          padding: 9px 12px;
          border-radius: 8px;

          background: rgba(31, 214, 95, 0.1);
          border: 1px solid rgba(31, 214, 95, 0.25);

          font-family: 'Geogrotesque Wide', sans-serif;
          font-weight: 700;
          font-size: 12px;
          color: #1fd65f;
        }

        .ann-dot {
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #1fd65f;
          box-shadow: 0 0 8px rgba(31, 214, 95, 0.9);
        }

        @media only screen and (max-width: 1250px) {
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
