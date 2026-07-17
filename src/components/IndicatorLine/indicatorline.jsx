/**
 * IndicatorLine — a precision glowing tick-mark line used across spinners and
 * roulette wheels. Designed to look like a physical laser line:
 *   - A razor-thin (1px) bright white-hot core
 *   - A narrow (2–3px) primary color bloom
 *   - A very soft outer halo at low opacity
 *   - Optional slow-breathing pulse
 *
 * Props:
 *   orientation  "horizontal" | "vertical"  (default "horizontal")
 *   length       CSS string for the long axis  (default "100%")
 *   thickness    CSS string for the short axis (default "2px")
 *   color        hex/css color for the core    (default neon green #1fd65f)
 *   pulse        bool – breathing glow         (default true)
 *   style        extra inline styles for outer wrapper
 *   class        extra class names for outer wrapper
 */
function IndicatorLine(props) {
  const isVert   = () => (props.orientation || 'horizontal') === 'vertical';
  const color    = () => props.color || '#1fd65f';
  const thickness = () => props.thickness || '2px';
  const length   = () => props.length || '100%';

  function hexToRgb(hex) {
    const h    = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n    = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const rgb = () => {
    try { return hexToRgb(color()); } catch { return [31, 214, 95]; }
  };

  function glow(alpha) {
    const [r, g, b] = rgb();
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const wrapStyle = () => {
    const s = {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'pointer-events': 'none',
      'flex-shrink': '0',
      position: 'relative',
      ...(props.style || {}),
    };
    if (isVert()) {
      s.width  = thickness();
      s.height = length();
    } else {
      s.width  = length();
      s.height = thickness();
    }
    return s;
  };

  // The "line" is built from three pseudo-layers stacked via box-shadow:
  //   1. Innermost: solid bright core (the actual element fill)
  //   2. Mid bloom: narrow spread at 60% alpha
  //   3. Outer halo: wider spread at 14% alpha for depth
  const barStyle = () => {
    const bloom1 = isVert()
      ? `0 0 3px 1px ${glow(0.7)}`   // narrow y-axis bloom
      : `0 0 3px 1px ${glow(0.7)}`;
    const bloom2 = isVert()
      ? `0 0 8px 2px ${glow(0.18)}`
      : `0 0 8px 2px ${glow(0.18)}`;

    return {
      display: 'block',
      width: '100%',
      height: '100%',
      // Core: white-hot center tinted by color
      background: `linear-gradient(${isVert() ? '180deg' : '90deg'},
        ${glow(0)} 0%,
        rgba(255,255,255,0.9) 20%,
        ${color()} 38%,
        ${color()} 62%,
        rgba(255,255,255,0.9) 80%,
        ${glow(0)} 100%)`,
      'border-radius': '9999px',
      'box-shadow': `${bloom1}, ${bloom2}`,
      animation: (props.pulse !== false) ? 'il-pulse 2.8s ease-in-out infinite' : 'none',
    };
  };

  return (
    <>
      <div
        class={'indicator-line-wrap ' + (props.class || '')}
        style={wrapStyle()}
        aria-hidden='true'
      >
        <div class='indicator-line-bar' style={barStyle()} />
      </div>

      <style>{`
        @keyframes il-pulse {
          0%, 100% { opacity: 0.85; }
          50%       { opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default IndicatorLine;
