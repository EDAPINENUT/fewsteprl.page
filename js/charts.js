/* Small dependency-free SVG charts: line chart with hover + legend toggles, stacked bars, dot plot. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const tip = () => document.getElementById("tip");

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceTicks(lo, hi, n) {
    const span = hi - lo || Math.abs(hi) || 1;
    const step0 = span / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || 10 * mag;
    const t0 = Math.ceil(lo / step - 1e-9) * step;
    const out = [];
    for (let v = t0; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function fmt(v, d) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    const a = Math.abs(v);
    const dd = d !== undefined ? d : (a >= 100 ? 1 : a >= 10 ? 2 : 3);
    return (+v).toFixed(dd);
  }
  function showTip(html, ev) {
    const t = tip();
    t.innerHTML = html; t.style.display = "block";
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
    t.style.left = x + "px"; t.style.top = y + "px";
  }
  function hideTip() { tip().style.display = "none"; }

  /**
   * lineChart(host, opts)
   * opts.series: [{name, color, dash, width, points: [[x, y], ...]}]
   * opts.xLabel, opts.yLabel, opts.xTicks (array), opts.logX, opts.height, opts.digits
   * opts.legendHost: element for legend (toggles visibility)
   */
  function lineChart(host, opts) {
    host.innerHTML = "";
    const W = 860, H = opts.height || 340, m = { l: 62, r: 18, t: 14, b: 44 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart" }, host);
    const hidden = opts.hidden || new Set();
    const vis = opts.series.filter(s => !hidden.has(s.name) && s.points.length);
    const xs = opts.series.flatMap(s => s.points.map(p => p[0]));
    const ys = vis.flatMap(s => s.points.map(p => p[1]));
    if (!xs.length || !ys.length) return;
    const tx = v => opts.logX ? Math.log2(v) : v;
    let x0 = Math.min(...xs.map(tx)), x1 = Math.max(...xs.map(tx));
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = (y1 - y0) * 0.08 || Math.abs(y1) * 0.05 || 1;
    y0 -= pad; y1 += pad;
    const X = v => m.l + (tx(v) - x0) / (x1 - x0 || 1) * (W - m.l - m.r);
    const Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    const g = el("g", { class: "grid" }, svg);
    const yt = niceTicks(y0, y1, 5);
    const step = yt.length > 1 ? yt[1] - yt[0] : 1;
    const tickDigits = opts.tickDigits !== undefined ? opts.tickDigits : Math.max(0, Math.ceil(-Math.log10(step) - 1e-9) + (String(+step.toPrecision(3)).includes("5") && step < 1 ? 1 : 0));
    yt.forEach(v => { el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, g); const t = el("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end" }, svg); t.textContent = fmt(v, tickDigits); });
    const xticks = opts.xTicks || niceTicks(Math.min(...xs), Math.max(...xs), 8);
    xticks.forEach(v => { const t = el("text", { x: X(v), y: H - m.b + 18, "text-anchor": "middle" }, svg); t.textContent = v; el("line", { x1: X(v), x2: X(v), y1: H - m.b, y2: H - m.b + 5, stroke: "#c9ced8" }, svg); });
    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: "#c9ced8" }, svg);
    if (opts.xLabel) { const t = el("text", { x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle", class: "ttl" }, svg); t.textContent = opts.xLabel; }
    if (opts.yLabel) { const t = el("text", { x: 14, y: (m.t + H - m.b) / 2, "text-anchor": "middle", class: "ttl", transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})` }, svg); t.textContent = opts.yLabel; }
    if (opts.refLine !== undefined) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(opts.refLine), y2: Y(opts.refLine), stroke: "#9aa0ab", "stroke-dasharray": "2 4" }, svg);
    }
    vis.forEach(s => {
      const d = s.points.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": s.width || 2.2, "stroke-dasharray": s.dash || "", "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      s.points.forEach(p => el("circle", { cx: X(p[0]), cy: Y(p[1]), r: s.dash ? 2.6 : 3.2, fill: s.color }, svg));
    });
    const cursor = el("line", { y1: m.t, y2: H - m.b, stroke: "#9aa0ab", "stroke-dasharray": "3 3", opacity: 0 }, svg);
    const hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
    const allX = [...new Set(xs)].sort((a, b) => a - b);
    hit.addEventListener("mousemove", ev => {
      const r = svg.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width * W;
      let best = allX[0];
      allX.forEach(x => { if (Math.abs(X(x) - px) < Math.abs(X(best) - px)) best = x; });
      cursor.setAttribute("x1", X(best)); cursor.setAttribute("x2", X(best)); cursor.setAttribute("opacity", 1);
      const rows = vis.map(s => { const p = s.points.find(q => q[0] === best); return p ? { s, v: p[1] } : null; }).filter(Boolean)
        .sort((a, b) => b.v - a.v)
        .map(o => `<div class="row"><span class="sw" style="background:${o.s.color}"></span>${o.s.name}<span style="margin-left:auto;padding-left:10px">${fmt(o.v, opts.digits)}</span></div>`).join("");
      showTip(`<b>${opts.xName || "x"} = ${best}</b>${rows}`, ev);
    });
    hit.addEventListener("mouseleave", () => { cursor.setAttribute("opacity", 0); hideTip(); });
    if (opts.legendHost) {
      opts.legendHost.innerHTML = "";
      opts.series.forEach(s => {
        const it = document.createElement("span");
        it.className = "it" + (hidden.has(s.name) ? " off" : "");
        it.innerHTML = `<span class="sw${s.dash ? " dash" : ""}" style="background:${s.color};color:${s.color}"></span>${s.name}`;
        it.onclick = () => { hidden.has(s.name) ? hidden.delete(s.name) : hidden.add(s.name); lineChart(host, Object.assign({}, opts, { hidden })); };
        opts.legendHost.appendChild(it);
      });
    }
  }

  /** stackedBars(host, rows: [{name, color, parts: [{label, value, color}]}], opts) — horizontal. */
  function stackedBars(host, rows, opts) {
    host.innerHTML = "";
    const W = 860, rowH = 34, m = { l: 128, r: 70, t: 24, b: 30 };
    const H = m.t + m.b + rows.length * rowH;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart" }, host);
    const max = Math.max(...rows.map(r => r.parts.reduce((a, p) => a + p.value, 0)));
    const X = v => m.l + v / max * (W - m.l - m.r);
    niceTicks(0, max, 6).forEach(v => {
      el("line", { x1: X(v), x2: X(v), y1: m.t - 6, y2: H - m.b, stroke: "#eef0f4" }, svg);
      const t = el("text", { x: X(v), y: H - m.b + 16, "text-anchor": "middle" }, svg); t.textContent = v;
    });
    const t = el("text", { x: (m.l + W - m.r) / 2, y: H - 2, "text-anchor": "middle", class: "ttl" }, svg); t.textContent = opts.xLabel || "";
    rows.forEach((r, i) => {
      const y = m.t + i * rowH;
      const n = el("text", { x: m.l - 10, y: y + rowH / 2 + 4, "text-anchor": "end", style: `fill:${r.color};font-weight:600;font-size:12px` }, svg); n.textContent = r.name;
      let acc = 0;
      r.parts.forEach(p => {
        const rect = el("rect", { x: X(acc), y: y + 6, width: Math.max(0, X(acc + p.value) - X(acc)), height: rowH - 12, rx: 4, fill: p.color }, svg);
        rect.addEventListener("mousemove", ev => showTip(`<b>${r.name}</b><div>${p.label}: ${p.value} s</div><div class="muted">s/iter ${r.total}</div>`, ev));
        rect.addEventListener("mouseleave", hideTip);
        acc += p.value;
      });
      const tt = el("text", { x: X(acc) + 6, y: y + rowH / 2 + 4, style: "font-weight:600;fill:#3c404b" }, svg); tt.textContent = r.total + " s";
    });
    if (opts.legend) {
      let lx = m.l;
      opts.legend.forEach(l => { el("rect", { x: lx, y: 4, width: 12, height: 10, rx: 2, fill: l.color }, svg); const tx = el("text", { x: lx + 17, y: 13 }, svg); tx.textContent = l.label; lx += 22 + l.label.length * 6.6; });
    }
  }

  /** dotPlot(host, dims: [{name, values: {series: value}}], series: [{name, color}], opts) */
  function dotPlot(host, dims, series, opts) {
    host.innerHTML = "";
    const W = 860, rowH = 30, m = { l: 190, r: 70, t: 12, b: 34 };
    const H = m.t + m.b + dims.length * rowH;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart" }, host);
    // the shared deviation axis must hold every point
    let maxDev = 0;
    dims.forEach(d => { const v = series.map(s => d.values[s.name]).filter(x => x !== undefined); const mu = v.reduce((a, b) => a + b, 0) / v.length; v.forEach(x => { maxDev = Math.max(maxDev, Math.abs(x - mu)); }); });
    opts = Object.assign({}, opts, { halfRange: Math.max(opts.halfRange || 0, Math.ceil(maxDev + 0.4)) });
    // each row has its own range (dimensions live on different scales); the axis shows deviation
    dims.forEach((d, i) => {
      const y = m.t + i * rowH + rowH / 2;
      const vals = series.map(s => d.values[s.name]).filter(v => v !== undefined);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const span = Math.max(...vals) - Math.min(...vals);
      const half = opts.halfRange || 3.5;
      const X = v => m.l + (v - mean + half) / (2 * half) * (W - m.l - m.r);
      el("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: "#eef0f4" }, svg);
      el("line", { x1: X(mean), x2: X(mean), y1: y - 9, y2: y + 9, stroke: "#c9ced8" }, svg);
      const lab = el("text", { x: m.l - 10, y: y + 4, "text-anchor": "end", style: "font-size:12px;fill:#3c404b" }, svg); lab.textContent = d.name;
      const sp = el("text", { x: W - m.r + 8, y: y + 4, style: `font-size:11.5px;font-weight:${span > 2.6 ? 700 : 500};fill:${span > 2.6 ? "#c45a1a" : "#6a6f7b"}` }, svg); sp.textContent = "Δ " + span.toFixed(2);
      series.forEach(s => {
        const v = d.values[s.name]; if (v === undefined) return;
        const c = el("circle", { cx: X(v), cy: y, r: 5.5, fill: s.color, stroke: "#fff", "stroke-width": 1.5, opacity: .92 }, svg);
        c.addEventListener("mousemove", ev => showTip(`<b>${d.name}</b><div class="row"><span class="sw" style="background:${s.color}"></span>${s.name}: ${v.toFixed(2)}</div><div>mean ${mean.toFixed(2)}, spread ${span.toFixed(2)}</div>`, ev));
        c.addEventListener("mouseleave", hideTip);
      });
    });
    const half = opts.halfRange || 3.5;
    [-half, -half / 2, 0, half / 2, half].forEach(v => {
      const x = m.l + (v + half) / (2 * half) * (W - m.l - m.r);
      const t = el("text", { x, y: H - m.b + 18, "text-anchor": "middle" }, svg); t.textContent = (v > 0 ? "+" : "") + v;
    });
    const tt = el("text", { x: (m.l + W - m.r) / 2, y: H - 4, "text-anchor": "middle", class: "ttl" }, svg); tt.textContent = "deviation from the mean of the seven trainers (points)";
  }

  window.Charts = { lineChart, stackedBars, dotPlot, fmt, showTip, hideTip };
})();
