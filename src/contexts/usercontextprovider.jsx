import {api, authedAPI, createNotification, fetchUser, getJWT} from "../util/api";
import {createContext, createResource, createSignal, onCleanup, useContext} from "solid-js";

const UserContext = createContext();

export function UserProvider(props) {

    const initialJwt = getJWT()
    const [fetched, setFetched] = createSignal(!initialJwt)
    const failSafe = setTimeout(() => {
        if (!fetched()) {
            console.warn('Startup auth timed out, releasing loading screen.')
            setFetched(true)
        }
    }, 12000)

    onCleanup(() => clearTimeout(failSafe))

    const [user, { mutate }] = createResource(() => initialJwt || null, getUser), userData = [user, {
        mutateUser(newUser) {
            mutate(newUser)
        },
        setBalance(newBal) {
            let newUser = user()
            newUser.balance = newBal
            mutate({
                ...newUser
            })
        },
        setNotifications(newNotis) {
            let newUser = user()
            newUser.notifications = newNotis
            mutate({
                ...newUser
            })
        },
        setXP(xp) {
            let newUser = user()
            newUser.xp = xp
            mutate({
                ...newUser
            })
        },
        getUser() {
            return user()
        },
        hasFetched() {
            return fetched()
        }
    }]

    async function getUser() {
        try {
            let data = await fetchUser()
            mutate(data)
            setFetched(true)
            clearTimeout(failSafe)

            if (data && window.$crisp) {
                // CRISP LIVE CHAT
                window.$crisp.push(["set", "user:nickname", [data.username]]);

                window.$crisp.push(["set", "session:data", [[
                    ["user-id", data.id]
                ]]]);
            }

            return data
        } catch (e) {
            mutate(null)
            setFetched(true)
            clearTimeout(failSafe)
            console.log(e)
            return null
        }
    }

    return (
        <UserContext.Provider value={userData}>
            {props.children}
        </UserContext.Provider>
    );
}

export function useUser() { return useContext(UserContext); }