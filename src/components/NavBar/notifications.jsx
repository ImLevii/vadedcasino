import {createEffect, createResource, createSignal, For, onCleanup, Show} from "solid-js";
import {useWebsocket} from "../../contexts/socketprovider";
import {addDropdown, authedAPI} from "../../util/api";
import Loader from "../Loader/loader";
import Notification from "./notification";
import {useUser} from "../../contexts/usercontextprovider";

function Notifications(props) {

  const [user, { setNotifications }] = useUser()
  const [active, setActive] = createSignal(false)
  const [clearing, setClearing] = createSignal(false)
  const [notifications, {mutate}] = createResource(() => active(), fetchNotifications)
  const [ws] = useWebsocket()

  addDropdown(setActive)

  createEffect(() => {
    const socket = ws()
    if (!socket || !socket.connected) return

    const handleNotifications = (type, notis) => {
      if (type === 'set') return setNotifications(notis)

      let newNotis = user().notifications + notis
      setNotifications(newNotis)
    }

    socket.on('notifications', handleNotifications)
    onCleanup(() => socket.off('notifications', handleNotifications))
  })

  async function fetchNotifications(dropdownActive) {
    if (!dropdownActive) return

    try {
      let notisRes = await authedAPI('/user/notifications', 'GET', null, false)
      return Array.isArray(notisRes) ? notisRes : []
    } catch (e) {
      return []
    }
  }

  function removeNotification(id) {
    let index = (notifications() || []).findIndex(noti => noti.id === id)

    if (index < 0) return
    mutate([
      ...notifications().slice(0, index),
      ...notifications().slice(index + 1)
    ])
  }

  async function clearNotifications() {
    if (clearing() || !notifications()?.length) return

    setClearing(true)
    try {
      const res = await authedAPI('/user/notifications', 'DELETE', null, true)
      if (res?.success) {
        mutate([])
        setNotifications(0)
      }
    } finally {
      setClearing(false)
    }
  }

  return (
    <>
      <div className='notifications'>
        <button class={'bell ' + (active() ? 'active' : '')} type='button' aria-label='Notifications'
                aria-expanded={active()} onClick={(e) => {
                  setActive(!active())
                  e.stopPropagation()
                }}>
          <img src='/assets/icons/bell.svg' height='18' width='23' alt=''/>

          {user().notifications > 0 && (
            <div className='alert'>
              {user().notifications > 99 ? '99+' : user().notifications}
            </div>
          )}
        </button>

        <div class={'dropdown' + (active() ? ' active' : '')} onClick={(e) => e.stopPropagation()}>
          <div class='decoration-arrow'/>
          <div class='notis-wrapper'>
            <div class='panel-header'>
              <div class='panel-title'>
                <span class='panel-icon'><img src='/assets/icons/bell.svg' height='15' width='16' alt=''/></span>
                <div>
                  <strong>Notifications</strong>
                  <p>{notifications()?.length ? `${notifications().length} recent updates` : 'Your activity updates'}</p>
                </div>
              </div>

              <Show when={notifications()?.length > 0}>
                <button class='clear-all' type='button' disabled={clearing()} onClick={clearNotifications}>
                  <img src='/assets/icons/trash.svg' height='12' width='11' alt=''/>
                  {clearing() ? 'Clearing...' : 'Clear all'}
                </button>
              </Show>
            </div>

            <div class='notis-body'>
              <div class='notis'>
                <Show when={!notifications.loading} fallback={<Loader max={'20px'}/>}>
                  {notifications()?.length > 0 ? (
                    <For each={notifications()}>{(noti) =>
                      <Notification {...noti} delete={() => removeNotification(noti.id)}/>
                    }</For>
                  ) : (
                    <div class='none'>
                      <span class='empty-icon'><img src='/assets/icons/bell.svg' height='19' width='20' alt=''/></span>
                      <strong>All caught up</strong>
                      <p>New activity will appear here.</p>
                    </div>
                  )}
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notifications {
          height: 43px;
          width: 43px;
          position: relative;
        }

        .bell {
          width: 100%;
          height: 100%;
          padding: 0;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid rgba(31,214,95,0.28);
          background: radial-gradient(80% 80% at 50% 0%, rgba(31,214,95,0.15), transparent 72%), linear-gradient(180deg, rgba(26, 42, 37, 0.82), rgba(11, 19, 20, 0.94));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: border-color .2s, background .2s, transform .2s, box-shadow .2s;
        }

        .bell:hover, .bell.active {
          border-color: rgba(31,214,95,0.55);
          background: radial-gradient(80% 80% at 50% 0%, rgba(31,214,95,0.22), transparent 72%), linear-gradient(180deg, rgba(27, 52, 41, 0.9), rgba(10, 27, 21, 0.98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 9px 22px rgba(0,0,0,.24), 0 0 18px rgba(31,214,95,.07);
          transform: translateY(-1px);
        }

        .bell:focus-visible {
          outline: 2px solid rgba(31,214,95,.72);
          outline-offset: 2px;
        }

        .alert {
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          box-sizing: border-box;
          position: absolute;
          top: -6px;
          right: -7px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #0c1218;
          border-radius: 999px;
          background: linear-gradient(180deg, #ff5e66, #d72f3d);
          box-shadow: 0 4px 10px rgba(0,0,0,.35), 0 0 8px rgba(255,71,82,.18);
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 8px;
          font-weight: 800;
          color: white;
        }

        .dropdown {
          position: absolute;
          width: min(380px, calc(100vw - 24px));
          height: min(480px, calc(100vh - 92px));
          top: 54px;
          right: 0;
          z-index: 20;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateY(-8px) scale(.985);
          transform-origin: top right;
          transition: opacity .18s ease, transform .18s ease, visibility .18s;
          cursor: default;
        }

        .dropdown.active {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateY(0) scale(1);
        }

        .decoration-arrow {
          width: 13px;
          height: 9px;

          top: 1px;
          background: rgba(20, 28, 38, 0.98);
          position: absolute;
          right: 0;

          border-left: 1px solid rgba(255,255,255,0.08);
          border-right: 1px solid rgba(255,255,255,0.08);
          border-top: 1px solid rgba(255,255,255,0.08);

          clip-path: polygon(0% 100%, 100% 0%, 100% 100%);
          z-index: 1;
        }

        .mobile .decoration-arrow {
          display: none;
        }

        .notis-wrapper {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--glass-border);
          background: radial-gradient(circle at 8% 0%, rgba(31,214,95,.08), transparent 30%), linear-gradient(145deg, rgba(24, 32, 43, 0.98), rgba(8, 13, 20, 0.99));
          border-radius: 10px;
          box-shadow: inset 0 1px 0 var(--glass-highlight), 0 16px 40px rgba(0,0,0,0.42);
          backdrop-filter: blur(18px) saturate(125%);
          -webkit-backdrop-filter: blur(18px) saturate(125%);

          margin-top: 8px;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .panel-header {
          min-height: 66px;
          padding: 11px 12px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,.065);
          background: rgba(255,255,255,.018);
        }

        .panel-title {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .panel-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 8px;
          border: 1px solid rgba(31,214,95,.24);
          background: rgba(31,214,95,.09);
        }

        .panel-title strong {
          display: block;
          color: #eef3f8;
          font-size: 13px;
          font-weight: 800;
        }

        .panel-title p {
          margin-top: 3px;
          color: #6f7a8b;
          font-size: 9px;
          font-weight: 700;
        }

        .clear-all {
          height: 30px;
          padding: 0 9px;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 6px;
          border: 1px solid rgba(255,93,105,.16);
          background: rgba(255,70,84,.055);
          color: #aeb7c5;
          font-family: "Geogrotesque Wide", sans-serif;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
          transition: color .18s, border-color .18s, background .18s;
        }

        .clear-all:hover:not(:disabled) {
          color: #ff7c87;
          border-color: rgba(255,93,105,.34);
          background: rgba(255,70,84,.1);
        }

        .clear-all:disabled {
          opacity: .55;
          cursor: wait;
        }

        .notis-body {
          min-height: 0;
          flex: 1;
          padding: 9px;
        }
        
        .notis {
          width: 100%;
          height: 100%;

          display: flex;
          flex-direction: column;
          gap: 8px;
          
          overflow-y: auto;
        }
        
        .notis::-webkit-scrollbar {
          width: 4px;
        }

        .notis::-webkit-scrollbar-thumb {
          border-radius: 99px;
          background: rgba(139,146,160,.24);
        }
        
        .none {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #d8dfe8;
          overflow: hidden;
        }

        .empty-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin-bottom: 3px;
          border-radius: 10px;
          border: 1px solid rgba(31,214,95,.18);
          background: rgba(31,214,95,.065);
          opacity: .8;
        }

        .none strong { font-size: 12px; font-weight: 800; }
        .none p { color: #677284; font-size: 10px; font-weight: 600; }

        @media only screen and (max-width: 1000px) {
          .notifications {
            width: 35px;
            height: 35px;
          }

          .dropdown { top: 46px; }
        }

        @media only screen and (max-width: 480px) {
          .dropdown { right: -8px; }
          .panel-header { padding: 10px; }
          .clear-all { padding: 0 8px; }
        }
      `}</style>
    </>
  );
}

export default Notifications
