/**
 * Signed area per subpath of an SVG path (M/L/H/V/C/S/Q/A/Z, absolute and
 * relative, packed arc flags; T is unsupported and throws).
 * Test helper: a filled subpath with ~0 area draws nothing, which is how a retraced arc once hid CommunityGlyph's second head.
 */
export function subpathAreas(d: string): number[] {
  const toks = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) as string[];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0;
  const areas: number[] = [];
  let pts: [number, number][] = [];
  const num = () => parseFloat(toks[i++]);
  const flag = (): number => { // arc flags may be packed: "01" -> 0,1
    const t = toks[i];
    if (t.length > 1 && /^[01]/.test(t)) { toks[i] = t.slice(1); return +t[0]; }
    i++; return +t;
  };
  const close = () => { if (pts.length > 2) { let a = 0;
    for (let k = 0; k < pts.length; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % pts.length]; a += x1 * y2 - x2 * y1; }
    areas.push(a / 2); } else if (pts.length) areas.push(0); pts = []; };
  const cubic = (x1: number, y1: number, x2: number, y2: number, ex: number, ey: number) => { for (let t = 1; t <= 16; t++) { const s = t / 16, u = 1 - s;
    pts.push([u*u*u*x + 3*u*u*s*x1 + 3*u*s*s*x2 + s*s*s*ex, u*u*u*y + 3*u*u*s*y1 + 3*u*s*s*y2 + s*s*s*ey]); } };
  const arc = (rx: number, ry: number, phi: number, fa: number, fs: number, ex: number, ey: number) => { // SVG 1.1 F.6.5, phi assumed 0 is fine but handle generally
    const p = phi * Math.PI / 180, c = Math.cos(p), sn = Math.sin(p);
    const dx = (x - ex) / 2, dy = (y - ey) / 2, x1 = c*dx + sn*dy, y1 = -sn*dx + c*dy;
    rx = Math.abs(rx); ry = Math.abs(ry); const L = x1*x1/(rx*rx) + y1*y1/(ry*ry); if (L > 1) { rx *= Math.sqrt(L); ry *= Math.sqrt(L); }
    let k = Math.sqrt(Math.max(0, (rx*rx*ry*ry - rx*rx*y1*y1 - ry*ry*x1*x1) / (rx*rx*y1*y1 + ry*ry*x1*x1))); if (fa === fs) k = -k;
    const cxp = k * rx * y1 / ry, cyp = -k * ry * x1 / rx;
    const ccx = c*cxp - sn*cyp + (x + ex) / 2, ccy = sn*cxp + c*cyp + (y + ey) / 2;
    const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux*vy - uy*vx, ux*vx + uy*vy);
    const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry); let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; if (fs && dt < 0) dt += 2 * Math.PI;
    for (let s = 1; s <= 24; s++) { const t = t1 + dt * s / 24; pts.push([ccx + rx*Math.cos(t)*c - ry*Math.sin(t)*sn, ccy + rx*Math.cos(t)*sn + ry*Math.sin(t)*c]); }
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const r = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = r ? x : 0, oy = r ? y : 0;
    if (C === 'Z') { x = sx; y = sy; close(); continue; }
    if (C === 'M') { close(); x = ox + num(); y = oy + num(); sx = x; sy = y; pts.push([x, y]); cmd = r ? 'l' : 'L'; continue; }
    if (C === 'L') { x = ox + num(); y = oy + num(); }
    else if (C === 'H') x = ox + num();
    else if (C === 'V') y = oy + num();
    else if (C === 'C') { const a: [number, number, number, number, number, number] = [ox+num(), oy+num(), ox+num(), oy+num(), ox+num(), oy+num()]; cubic(...a); [cx, cy, x, y] = [a[2], a[3], a[4], a[5]]; continue; }
    else if (C === 'S') { const a: [number, number, number, number, number, number] = [2*x-cx, 2*y-cy, ox+num(), oy+num(), ox+num(), oy+num()]; cubic(...a); [cx, cy, x, y] = [a[2], a[3], a[4], a[5]]; continue; }
    else if (C === 'Q') { const qx = ox+num(), qy = oy+num(), ex = ox+num(), ey = oy+num(); cubic(x+2/3*(qx-x), y+2/3*(qy-y), ex+2/3*(qx-ex), ey+2/3*(qy-ey), ex, ey); [cx, cy, x, y] = [qx, qy, ex, ey]; continue; }
    else if (C === 'A') { const rx = num(), ry = num(), ph = num(), fa = flag(), fs = flag(), ex = ox + num(), ey = oy + num(); arc(rx, ry, ph, fa, fs, ex, ey); x = ex; y = ey; continue; }
    else throw new Error('unsupported ' + cmd);
    pts.push([x, y]);
  }
  close();
  return areas;
}
