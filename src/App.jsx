import {Routes, Route, useSearchParams, useLocation} from '@solidjs/router'
import {createEffect, createSignal, ErrorBoundary, lazy, onCleanup, onMount, Suspense} from "solid-js";
import {useUser} from "./contexts/usercontextprovider";
import Sidebar from "./components/SideBar/sidebar";
import {authedAPI, closeDropdowns, createNotification} from "./util/api";
import Navbar from "./components/NavBar/navbar";
import {Toaster} from "solid-toast";
import Loader from "./components/Loader/loader";
import LoadingScreen from "./components/Loader/loadingscreen";
import {Redirect} from "./util/redirect";
import {useWebsocket} from "./contexts/socketprovider";
import {ADMIN_ROLES} from "./resources/users";
import Footer from "./components/Footer/footer";
import Freecoins from "./components/Freecoins/freecoins";
import Rakeback from "./components/Rakeback/rakeback";
import AML from "./components/Documentation/aml";
import UserModal from "./components/UserPopup/userpopup";
import SignIn from "./components/Signin/signin";
import {GameFairnessDock} from "./components/GameFairness/gamefairnessbutton";

const Admin = lazy(() => import('./pages/admin'))
const AdminDashboard = lazy(() => import('./components/Admin/dashboard'))
const AdminUsers = lazy(() => import('./components/Admin/users'))
const AdminStatistics = lazy(() => import('./components/Admin/statistics'))
const AdminFilter = lazy(() => import('./components/Admin/filter'))
const AdminCashier = lazy(() => import('./components/Admin/cashier'))
const AdminRain = lazy(() => import('./components/Admin/rain'))
const AdminAnnouncements = lazy(() => import('./components/Admin/announcements'))
const AdminCases = lazy(() => import('./components/Admin/cases'))
const AdminRewards = lazy(() => import('./components/Admin/rewards'))
const AdminSlides = lazy(() => import('./components/Admin/slides'))
const AdminStatsbook = lazy(() => import('./components/Admin/statsbook'))
const AdminSettings = lazy(() => import('./components/Admin/settings'))
const AdminGameSettings = lazy(() => import('./components/Admin/gamesettings'))
const AdminProbability = lazy(() => import('./components/Admin/probability'))

const Mines = lazy(() => import('./pages/mines'))
const Crash = lazy(() => import('./pages/crash'))

const Slot = lazy(() => import('./pages/slot'))
const Slots = lazy(() => import('./pages/slots'))

const Surveys = lazy(() => import('./pages/surveys'))

const Docs = lazy(() => import('./pages/docs'))
const TOS = lazy(() => import('./components/Documentation/tos'))
const Privacy = lazy(() => import('./components/Documentation/privacy'))
const Provably = lazy(() => import('./components/Documentation/provably'))
const FAQ = lazy(() => import('./components/Documentation/faq'))

const Home = lazy(() => import('./pages/home'))

const Profile = lazy(() => import('./pages/profile'))
const Rewards = lazy(() => import('./pages/rewards'))
const Overview = lazy(() => import('./components/Profile/overview'))
const Transactions = lazy(() => import('./components/Profile/transactions'))
const History = lazy(() => import('./components/Profile/history'))
const Settings = lazy(() => import('./components/Profile/settings'))

const Deposit = lazy(() => import('./pages/deposits'))
const Withdraws = lazy(() => import('./pages/withdraws'))

const Leaderboard = lazy(() => import('./pages/leaderboard'))
const Affiliates = lazy(() => import('./pages/affiliates'))

const Coinflips = lazy(() => import('./pages/coinflips'))
const Roulette = lazy(() => import('./pages/roulette'))

const Battles = lazy(() => import('./pages/battles'))
const Battle = lazy(() => import('./pages/battle'))
const CreateBattle = lazy(() => import('./pages/createbattle'))

const Cases = lazy(() => import('./pages/cases'))
const CasesPage = lazy(() => import("./components/Cases/casespage"))
const CasePage = lazy(() => import("./components/Cases/casepage"))
const CommunityCases = lazy(() => import('./pages/communitycases'))
const CreateCase = lazy(() => import('./pages/createcase'))

