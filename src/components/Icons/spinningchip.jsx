function SpinningChip(props) {

    const size = props.size || 96

    return (
        <>
            <div class='chip-wrapper' style={{width: `${size}px`, height: `${size}px`}}>
                <img src='/assets/icons/chip-spinning.svg' width={size} height={size} alt='' draggable={false}/>
            </div>

            <style jsx>{`
              .chip-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
              }

              .chip-wrapper img {
                width: 100%;
                height: 100%;
                user-select: none;
              }
            `}</style>
        </>
    )
}

export default SpinningChip
