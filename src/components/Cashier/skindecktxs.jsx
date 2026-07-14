import {createResource, For, Show} from "solid-js";
import {authedAPI} from "../../util/api";
import Loader from "../Loader/loader";
import Avatar from "../Level/avatar";
import {formatNumber} from "../../util/numbers";

function AdminSkinDeckCashier() {
    const [payments] = createResource(async () => {
        const response = await authedAPI('/admin/cashier/skindeck?page=1', 'GET');
        return response?.data || [];
    });

    return (
        <div class='payments'>
            <div class='table-header row'>
                <span>USER</span><span>TYPE</span><span>VALUE</span><span>STATUS</span><span>UPDATED</span>
            </div>
            <Show when={!payments.loading} fallback={<Loader/>}>
                <For each={payments()}>{payment => (
                    <div class='row payment-row'>
                        <div class='user'><Avatar id={payment.userId} xp={payment.xp} height='28'/><strong>{payment.username}</strong></div>
                        <span>{payment.type}</span>
                        <strong>{formatNumber(payment.value)} coins</strong>
                        <span class={`status ${payment.status}`}>{payment.status}</span>
                        <span>{new Date(payment.updatedAt).toLocaleString()}</span>
                    </div>
                )}</For>
            </Show>
            <style jsx>{`
                .payments { width: 100%; }
                .row { display: grid; grid-template-columns: 1.3fr .7fr .8fr .8fr 1.1fr; align-items: center; gap: 12px; min-height: 52px; padding: 0 16px; }
                .table-header { min-height: 34px; color: #59616e; font-family: Geogrotesque Wide, sans-serif; font-size: 10px; font-weight: 700; }
                .payment-row { border-top: 1px solid rgba(255,255,255,.06); background: rgba(18,21,28,.56); color: #8b92a0; font-family: Geogrotesque Wide, sans-serif; font-size: 11px; }
                .payment-row:nth-child(odd) { background: rgba(255,255,255,.018); }
                .payment-row strong { color: #c3cad6; }
                .user { display: flex; align-items: center; gap: 8px; min-width: 0; }
                .status { text-transform: uppercase; }
                .status.completed { color: #1fd65f; }
                .status.failed, .status.cancelled, .status.expired { color: #ff5141; }
                @media (max-width: 800px) { .row { grid-template-columns: 1.2fr .8fr .8fr; } .row > :nth-child(2), .row > :nth-child(5) { display: none; } }
            `}</style>
        </div>
    );
}

export default AdminSkinDeckCashier;