function App() {

  let pageContent

  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [user, {hasFetched, setBalance, setXP, getUser}] = useUser()
  const [ws] = useWebsocket()
  const [chat, setChat] = createSignal(false)

  onMount(() => {
    const recoveryReset = setTimeout(() => {
      sessionStorage.removeItem('chunk-recovery-attempted')
    }, 30000)
    onCleanup(() => clearTimeout(recoveryReset))
  })

  createEffect(() => {
    if (location.pathname && pageContent) {
      pageContent.scrollTo({top: 0})
    }
  })

  createEffect(() => {
    if (ws() && ws().connected) {
      // Remove any previously attached handlers so effect re-runs
      // (reconnects) don't stack duplicate listeners
      ws().off('balance')
      ws().off('xp')
      ws().off('coinflip:own:started')

      ws().on('balance', (type, amount, delay) => {
        if (type === 'set') {
          setTimeout(() => setBalance(+amount), +delay || 0)
        }

        if (type === 'add') {
          setTimeout(() => setBalance((+user()?.balance || 0) + +amount), +delay || 0)
        }
      })

      ws().on('xp', (xp) => {
        setXP(xp)
      })

      ws().on('coinflip:own:started', (flip) => {
        if (!user()) return
        let isCreator = flip[flip.ownerSide]?.id === user()?.id
        let creatorWon = flip.winnerSide === flip.ownerSide

        if ((isCreator && !creatorWon) || (!isCreator && creatorWon)) return
      })
    }
  })

  createEffect(async () => {
    try {
      if (!hasFetched()) return

      if (!user() && searchParams.a)  {
        setSearchParams({ a: null, modal: 'login' })
        localStorage.setItem('aff', searchParams.a)
        return
      }

      if (user() && searchParams.a) {
        setSearchParams({a: null})

        let res = await authedAPI('/user/affiliate', 'POST', JSON.stringify({
          code: searchParams.a
        }), true)

        if (res.success) {
          createNotification('success', `Successfully redeemed affiliate code ${searchParams.a}.`)
        }
      }
    } catch (e) {
      console.error(e)
      setSearchParams({a: null})
    }
  })

  return (
    <>
      {!hasFetched() ? (
        <LoadingScreen/>
      ) : (
        <>
          <Toaster
            position='bottom-right'
            gutter={10}
            containerStyle={{
              bottom: '24px',
              right: '20px',
            }}
          />

          {searchParams.modal === 'login' && !user() && (
            <SignIn ws={ws}/>
          )}

          {searchParams.modal === 'freecoins' && user() && (
            <Freecoins ws={ws}/>
          )}

          {searchParams?.modal === 'rakeback' && user() && (
            <Rakeback ws={ws} user={user()}/>
          )}

          {searchParams?.user && (
              <UserModal user={user()}/>
          )}

          <ErrorBoundary
            fallback={err => {
              console.log(err.message)
              if (err.message.includes('dynamically imported module')) {
                const recoveryKey = 'chunk-recovery-attempted'
                if (!sessionStorage.getItem(recoveryKey)) {
                  sessionStorage.setItem(recoveryKey, 'true')
                  const url = new URL(window.location.href)
                  url.searchParams.set('_refresh', Date.now().toString())
                  window.location.replace(url.toString())
                  return null
                }
              }

              return (
                <>
                  <div class='startup-error'>
                    <h2>We could not load this page</h2>
                    <p>The latest site files did not finish loading. Refresh once or return home.</p>
                    <button class='bevel-gold' onClick={() => {
                      sessionStorage.removeItem('chunk-recovery-attempted')
                      window.location.href = '/'
                    }}>RETURN HOME</button>
                  </div>
                  {console.log(err)}
                </>
              )
            }}>
            <div class='app' onClick={() => closeDropdowns()}>
              <Sidebar chat={chat()} setChat={setChat}/>
              <div class='center' ref={pageContent}>
                <Navbar user={user()} chat={chat()} setChat={setChat}/>
                <GameFairnessDock pathname={location.pathname}/>

                <div class='content'>
                  <Routes>
                    <Route path='/' element={
                      <Suspense fallback={<Loader/>}>
                        <Home user={user()}/>
                      </Suspense>
                    }/>

                    <Route path='/surveys' element={
                      <Suspense fallback={<Loader/>}>
                        <Surveys user={user()}/>
                      </Suspense>
                    }/>

                    <Route path='/roulette' element={
                      <Suspense fallback={<Loader/>}>
                        <Roulette user={user()}/>
                      </Suspense>
                    }/>

                    <Route path='/crash' element={
                      <Suspense fallback={<Loader/>}>
                        <Crash user={user()}/>
                      </Suspense>
                    }/>

                    <Route path='/mines' element={
                      <Suspense fallback={<Loader/>}>
                        <Mines user={user()}/>
                      </Suspense>
                    }/>

                    <Route path='/cases' element={
                      <Suspense fallback={<Loader/>}>
                        <Cases/>
                      </Suspense>
                    }>

                      <Route path='/' element={
                        <Suspense fallback={<Loader/>}>
                          <CasesPage/>
                        </Suspense>
                      }/>

                      <Route path='/community' element={
                        <Suspense fallback={<Loader/>}>
                          <CommunityCases/>
                        </Suspense>
                      }/>

                      <Route path='/community/create' element={
                        <Suspense fallback={<Loader/>}>
                          <CreateCase/>
                        </Suspense>
                      }/>

                      <Route path='/:slug' element={
                        <Suspense fallback={<Loader/>}>
                          <CasePage/>
                        </Suspense>
                      }/>
                    </Route>

                    <Route path='/battles' element={
                      <Suspense fallback={<Loader/>}>
                        <Battles user={user()}/>
                      </Suspense>
                    }/>
                    <Route path='/battle/create' element={
                      <Suspense fallback={<Loader/>}>
                        <CreateBattle user={user()}/>
                      </Suspense>
                    }/>
                    <Route path='/battle/:id' element={
                      <Suspense fallback={<Loader/>}>
                        <Battle user={user()}/>
                      </Suspense>
                    }/>

                    <Route path='/coinflip' element={
                      <Suspense fallback={<Loader/>}>
                        <Coinflips/>
                      </Suspense>
                    }/>

                    <Route path='/slots' element={
                      <Suspense fallback={<Loader/>}>
                        <Slots/>
                      </Suspense>
                    }/>

                    <Route path='/slots/:slug' element={
                      <Suspense fallback={<Loader/>}>
                        <Slot/>
                      </Suspense>
                    }/>

                    <Route path='/leaderboard' element={
                      <Suspense fallback={<Loader/>}>
                        <Leaderboard/>
                      </Suspense>
                    }/>

                    <Route path='/docs' element={
                      <Suspense fallback={<Loader/>}>
                        <Docs/>
                      </Suspense>
                    }>
                      <Route path='/faq' element={
                        <Suspense fallback={<Loader/>}>
                          <FAQ/>
                        </Suspense>
                      }/>
                      <Route path='/provably' element={
                        <Suspense fallback={<Loader/>}>
                          <Provably/>
                        </Suspense>
                      }/>
                      <Route path='/tos' element={
                        <Suspense fallback={<Loader/>}>
                          <TOS/>
                        </Suspense>
                      }/>
                      <Route path='/privacy' element={
                        <Suspense fallback={<Loader/>}>
                          <Privacy/>
                        </Suspense>
                      }/>
                      <Route path='/aml' element={
                        <Suspense fallback={<Loader/>}>
                          <AML/>
                        </Suspense>
                      }/>
                    </Route>

                    {user() && (
                      <>
                        <Route path='/affiliates' element={
                          <Suspense fallback={<Loader/>}>
                            <Affiliates user={user()}/>
                          </Suspense>
                        }/>

                        <Route path='/profile' element={
                          <Suspense fallback={<Loader/>}>
                            <Profile/>
                          </Suspense>
                        }>
                          <Route path='/' element={<Overview/>}/>
                          <Route path='/transactions' element={<Transactions/>}/>
                          <Route path='/history' element={<History/>}/>
                          <Route path='/settings' element={<Settings/>}/>
                        </Route>

                        <Route path='/rewards/daily' element={
                          <Suspense fallback={<Loader/>}>
                            <Rewards/>
                          </Suspense>
                        }/>

                        <Route path='/rewards/cases' element={
                          <Suspense fallback={<Loader/>}>
                            <Rewards/>
                          </Suspense>
                        }/>

                        <Route path='/rewards/supercharge' element={
                          <Suspense fallback={<Loader/>}>
                            <Rewards/>
                          </Suspense>
                        }/>

                        <Route path='/deposit' element={
                          <Suspense fallback={<Loader/>}>
                            <Deposit/>
                          </Suspense>
                        }/>

                        <Route path='/deposit' element={
                          <Suspense fallback={<Loader/>}>
                            <Deposit/>
                          </Suspense>
                        }/>

                        <Route path='/withdraw' element={
                          <Suspense fallback={<Loader/>}>
                            <Withdraws/>
                          </Suspense>
                        }/>
                      </>
                    )}

                    {user() && ADMIN_ROLES.includes(user().role) && (
                      <>
                        <Route path='/admin' element={
                          <Suspense fallback={<Loader/>}>
                            <Admin/>
                          </Suspense>
                        }>
                          <Route path='/' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminDashboard/>
                            </Suspense>
                          }/>

                          <Route path='/users' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminUsers/>
                            </Suspense>
                          }/>

                          <Route path='/statistics' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminStatistics/>
                            </Suspense>
                          }/>

                          <Route path='/filter' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminFilter/>
                            </Suspense>
                          }/>

                          <Route path='/cashier' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminCashier/>
                            </Suspense>
                          }/>

                          <Route path='/rain' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminRain/>
                            </Suspense>
                          }/>

                          <Route path='/announcements' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminAnnouncements/>
                            </Suspense>
                          }/>

                          <Route path='/cases' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminCases/>
                            </Suspense>
                          }/>

                          <Route path='/rewards' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminRewards/>
                            </Suspense>
                          }/>

                          <Route path='/slides' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminSlides/>
                            </Suspense>
                          }/>

                          <Route path='/statsbook' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminStatsbook/>
                            </Suspense>
                          }/>

                          <Route path='/settings' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminSettings/>
                            </Suspense>
                          }/>

                          <Route path='/games' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminGameSettings/>
                            </Suspense>
                          }/>

                          <Route path='/games/probability' element={
                            <Suspense fallback={<Loader/>}>
                              <AdminProbability/>
                            </Suspense>
                          }/>
                        </Route>
                      </>
                    )}

                    {hasFetched() && (
                      <Route path='*' element={<Redirect/>}/>
                    )}
                  </Routes>

                  <div class='background'/>
                </div>

                <Footer/>
              </div>
            </div>
          </ErrorBoundary>
        </>
      )}

      <style jsx>{`
        .app {
          width: 100vw;
          height: 100vh;

          display: flex;

          position: relative;
          overflow: hidden;
          scrollbar-color: transparent transparent;
        }

        .center {
          height: 100vh;
          width: 100%;
          min-width: 0;
          position: relative;
          overflow: auto;
          scrollbar-color: transparent transparent;
        }

        .center::-webkit-scrollbar {
          display: none;
        }

        .content {
          width: 100%;
          min-width: 0;
          min-height: calc(100% - 130px);
          box-sizing: border-box;

          position: relative;
          padding-inline: clamp(12px, 1.75vw, 30px);
          background:
            radial-gradient(130% 60% at 50% -6%, rgba(31, 214, 95, 0.05), transparent 48%),
            linear-gradient(200deg, rgba(12, 16, 24, 0.72), rgba(7, 10, 16, 0.78));
          border: 1px solid rgba(255, 255, 255, 0.045);
          border-top: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 14px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 0 0 1px rgba(0, 0, 0, 0.06),
            0 24px 60px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(10px) saturate(130%);
          -webkit-backdrop-filter: blur(10px) saturate(130%);
        }

        .background {
          display: none;
          position: absolute;
          max-width: 1500px;
          top: 0;
          left: 50%;
          transform: translateX(-50%);

          height: 100%;
          width: 100%;

          background-image: url("/assets/art/background.png");
          mix-blend-mode: luminosity;
          z-index: -1;

          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
        }

        .app::-webkit-scrollbar {
          display: none;
        }

        .startup-error {
          width: min(440px, calc(100vw - 36px));
          margin: 16vh auto 0;
          padding: 32px 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          background: linear-gradient(160deg, rgba(22, 28, 40, 0.96), rgba(8, 11, 18, 0.98));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 24px 64px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(0, 0, 0, 0.12);
          color: var(--text-secondary, #8f96a6);
          font-family: 'Geogrotesque Wide', sans-serif;
          text-align: center;
        }

        .startup-error h2 {
          margin: 0 0 10px;
          color: #fff;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }

        .startup-error p {
          margin: 0 0 24px;
          color: #7a8294;
          font-size: 13px;
          line-height: 1.6;
        }

        .startup-error button {
          min-width: 160px;
          height: 42px;
          padding: 0 22px;
          border: 0;
          font-family: inherit;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.4px;
          cursor: pointer;
          border-radius: 8px;
        }

        @media only screen and (max-width: 1000px) {
          .center {
            padding-bottom: 50px;
          }

          .content {
            padding-inline: clamp(10px, 2.2vw, 16px);
            border-radius: 12px;
          }
        }

        @media only screen and (max-width: 600px) {
          .content {
            padding-inline: 10px;
            border-left: 0;
            border-right: 0;
            border-radius: 0;
          }
        }
      `}</style>
    </>
  );
}

export default App;
