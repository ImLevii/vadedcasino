export default function TrashIcon(props) {
    return <svg width={props.size || 16} height={props.size || 16} viewBox='0 0 24 24'
                fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'
                stroke-linejoin='round' aria-hidden='true' style={{'flex-shrink': 0}}>
        <path d='M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'/>
    </svg>;
}
