/* Interactive schematic figures of the three framework phases. All geometry is illustrative. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  let UID = 0;
  // marker ids must be unique per document: url(#id) resolves to the first match, which may sit in a hidden page
  function defs(svg) {
    if (!svg.dataset.pfx) svg.dataset.pfx = "f" + (++UID) + "-";
    const d = el("defs", {}, svg);
    [["ar-ink", "#1e1f24"], ["ar-blue", "#2c63d6"], ["ar-green", "#1f8a5b"], ["ar-orange", "#d66e28"], ["ar-grey", "#8a8f9a"], ["ar-cyan", "#3fb6c8"], ["ar-purple", "#6a3fc1"]].forEach(([id, c]) => {
      const mk = el("marker", { id: svg.dataset.pfx + id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, d);
      el("path", { d: "M0,0 L10,5 L0,10 z", fill: c }, mk);
    });
  }
  function arrow(svg, a, b, color, id, w, dash) {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) return;
    el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: color, "stroke-width": w || 2.4, "marker-end": `url(#${svg.dataset.pfx}${id})`, "stroke-dasharray": dash || "" }, svg);
  }
  function dot(svg, p, color, r, ring) {
    el("circle", { cx: p[0], cy: p[1], r: r || 6, fill: ring ? "#fff" : color, stroke: color, "stroke-width": ring ? 2.5 : 0 }, svg);
  }
  function label(svg, p, html, dx, dy, color) {
    const fo = el("foreignObject", { x: p[0] + (dx || 8), y: p[1] + (dy || -26), width: 230, height: 40 }, svg);
    const div = document.createElement("div");
    div.style.cssText = `font-size:13px;color:${color || "#1e1f24"};white-space:nowrap;font-family:Inter,sans-serif`;
    div.innerHTML = html;
    fo.appendChild(div);
    if (window.katexRender) window.katexRender(div);
    return fo;
  }
  const lerp = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];

  /* ---------------- phase 1: x-space transport ---------------- */
  function xspace(root) {
    const svg = root.querySelector("svg");
    const st = { t: 0.6, r: 0, e: 0.45 };
    const S = 112, C = [285, 205];
    const P = v => [C[0] + v[0] * S, C[1] - v[1] * S];
    const xh = [-1.35, -1.15], eps = [2.0, 1.45];
    const vcond = [eps[0] - xh[0], eps[1] - xh[1]];
    const pert = [0.35, -1.7];    // direction of the policy error (schematic)
    function draw() {
      svg.innerHTML = ""; defs(svg);
      const xt = lerp(xh, eps, st.t);
      const vth = [vcond[0] + st.e * pert[0], vcond[1] + st.e * pert[1]];
      const X = (v, r) => [xt[0] - (st.t - st.r) * v[0] * (r === undefined ? 1 : 1), xt[1] - (st.t - st.r) * v[1]];
      const Xc = X(vcond), Xth = X(vth);
      const X0th = [xt[0] - st.t * vth[0], xt[1] - st.t * vth[1]];
      // linear noising path
      el("line", { x1: P(xh)[0], y1: P(xh)[1], x2: P(eps)[0], y2: P(eps)[1], stroke: "#c9ced8", "stroke-width": 2, "stroke-dasharray": "6 6" }, svg);
      const tl = el("text", { x: P(lerp(xh, eps, .5))[0] + 12, y: P(lerp(xh, eps, .5))[1] + 22, fill: "#9a9ea8", "font-size": 12 }, svg); tl.textContent = "linear path  (1−t)·x̂ + t·ε";
      // r-level points on the path (the level-r slice)
      if (st.r > 0.001) {
        const xr = lerp(xh, eps, st.r);
        dot(svg, P(xr), "#9a9ea8", 4);
      }
      // policy prediction at r = 0 (faint) for reference
      if (st.r > 0.001) el("line", { x1: P(xt)[0], y1: P(xt)[1], x2: P(X0th)[0], y2: P(X0th)[1], stroke: "#2c63d6", "stroke-width": 1.2, "stroke-dasharray": "3 4", opacity: .5 }, svg);
      arrow(svg, P(xt), P(Xc), "#1f8a5b", "ar-green", 2.6);
      arrow(svg, P(xt), P(Xth), "#2c63d6", "ar-blue", 2.6);
      el("line", { x1: P(Xc)[0], y1: P(Xc)[1], x2: P(Xth)[0], y2: P(Xth)[1], stroke: "#d66e28", "stroke-width": 2, "stroke-dasharray": "4 3" }, svg);
      dot(svg, P(xh), "#1f8a5b", 7); dot(svg, P(eps), "#8a8f9a", 7); dot(svg, P(xt), "#1e1f24", 6.5);
      dot(svg, P(Xc), "#1f8a5b", 5, true); dot(svg, P(Xth), "#2c63d6", 5, true);
      label(svg, P(xh), "\\(\\hat x\\) (rollout sample)", -30, 12, "#1f8a5b");
      label(svg, P(eps), "\\(\\epsilon\\) (noise)", -84, -12, "#6a6f7b");
      label(svg, P(xt), "\\(\\tilde x_t\\)", 12, -30, "#1e1f24");
      label(svg, P(Xth), st.r < 0.001 ? "\\(\\tilde x_\\theta=X[\\tilde x_t,v_\\theta,0]\\) (policy prediction)" : "\\(X[\\tilde x_t,v_\\theta,r]\\)", -60, -36, "#2c63d6");
      if (st.r > 0.001) label(svg, P(Xc), "\\(X[\\tilde x_t,v_{\\mathrm{cond}},r]\\)", 14, 0, "#1f8a5b");
      else label(svg, P(Xc), "\\(=X[\\tilde x_t,v_{\\mathrm{cond}},0]\\)", 14, -8, "#1f8a5b");
      const dv = (vth[0] - vcond[0]) ** 2 + (vth[1] - vcond[1]) ** 2;
      const dx = ((Xth[0] - Xc[0]) ** 2 + (Xth[1] - Xc[1]) ** 2) / Math.max(1e-9, (st.t - st.r) ** 2);
      root.querySelector("[data-readout]").innerHTML =
        `\\(\\|v_\\theta-v_{\\mathrm{cond}}\\|^2\\) = <b>${dv.toFixed(4)}</b><br>\\(\\|X_\\theta-X_{\\mathrm{cond}}\\|^2/(t-r)^2\\) = <b>${dx.toFixed(4)}</b>` +
        (st.r > st.t - 1e-6 ? `<br><span class="note">r ≥ t: no transport (factor undefined)</span>` : "");
      window.katexRender && window.katexRender(root.querySelector("[data-readout]"));
      ["t", "r", "e"].forEach(k => root.querySelector(`[data-v=${k}]`).textContent = st[k].toFixed(2));
    }
    root.querySelectorAll("input[type=range]").forEach(inp => inp.addEventListener("input", () => {
      st[inp.dataset.k] = +inp.value;
      if (st.r > st.t - 0.01) { st.r = Math.max(0, st.t - 0.01); root.querySelector("[data-k=r]").value = st.r; }
      draw();
    }));
    draw();
  }

  /* ---------------- phase 2: force diagram ---------------- */
  const PRESETS = {
    "DiffusionNFT": { slider: "A", reg: "old", base: "old", rwd: ["xh"], omega: s => [Math.max(-1, Math.min(1, s.A))], Wreg: 1, Wrwd: 1,
      tex: ["\\tilde x_{\\mathrm{old}}", "\\tilde x_{\\mathrm{old}}", "\\hat x", "\\beta^2/t^2", "\\beta^2/t^2", "\\operatorname{clip}(A,-1,1)/\\beta"] },
    "AWM": { slider: "A", reg: null, base: "pred", rwd: ["xh"], omega: s => [s.A], Wreg: 0, Wrwd: 1,
      tex: ["\\varnothing", "\\operatorname{sg}(\\tilde x_\\theta)", "\\hat x", "0", "w(t)/t^2", "A"] },
    "DiffusionOPSD": { slider: "rhat", reg: "old", base: "old", rwd: ["xp", "xm"], omega: s => [s.rhat, -(1 - s.rhat)], Wreg: 1, Wrwd: 1,
      tex: ["\\tilde x_{\\mathrm{old}}", "\\tilde x_{\\mathrm{old}}", "\\tilde x_{+},\\ \\tilde x_{-}", "\\beta^2(a_++a_-)", "\\beta^2(a_++a_-)", "\\tfrac{a_+}{\\beta(a_++a_-)},\\,-\\tfrac{a_-}{\\beta(a_++a_-)}"] },
    "ReFL (proxy)": { slider: null, reg: null, base: "old", rwd: ["xp"], omega: () => [1], Wreg: 0, Wrwd: 1,
      tex: ["\\varnothing", "\\tilde x_{\\mathrm{old}}", "\\tilde x_{+}", "0", "\\text{detached}>0", ">0"] },
    "DMD (distill.)": { slider: null, reg: null, base: "aux", rwd: ["real"], omega: () => [1], Wreg: 0, Wrwd: 1,
      tex: ["\\varnothing", "\\tilde x_{\\mathrm{aux}}", "\\tilde x_{\\mathrm{real}}", "0", "(1-t)/(2t^2)", "1"] },
    "MeanFlow (distill.)": { slider: null, reg: null, base: "ind", rwd: ["real"], omega: () => [1], Wreg: 0, Wrwd: 1,
      tex: ["\\varnothing", "\\tilde x_{\\mathrm{ind},r}", "\\tilde x_{\\mathrm{real},r}", "0", "1/(t-r)^2", "1"] },
  };
  const PTS = {
    old: [150, 300, "\\tilde x_{\\mathrm{old}}"], xh: [470, 90, "\\hat x"], xp: [400, 120, "\\tilde x_{+}"], xm: [60, 360, "\\tilde x_{-}"],
    aux: [140, 230, "\\tilde x_{\\mathrm{aux}}"], ind: [140, 230, "\\tilde x_{\\mathrm{ind},r}"], real: [460, 110, "\\tilde x_{\\mathrm{real}}"],
  };
  function forces(root) {
    const svg = root.querySelector("svg");
    const st = { preset: "DiffusionNFT", A: 1, rhat: 0.75, pred: [300, 290] };
    const chips = root.querySelector("[data-presets]");
    Object.keys(PRESETS).forEach(k => {
      const b = document.createElement("button"); b.className = "chip"; b.textContent = k;
      b.onclick = () => { st.preset = k; draw(); };
      chips.appendChild(b);
    });
    let drag = false;
    svg.addEventListener("pointerdown", ev => { drag = true; move(ev); svg.setPointerCapture(ev.pointerId); });
    svg.addEventListener("pointermove", ev => { if (drag) move(ev); });
    svg.addEventListener("pointerup", () => { drag = false; });
    function move(ev) {
      const r = svg.getBoundingClientRect();
      st.pred = [Math.max(20, Math.min(540, (ev.clientX - r.left) / r.width * 560)), Math.max(20, Math.min(380, (ev.clientY - r.top) / r.height * 400))];
      draw();
    }
    function pt(k) { return k === "pred" ? st.pred : PTS[k]; }
    function draw() {
      const p = PRESETS[st.preset];
      chips.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.textContent === st.preset));
      root.querySelector("[data-for=A]").style.display = p.slider === "A" ? "" : "none";
      root.querySelector("[data-for=rhat]").style.display = p.slider === "rhat" ? "" : "none";
      svg.innerHTML = ""; defs(svg);
      const om = p.omega(st);
      const K = 0.5;   // drawing scale of the forces
      // anchors
      const shown = new Set();
      [p.reg, p.base, ...p.rwd].forEach(k => { if (k && k !== "pred") shown.add(k); });
      shown.forEach(k => { dot(svg, PTS[k], k === "xm" ? "#d66e28" : (k === "old" || k === "aux" || k === "ind") ? "#6a6f7b" : "#1f8a5b", 7); label(svg, PTS[k], `\\(${PTS[k][2]}\\)`, 10, -30, "#3c404b"); });
      // displacement lines anchor->rewarded
      p.rwd.forEach(k => {
        const b = pt(p.base);
        el("line", { x1: b[0], y1: b[1], x2: PTS[k][0], y2: PTS[k][1], stroke: "#c9ced8", "stroke-width": 1.5, "stroke-dasharray": "5 5" }, svg);
      });
      const P0 = st.pred;
      let net = [0, 0];
      if (p.reg && p.Wreg) {
        const f = [-(P0[0] - PTS[p.reg][0]) * p.Wreg * K, -(P0[1] - PTS[p.reg][1]) * p.Wreg * K];
        arrow(svg, P0, [P0[0] + f[0], P0[1] + f[1]], "#8a8f9a", "ar-grey", 2.6);
        net = [net[0] + f[0], net[1] + f[1]];
      }
      p.rwd.forEach((k, i) => {
        const b = pt(p.base);
        const f = [om[i] * (PTS[k][0] - b[0]) * p.Wrwd * K, om[i] * (PTS[k][1] - b[1]) * p.Wrwd * K];
        const neg = om[i] < 0;
        arrow(svg, P0, [P0[0] + f[0], P0[1] + f[1]], neg ? "#d66e28" : "#2c63d6", neg ? "ar-orange" : "ar-blue", 2.6);
        net = [net[0] + f[0], net[1] + f[1]];
      });
      const nComp = (p.reg && p.Wreg ? 1 : 0) + p.rwd.length;
      if (nComp > 1) arrow(svg, P0, [P0[0] + net[0], P0[1] + net[1]], "#1e1f24", "ar-ink", 3.4);
      dot(svg, P0, "#2c63d6", 8);
      label(svg, P0, "\\(\\tilde x_\\theta\\) <span style='color:#9a9ea8;font-size:11px'>(drag)</span>", 10, 4, "#2c63d6");
      const ro = root.querySelector("[data-readout]");
      const omTxt = om.map((v, i) => `\\(\\omega${om.length > 1 ? "_" + (i + 1) : ""}\\)=${v.toFixed(2)}`).join(", ");
      const kind = om.map(v => v > 0 ? "attraction" : v < 0 ? "repulsion" : "no reward force");
      ro.innerHTML = `${omTxt} &nbsp;→&nbsp; ${[...new Set(kind)].join(" + ")}` +
        (p.slider === "A" ? `<br><span class="note">${st.preset === "AWM" ? "AWM: |ω| = |A| is unbounded; the baseline moves with the prediction." : "DiffusionNFT: |ω| saturates at 1/β (β = 1 in this drawing)."}</span>` : "") +
        (st.preset === "DiffusionOPSD" ? `<br><span class="note">|ω₁| + |ω₂| = 1/β is fixed; \\(\\hat r\\) redistributes it between the ascent and descent points. Both terms push the same way.</span>` : "");
      const t = p.tex;
      root.querySelector("[data-anchors]").innerHTML = `\\(\\tilde x_{\\mathrm{reg}}=${t[0]}\\), \\(\\tilde x_{\\mathrm{base}}=${t[1]}\\), \\(\\tilde x_{\\mathrm{rwd}}=${t[2]}\\)<br>\\(W_{\\mathrm{reg}}=${t[3]}\\), \\(W_{\\mathrm{rwd}}=${t[4]}\\), \\(\\omega=${t[5]}\\)`;
      window.katexRender && (window.katexRender(ro), window.katexRender(root.querySelector("[data-anchors]")));
      root.querySelector("[data-v=A]").textContent = st.A.toFixed(2);
      root.querySelector("[data-v=rhat]").textContent = st.rhat.toFixed(2);
    }
    root.querySelectorAll("input[type=range]").forEach(inp => inp.addEventListener("input", () => { st[inp.dataset.k] = +inp.value; draw(); }));
    draw();
  }

  /* ---------------- phase 3: u-form vs v-form ---------------- */
  function forms(root) {
    const svg = root.querySelector("svg");
    const dom = root.querySelector("svg.domain");
    const st = { mode: "u-form", t: 0.85, r: 0.35 };
    // trajectory x(nu) = P0 + nu (P2 - P0) + c nu (1 - nu) n: clean end at nu = 0, noise at nu = 1.
    // With this curve the tangent extrapolation X[x_t, v, 0] lands at P0 + c t^2 n (inside the canvas).
    const P0 = [150, 320], P2 = [510, 60], c = 150;
    const D = [P2[0] - P0[0], P2[1] - P0[1]], nl = Math.hypot(-D[1], D[0]), N = [D[1] / nl, -D[0] / nl];
    const Nn = N[1] > 0 ? [-N[0], -N[1]] : N;  // bend toward the top-left
    const B = s => [P0[0] + s * D[0] + c * s * (1 - s) * Nn[0], P0[1] + s * D[1] + c * s * (1 - s) * Nn[1]];
    const dB = s => [D[0] + c * (1 - 2 * s) * Nn[0], D[1] + c * (1 - 2 * s) * Nn[1]];
    const chips = root.querySelector("[data-forms]");
    ["u-form", "v-ind", "v-aux"].forEach(k => {
      const b = document.createElement("button"); b.className = "chip"; b.textContent = k;
      b.onclick = () => { st.mode = k; draw(); };
      chips.appendChild(b);
    });
    function draw() {
      chips.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.textContent === st.mode));
      svg.innerHTML = ""; defs(svg);
      const t = st.t, r = Math.min(st.r, t - 0.02);
      let d = ""; for (let i = 0; i <= 60; i++) { const p = B(i / 60); d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }
      el("path", { d, fill: "none", stroke: "#c9ced8", "stroke-width": 3 }, svg);
      const lab0 = el("text", { x: P0[0] - 10, y: P0[1] + 26, fill: "#6a6f7b", "font-size": 12 }, svg); lab0.textContent = "clean end (level 0)";
      const xt = B(t);
      const v = dB(t);  // instantaneous velocity along the curve (per unit level, pointing toward noise)
      const u = (a, b) => [(B(a)[0] - B(b)[0]) / (a - b), (B(a)[1] - B(b)[1]) / (a - b)];  // average velocity over [b, a]
      const X = (vel, lvl) => [xt[0] - (t - lvl) * vel[0], xt[1] - (t - lvl) * vel[1]];
      const ro = root.querySelector("[data-readout]");
      if (st.mode === "u-form") {
        const end = X(u(t, 0), 0);
        arrow(svg, xt, end, "#2c63d6", "ar-blue", 2.8);
        dot(svg, end, "#2c63d6", 6, true);
        label(svg, end, "\\(\\tilde x_{\\theta,\\mathrm u}=\\tilde x_t-t\\,u_\\theta(\\tilde x_t,t,0)\\)", 10, -6, "#2c63d6");
        ro.innerHTML = "<b>u-form.</b> The prediction is the end of the transport (secant to level 0). Only \\(u_\\theta(\\cdot,t,0)\\) receives a gradient: the \\(r=0\\) edge of the domain.";
      } else {
        const ur = u(t, r);
        const xr = X(ur, r);
        el("line", { x1: xt[0], y1: xt[1], x2: xr[0], y2: xr[1], stroke: "#8a8f9a", "stroke-width": 2, "stroke-dasharray": "5 4" }, svg);
        dot(svg, xr, "#8a8f9a", 4.5);
        label(svg, xr, "\\(X[\\tilde x_t,u(\\tilde x_t,t,r),r]\\)", 8, 2, "#6a6f7b");
        const tan = X(v, 0);
        if (st.mode === "v-ind") {
          // J turns the secant velocity u(t,r) into the tangent velocity v
          const end = tan;
          arrow(svg, xt, end, "#2c63d6", "ar-blue", 2.8);
          dot(svg, end, "#2c63d6", 6, true);
          label(svg, end, "\\(\\tilde x_{\\theta,\\mathrm v}=\\tilde x_t-t\\,(u_\\theta+J)\\)", -20, -44, "#2c63d6");
          const jfree = X(ur, 0);
          arrow(svg, jfree, end, "#3fb6c8", "ar-cyan", 2, "3 3");
          label(svg, lerp(jfree, end, .5), "\\(-t\\,J\\)", 6, -4, "#2a9aac");
          ro.innerHTML = "<b>v-ind.</b> \\(v_{\\mathrm{ind}}=u_{\\mathrm{old}}+J[u_{\\mathrm{old}},t,r]\\) recovers the tangent from the network itself (MeanFlow identity); \\(J\\) is detached, so the Jacobian is that of \\(u_\\theta(\\cdot,t,r)\\) and resampling \\(r\\) trains the whole domain. Cost: two extra no-grad forwards of \\(u_{\\mathrm{old}}\\) per query.";
        } else {
          const vphi = [v[0] * 0.96 - 18, v[1] * 0.96 + 22];  // a fitted approximation of v (schematic error)
          const aux = X(vphi, 0);
          arrow(svg, xt, aux, "#6a3fc1", "ar-purple", 2.4, "6 3");
          dot(svg, aux, "#6a3fc1", 5.5, true);
          label(svg, aux, "\\(\\tilde x_{\\mathrm{aux}}=\\tilde x_t-t\\,v_\\phi\\) (anchor)", -30, -42, "#6a3fc1");
          const jfree = X(ur, 0);
          arrow(svg, xt, jfree, "#2c63d6", "ar-blue", 2.8);
          dot(svg, jfree, "#2c63d6", 6, true);
          label(svg, jfree, "\\(\\tilde x_\\theta=X[\\tilde x_t,u_\\theta(\\tilde x_t,t,r),0]\\)", 12, 4, "#2c63d6");
          ro.innerHTML = "<b>v-aux.</b> The auxiliary \\(v_\\phi\\), fitted to the old-policy rollouts, supplies only the baseline \\(\\tilde x_{\\mathrm{aux}}\\). The prediction is the J-free \\((t,r)\\) query, which has the same Jacobian as \\(\\tilde x_{\\theta,\\mathrm v}\\); no Jacobian-vector product, but \\(n_{\\mathrm{fm}}\\) extra fitting steps per iteration.";
        }
      }
      dot(svg, xt, "#1e1f24", 7);
      label(svg, xt, `\\(\\tilde x_t\\)  (level t = ${t.toFixed(2)})`, 10, -30);
      window.katexRender && window.katexRender(ro);
      root.querySelector("[data-v=t]").textContent = t.toFixed(2);
      root.querySelector("[data-v=r]").textContent = r.toFixed(2);
      // domain {0 <= r <= t <= 1}
      dom.innerHTML = "";
      const DX = v => 30 + v * 190, DY = v => 170 - v * 150;
      el("polygon", { points: `${DX(0)},${DY(0)} ${DX(1)},${DY(0)} ${DX(1)},${DY(1)}`, fill: st.mode === "u-form" ? "#f2f4f8" : "#dfe9ff", stroke: "#c9ced8" }, dom);
      if (st.mode === "u-form") el("line", { x1: DX(0), y1: DY(0), x2: DX(1), y2: DY(0), stroke: "#2c63d6", "stroke-width": 5 }, dom);
      el("circle", { cx: DX(t), cy: DY(st.mode === "u-form" ? 0 : r), r: 5, fill: "#1e1f24" }, dom);
      const tx = el("text", { x: DX(.5), y: 192, "text-anchor": "middle", "font-size": 12, fill: "#6a6f7b" }, dom); tx.textContent = "t →";
      const ry = el("text", { x: 16, y: DY(.5), "text-anchor": "middle", "font-size": 12, fill: "#6a6f7b" }, dom); ry.textContent = "r";
      const rr = el("text", { x: DX(1) - 6, y: DY(1) - 6, "text-anchor": "end", "font-size": 11, fill: "#9a9ea8" }, dom); rr.textContent = "r = t";
      const cap = el("text", { x: DX(.02), y: DY(.92), "font-size": 11.5, fill: "#3c404b" }, dom); cap.textContent = st.mode === "u-form" ? "trained: r = 0 edge" : "trained: 0 ≤ r ≤ t";
    }
    root.querySelectorAll("input[type=range]").forEach(inp => inp.addEventListener("input", () => { st[inp.dataset.k] = +inp.value; draw(); }));
    draw();
  }

  window.Figures = { xspace, forces, forms };
})();
