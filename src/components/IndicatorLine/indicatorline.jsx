/**
 * IndicatorLine — reusable glowing capsule bar that replaces every dashed tick-mark
 * style indicator across the platform.
 *
 * Props:
 *   orientation  "horizontal" | "vertical"  (default "horizontal")
 *   length       string CSS value for the long axis (default "100%")
 *   thickness    string CSS value for the short axis (default "3px")
 *   color        hex/css string for core color (default neon green #1fd65f)
 *   pulse        bool – enable slow breathing glow animation (default true)
 *   style        extra inline styles for the outer wrapper
 *   class        extra class names for the outer wrapper
 */
function IndicatorLine(props) {
  const isVert = () => (props.orientation || 'horizontal') === 'vertical';
  const color  = () => props.color || '#1fd65f';
  const thickness = () => props.thickness || '3px';
  const length    = () => props.length    || '100%';

  // Derive RGB channels from hex so we can feed them into rgba() for the glow
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const rgb = () => {
    try { return hexToRgb(color()); } catch { return [31, 214, 95]; }
  };

  function glow(alpha) {
    const [r, g, b] = rgb();
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Outer wrapper: constrained to exact dimensions
  const wrapStyle = () => {
    const base = {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'pointer-events': 'none',
      'flex-shrink': '0',
      ...(props.style || {}),
    };

    if (isVert()) {
      base.width  = thickness();
      base.height = length();
    } else {
      base.width  = length();
      base.height = thickness();
    }

    return base;
  };

  // Core capsule — fills the wrapper 100%
  const barStyle = () => {
    const [r, g, b] = rgb();
    const boxShadow = [
      `0 0 4px  2px ${glow(0.9)}`,
      `0 0 10px 4px ${glow(0.6)}`,
      `0 0 22px 7px ${glow(0.35)}`,
      `0 0 40px 14px ${glow(0.16)}`,
    ].join(', ');

    return {
      display: 'block',
      width: '100%',
      height: '100%',
      background: color(),
      'border-radius': '9999px',
      'box-shadow': boxShadow,
      animation: (props.pulse !== false) ? 'indicator-pulse 2.4s ease-in-out infinite' : 'none',
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
        @keyframes indicator-pulse {
          0%, 100% { opacity: 0.80; filter: brightness(1);    }
          50%       { opacity: 1;   filter: brightness(1.22); }
        }
      `}</style>
    </>
  );
}

export default IndicatorLine;
