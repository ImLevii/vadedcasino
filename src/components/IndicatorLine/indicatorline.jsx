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

  // The bar is oriented via flex direction so it works for both axes
  const wrapStyle = () => {
    const base = {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'pointer-events': 'none',
      ...(props.style || {}),
    };
    if (isVert()) {
      base.width = props.thickness || '3px';
      base.height = props.length   || '100%';
    } else {
      base.height = props.thickness || '3px';
      base.width  = props.length    || '100%';
    }
    return base;
  };

  // Core capsule styles
  const barStyle = () => {
    const [r, g, b] = rgb();
    const boxShadow = [
      `0 0 4px  2px ${glow(0.85)}`,
      `0 0 10px 4px ${glow(0.55)}`,
      `0 0 22px 8px ${glow(0.30)}`,
      `0 0 46px 16px ${glow(0.14)}`,
    ].join(', ');

    const base = {
      background: color(),
      'border-radius': '9999px',
      'box-shadow': boxShadow,
      animation: (props.pulse !== false) ? 'indicator-pulse 2.4s ease-in-out infinite' : 'none',
    };
    if (isVert()) {
      base.width   = '100%';
      base.height  = '100%';
    } else {
      base.width   = '100%';
      base.height  = '100%';
    }
    return base;
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
          0%, 100% { opacity: 0.82; filter: brightness(1);   }
          50%       { opacity: 1;    filter: brightness(1.18); }
        }
      `}</style>
    </>
  );
}

export default IndicatorLine;
