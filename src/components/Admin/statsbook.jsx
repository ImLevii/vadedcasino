import {createResource, createSignal, For, Show} from "solid-js";
import {authedAPI, createNotification} from "../../util/api";
import Loader from "../Loader/loader";
import AdminMFA from "../MFA/adminmfa";
import {useSearchParams} from "@solidjs/router";
import Switch from "../Toggle/switch";

function AdminStatsbook(props) {

    const [params, setParams] = useSearchParams()
    const [page, setPage] = createSignal(1)
    const [statsbook, setStatsbook] = createSignal([])
    const [isLoading, setIsLoading] = createSignal(true)

    async function fetchStatsbook() {
        try {
            let statsbookRes = await authedAPI(`/admin/statsbook?page=${params.page || 1}`, 'GET', null)
            if (statsbookRes.error && statsbookRes.error === '2FA_REQUIRED') {
                return
            }

            setStatsbook(statsbookRes)
            return setIsLoading(false)
        } catch (e) {
            console.log(e)
        }
    }
    fetchStatsbook()

    return (
        <>
            <div class='content'>
                <div class='table-wrapper'>
                    <div class='table-header'>
                        <div className='table-column'>
                            <p>NAME</p>
                        </div>
                        <div className='table-column'>
                            <p>WEEK</p>
                        </div>
                        <div className='table-column'>
                            <p>MONTH</p>
                        </div>
                        <div className='table-column'>
                            <p>BANNED</p>
                        </div>
                    </div>

                    <Show when={!isLoading()} fallback={<Loader/>}>
                        <For each={statsbook()}>{(stat) =>
                            <div className='table-data'>
                                <div className='table-column'>
                                    <p>{stat?.username}</p>
                                </div>
                                <div className='table-column'>
                                    <p>{(stat?.week || 0)?.toLocaleString()}</p>
                                </div>
                                <div className='table-column'>
                                    <p>{(stat?.month || 0)?.toLocaleString()}</p>
                                </div>
                                <div className='table-column'>
                                    <Switch dark={true} active={false} toggle={async () => {

                                    }}/>
                                </div>
                            </div>
                        }</For>
                    </Show>
                </div>
            </div>

            <style jsx>{`
              .table-wrapper {
                width: 100%;
                min-width: 0;
              }

              .table-header, .table-data {
                display: flex;
                justify-content: space-between;
              }

              .table-header {
                margin: 0 0 20px 0;
              }

              .table-data {
                height: 48px;
                background: #12151c;
                border-radius: 6px;
                padding: 0 16px;

                display: flex;
                align-items: center;

                color: #8b92a0;
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 3px;
              }

              .table-data:nth-of-type(2n) {
                background: rgba(255,255,255,0.02);
              }

              .table-column {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1 1 0;
                min-width: 0;
              }

              .table-column:nth-of-type(4n) {
                justify-content: flex-end;
              }

              .table-header p {
                background: rgba(255,255,255,0.05);
                height: 24px;
                line-height: 24px;
                padding: 0 12px;
                border-radius: 4px;

                color: #4b5260;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
              }

              .content {
                display: flex;
                gap: 35px;
                width: 100%;
                min-width: 0;
              }

              @media only screen and (max-width: 768px) {
                .content {
                  flex-direction: column;
                }
              }
            `}</style>
        </>
    );
}

export default AdminStatsbook;