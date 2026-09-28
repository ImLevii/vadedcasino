import TrashIcon from '../Icons/trash';
import Avatar from '../Level/avatar';
import {STAFF_ROLES} from '../../resources/users';
import {getUserLevel} from '../../resources/levels';
import {useSearchParams} from '@solidjs/router';
import {For, Show} from 'solid-js';
import {findChatEmoji} from '../../resources/chatEmojis';
import './message.css';
export default function Message(props) {
    const [,setParams] = useSearchParams();
    const branded = () => props.user?.staffMode === true;
    const level = () => getUserLevel(props.user?.xp || 0);
    const tryToParseWord = (word) => {
        if (word[0] === '@' && word.length > 3) {
            return <span style={{ color: '#1fd65f' }}>{word}&nbsp;</span>
        }

      if (word[0] === ':' && word[word.length - 1] === ':') {

            let emojiName = word.replaceAll(':', '').trim()
        let emoji = findChatEmoji(emojiName)
            if (!emoji) return <>{word + ' '}</>

        return <>
          <span class='inline-emoji animated' title={`:${emoji.name}:`}>
            <span class='inline-emoji-fallback'>{emoji.fallback}</span>
            <img src={emoji.url} alt={emoji.fallback} loading='lazy'
                 onError={(e) => e.currentTarget.style.display = 'none'}/>
          </span>&nbsp;
        </>
        }

        return word + ' '
    }

    function wasMentioned() {
        if (!props?.actualUser) return false
        return props?.content?.includes(`@${props?.actualUser?.username}`)
    }


    return <article class='chat-line' classList={{'chat-line-staff':branded(),mentioned:wasMentioned()}}>
        <Show when={props.replyTo}><div class='chat-quoted' title={props.repliedMessage}><span>{props.repliedMessage || 'Message unavailable'}</span></div></Show>
        <div class='chat-line-heading' title={new Date(props.createdAt).toLocaleTimeString()}>
            <Show when={branded()} fallback={
                <button type='button' class='chat-identity' onClick={()=>props.user?.id && setParams({user:props.user.id})}>
                    <Avatar id={props.user?.id} xp={props.user?.xp} height={24}/>
                    <span class='chat-level' classList={{'chat-level-gold':level()>=50}}>{level()}</span>
                    <Show when={STAFF_ROLES.includes(props.user?.role)}><span class='chat-role'>{props.user.role}</span></Show>
                    <span class='chat-username'>{props.user?.username || 'Anonymous'}</span>
                </button>
            }><span class='chat-brand-badge'>COSMICLUCK</span></Show>
            <div class='chat-line-actions'>
                <button type='button' aria-label='Reply to message' title='Reply' onClick={()=>props.setReplying(props.replying===props.id ? null : props.id)}><svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.8' aria-hidden='true'><path d='m8 4-5 5 5 5M3 9h9a5 5 0 0 1 5 5v3'/></svg></button>
                <Show when={STAFF_ROLES.includes(props.actualUser?.role)}><button type='button' aria-label='Delete message' title='Delete message' onClick={()=>props.ws?.connected && props.ws.emit('chat:sendMessage', '/delete '+props.id)}><TrashIcon/></button></Show>
            </div>
        </div>
        <p class='chat-line-content'><For each={props.content?.split(' ')}>{tryToParseWord}</For></p>
    </article>;
}
