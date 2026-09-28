import {createSignal, Show} from 'solid-js';
import {useUser} from '../../contexts/usercontextprovider';
import {authedAPI} from '../../util/api';
import {STAFF_ROLES} from '../../resources/users';
import './staffmode.css';
export default function StaffModeButton() {
    const [user,{mutateUser}] = useUser();
    const [saving,setSaving] = createSignal(false);
    async function toggle() {
        if (saving()) return;
        setSaving(true);
        try {
            const result = await authedAPI('/user/staff-mode','POST',JSON.stringify({enable:!user()?.staffMode}),true);
            if (result?.success) mutateUser({...user(),staffMode:result.staffMode});
        } finally {setSaving(false);}
    }
    return <Show when={STAFF_ROLES.includes(user()?.role)}>
        <button class='staff-mode-control' classList={{enabled:!!user()?.staffMode}} type='button' aria-pressed={!!user()?.staffMode} aria-label='Staff mode' disabled={saving()} onClick={toggle} title='Post in chat as COSMICLUCK'>
            <svg width='14' height='16' viewBox='0 0 20 22' fill='none' stroke='currentColor' stroke-width='1.6' aria-hidden='true'><path d='M10 1 18 4v6c0 5-4 9-8 11-4-2-8-6-8-11V4Z'/><path d='m6 10 3 3 5-6'/></svg>
            <span>{user()?.staffMode ? 'COSMICLUCK identity' : 'Staff mode'}</span>
            <span class='staff-mode-switch' aria-hidden='true'><i/></span>
        </button>
    </Show>;
}
