/* 90-second explainer of the three phases, drawn on canvas + KaTeX overlays from one timeline.
   Every frame is a pure function of the time t (renderAt), so the same code plays in the page and
   exports to mp4 frame by frame. The 1D flow is exact: the data are a two-component Gaussian mixture,
   x_t = (1-t) x0 + t eps, and v(x,t) = E[eps - x0 | x_t = x] is computed in closed form. */
(function () {
  "use strict";
  const W = 1280, H = 720, T_END = 88, COVER_T = 9.2;
  const C = { blue: "#4c6ee0", orange: "#f39a3c", purple: "#8e6ccb", lav: "#b9a5e6", grey: "#7a7a7a", dark: "#191919", ink: "#262626", faint: "#a3a7b0", panel: "#c9ccd3" };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const seg = (t, a, b) => ease((t - a) / (b - a));
  const win = (t, a, b, f = 0.5) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
  const lerp = (a, b, s) => a + (b - a) * s;
  const lerp2 = (p, q, s) => [lerp(p[0], q[0], s), lerp(p[1], q[1], s)];
  const hex = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const mixHex = (a, b, s) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const ch = sh => Math.round(lerp((A >> sh) & 255, (B >> sh) & 255, s)); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };

  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ---------------------------------------------------------------- exact 1D flow */
  const MIX = [{ pi: 0.35, mu: -2.0, s: 0.3 }, { pi: 0.65, mu: 2.0, s: 0.3 }];  // after RL: the high-reward mode is heavier
  const pdf = (x, m, v) => Math.exp(-(x - m) * (x - m) / (2 * v)) / Math.sqrt(2 * Math.PI * v);
  function comp(x, t, k) { const m = (1 - t) * MIX[k].mu, v = (1 - t) * (1 - t) * MIX[k].s * MIX[k].s + t * t; return { m, v, w: MIX[k].pi * pdf(x, m, v) }; }
  function marg(x, t) { const a = comp(x, t, 0), b = comp(x, t, 1); return { p: a.w + b.w, post: b.w / (a.w + b.w + 1e-300) }; }
  function vel(x, t) {
    let num = 0, den = 0;
    for (let k = 0; k < 2; k++) {
      const c = comp(x, t, k), s2 = MIX[k].s * MIX[k].s;
      const Ex0 = MIX[k].mu + (1 - t) * s2 / c.v * (x - c.m), Eeps = t / c.v * (x - c.m);
      num += c.w * (Eeps - Ex0); den += c.w;
    }
    return num / (den + 1e-300);
  }
  function trajectory(x1, n = 240) {   // integrate dx/dt = v from t = 1 down to t = 0 (RK4)
    const pts = [[1, x1]]; let x = x1; const h = 1 / n;
    for (let i = 0; i < n; i++) {
      const t = 1 - i * h;
      const k1 = vel(x, t), k2 = vel(x - h / 2 * k1, t - h / 2), k3 = vel(x - h / 2 * k2, t - h / 2), k4 = vel(x - h * k3, t - h);
      x = x - h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
      pts.push([t - h, x]);
    }
    return pts;
  }
  const atLevel = (pts, t) => { const i = clamp(Math.round((1 - t) * (pts.length - 1)), 0, pts.length - 1); return pts[i][1]; };
  const slopeAt = (pts, t) => vel(atLevel(pts, t), t);
  // plot mapping: level 1 (noise) on the left, level 0 (data) on the right, as in the paper's Fig. 2(c)
  const LX = l => 190 + (1 - l) * 470, Y = x => 352 - x * 66;
  const QUANT = [-1.803, -1.242, -0.919, -0.674, -0.464, -0.272, -0.09, 0.09, 0.272, 0.464, 0.674, 0.919, 1.242, 1.803];  // N(0,1) quantiles
  const TRAJ = QUANT.map(q => trajectory(q));
  const HERO = trajectory(-0.3);   // highlighted: starts near the split, stays flat, bends late into the high-reward mode

  /* ---------------------------------------------------------------- 2D scene */
  const CO = [255, 455], CB = [545, 265];   // low- / high-reward mode centres
  const R2 = rng(7);
  const PART = [];
  for (let i = 0; i < 150; i++) {
    const hi = i % 2 === 1;
    const c = hi ? CB : CO;
    const p = [c[0] + gauss(R2) * 62, c[1] + gauss(R2) * 44];
    const mig = !hi && R2() < 0.6;   // 30% of all samples move from the low- to the high-reward mode
    const tgt = [CB[0] + gauss(R2) * 58, CB[1] + gauss(R2) * 40];
    PART.push({ p, hi, mig, tgt, bend: (R2() - 0.5) * 120, delay: R2() * 0.35 });
  }

  /* ---------------------------------------------------------------- drawing helpers */
  function arrow(ctx, a, b, color, w = 3, dash = null, head = 13) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 3) return;
    const ux = dx / L, uy = dy / L, hb = [b[0] - ux * head, b[1] - uy * head];
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(hb[0], hb[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(hb[0] - uy * head * 0.45, hb[1] + ux * head * 0.45); ctx.lineTo(hb[0] + uy * head * 0.45, hb[1] - ux * head * 0.45); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function dot(ctx, p, color, r = 7, ring = false) {
    ctx.save(); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
    if (ring) { ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = color; ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = "#fff"; ctx.stroke(); }
    ctx.restore();
  }
  function predDot(ctx, p, r = 8) {   // the policy prediction: half orange, half blue (as in the paper)
    ctx.save(); const g = ctx.createLinearGradient(p[0] - r, p[1], p[0] + r, p[1]);
    g.addColorStop(0, C.orange); g.addColorStop(0.5, C.orange); g.addColorStop(0.5, C.blue); g.addColorStop(1, C.blue);
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.restore();
  }
  function modes(ctx, a, wLow = 1, wHigh = 1) {
    [[CO, C.orange, wLow], [CB, C.blue, wHigh]].forEach(([c, col, w]) => {
      [1, 0.72, 0.46].forEach((s, k) => {
        ctx.beginPath(); ctx.ellipse(c[0], c[1], 205 * s, 140 * s, 0, 0, 2 * Math.PI);
        ctx.fillStyle = hex(col, a * (0.05 + 0.05 * k) * w); ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = hex(col, a * 0.45 * Math.min(1, 0.4 + w)); ctx.stroke();
      });
    });
  }
  function panel(ctx, a, label) {
    ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 1.5; ctx.strokeStyle = C.panel;
    ctx.beginPath(); ctx.roundRect(40, 74, 720, 556, 14); ctx.stroke();
    ctx.fillStyle = C.faint; ctx.font = "500 17px Inter, sans-serif"; ctx.fillText(label, 58, 100);
    ctx.restore();
  }
  function mini1D(ctx, a, s) {   // p_old -> p_theta inset (as in Fig. 2a)
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const draw = (x0, w, wl, wh, lab) => {
      const pts = []; for (let i = 0; i <= 80; i++) { const x = -2.6 + 5.2 * i / 80; pts.push([x0 + w * i / 80, wl * pdf(x, -1.2, 0.2) + wh * pdf(x, 1.2, 0.2)]); }
      const base = 560, sc = 120;
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0.15, hex(C.orange, 0.75)); g.addColorStop(0.85, hex(C.blue, 0.75));
      ctx.beginPath(); ctx.moveTo(x0, base); pts.forEach(p => ctx.lineTo(p[0], base - p[1] * sc)); ctx.lineTo(x0 + w, base); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], base - p[1] * sc) : ctx.moveTo(p[0], base - p[1] * sc)); ctx.lineWidth = 2; ctx.strokeStyle = "#555"; ctx.stroke();
    };
    draw(830, 150, 0.5, 0.5, "p_old");
    draw(1060, 150, lerp(0.5, 0.3, s), lerp(0.5, 0.7, s), "p_θ");
    arrow(ctx, [995, 520], [1048, 520], "#c3c6cc", 8, null, 16);
    ctx.fillStyle = C.grey; ctx.font = "600 15px Inter, sans-serif"; ctx.fillText("RL", 1010, 500);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- 1D plot */
  let HEAT = null;
  function heat() {
    if (HEAT) return HEAT;
    const cv = document.createElement("canvas"); cv.width = 470; cv.height = 470;
    const g = cv.getContext("2d"), img = g.createImageData(470, 470);
    for (let j = 0; j < 470; j++) {
      const x = (352 - (j + 117)) / 66;
      for (let i = 0; i < 470; i++) {
        const l = 1 - i / 470, m = marg(x, l);
        const s = clamp((m.post - 0.15) / 0.7);
        const r = lerp(243, 76, s), gg = lerp(154, 110, s), b = lerp(60, 224, s);
        const a = clamp(m.p * 1.15) * 120;
        const k = 4 * (j * 470 + i); img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = a;
      }
    }
    g.putImageData(img, 0, 0); HEAT = cv; return cv;
  }
  function axes1D(ctx, a, opts = {}) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    if (opts.heat) { ctx.globalAlpha = a * opts.heat; ctx.drawImage(heat(), LX(1), 117); ctx.globalAlpha = a; }
    ctx.strokeStyle = "#8a8f9a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(LX(1) - 10, 610); ctx.lineTo(LX(0) + 30, 610); ctx.stroke();
    arrow(ctx, [LX(0) + 20, 610], [LX(0) + 40, 610], "#8a8f9a", 1.5, null, 9);
    ctx.font = "16px Inter, sans-serif"; ctx.fillStyle = "#6a6f7b"; ctx.textAlign = "center";
    [1, 0.75, 0.5, 0.25, 0].forEach(l => { ctx.beginPath(); ctx.moveTo(LX(l), 604); ctx.lineTo(LX(l), 616); ctx.stroke(); ctx.fillText(String(l), LX(l), 638); });
    ctx.fillText("noise level t  (sampling runs left → right)", (LX(1) + LX(0)) / 2, 662);
    ctx.textAlign = "left";
    if (opts.dens !== undefined) {   // Gaussian at t = 1 (left), data distribution at t = 0 (right)
      ctx.globalAlpha = a * opts.dens;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const x = -3 + 6 * i / 120; const px = LX(1) - 4 - 150 * pdf(x, 0, 1); i ? ctx.lineTo(px, Y(x)) : ctx.moveTo(px, Y(x)); }
      ctx.strokeStyle = "#6a6f7b"; ctx.lineWidth = 2; ctx.stroke();
      [[0, C.orange], [1, C.blue]].forEach(([k, col]) => {
        ctx.beginPath(); ctx.moveTo(LX(0) + 4, Y(-3));
        for (let i = 0; i <= 160; i++) { const x = -3 + 6 * i / 160; ctx.lineTo(LX(0) + 4 + 105 * MIX[k].pi * pdf(x, MIX[k].mu, MIX[k].s * MIX[k].s), Y(x)); }
        ctx.lineTo(LX(0) + 4, Y(3)); ctx.closePath(); ctx.fillStyle = hex(col, 0.35); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
      });
      ctx.fillStyle = "#6a6f7b"; ctx.font = "15px Inter, sans-serif";
      ctx.fillText("noise", LX(1) - 118, 132); ctx.fillText("data", LX(0) + 22, 132);
    }
    ctx.restore();
  }
  function trajPath(ctx, pts, prog, color, w, a, lx = LX, y = Y) {
    const n = Math.max(1, Math.round(prog * (pts.length - 1)));
    ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = w; ctx.lineCap = "round";
    if (color === "grad") { const g = ctx.createLinearGradient(lx(1), 0, lx(0), 0); g.addColorStop(0, C.orange); g.addColorStop(1, C.blue); ctx.strokeStyle = g; }
    else ctx.strokeStyle = color;
    ctx.beginPath(); for (let i = 0; i <= n; i++) { const p = pts[i]; i ? ctx.lineTo(lx(p[0]), y(p[1])) : ctx.moveTo(lx(p[0]), y(p[1])); } ctx.stroke(); ctx.restore();
  }
  const P1 = (pts, l) => [LX(l), Y(atLevel(pts, l))];
  // a point transported from (l, x) with velocity v down to level r:  X[x, v, r] = x - (l - r) v
  const Xmap = (l, x, v, r) => [LX(r), Y(x - (l - r) * v)];

  // phase-1 example on the 1D plot: rollout x_hat in the high-reward mode, noise eps, level t
  const S2 = { xh: 2.0, eps: -0.6, t: 0.6, old: 0.6, th: 1.3 };
  S2.xt = (1 - S2.t) * S2.xh + S2.t * S2.eps;
  S2.vcond = S2.eps - S2.xh;
  S2.vold = (S2.xt - S2.old) / S2.t;   // the old policy's velocity lands at x_old
  S2.vth = (S2.xt - S2.th) / S2.t;     // the policy's velocity lands at x_theta

  /* ---------------------------------------------------------------- overlays (HTML + KaTeX) */
  const TEX = String.raw;
  const OVER = [
    // phase chips
    { id: "chips", t0: 0, t1: T_END, x: 30, y: 18, w: 1220, html: `<div class="xp-chips"><span data-c="0">RL on a few-step generator</span><span data-c="1">① Transformation</span><span data-c="2">② Decomposition</span><span data-c="3">③ Adaptation</span></div>`, nofade: true },
    // ---- S0 right column
    { t0: 0.4, t1: 12, x: 800, y: 84, w: 450, html: TEX`<h4>What RL does</h4><p>Maximise the expected reward of the policy's own samples</p>$$\max_\theta\ \mathbb E_{\hat x\sim p_\theta}\big[R(\hat x,c)\big]$$` },
    { t0: 3.0, t1: 12, x: 800, y: 268, w: 450, html: TEX`<p>Each prompt gets a group of rollouts \(\hat x^{(i)}\sim p_{\mathrm{old}}\) and a group-normalised advantage</p>$$A^{(i)}=\frac{R^{(i)}-\operatorname{mean}\{R\}}{\operatorname{std}\{R\}+\varepsilon}$$` },
    { t0: 1.5, t1: 12.2, html: TEX`<span class="xp-lab">\(p_{\mathrm{old}}\)</span>`, pos: () => [886, 404] },
    { t0: 1.5, t1: 12.2, html: TEX`<span class="xp-lab">\(p_\theta\)</span>`, pos: () => [1124, 404] },
    { t0: 1.0, t1: 12, x: 330, y: 120, w: 260, html: TEX`<span class="xp-lab" style="color:${C.blue}">high reward \((A>0)\)</span>`, pos: () => [560, 150] },
    { t0: 1.0, t1: 12, x: 120, y: 560, w: 260, html: TEX`<span class="xp-lab" style="color:${C.orange}">low reward \((A<0)\)</span>`, pos: () => [95, 575] },
    // ---- S1 right column
    { t0: 15.6, t1: 29, x: 800, y: 84, w: 450, html: TEX`<h4>A generator is a flow</h4><p>Noise (level 1) is transported to data (level 0) along an ODE</p>$$\frac{dx_t}{dt}=v(x_t,t)\quad\text{instantaneous velocity}$$` },
    { t0: 23.0, t1: 29, x: 800, y: 268, w: 450, html: TEX`<p>A few-step model learns the <b>average velocity</b> over an interval</p>$$u(x_t,t,r)=\frac{1}{t-r}\int_r^t v(x_\nu,\nu)\,d\nu$$` },
    { t0: 26.0, t1: 29, x: 800, y: 440, w: 450, html: TEX`<p>so one step is one exact jump (4 steps, no CFG):</p>$$x_r=x_t-(t-r)\,u_\theta(x_t,t,r)$$<p><b>But RL objectives are written for \(v\).</b></p>` },
    { t0: 19.5, t1: 26, html: TEX`<span class="xp-lab">\(x_t\)</span>`, pos: () => { const p = P1(HERO, 0.75); return [p[0] - 30, p[1] + 8]; } },
    { t0: 20.3, t1: 26, html: TEX`<span class="xp-lab" style="color:#555">tangent: \(v(x_t,t)\)</span>`, pos: () => { const p = Xmap(0.75, atLevel(HERO, 0.75), slopeAt(HERO, 0.75), 0.42); return [p[0] + 8, p[1] + 2]; } },
    { t0: 23.0, t1: 26, html: TEX`<span class="xp-lab" style="color:${C.dark}">chord: \(u(x_t,t,r)\)</span>`, pos: () => { const p = P1(HERO, 0.3); return [p[0] - 60, p[1] - 44]; } },
    // ---- S2 (phase 1)
    { t0: 29.2, t1: 46, x: 800, y: 84, w: 450, html: TEX`<h4>① Transformation · e.g. DiffusionNFT</h4><p>DiffusionNFT is written in <b>velocity space</b>:</p>$$\mathcal L_{\mathrm{NFT}}=\mathbb E\big[\hat r\,\|v^{+}_\theta-v_{\mathrm{cond}}\|^2+(1-\hat r)\,\|v^{-}_\theta-v_{\mathrm{cond}}\|^2\big]$$<p class="xp-small">\(v^{\pm}_\theta=(1\mp\beta)\,v_{\mathrm{old}}\pm\beta\,v_\theta,\quad \hat r=\tfrac12+\tfrac12\operatorname{clip}(A,-1,1)\)</p>` },
    { t0: 36.5, t1: 46, x: 800, y: 330, w: 450, html: TEX`<p>A velocity transports a state to a <b>point</b>:</p>$$X[x_t,v,r]=x_t-(t-r)\,v$$$$\|v_a-v_b\|^2=\frac{\|X[x_t,v_a,r]-X[x_t,v_b,r]\|^2}{(t-r)^2}$$` },
    { t0: 40.0, t1: 46, x: 800, y: 500, w: 450, html: TEX`<p>so the same loss in <b>x-space</b> compares clean predictions:</p>$$\mathcal L_{\mathrm{NFT}}=\mathbb E\Big[\tfrac{1}{t^2}\big(\hat r\,\|\tilde x^{+}_\theta-\hat x\|^2+(1-\hat r)\,\|\tilde x^{-}_\theta-\hat x\|^2\big)\Big]$$<p class="xp-small">\(\tilde x^{\pm}_\theta=\tilde x_{\mathrm{old}}\pm\beta(\tilde x_\theta-\tilde x_{\mathrm{old}})\)</p>` },
    { t0: 31.5, t1: 46, html: TEX`<span class="xp-lab" style="color:${C.blue}">\(\hat x\) rollout</span>`, pos: () => [LX(0) + 16, Y(S2.xh) - 15] },
    { t0: 31.5, t1: 46, html: TEX`<span class="xp-lab" style="color:#6a6f7b">\(\epsilon\)</span>`, pos: () => [LX(1) - 26, Y(S2.eps) - 12] },
    { t0: 32.5, t1: 46, html: TEX`<span class="xp-lab">\(\tilde x_t=(1-t)\hat x+t\epsilon\)</span>`, pos: () => [LX(S2.t) - 80, Y(S2.xt) + 14] },
    { t0: 37.2, t1: 46, html: TEX`<span class="xp-lab" style="color:${C.grey}">\(\tilde x_{\mathrm{old}}\)</span>`, pos: () => [LX(0) + 16, Y(S2.old) - 15] },
    { t0: 37.2, t1: 46, html: TEX`<span class="xp-lab" style="color:#5a4fb0">\(\tilde x_\theta=\tilde x_t-t\,v_\theta\)</span>`, pos: () => [LX(0) + 16, Y(S2.th) - 15] },
    // ---- S3 (phase 2)
    { t0: 46.2, t1: 64, x: 800, y: 84, w: 450, html: TEX`<h4>② Decoupled decomposition</h4><p>Differentiating the x-space loss gives two forces:</p>$$\nabla_\theta\mathcal L\propto\Big(\frac{\partial\tilde x_\theta}{\partial\theta}\Big)^{\!\top}\Big[\underbrace{\color{#8e6ccb}{(\tilde x_\theta-\tilde x_{\mathrm{old}})}}_{\text{self-regression}}-\underbrace{\color{#4c6ee0}{\tfrac{\operatorname{clip}(A,-1,1)}{\beta}(\hat x-\tilde x_{\mathrm{old}})}}_{\text{reward augmentation}}\Big]$$` },
    { t0: 59.0, t1: 64, x: 800, y: 330, w: 450, html: TEX`<p>Every method we consider has this form — a prediction, <b>three anchors</b> and <b>three weights</b>:</p>$$W_{\mathrm{reg}}(\tilde x_\theta-\tilde x_{\mathrm{reg}})-W_{\mathrm{rwd}}\,\omega\,(\tilde x_{\mathrm{rwd}}-\tilde x_{\mathrm{base}})$$<p class="xp-small">DiffusionNFT: \(\tilde x_{\mathrm{reg}}=\tilde x_{\mathrm{base}}=\tilde x_{\mathrm{old}},\ \tilde x_{\mathrm{rwd}}=\hat x,\ \omega=\operatorname{clip}(A,-1,1)/\beta\)</p>` },
    { t0: 51.0, t1: 59, html: TEX`<span class="xp-lab" style="color:${C.blue}">\(\hat x^{+}\) (high reward)</span>`, pos: () => [CB[0] + 30, CB[1] - 70] },
    { t0: 55.0, t1: 59, html: TEX`<span class="xp-lab" style="color:${C.orange}">\(\hat x^{-}\) (low reward)</span>`, pos: () => [CO[0] - 175, CO[1] + 18] },
    { t0: 51.0, t1: 59, html: TEX`<span class="xp-lab" style="color:${C.grey}">\(\tilde x_{\mathrm{old}}=\tilde x_{\mathrm{reg}}=\tilde x_{\mathrm{base}}\)</span>`, pos: () => [PB_OLD[0] - 250, PB_OLD[1] - 8] },
    { t0: 51.6, t1: 55, html: TEX`<span class="xp-lab" style="color:${C.blue}">pull</span>`, pos: () => [PRED[0] + 64, PRED[1] - 66] },
    { t0: 55.6, t1: 59, html: TEX`<span class="xp-lab" style="color:${C.orange}">push</span>`, pos: () => [PRED[0] + 70, PRED[1] + 14] },
    { t0: 52.2, t1: 59, html: TEX`<span class="xp-lab" style="color:${C.purple}">regression</span>`, pos: () => [PRED[0] - 120, PRED[1] + 10] },
    // ---- S4 (phase 3)
    { t0: 64.2, t1: 82, x: 800, y: 84, w: 450, html: TEX`<h4>③ Few-step adaptation</h4><p>The network outputs \(u_\theta(\tilde x_t,t,r)\), not \(v_\theta\). Where does \(\tilde x_\theta\) land?</p>` },
    { t0: 66.5, t1: 82, x: 800, y: 196, w: 450, html: TEX`<p><b>u-form</b>: end of the transport, \(\tilde x_t-t\,u_\theta(\tilde x_t,t,0)\) — trains only \(r=0\).<br><b>v-form</b>: the tangent, \(\tilde x_t-t\,v\) — trains every \((t,r)\), but needs \(v\).</p>` },
    { t0: 72.5, t1: 82, x: 800, y: 330, w: 450, html: TEX`<div class="xp-box"><b>MeanFlow</b> (self-induced, <code>v-ind</code>)$$v_{\mathrm{ind}}=u_{\mathrm{old}}+J,\quad J=(t-r)\operatorname{sg}(\partial_t u)$$<b>DMD</b> (auxiliary net, <code>v-aux</code>)$$v_\phi(\tilde x_t,t)\approx\mathbb E\big[\epsilon-\hat x\mid\tilde x_t\big]$$</div>` },
    { t0: 77.0, t1: 82, x: 800, y: 530, w: 450, html: TEX`<div class="xp-anch"><b class="xp-anch-h">Same loss, new prediction and anchors</b><b>MeanFlowNFT</b><span>\(\tilde x_\theta=X[\tilde x_t,u_\theta{+}J,0]\)</span><span>\(\tilde x_{\mathrm{reg}}=\tilde x_{\mathrm{base}}=\tilde x_{\mathrm{ind}}\)</span><b>DMDNFT</b><span>\(\tilde x_\theta=X[\tilde x_t,u_\theta,0]\)</span><span>\(\tilde x_{\mathrm{base}}=X[\tilde x_t,v_\phi,0]\)</span></div>` },
    { t0: 64.8, t1: 82, html: TEX`<span class="xp-lab">\(\tilde x_t\)</span>`, pos: () => [S4.pt[0] - 12, S4.pt[1] + 14] },
    { t0: 66.9, t1: 82, html: TEX`<span class="xp-lab">u-form</span>`, pos: () => [S4.end[0] + 14, S4.end[1] - 13] },
    { t0: 69.9, t1: 82, html: TEX`<span class="xp-lab" style="color:#555">v-form</span>`, pos: () => [S4.tan[0] + 14, S4.tan[1] - 13] },
    { t0: 73.0, t1: 82, html: TEX`<span class="xp-lab" style="color:#2a9aac">\(u(\tilde x_t,t,r)\)</span>`, pos: () => [S4.pr[0] + 12, S4.pr[1] + 2] },
    { t0: 74.4, t1: 82, html: TEX`<span class="xp-lab" style="color:#2a9aac">\(+J\)</span>`, pos: () => [S4.jfree[0] - 44, (S4.jfree[1] + S4.tan[1]) / 2 - 12] },
    { t0: 75.6, t1: 82, html: TEX`<span class="xp-lab" style="color:${C.purple}">\(v_\phi\)</span>`, pos: () => [S4.aux[0] + 14, S4.aux[1] - 10] },
    { t0: 64.8, t1: 82, html: TEX`<span class="xp-lab" style="color:#9aa0ab">\(t\)</span>`, pos: () => [S4.pt[0] - 5, 116] },
    { t0: 72.6, t1: 82, html: TEX`<span class="xp-lab" style="color:#9aa0ab">\(r\)</span>`, pos: () => [S4.pr[0] - 5, 116] },
    // ---- end card
    { t0: 82.2, t1: T_END + 1, x: 140, y: 110, w: 1000, html: TEX`<div class="xp-end"><div class="xp-brand">FewStepRL<span>— Hunyuan</span></div><div class="xp-end-row"><div><b>① Transformation</b><span>write every objective through one prediction <nobr>\(\tilde x_\theta=X[\tilde x_t,v_\theta,0]\)</nobr></span></div><div><b>② Decomposition</b><span>self-regression + reward augmentation: three anchors, three weights</span></div><div><b>③ Adaptation</b><span>anchors from \(u_\theta\): u-form, or v-form with <nobr>\(v_{\mathrm{ind}}\) / \(v_\phi\)</nobr></span></div></div><div class="xp-map"><span>RL objectives</span><p>FlowGRPO · AWM · DiffusionNFT · DiffusionOPSD · ReFL</p><span>few-step trainers</span><p><b>FewStepGRPO · MeanFlowAWM · DMDAWM · MeanFlowNFT · DMDNFT · FewStepOPSD · ReFL</b></p></div><p class="xp-small">↓ below the video: how each objective enters the three phases</p></div>` },
    // ---- captions
    ...[
      [0.3, 3.0, "RL post-training: two kinds of samples — high reward and low reward."],
      [3.0, 6.0, "Each iteration rolls out a group of samples from the current (old) policy and scores them."],
      [6.0, 10.5, "RL moves probability mass: samples are pulled toward the high-reward mode."],
      [10.5, 12.2, "Every iteration needs fresh rollouts — with a many-step sampler they dominate the cost."],
      [12.2, 15.5, "Look along the axis that joins the two modes: the data become a two-peak distribution in 1D."],
      [15.5, 19.5, "A diffusion / flow model transports Gaussian noise to these two peaks along ODE trajectories (exact flow)."],
      [19.5, 23.0, "The tangent of a trajectory is the instantaneous velocity v — what many-step samplers integrate."],
      [23.0, 26.0, "The chord between two levels is the average velocity u over [r, t] — what a few-step model outputs."],
      [26.0, 29.2, "Four exact jumps replace dozens of Euler steps. Existing RL objectives, however, assume v."],
      [29.2, 34.0, "Phase 1: take DiffusionNFT. Re-noise a rollout sample to level t and compare velocities there."],
      [34.0, 40.0, "Each velocity at x̃_t transports the state to a clean point: v_cond lands exactly on the rollout x̂."],
      [40.0, 46.0, "In x-space every objective becomes a distance between predictions at the same state."],
      [46.0, 51.0, "Phase 2: its gradient splits into a self-regression and a reward augmentation."],
      [51.0, 55.0, "A > 0: the prediction is pulled toward the high-reward sample, along x̂⁺ − x̃_old."],
      [55.0, 59.0, "A < 0: it is pushed away from the low-reward sample, while the regression keeps it near the old policy."],
      [59.0, 64.0, "Summed over the group, mass moves to the high-reward mode — the RL step we started from."],
      [64.0, 69.5, "Phase 3: a few-step network gives the chord u, not the tangent v."],
      [69.5, 72.5, "Using u directly (u-form) trains only the r = 0 edge; the v-form uses the tangent."],
      [72.5, 77.0, "Recover v from the network itself (MeanFlow: u + J) or from an auxiliary net v_φ (DMD)."],
      [77.0, 82.2, "The decomposed loss is unchanged — only its prediction and anchors are rebuilt from the few-step model."],
      [82.2, T_END, "Three phases turn five RL objectives into seven few-step trainers in one codebase."],
    ].map(([a, b, s]) => ({ t0: a, t1: b, x: 40, y: 676, w: 1200, html: `<div class="xp-cap">${s}</div>`, cap: true })),
  ];

  // positions used by moving overlays
  let PRED = [0, 0], PB_OLD = [0, 0];
  // phase 3 zooms in on the hero trajectory so the curve end, the tangent and the chord separate
  const LX4 = l => 120 + (1 - l) * 560, Y4 = x => 520 - (x + 0.3) * 190;
  const S4 = (() => {
    const lt = 0.75, r = 0.4, xt = atLevel(HERO, lt), v = slopeAt(HERO, lt), xr = atLevel(HERO, r), uR = (xt - xr) / (lt - r);
    return { lt, r, pt: [LX4(lt), Y4(xt)], end: [LX4(0), Y4(atLevel(HERO, 0))], tan: [LX4(0), Y4(xt - lt * v)], pr: [LX4(r), Y4(xr)],
      jfree: [LX4(0), Y4(xt - lt * uR)], aux: [LX4(0), Y4(xt - lt * v - 0.25)] };   // v_phi: an auxiliary estimate, slightly off the tangent
  })();

  /* ---------------------------------------------------------------- scenes */
  function scene0(ctx, t) {   // 0-12 s: RL in 2D (+ projection to 1D at 12-14.5 s)
    const a = seg(t, 0, 1) * (1 - seg(t, 12.2, 14));
    if (a <= 0 && t > 15) return;
    panel(ctx, a, "clean-sample space");
    const mig = seg(t, 6, 10.2);
    modes(ctx, a, lerp(1, 0.55, mig), lerp(1, 1.35, mig));
    // the RL arrow between the modes
    if (t > 6 && t < 12.2) { const g = win(t, 6, 12.2); arrow(ctx, [CO[0] + 70, CO[1] - 60], [CB[0] - 95, CB[1] + 50], hex(C.blue, 0.75 * g), 5, null, 18); }
    const pop = seg(t, 1.0, 3.0), proj = seg(t, 12.2, 14.5);
    PART.forEach((q, i) => {
      if (i / PART.length > pop + 1e-6 && t < 3) return;
      const m = q.mig ? ease(clamp((mig - q.delay) / 0.65)) : 0;
      const mid = [(q.p[0] + q.tgt[0]) / 2 + q.bend, (q.p[1] + q.tgt[1]) / 2 - q.bend * 0.4];
      const b = [(1 - m) * (1 - m) * q.p[0] + 2 * (1 - m) * m * mid[0] + m * m * q.tgt[0], (1 - m) * (1 - m) * q.p[1] + 2 * (1 - m) * m * mid[1] + m * m * q.tgt[1]];
      let pos = b;
      if (proj > 0) {   // project on the axis joining the modes -> 1D sample at level 0
        const d = [CB[0] - CO[0], CB[1] - CO[1]], s = ((b[0] - CO[0]) * d[0] + (b[1] - CO[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1]);
        const x1 = MIX[0].mu + (MIX[1].mu - MIX[0].mu) * s;
        pos = lerp2(b, [LX(0) + 8 + (i % 7) * 3, Y(x1)], proj);
      }
      const hiNow = q.hi || m > 0.5;
      const col = q.hi ? C.blue : mixHex(C.orange, C.blue, m);
      ctx.globalAlpha = (t < 15.5 ? 1 : 1 - seg(t, 15.5, 16.5)) * (t < 3 ? 1 : 1);
      dot(ctx, pos, t < 3 ? "#8a8f9a" : col, hiNow ? 4.6 : 4.2);
      ctx.globalAlpha = 1;
    });
    mini1D(ctx, win(t, 1.5, 12.2, 0.6), seg(t, 6, 10.2));
  }
  function scene1(ctx, t) {   // 12-29 s: 1D exact flow, v vs u, few-step jumps
    const a = seg(t, 12.6, 14.6) * (1 - seg(t, 49, 51));
    if (a <= 0) return;
    const dim = 1 - 0.75 * seg(t, 29, 31);
    axes1D(ctx, a, { heat: seg(t, 14.5, 16) * (1 - 0.6 * seg(t, 29, 31)), dens: seg(t, 14.5, 15.8) });
    const prog = seg(t, 15.6, 19.4);
    TRAJ.forEach((pts, k) => {
      const end = pts[pts.length - 1][1];
      const col = end > 0 ? C.blue : C.orange;
      trajPath(ctx, pts, prog, col, 1.6, a * 0.55 * dim * (1 - 0.6 * seg(t, 19.5, 20.5) * (pts === HERO ? 0 : 1)));
    });
    if (t >= 19.5 && t < 29.5) {
      const g = win(t, 19.5, 29.5);
      trajPath(ctx, HERO, 1, "grad", 4, g);
      const lt = 0.75, xt = atLevel(HERO, lt), v = slopeAt(HERO, lt), pt = [LX(lt), Y(xt)];
      // tangent (instantaneous velocity), drawn as the transport toward lower levels
      const tg = win(t, 20.2, 26.4);
      if (tg > 0) arrow(ctx, pt, Xmap(lt, xt, v, lerp(lt, 0.42, seg(t, 20.2, 21.4))), hex("#555555", tg), 2.6, [8, 6]);
      // secant to level r (average velocity)
      const sg = win(t, 23, 26.4);
      if (sg > 0) { const r = 0.3, pr = P1(HERO, r); arrow(ctx, pt, lerp2(pt, pr, seg(t, 23, 24.2)), hex(C.dark, sg), 3); dot(ctx, pr, hex("#333333", sg), 5); }
      dot(ctx, pt, C.dark, 7);
      // four exact jumps on the grid {1, 0.9, 0.75, 0.5, 0}
      const jg = win(t, 26, 29.5);
      if (jg > 0) {
        const grid = [1, 0.9, 0.75, 0.5, 0];
        for (let i = 0; i < 4; i++) {
          const s = seg(t, 26 + i * 0.55, 26.5 + i * 0.55);
          if (s <= 0) continue;
          const a0 = P1(HERO, grid[i]), a1 = P1(HERO, grid[i + 1]);
          arrow(ctx, a0, lerp2(a0, a1, s), hex("#2a9aac", jg), 3.4, null, 12);
          dot(ctx, a0, hex("#2a9aac", jg), 5);
          if (i === 3 && s > 0.98) dot(ctx, a1, hex("#2a9aac", jg), 6);
        }
      }
    }
  }
  function scene2(ctx, t) {   // 29-46 s: phase 1 on the 1D plot
    const a = seg(t, 31.5, 32.5) * (1 - seg(t, 46, 49));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const pX = [LX(0), Y(S2.xh)], pE = [LX(1), Y(S2.eps)];
    ctx.setLineDash([6, 6]); ctx.strokeStyle = "#9aa0ab"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pE[0], pE[1]); ctx.lineTo(pX[0], pX[1]); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, pX, C.blue, 8); dot(ctx, pE, "#8a8f9a", 7);
    const pt = [LX(S2.t), Y(S2.xt)];
    if (t > 32.5) dot(ctx, pt, C.dark, 7);
    // velocities at x_t: short arrows (one level-0.12 step), then extended to level 0
    const ext = seg(t, 36.5, 38.6);
    const len = lerp(0.12, S2.t, ext);
    const show = seg(t, 34, 35);
    if (show > 0) {
      [[S2.vcond, C.blue, null], [S2.vold, C.grey, [7, 5]], [S2.vth, "#5a4fb0", null]].forEach(([v, col, dash]) => {
        const end = Xmap(S2.t, S2.xt, v, S2.t - len);
        arrow(ctx, pt, lerp2(pt, end, show), col, 2.8, dash);
      });
      if (ext > 0.98) { dot(ctx, [LX(0), Y(S2.old)], C.grey, 6, true); predDot(ctx, [LX(0), Y(S2.th)], 7.5); }
    }
    ctx.restore();
  }
  // 2D positions for phase 2
  const OLD2 = [400, 360], XP = [600, 230], XM = [210, 470];
  function scene3(ctx, t) {   // 46-64 s: phase 2 dynamics in 2D
    const a = seg(t, 49, 51) * (1 - seg(t, 63.6, 64.9));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    panel(ctx, 1, "clean-sample space");
    const mig = seg(t, 59.4, 63.4);
    modes(ctx, 1, lerp(1, 0.55, mig), lerp(1, 1.35, mig));
    PB_OLD = OLD2;
    const hiCase = win(t, 51, 55.2, 0.4), loCase = win(t, 55, 59.2, 0.4);
    // prediction drifts under the net force
    let pred = [OLD2[0] + 62, OLD2[1] + 44];
    const k = 0.5;
    if (t >= 51 && t < 59.2) {
      const isHi = t < 55;
      const tgt = isHi ? XP : XM, s = isHi ? 1 : -1;
      const reg = [-(pred[0] - OLD2[0]), -(pred[1] - OLD2[1])];
      const rwd = [s * (tgt[0] - OLD2[0]) * 0.32, s * (tgt[1] - OLD2[1]) * 0.32];
      const drift = seg(t, isHi ? 53 : 57, isHi ? 55 : 59) * 0.55;
      pred = [pred[0] + (reg[0] * 0.3 + rwd[0]) * drift, pred[1] + (reg[1] * 0.3 + rwd[1]) * drift];
      PRED = pred;
      const g = isHi ? hiCase : loCase;
      ctx.setLineDash([6, 6]); ctx.strokeStyle = hex(C.grey, g); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(OLD2[0], OLD2[1]); ctx.lineTo(tgt[0], tgt[1]); ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, tgt, isHi ? C.blue : C.orange, 8);
      arrow(ctx, pred, [pred[0] + rwd[0] * 1.1, pred[1] + rwd[1] * 1.1], hex(isHi ? C.blue : C.orange, g), 4, isHi ? null : [9, 6]);
      arrow(ctx, pred, [pred[0] + reg[0] * 0.85, pred[1] + reg[1] * 0.85], hex(C.lav, g), 4.5);
      dot(ctx, OLD2, C.grey, 7);
      predDot(ctx, pred, 9);
    } else PRED = pred;
    // population: predictions of the whole group move; mass shifts to the high-reward mode
    if (t >= 59) {
      const pa = seg(t, 59, 59.6);
      PART.forEach(q => {
        const m = q.mig ? ease(clamp((mig - q.delay) / 0.65)) : 0;
        const mid = [(q.p[0] + q.tgt[0]) / 2 + q.bend, (q.p[1] + q.tgt[1]) / 2 - q.bend * 0.4];
        const b = [(1 - m) * (1 - m) * q.p[0] + 2 * (1 - m) * m * mid[0] + m * m * q.tgt[0], (1 - m) * (1 - m) * q.p[1] + 2 * (1 - m) * m * mid[1] + m * m * q.tgt[1]];
        ctx.globalAlpha = a * pa;
        dot(ctx, b, q.hi ? C.blue : mixHex(C.orange, C.blue, m), 4.4);
      });
      ctx.globalAlpha = a;
    }
    ctx.restore();
  }
  function scene4(ctx, t) {   // 64-82 s: phase 3 on one trajectory (zoomed)
    const a = seg(t, 64.6, 66) * (1 - seg(t, 81.6, 82.6));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    // axis
    ctx.strokeStyle = "#8a8f9a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(LX4(1) - 10, 600); ctx.lineTo(LX4(0) + 30, 600); ctx.stroke();
    arrow(ctx, [LX4(0) + 20, 600], [LX4(0) + 40, 600], "#8a8f9a", 1.5, null, 9);
    ctx.font = "16px Inter, sans-serif"; ctx.fillStyle = "#6a6f7b"; ctx.textAlign = "center";
    [1, 0.75, 0.5, 0.25, 0].forEach(l => { ctx.beginPath(); ctx.moveTo(LX4(l), 594); ctx.lineTo(LX4(l), 606); ctx.stroke(); ctx.fillText(String(l), LX4(l), 628); });
    ctx.fillText("noise level", (LX4(1) + LX4(0)) / 2, 652);
    ctx.textAlign = "left";
    // level guides: t (the query level), r (MeanFlow), 0 (data)
    const guide = (l, al) => { if (al <= 0) return; ctx.save(); ctx.globalAlpha = a * al; ctx.strokeStyle = "#c9ccd3"; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(LX4(l), 590); ctx.lineTo(LX4(l), 140); ctx.stroke(); ctx.restore(); };
    guide(S4.lt, 1); guide(0, seg(t, 66.5, 67.2)); guide(S4.r, seg(t, 72.5, 73.2));
    trajPath(ctx, HERO, 1, "grad", 5, 1, LX4, Y4);
    const { pt, end, tan, pr, jfree, aux } = S4;
    // u-form: end of the transport (exact flow map to level 0 = the curve end)
    const ug = seg(t, 66.5, 67.6);
    if (ug > 0) { arrow(ctx, pt, lerp2(pt, end, ug), C.dark, 3.2); if (ug > 0.98) dot(ctx, end, C.dark, 6.5); }
    // v-form: tangent extrapolation to level 0
    const vg = seg(t, 69.5, 70.6);
    if (vg > 0) { arrow(ctx, pt, lerp2(pt, tan, vg), "#555555", 2.8, [9, 6]); if (vg > 0.98) dot(ctx, tan, C.dark, 6.5); }
    // MeanFlow: chord to level r, carried on to level 0, then + J turns it into the tangent
    const mg = seg(t, 72.5, 73.5);
    if (mg > 0) {
      arrow(ctx, pt, lerp2(pt, pr, mg), "#2a9aac", 3);
      const eg = seg(t, 73.4, 74.2);
      if (eg > 0) { ctx.save(); ctx.strokeStyle = hex("#2a9aac", 0.7); ctx.lineWidth = 1.8; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(pr[0], pr[1]); const q = lerp2(pr, jfree, eg); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.restore(); }
      if (eg > 0.98) dot(ctx, jfree, "#2a9aac", 5.5, true);
      const jg = seg(t, 74.2, 75.4);
      if (jg > 0) arrow(ctx, jfree, lerp2(jfree, tan, jg), "#2a9aac", 3, null, 11);
    }
    // DMD: an auxiliary estimate v_phi of the tangent
    const dg = seg(t, 75.6, 76.6);
    if (dg > 0) { arrow(ctx, pt, lerp2(pt, aux, dg), C.purple, 2.6, [3, 5]); if (dg > 0.98) dot(ctx, aux, C.purple, 5.5, true); }
    dot(ctx, pt, C.dark, 7.5);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- narration: video time tau -> animation time t */
  // data/narration.js (page_build/build_narration.py) gives the spoken track, its subtitles and piecewise-linear knots
  // (tau, t); flat segments hold the picture while the narrator finishes. Without it, tau = t and the captions above play.
  const NAR = window.NARRATION || null;
  const DUR = NAR ? NAR.duration : T_END;
  const KN = NAR ? NAR.knots : [[0, 0], [T_END, T_END]];
  const MARKS = NAR ? NAR.marks : [["RL", 0], ["①", 29], ["②", 46], ["③", 64], ["∎", 82]];
  const SUBS = NAR ? NAR.subs : null;
  function warp(tau) {
    if (tau <= KN[0][0]) return KN[0][1];
    for (let i = 1; i < KN.length; i++) {
      if (tau <= KN[i][0]) { const [x0, y0] = KN[i - 1], [x1, y1] = KN[i]; return x1 > x0 ? y0 + (tau - x0) / (x1 - x0) * (y1 - y0) : y1; }
    }
    return KN[KN.length - 1][1];
  }
  function inverse(t) {   // first tau at which the animation reaches t
    for (let i = 1; i < KN.length; i++) {
      const [x0, y0] = KN[i - 1], [x1, y1] = KN[i];
      if (y1 >= t && y1 > y0) return t <= y0 ? x0 : x0 + (t - y0) / (y1 - y0) * (x1 - x0);
    }
    return DUR;
  }
  const ICON = {   // inline icons (no emoji font needed)
    on: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    off: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    fs: `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  };
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  /* ---------------------------------------------------------------- player */
  class Explainer {
    constructor(root) {
      this.root = root; this.t = 0; this.playing = false; this.last = 0; this.sound = false;
      this.cover = true;   // show a representative frame until the first play
      this.reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.innerHTML = `<div class="xp-stage"><canvas></canvas><div class="xp-over"></div>${NAR ? `<button class="xp-cta" type="button">${ICON.on}<span>Play with narration</span></button>` : ""}</div>
        <div class="xp-ctl"><button class="xp-play" aria-label="Play">▶</button><div class="xp-bar"><div class="xp-fill"></div>${MARKS.map(([l, s]) => `<span class="xp-mark" style="left:${s / DUR * 100}%" data-t="${s}">${l}</span>`).join("")}</div><span class="xp-time">0:00</span>${NAR ? `<button class="xp-snd" aria-label="Narration" title="Narration on / off">${ICON.off}</button>` : ""}<button class="xp-fs" aria-label="Full screen" title="Full screen">${ICON.fs}</button></div>`;
      this.stage = root.querySelector(".xp-stage"); this.cv = root.querySelector("canvas"); this.ov = root.querySelector(".xp-over");
      this.items = OVER.filter(o => !(NAR && o.cap)).map(o => {
        const d = document.createElement("div"); d.className = "xp-o" + (o.cap ? " xp-capbox" : ""); d.innerHTML = o.html;
        if (o.w) d.style.width = (o.w / W * 100) + "%";
        this.ov.appendChild(d); return { o, d };
      });
      if (SUBS) {   // one subtitle line, driven by the narration clock
        this.sub = document.createElement("div"); this.sub.className = "xp-o xp-capbox";
        Object.assign(this.sub.style, { left: (40 / W * 100) + "%", top: (676 / H * 100) + "%", width: (1200 / W * 100) + "%" });
        this.sub.innerHTML = `<div class="xp-cap"></div>`; this.ov.appendChild(this.sub); this.subText = this.sub.firstChild; this.subIdx = -2;
        const probe = document.createElement("audio"), A = NAR.audio;
        const src = typeof A === "string" ? A : probe.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? A.m4a : A.ogg;
        this.audio = new Audio(src); this.audio.preload = "metadata";
        this.audio.addEventListener("ended", () => { if (this.playing) { this.t = DUR; this.renderAt(DUR); this.pause(); } });
      }
      if (window.katexRender) window.katexRender(this.ov);
      this.chips = Array.from(this.ov.querySelectorAll(".xp-chips span"));
      const play = root.querySelector(".xp-play"), bar = root.querySelector(".xp-bar");
      play.onclick = () => this.toggle();
      const fs = root.querySelector(".xp-fs");
      if (!root.requestFullscreen) fs.style.display = "none";
      fs.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen().catch(() => {}); };
      const snd = root.querySelector(".xp-snd"), cta = root.querySelector(".xp-cta");
      if (snd) snd.onclick = () => this.setSound(!this.sound);
      if (cta) cta.onclick = ev => { ev.stopPropagation(); this.setSound(true); };
      this.stage.onclick = () => this.toggle();
      const seek = ev => { const r = bar.getBoundingClientRect(); this.seek(clamp((ev.clientX - r.left) / r.width) * DUR); };
      bar.addEventListener("pointerdown", ev => { seek(ev); bar.setPointerCapture(ev.pointerId); bar.onpointermove = seek; });
      bar.addEventListener("pointerup", () => { bar.onpointermove = null; });
      root.querySelectorAll(".xp-mark").forEach(m => m.addEventListener("click", ev => { ev.stopPropagation(); this.seek(+m.dataset.t + 0.01); }));
      new ResizeObserver(() => this.resize()).observe(this.stage);
      this.resize();
      new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !this.userPaused && !this.reduced) this.play(); else if (!e.isIntersecting) this.pause(); }), { threshold: 0.35 }).observe(root);
    }
    resize() {
      const w = this.stage.clientWidth, dpr = window.devicePixelRatio || 1;
      this.scale = w / W;
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(w * H / W * dpr);
      this.stage.style.setProperty("--s", this.scale);
      this.renderAt(this.t);
    }
    subAt(tau) {   // index of the subtitle line shown at tau (kept through short pauses), or -1
      if (!SUBS) return -1;
      let i = -1;
      for (let k = 0; k < SUBS.length && SUBS[k][0] <= tau; k++) i = k;
      if (i < 0) return -1;
      const next = SUBS[i + 1];
      return tau <= SUBS[i][1] + 0.25 || (next && next[0] - SUBS[i][1] < 0.9) ? i : -1;
    }
    setSound(on) {
      if (!this.audio) return;
      this.sound = on;
      this.root.classList.toggle("xp-sound", on);
      this.root.querySelector(".xp-snd").innerHTML = on ? ICON.on : ICON.off;
      if (!on) { this.audio.pause(); return; }
      // start the narration at a sentence boundary: from the top near the start, else at the current line
      const i = this.subAt(this.t);
      let tau = this.cover || this.t < 6 || this.t >= DUR - 0.05 ? 0 : i >= 0 ? SUBS[i][0] - 0.15 : this.t;
      this.pause(); this.seek(Math.max(0, tau)); this.userPaused = false; this.play();
    }
    toggle() { if (this.playing) { this.userPaused = true; this.pause(); } else { this.userPaused = false; if (this.t >= DUR - 0.05) this.seek(0); this.play(); } }
    play() {
      if (this.playing) return;
      this.cover = false; this.playing = true; this.root.querySelector(".xp-play").textContent = "❚❚"; this.last = performance.now();
      if (this.sound && this.audio) { this.audio.currentTime = this.t; this.audio.play().catch(() => this.setSound(false)); }
      requestAnimationFrame(this.tick.bind(this));
    }
    pause() { this.playing = false; this.root.querySelector(".xp-play").textContent = "▶"; if (this.audio) this.audio.pause(); }
    seek(tau) { this.cover = false; this.t = clamp(tau, 0, DUR); if (this.audio && this.sound) this.audio.currentTime = this.t; this.renderAt(this.t); }
    tick(now) {
      if (!this.playing) return;
      const a = this.audio;
      // the audio clock leads while the narration plays; it also stalls the picture while the audio buffers
      if (this.sound && a && !a.paused) this.t = a.currentTime; else this.t += (now - this.last) / 1000;
      this.last = now;
      if (this.t >= DUR) { this.t = DUR; this.renderAt(this.t); this.pause(); return; }
      this.renderAt(this.t); requestAnimationFrame(this.tick.bind(this));
    }
    renderAt(tau) {   // tau: video time (narration clock)
      this.t = tau;
      this.draw(this.cover ? COVER_T : warp(tau), tau);
    }
    draw(t, tau) {    // t: animation time
      const ctx = this.cv.getContext("2d"), k = this.cv.width / W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#fcfcfd"; ctx.fillRect(0, 0, W, H);
      scene0(ctx, t); scene1(ctx, t); scene2(ctx, t); scene3(ctx, t); scene4(ctx, t);
      // overlays
      this.items.forEach(({ o, d }) => {
        const op = o.nofade ? 1 : win(t, o.t0, o.t1, o.cap ? 0.3 : 0.45);
        d.style.opacity = op; d.style.visibility = op > 0.001 ? "visible" : "hidden";
        if (op > 0.001) {
          const p = o.pos ? o.pos(t) : [o.x, o.y];
          d.style.left = (p[0] / W * 100) + "%"; d.style.top = (p[1] / H * 100) + "%";
        }
      });
      if (this.sub) {
        const i = this.cover ? -1 : this.subAt(tau);
        if (i !== this.subIdx) { this.subIdx = i; if (i >= 0) this.subText.textContent = SUBS[i][2]; }
        this.sub.style.visibility = i >= 0 ? "visible" : "hidden";
      }
      const chip = t < 29 ? 0 : t < 46 ? 1 : t < 64 ? 2 : t < 82 ? 3 : 4;
      this.chips.forEach((c, i) => c.classList.toggle("on", chip === 4 ? i > 0 : i === chip));
      const tb = this.cover ? 0 : tau;   // the cover frame keeps the bar at 0:00
      const fill = this.root.querySelector(".xp-fill"); if (fill) fill.style.width = (tb / DUR * 100) + "%";
      const tm = this.root.querySelector(".xp-time"); if (tm) tm.textContent = `${clock(tb)} / ${clock(DUR)}`;
    }
  }
  window.Explainer = Explainer;
  window.EXPLAINER_DURATION = DUR;
  window.EXPLAINER_TIME = { warp, inverse, narrated: !!NAR };
})();
