// Wanna yap? logo: neon gradient ring, handset with signal, "available" dot.
const HANDSET = 'M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z';

/** The mark centred at (cx, cy) with ring radius r. */
function mark(cx, cy, r, { glow = true } = {}) {
  const stroke = r * 0.19;
  const s = (r * 1.0) / 18; // handset scale (glyph is ~18 units)
  const arc = (rad) => {
    // quarter arc above-right of the handset's ear
    const ox = cx + r * 0.0, oy = cy - r * 0.1;
    const a0 = -Math.PI * 0.5, a1 = 0;
    const x0 = ox + rad * Math.cos(a0), y0 = oy + rad * Math.sin(a0);
    const x1 = ox + rad * Math.cos(a1), y1 = oy + rad * Math.sin(a1);
    return `M ${x0} ${y0} A ${rad} ${rad} 0 0 1 ${x1} ${y1}`;
  };
  const dot = { x: cx + r * 0.707, y: cy - r * 0.707, r: r * 0.17 };
  return `
  ${glow ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ring)" stroke-width="${stroke * 1.5}" filter="url(#soft)" opacity="0.85"/>` : ''}
  <circle cx="${cx}" cy="${cy}" r="${r - stroke / 2}" fill="url(#inner)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ring)" stroke-width="${stroke}"/>
  <path d="M ${cx - r * 0.72} ${cy - r * 0.69} A ${r} ${r} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.995}" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="${stroke * 0.22}" stroke-linecap="round"/>
  <g transform="translate(${cx - 12.6 * s} ${cy - 11.4 * s}) scale(${s})"><path d="${HANDSET}" fill="#F4F4FA"/></g>
  <path d="${arc(r * 0.31)}" fill="none" stroke="#00E5FF" stroke-width="${r * 0.075}" stroke-linecap="round"/>
  <path d="${arc(r * 0.48)}" fill="none" stroke="#00E5FF" stroke-width="${r * 0.075}" stroke-linecap="round" opacity="0.55"/>
  ${glow ? `<circle cx="${dot.x}" cy="${dot.y}" r="${dot.r * 1.3}" fill="#FF2E93" filter="url(#soft)" opacity="0.8"/>` : ''}
  <circle cx="${dot.x}" cy="${dot.y}" r="${dot.r}" fill="#FF2E93" stroke="#0B0B12" stroke-width="${dot.r * 0.32}"/>`;
}

function defs(size) {
  return `<defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#00E5FF"/><stop offset="0.5" stop-color="#8B5CFF"/><stop offset="1" stop-color="#FF2E93"/>
    </linearGradient>
    <radialGradient id="inner" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#23233A"/><stop offset="1" stop-color="#101019"/>
    </radialGradient>
    <radialGradient id="bg" cx="0.5" cy="0.45" r="0.75">
      <stop offset="0" stop-color="#171727"/><stop offset="1" stop-color="#0B0B12"/>
    </radialGradient>
    <radialGradient id="glowC" cx="0.12" cy="0.1" r="0.6">
      <stop offset="0" stop-color="#00E5FF" stop-opacity="0.32"/><stop offset="1" stop-color="#00E5FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowP" cx="0.9" cy="0.92" r="0.6">
      <stop offset="0" stop-color="#FF2E93" stop-opacity="0.26"/><stop offset="1" stop-color="#FF2E93" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${size * 0.028}"/></filter>
  </defs>`;
}

/** App icon: opaque square, iOS rounds the corners. */
function icon(size = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${defs(size)}
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" fill="url(#glowC)"/>
  <rect width="${size}" height="${size}" fill="url(#glowP)"/>
  ${mark(size / 2, size / 2, size * 0.315)}
</svg>`;
}

/** Splash / transparent mark. */
function markOnly(size = 600) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${defs(size)}
  ${mark(size / 2, size / 2, size * 0.36)}
</svg>`;
}

module.exports = { icon, markOnly, mark, defs, HANDSET };
