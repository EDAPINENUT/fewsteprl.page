/* FewStepRL project page: router, KaTeX, film strips, tables, charts, method pages, players. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // ---------------------------------------------------------------- colours & labels
  const COLOR = {
    "FewStepGRPO": "#8a9bbd", "MeanFlowAWM": "#38a9e0", "DMDAWM": "#119e78", "MeanFlowNFT": "#2c63d6",
    "DMDNFT": "#6a3fc1", "FewStepOPSD": "#d4561c", "ReFL": "#e2a012", "AnyFlow init": "#6f7480", "SD3.5-Medium": "#2a2d34",
  };
  const ORDER = ["FewStepGRPO", "MeanFlowAWM", "DMDAWM", "MeanFlowNFT", "DMDNFT", "FewStepOPSD", "ReFL"];
  const RG = new Set(["FewStepOPSD", "ReFL"]);
  const SLUG = { FewStepGRPO: "fewstepgrpo", MeanFlowAWM: "meanflowawm", DMDAWM: "dmdawm", MeanFlowNFT: "meanflownft", DMDNFT: "dmdnft", FewStepOPSD: "fewstepopsd", ReFL: "refl" };

  // ---------------------------------------------------------------- KaTeX
  const MACROS = {
    "\\sg": "\\operatorname{sg}", "\\clip": "\\operatorname{clip}",
  };
  window.katexRender = function (root) {
    if (!window.renderMathInElement) return;
    renderMathInElement(root, {
      delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }],
      macros: MACROS, throwOnError: false, strict: "ignore",
    });
  };

  // ---------------------------------------------------------------- data
  let PAPER = null, MEDIA = null;
  const num = s => { const m = String(s).match(/[+-]?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };

  // ---------------------------------------------------------------- method pages
  function resultCards(name) {
    const t6b = PAPER.tab6b.rows, t6a = PAPER.tab6a.rows, t8 = PAPER.tab8.rows, s2 = PAPER.tabS2.quality.rows;
    const init6b = t6b["AnyFlow init"], init8 = t8["AnyFlow init"];
    const delta = (v, base, d) => {
      const x = num(v) - num(base); if (isNaN(x)) return "";
      const cls = x > 0 ? "up" : x < 0 ? "down" : "";
      return `<span class="d ${cls}">${x > 0 ? "+" : ""}${x.toFixed(d)}</span>`;
    };
    const kv = (k, v, d) => `<div class="kv"><span>${k}</span><span><b>${v}</b>${d || ""}</span></div>`;
    const m = t6b[name];
    let mix = `<h4>Image · mixed reward <span class="src">Tab. 6(b)</span></h4>` +
      kv("training reward", m[2], delta(m[2], init6b[2], 3)) + kv("HPSv3 (held out)", m[8], delta(m[8], init6b[8], 2)) +
      kv("ImageReward (held out)", m[9], delta(m[9], init6b[9], 3)) + kv("GenEval2 best (it.)", m[12]) + kv("s / iteration", m[0] + " s");
    const o = t6a[name];
    let ocr;
    if (!o || o[0] === "n/a") {
      ocr = `<h4>Image · OCR reward <span class="src">Tab. 6(a)</span></h4><p class="note" style="margin:0">Not applicable: OCR accuracy has no gradient with respect to the sample decoded from rollout latents.</p>`;
    } else {
      ocr = `<h4>Image · OCR reward <span class="src">Tab. 6(a)</span></h4>` + kv("OCR @ it. 100", o[2], delta(o[2], "0.498", 3)) + kv("OCR @ it. 200", o[4], delta(o[4], "0.498", 3)) +
        kv("HPSv3 at first ckpt > 0.82", o[9] === "---" ? "not reached" : `${o[9]} <span class="muted small">(it. ${o[6]})</span>`) + kv("s / iteration", o[0] + " s");
    }
    const v = t8[name];
    const vid = `<h4>Video · Wan2.1 <span class="src">Tab. 8</span></h4>` + kv("training reward", v[3], delta(v[3], init8[3], 2)) +
      kv("VBench overall", v[8], delta(v[8], init8[8], 2)) + kv("dynamic degree", s2[name][0]) + kv("text alignment (TA)", v[7], delta(v[7], init8[7], 2)) +
      kv("GPU-hours (GPUs)", `${v[2]} <span class="muted small">(${v[0]})</span>`);
    return `<div class="result-cards"><div class="result-card">${mix}</div><div class="result-card">${ocr}</div><div class="result-card">${vid}</div></div>
      <p class="note">Δ against the AnyFlow init (iteration 0). Image mixed reward at iteration 400; OCR within 200 iterations; video at iteration 250. Single run per method.</p>`;
  }

  function buildMethodPages() {
    const host = $("#method-pages");
    const order = ["methods", ...METHODS.map(m => "m-" + m.key), "exp-mix"];
    METHODS.forEach((m, i) => {
      const anchor = (k, tex, off) => `<div class="anchor-card${off ? " off" : ""}"><div class="k">${k}</div><div class="v">${off ? "∅ (not used)" : `\\(${tex}\\)`}</div></div>`;
      const sec = document.createElement("section");
      sec.className = "page"; sec.id = "p-m-" + m.key; sec.dataset.title = m.name;
      const cost = m.cost.map(c => `<td>${String(c).replace("M_step", "\\(M_{\\mathrm{step}}\\)").replace("n_ts", "\\(n_{\\mathrm{ts}}\\)").replace("n_fm", "\\(n_{\\mathrm{fm}}\\)").replace("M_tgt", "\\(M_{\\mathrm{tgt}}\\)")}</td>`).join("");
      sec.innerHTML = `
        <div class="kicker${m.cls === "rg" ? " rg" : ""}">Methods · ${m.cls === "rg" ? "reward-gradient-based RL" : "group-advantage-based RL"} · ${m.sec}</div>
        <h1>${m.name}</h1>
        <div class="badges"><span class="badge ${m.cls}">${m.cls === "rg" ? "reward-gradient-based" : "group-advantage-based"}</span>
          <span class="badge">estimator: ${m.estimator}</span><span class="badge">${m.sampler}</span><span class="badge">adapts ${m.orig}</span></div>
        <p class="lead">${m.one}</p>
        <p class="note">Original method: ${m.origNote}.</p>
        <div class="step-block${m.cls === "rg" ? " rg" : ""}"><div class="si">1</div><div><h3>Transformation to x-space <a class="small" href="#phase-1">(phase 1)</a></h3>${m.transform}</div></div>
        <div class="step-block${m.cls === "rg" ? " rg" : ""}"><div class="si">2</div><div><h3>Decoupled decomposition <a class="small" href="#phase-2">(phase 2)</a></h3>
          <p>The prediction, three anchors and three weights of the general gradient <span class="src">Tab. 2</span>:</p>
          <div class="anchor-cards">${anchor("prediction \\(\\tilde x_\\theta\\)", m.anchors.x_z)}${anchor("regression \\(\\tilde x_{\\mathrm{reg}}\\)", m.anchors.x_reg, !m.anchors.x_reg)}${anchor("baseline \\(\\tilde x_{\\mathrm{base}}\\)", m.anchors.x_base)}${anchor("rewarded \\(\\tilde x_{\\mathrm{rwd}}\\)", m.anchors.x_rwd)}</div>
          <div class="anchor-cards" style="grid-template-columns:repeat(3,1fr)">${anchor("\\(W_{\\mathrm{reg}}\\)", m.weights.W_reg, m.weights.W_reg === "0")}${anchor("\\(W_{\\mathrm{rwd}}\\)", m.weights.W_rwd)}${anchor("\\(\\omega\\)", m.weights.omega)}</div>
          <p class="note">${m.weightNote}</p></div></div>
        <div class="step-block${m.cls === "rg" ? " rg" : ""}"><div class="si">3</div><div><h3>Few-step adaptation <a class="small" href="#phase-3">(phase 3)</a></h3>${m.adapt}
          <div class="table-wrap"><table class="data"><thead><tr><th class="nosort">\\(n_{\\mathrm{it}}\\)</th><th class="nosort">\\(c_\\theta\\)</th><th class="nosort">\\(c_{\\mathrm{old}}\\)</th><th class="nosort">\\(c_J\\)</th><th class="nosort">\\(c_\\phi\\)</th><th class="nosort">\\(c_{\\mathrm{ref}}\\)</th><th class="nosort">\\(c_{\\mathrm{extra}}\\)</th></tr></thead><tbody><tr>${cost}</tr></tbody></table></div>
          <p class="note">Network evaluations per inner iteration <span class="src">Tab. 4</span>${String(m.cost[3]).includes("†") ? "; † J dropped because it cancels (App. C)" : ""}.</p></div></div>
        <h2>In code</h2><pre class="code">${escapeCode(m.code)}</pre>
        <p class="note">Transcribed from the paper's code box for this family (§5).</p>
        <h2>Results</h2>${resultCards(m.name)}
        <ul class="prose">${m.facts.map(f => `<li>${f}</li>`).join("")}</ul>
        <h2>Samples</h2>
        <div class="toggle-row"><div class="seg" data-sample-toggle><button class="on" data-v="${m.name}">${m.name}</button><button data-v="AnyFlow init">AnyFlow init</button><button data-v="SD3.5-M · 40 steps + CFG">SD3.5-M · 40 steps + CFG</button></div><span class="note">same prompt and seed (= same initial noise) per column</span></div>
        <div class="samples" data-samples></div>
        <p class="note">${m.imageNote || "Unprocessed 512² samples of the released mixed-reward checkpoint; held-out ImageReward under each image."}</p>
        <div class="vgrid" style="grid-template-columns:1fr 1fr;margin-top:14px" data-pair></div>
        <p class="note" data-pair-note></p>
        <div class="pager"></div>`;
      host.appendChild(sec);
    });
    void order;
  }
  function escapeCode(s) {
    const esc = x => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return s.split("\n").map(line => {
      const i = line.indexOf("#");
      const code = i < 0 ? line : line.slice(0, i), com = i < 0 ? "" : line.slice(i);
      return esc(code).replace(/\b(class|def|return|for|in|if|else|None|yield)\b/g, '<span class="k">$1</span>') +
        (com ? `<span class="c">${esc(com)}</span>` : "");
    }).join("\n");
  }

  function methodSamples(sec, name) {
    const host = $("[data-samples]", sec);
    const draw = label => {
      const items = MEDIA.methods[label] || [];
      host.innerHTML = items.map(it => `<div class="sample"><img src="${it.src}" alt="" loading="lazy" data-meta='${JSON.stringify({ trainer: label, prompt: it.prompt, seed: it.seed, note: it.note }).replace(/'/g, "&#39;")}'><div class="lab">ImageReward ${it.imagereward.toFixed(2)}${it.note ? " · " + it.note : ""}</div></div>`).join("");
      $$("img", host).forEach(img => img.addEventListener("click", () => openLightbox({ kind: "image", src: img.src, ...JSON.parse(img.dataset.meta) })));
    };
    $$("[data-sample-toggle] button", sec).forEach(b => b.addEventListener("click", () => {
      $$("[data-sample-toggle] button", sec).forEach(x => x.classList.toggle("on", x === b)); draw(b.dataset.v);
    }));
    draw(name);
    // synced pair: AnyFlow init vs this trainer
    const p = Object.keys(MEDIA.video_grid)[0], grid = MEDIA.video_grid[p];
    const pair = $("[data-pair]", sec);
    pair.innerHTML = ["AnyFlow init", name].map(k => `<div class="vcell"><video muted loop playsinline preload="none" poster="${grid[k].poster}" src="${grid[k].src}"></video><span class="lab ${k === "AnyFlow init" ? "ref" : RG.has(k) ? "rg" : ""}">${k} · 4 steps</span></div>`).join("");
    $("[data-pair-note]", sec).textContent = `Wan2.1 video, same prompt and seed: “${grid._prompt}”`;
    syncGroup($$("video", pair));
  }

  // ---------------------------------------------------------------- router
  let PAGES = [];
  const inited = new Set();
  function route() {
    const id = (location.hash || "#home").slice(1) || "home";
    const page = $("#p-" + id) || $("#p-home");
    $$(".page").forEach(p => p.classList.toggle("active", p === page));
    $$(".toc a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + page.id.slice(2)));
    document.title = (page.id === "p-home" ? "" : page.dataset.title.replace(/&amp;/g, "&") + " · ") + "FewStepRL";
    document.body.classList.remove("menu-open");
    window.scrollTo(0, 0);
    initPage(page);
    $$("video").forEach(v => { if (!page.contains(v)) v.pause(); });
  }
  function pager(page) {
    const host = $(".pager", page); if (!host) return;
    const i = PAGES.indexOf(page.id.slice(2));
    const prev = PAGES[i - 1], next = PAGES[i + 1];
    const t = id => ($("#p-" + id).dataset.title || id).replace(/&amp;/g, "&");
    host.innerHTML = (prev ? `<a href="#${prev}"><small>← previous</small><b>${t(prev)}</b></a>` : "<span></span>") +
      (next ? `<a class="next" href="#${next}"><small>next →</small><b>${t(next)}</b></a>` : "<span></span>");
  }
  function initPage(page) {
    const id = page.id.slice(2);
    if (inited.has(id)) { playVisible(page); return; }
    inited.add(id);
    const fn = {
      "phase-1": () => Figures.xspace($("#fig-xspace")),
      "phase-2": () => Figures.forces($("#fig-forces")),
      "phase-3": () => Figures.forms($("#fig-forms")),
      "methods": () => componentsTable(),
      "exp-mix": () => { table6b(); curves("mix", $("#chart-mix")); timeChart(); },
      "exp-ocr": () => { table6a(); curves("ocr", $("#chart-ocr")); beforeAfter(); },
      "exp-video": () => { table8(); videoGrid(); vbench(); },
      "exp-tts": () => { tts(); tableS3(); },
      "guidance": () => tree(),
    }[id];
    if (fn) fn();
    if (id.startsWith("m-")) methodSamples(page, page.dataset.title);
    playVisible(page);
  }

  // ---------------------------------------------------------------- film strips
  function buildFilms() {
    const g = MEDIA.gallery;
    const half = Math.ceil(g.images.length / 2);
    const sets = {
      "images-a": g.images.slice(0, half), "images-b": g.images.slice(half),
      "videos": g.videos, "posters": [...MEDIA.posters, ...g.images.slice(0, 6)],
    };
    $$(".filmstrip").forEach(strip => {
      const items = sets[strip.dataset.film] || [];
      const frame = it => it.kind === "video"
        ? `<div class="frame wide" data-i><video muted loop playsinline preload="none" poster="${it.poster}" data-src="${it.src}"></video><span class="kind">VIDEO</span><div class="cap"><b>${it.trainer}</b>${short(it.prompt)}</div></div>`
        : `<div class="frame sq" data-i><img src="${it.src}" alt="" loading="lazy" decoding="async"><div class="cap"><b>${it.trainer}</b>${short(it.prompt)}</div></div>`;
      const html = items.map(frame).join("");
      strip.innerHTML = `<div class="track">${html}${html}</div>`;
      $$(".frame", strip).forEach((f, k) => f.addEventListener("click", () => openLightbox(items[k % items.length])));
    });
    // lazy-start videos in strips when they become visible
    const io = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
    }), { rootMargin: "100px" });
    $$(".filmstrip video").forEach(v => io.observe(v));
  }
  const short = s => { const w = s.replace(/["“”]/g, "").split(" "); return w.slice(0, 11).join(" ") + (w.length > 11 ? "…" : ""); };
  function playVisible(page) { $$(".filmstrip video", page).forEach(v => { if (v.src) v.play().catch(() => {}); }); }

  // ---------------------------------------------------------------- lightbox
  function openLightbox(it) {
    const lb = $("#lightbox");
    const media = $(".media", lb), meta = $(".meta", lb);
    const src = it.full || it.src;
    media.innerHTML = it.kind === "video" ? `<video src="${it.src}" controls autoplay muted loop playsinline></video>` : `<img src="${src}" alt="">`;
    let cmd = "";
    if (it.ckpt && it.kind === "video") cmd = `# from the fewsteprl-wan21 root\npython inference.py scripts/eval/configs/sample_wan.yaml \\\n  --prompt "${it.prompt}" \\\n  --override seed=${it.seed} mode=meanflow_nft meanflow_nft_path=${it.ckpt}`;
    else if (it.ckpt) cmd = `# from the fewsteprl-sd35 root\npython inference.py scripts/eval/configs/sample_sd35m_fewstep.yaml \\\n  --prompt "${it.prompt}" \\\n  --override seed=${it.seed} batch_size=1 num_stages=3 \\\n  stage3_lora_path=${it.ckpt}`;
    meta.innerHTML = it.prompt === undefined ? "" : `<h4>${it.trainer || ""}</h4><p>${it.kind === "video" ? "Wan2.1-T2V-1.3B · 81×480×832 · 4 steps, no CFG" : "SD3.5-Medium · 512² · 4 steps, no CFG"}${it.seed !== undefined ? " · seed " + it.seed : ""}</p><p>“${it.prompt}”</p>${it.note ? `<p class="note">${it.note}</p>` : ""}${cmd ? `<pre>${cmd.replace(/</g, "&lt;")}</pre>` : ""}`;
    lb.classList.add("open");
  }
  function closeLightbox() { const lb = $("#lightbox"); lb.classList.remove("open"); $(".media", lb).innerHTML = ""; }

  // ---------------------------------------------------------------- tables
  function sortable(table) {
    $$("thead tr:last-child th", table).forEach((th, ci) => {
      if (th.classList.contains("nosort")) return;
      th.insertAdjacentHTML("beforeend", '<span class="arrow">⇅</span>');
      th.addEventListener("click", () => {
        const body = $("tbody", table);
        const rows = $$("tr", body);
        const ref = rows.filter(r => r.classList.contains("ref"));
        const rest = rows.filter(r => !r.classList.contains("ref"));
        const dir = th.dataset.dir === "desc" ? 1 : -1; th.dataset.dir = dir === 1 ? "asc" : "desc";
        rest.sort((a, b) => {
          const x = num(a.children[ci].textContent), y = num(b.children[ci].textContent);
          if (isNaN(x) && isNaN(y)) return a.children[ci].textContent.localeCompare(b.children[ci].textContent) * dir;
          if (isNaN(x)) return 1; if (isNaN(y)) return -1;
          return (x - y) * dir;
        });
        [...ref, ...rest].forEach(r => body.appendChild(r));
      });
    });
  }
  /** generic paper table: cols [{i, label, better: 'high'|'low'|null, group}] */
  function paperTable(table, rows, cols, opts) {
    opts = opts || {};
    const groups = [];
    cols.forEach(c => { const g = c.group || ""; if (groups.length && groups[groups.length - 1].g === g) groups[groups.length - 1].n++; else groups.push({ g, n: 1 }); });
    // bold = exactly the cells the paper sets in bold (parsed from the tex), never recomputed here
    const boldOf = (n, i) => !!(opts.bold && PAPER.bold[opts.bold] && PAPER.bold[opts.bold][n] && PAPER.bold[opts.bold][n][i]);
    let html = "<thead>";
    if (groups.some(g => g.g)) html += `<tr class="groups"><th class="nosort"></th>${groups.map(g => `<th class="nosort" colspan="${g.n}">${g.g}</th>`).join("")}</tr>`;
    html += `<tr><th>method</th>${cols.map(c => `<th>${c.label}</th>`).join("")}</tr></thead><tbody>`;
    const names = [...(rows["AnyFlow init"] ? ["AnyFlow init"] : []), ...ORDER.filter(n => rows[n])];
    names.forEach(n => {
      const r = rows[n];
      const cls = n === "AnyFlow init" ? "ref" : RG.has(n) ? "rg" : "grp";
      const link = SLUG[n] ? `<a href="#m-${SLUG[n]}">${n}</a>` : n;
      if (r[0] === "n/a") { html += `<tr class="${cls}"><td>${link}</td><td class="na" colspan="${cols.length}">${opts.na || "not applicable"}</td></tr>`; return; }
      html += `<tr class="${cls}"><td>${link}</td>${cols.map(c => { const v = r[c.i]; return `<td class="${boldOf(n, c.i) ? "best" : ""}">${v === "---" ? "—" : v}</td>`; }).join("")}</tr>`;
    });
    table.innerHTML = html + "</tbody>";
    sortable(table);
  }
  function table6b() {
    const C = (i, label, better, group) => ({ i, label, better, group });
    paperTable($("#tab-6b"), PAPER.tab6b.rows, [
      C(0, "s/iter", "low", "cost"), C(1, "h", "low", "cost"),
      C(2, "sum", "high", "training reward"), C(3, "HPSv2", "high", "training reward"), C(4, "PickScore", "high", "training reward"), C(5, "CLIPScore", "high", "training reward"),
      C(6, "aesthetic", "high", "held-out reward"), C(7, "OCR", "high", "held-out reward"), C(8, "HPSv3", "high", "held-out reward"), C(9, "ImageReward", "high", "held-out reward"),
      C(10, "it. 400", "high", "GenEval2 (held out)"), C(11, "mean", "high", "GenEval2 (held out)"), C(12, "best (it.)", "high", "GenEval2 (held out)"),
    ], { bold: "tab6b" });
  }
  function table6a() {
    const C = (i, label, better, group) => ({ i, label, better, group });
    paperTable($("#tab-6a"), PAPER.tab6a.rows, [
      C(0, "s/iter", "low", "cost"),
      C(1, "it. 50", "high", "OCR accuracy at iteration"), C(2, "it. 100", "high", "OCR accuracy at iteration"), C(3, "it. 150", "high", "OCR accuracy at iteration"), C(4, "it. 200", "high", "OCR accuracy at iteration"),
      C(5, "first it. ≥ 0.85 (h)", "low", "OCR accuracy at iteration"),
      C(6, "it.", null, "at the first saved checkpoint with OCR > 0.82"), C(7, "OCR", "high", "at the first saved checkpoint with OCR > 0.82"), C(8, "aesthetic", "high", "at the first saved checkpoint with OCR > 0.82"),
      C(9, "HPSv3", "high", "at the first saved checkpoint with OCR > 0.82"), C(10, "ImageReward", "high", "at the first saved checkpoint with OCR > 0.82"), C(11, "GenEval2", "high", "at the first saved checkpoint with OCR > 0.82"),
    ], { bold: "tab6a", na: "not applicable: OCR accuracy has no gradient with respect to the decoded sample" });
  }
  function table8() {
    const C = (i, label, better, group, only) => ({ i, label, better, group, only });
    paperTable($("#tab-8"), PAPER.tab8.rows, [
      C(0, "GPUs", null, "cost"), C(1, "s/iter", "low", "cost", (n, r) => r[0] === "32"), C(2, "GPU-h", "low", "cost"),
      C(3, "sum", "high", "training reward"), C(4, "HPSv3-G", "high", "training reward"), C(5, "HPSv3-P", "high", "training reward"), C(6, "MQ", "high", "training reward"), C(7, "TA", "high", "training reward"),
      C(8, "overall", "high", "VBench (held out)"), C(9, "quality", "high", "VBench (held out)"), C(10, "semantic", "high", "VBench (held out)"),
    ], { bold: "tab8" });
  }
  function tableS3() {
    const C = (i, label, group) => ({ i, label, better: null, group });
    paperTable($("#tab-S3"), PAPER.tabS3.rows, [
      C(0, "it.", ""), C(1, "4", "HPSv3 at M_step"), C(2, "8", "HPSv3 at M_step"), C(3, "16", "HPSv3 at M_step"), C(4, "32", "HPSv3 at M_step"),
      C(5, "HPSv3", "% change, 32 vs. 4 steps"), C(6, "ImgRwd", "% change, 32 vs. 4 steps"), C(7, "GenEval2", "% change, 32 vs. 4 steps"), C(8, "Aesth.", "% change, 32 vs. 4 steps"),
      C(9, "CLIP", "% change, 32 vs. 4 steps"), C(10, "HPSv2", "% change, 32 vs. 4 steps"), C(11, "Pick", "% change, 32 vs. 4 steps"),
    ]);
  }
  function componentsTable() {
    const t = $("#tab-components");
    let html = `<thead><tr><th class="nosort">stage</th><th class="nosort">quantity</th>${COMPONENTS.cols.map((c, j) => `<th class="nosort m ${RG.has(c) ? "rgc" : "grpc"}" data-col="${j}">${c}</th>`).join("")}</tr></thead><tbody>`;
    COMPONENTS.rows.forEach(r => { html += `<tr><td style="text-align:left">${r[0]}</td><td>${r[1]}</td>${r[2].map((v, j) => `<td data-col="${j}">${v}</td>`).join("")}</tr>`; });
    t.innerHTML = html + "</tbody>";
    $$("th.m", t).forEach(th => {
      const j = th.dataset.col;
      th.addEventListener("mouseenter", () => $$(`[data-col="${j}"]`, t).forEach(c => c.classList.add("hl")));
      th.addEventListener("mouseleave", () => $$(`[data-col="${j}"]`, t).forEach(c => c.classList.remove("hl")));
      th.addEventListener("click", () => { location.hash = "#m-" + SLUG[COMPONENTS.cols[j]]; });
    });
    katexRender(t);
  }

  // ---------------------------------------------------------------- charts
  const MIX_DIMS = [["sum3", "Training reward"], ["hpsv2", "HPSv2"], ["pickscore", "PickScore"], ["clipscore", "CLIPScore"], ["aesthetic", "Aesthetic (held out)"], ["ocr", "OCR (held out)"], ["hpsv3", "HPSv3 (held out)"], ["imagereward", "ImageReward (held out)"], ["geneval2", "GenEval2 (held out)"]];
  const OCR_DIMS = [["ocr", "OCR accuracy"], ["aesthetic", "Aesthetic (held out)"], ["clipscore", "CLIPScore (held out)"], ["hpsv3", "HPSv3 (held out)"], ["imagereward", "ImageReward (held out)"], ["geneval2", "GenEval2 (held out)"]];
  function curves(side, card) {
    const dims = side === "mix" ? MIX_DIMS : OCR_DIMS;
    const seg = $("[data-metrics]", card);
    const hidden = new Set();
    const draw = key => {
      $$("button", seg).forEach(b => b.classList.toggle("on", b.dataset.k === key));
      const series = ORDER.filter(n => PAPER.curves[side][n]).map(n => ({ name: n, color: COLOR[n], points: PAPER.curves[side][n][key] || [] }));
      Charts.lineChart($("[data-svg]", card), { series, xLabel: "RL iteration", yLabel: dims.find(d => d[0] === key)[1], xName: "iteration",
        xTicks: side === "mix" ? [0, 50, 100, 150, 200, 250, 300, 350, 400] : [0, 50, 100, 150, 200], legendHost: $("[data-legend]", card), hidden });
    };
    seg.innerHTML = dims.map(d => `<button data-k="${d[0]}">${d[1].replace(" (held out)", "")}</button>`).join("");
    $$("button", seg).forEach(b => b.addEventListener("click", () => draw(b.dataset.k)));
    draw(dims[0][0]);
  }
  function timeChart() {
    const rows = ORDER.map(n => { const r = PAPER.tab7.rows[n]; return { name: n, color: COLOR[n], total: r[0], parts: [{ label: "sampling", value: num(r[1]), color: "#c7d3ea" }, { label: "update", value: num(r[2]), color: RG.has(n) ? "#e8935a" : "#2c63d6" }] }; });
    Charts.stackedBars($("#chart-time [data-svg]"), rows, { xLabel: "seconds per outer iteration (8 H20 GPUs)", legend: [{ label: "sampling (rollout + reward)", color: "#c7d3ea" }, { label: "update", color: "#2c63d6" }] });
  }
  function vbench() {
    const card = $("#chart-vbench");
    const Q = { DD: "dynamic degree", SC: "subject consistency*", MS: "motion smoothness*", TF: "temporal flickering*", BC: "background consistency*", AQ: "aesthetic quality", IQ: "imaging quality", quality: "quality (aggregate)" };
    const S = { OC: "object class", MO: "multiple objects", HA: "human action", Co: "color", SR: "spatial relationship", Sc: "scene*", AS: "appearance style*", TS: "temporal style*", OCs: "overall consistency*", semantic: "semantic (aggregate)" };
    const seg = $("[data-groups]", card);
    const draw = g => {
      $$("button", seg).forEach(b => b.classList.toggle("on", b.dataset.g === g));
      const tab = PAPER.tabS2[g], names = g === "quality" ? Q : S;
      const dims = tab.columns.map((c, i) => ({ name: names[c] || c, values: Object.fromEntries(ORDER.map(n => [n, num(tab.rows[n][i])])) }));
      Charts.dotPlot($("[data-svg]", card), dims, ORDER.map(n => ({ name: n, color: COLOR[n] })), { halfRange: g === "quality" ? 4 : 2 });
      $("[data-legend]", card).innerHTML = ORDER.map(n => `<span class="it"><span class="sw" style="background:${COLOR[n]};height:9px;width:9px;border-radius:50%"></span>${n}</span>`).join("") + `<span class="note">* rescaled by fixed min–max ranges before aggregation</span>`;
    };
    seg.innerHTML = `<button data-g="quality">Quality dimensions</button><button data-g="semantic">Semantic dimensions</button>`;
    $$("button", seg).forEach(b => b.addEventListener("click", () => draw(b.dataset.g)));
    draw("quality");
  }
  function tts() {
    const card = $("#chart-tts");
    const ARM = { fewstepgrpo_mix: "FewStepGRPO", meanflowawm_mix: "MeanFlowAWM", dmdawm_mix: "DMDAWM", meanflownft_mix: "MeanFlowNFT", dmdnft_mix: "DMDNFT", meanflowopsd_v_mix: "FewStepOPSD", reflmx_mix: "ReFL", anyflow_init: "AnyFlow init", sd35_pretrained: "SD3.5-Medium" };
    const DIMS = [["hpsv3", "HPSv3"], ["imagereward", "ImageReward"], ["geneval2", "GenEval2"], ["aesthetic", "Aesthetic"], ["clipscore", "CLIPScore"], ["hpsv2", "HPSv2"], ["pickscore", "PickScore"]];
    const seg = $("[data-metrics]", card);
    const hidden = new Set();
    const draw = key => {
      $$("button", seg).forEach(b => b.classList.toggle("on", b.dataset.k === key));
      const series = Object.entries(ARM).filter(([a]) => PAPER.tts[a]).map(([a, n]) => ({ name: n, color: COLOR[n], dash: n === "AnyFlow init" ? "7 5" : n === "SD3.5-Medium" ? "2 4" : "", points: PAPER.tts[a][key] || [] }));
      Charts.lineChart($("[data-svg]", card), { series, logX: true, xTicks: [4, 8, 16, 32], xLabel: "sampling steps M_step (log scale)", xName: "M_step", yLabel: DIMS.find(d => d[0] === key)[1], legendHost: $("[data-legend]", card), hidden });
    };
    seg.innerHTML = DIMS.map(d => `<button data-k="${d[0]}">${d[1]}</button>`).join("");
    $$("button", seg).forEach(b => b.addEventListener("click", () => draw(b.dataset.k)));
    draw("hpsv3");
  }

  // ---------------------------------------------------------------- players
  function syncGroup(videos, ui) {
    if (!videos.length) return;
    const master = videos[0];
    let playing = true;
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting) && playing) videos.forEach(v => v.play().catch(() => {}));
      else if (!es.some(e => e.isIntersecting)) videos.forEach(v => v.pause());
    }, { threshold: .2 });
    io.observe(master);
    master.addEventListener("timeupdate", () => {
      videos.slice(1).forEach(v => { if (Math.abs(v.currentTime - master.currentTime) > 0.12) v.currentTime = master.currentTime; });
      if (ui && master.duration) { ui.scrub.value = master.currentTime / master.duration * 1000; ui.time.textContent = master.currentTime.toFixed(1) + " s"; }
    });
    if (ui) {
      ui.play.onclick = () => { playing = !playing; videos.forEach(v => playing ? v.play() : v.pause()); ui.play.textContent = playing ? "❚❚ Pause" : "▶ Play"; };
      ui.scrub.oninput = () => { const t = ui.scrub.value / 1000 * (master.duration || 5.06); videos.forEach(v => { v.currentTime = t; }); };
    }
  }
  function videoGrid() {
    const fig = $("#fig-vgrid");
    const chips = $("[data-prompts]", fig), grid = $("[data-grid]", fig);
    const ui = { play: $("[data-play]", fig), scrub: $("[data-scrub]", fig), time: $("[data-time]", fig) };
    const labels = { w_dolphins: "Dolphins", v_butterflies: "Butterflies" };
    const draw = p => {
      $$(".chip", chips).forEach(c => c.classList.toggle("on", c.dataset.p === p));
      const g = MEDIA.video_grid[p];
      grid.innerHTML = ["AnyFlow init", ...ORDER].map(k => `<div class="vcell"><video muted loop playsinline preload="auto" poster="${g[k].poster}" src="${g[k].src}"></video><span class="lab ${k === "AnyFlow init" ? "ref" : RG.has(k) ? "rg" : ""}">${k}</span></div>`).join("");
      $("[data-prompt-text]", fig).textContent = "“" + g._prompt + "” · seed " + g._seed;
      ui.play.textContent = "❚❚ Pause";
      syncGroup($$("video", grid), ui);
    };
    chips.innerHTML = Object.keys(MEDIA.video_grid).map(p => `<button class="chip" data-p="${p}">${labels[p] || p}</button>`).join("");
    $$(".chip", chips).forEach(c => c.addEventListener("click", () => draw(c.dataset.p)));
    draw(Object.keys(MEDIA.video_grid)[0]);
  }
  function beforeAfter() {
    const fig = $("#fig-ba"), ba = $("[data-ba]", fig);
    const NAMES = { "fewstepgrpo_ocr": "FewStepGRPO · it. 200 (released)", "meanflowawm_ocr@300": "MeanFlowAWM · it. 300", "dmdawm_ocr@100": "DMDAWM · it. 100", "meanflownft_ocr@100": "MeanFlowNFT · it. 100", "dmdnft_ocr@100": "DMDNFT · it. 100" };
    const st = { p: 0, m: "meanflownft_ocr@100" };
    const draw = () => {
      const item = MEDIA.ocr_pairs[st.p];
      const [a, b] = $$("img", ba);
      a.src = item.models.anyflow.src; b.src = item.models[st.m].src;
      $("[data-rtag]", ba).textContent = NAMES[st.m].split(" · ")[0];
      $("[data-readout]", fig).innerHTML = `<b>“${item.prompt}”</b> · seed ${item.seed}<br>OCR accuracy: AnyFlow init <b>${item.models.anyflow.ocr.toFixed(2)}</b> → ${NAMES[st.m]} <b>${item.models[st.m].ocr.toFixed(2)}</b>`;
      $$("[data-prompts] .chip", fig).forEach((c, i) => c.classList.toggle("on", i === st.p));
      $$("[data-trainers] .chip", fig).forEach(c => c.classList.toggle("on", c.dataset.m === st.m));
    };
    $("[data-prompts]", fig).innerHTML = MEDIA.ocr_pairs.map((it, i) => `<button class="chip">${["Storefront sign", "Magazine cover", "Book cover", "T-shirt", "Signpost"][i] || "prompt " + (i + 1)}</button>`).join("");
    $$("[data-prompts] .chip", fig).forEach((c, i) => c.addEventListener("click", () => { st.p = i; draw(); }));
    $("[data-trainers]", fig).innerHTML = Object.entries(NAMES).map(([k, v]) => `<button class="chip" data-m="${k}">${v}</button>`).join("");
    $$("[data-trainers] .chip", fig).forEach(c => c.addEventListener("click", () => { st.m = c.dataset.m; draw(); }));
    let drag = false;
    const set = ev => { const r = ba.getBoundingClientRect(); const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); ba.style.setProperty("--cut", (x * 100).toFixed(1) + "%"); };
    ba.addEventListener("pointerdown", ev => { drag = true; set(ev); ba.setPointerCapture(ev.pointerId); });
    ba.addEventListener("pointermove", ev => { if (drag) set(ev); });
    ba.addEventListener("pointerup", () => { drag = false; });
    draw();
  }

  // ---------------------------------------------------------------- decision tree
  function tree() {
    const host = $("#tree");
    const st = {};
    const Q = [
      { k: "diff", q: "Is the reward differentiable with respect to the clean sample?", hint: "Yes for CLIPScore, HPSv2, PickScore, HPSv3. No for OCR accuracy and VideoAlign's MQ / TA.", opts: [["yes", "Yes"], ["no", "No"]] },
      { k: "cheap", q: "Is its gradient affordable — memory and time through the reward model and the decoder?", hint: "It was on 512² images; on 81-frame video latents it needed fp32 reward models and per-frame decoding.", opts: [["yes", "Yes"], ["no", "No"]], when: s => s.diff === "yes" },
    ];
    const RGANS = `<div class="ans rg"><b>Use the reward gradient: ReFL or FewStepOPSD.</b>
      <ul><li>They reach the two highest training rewards on images (1.641, 1.623 vs. 1.461–1.519) and lead on ImageReward and GenEval2. <span class="src rg">Tab. 6(b)</span></li>
      <li>ReFL alone is already a strong baseline, and the cheapest per iteration (219 s). <span class="src rg">§6.6, Tab. 7</span></li>
      <li>Watch held-out scores: both peak on aesthetic and HPSv3 by iteration 100 while the training reward keeps rising. <span class="src rg">§6.3</span></li></ul>
      <p class="small" style="margin:0"><a href="#m-refl">ReFL</a> · <a href="#m-fewstepopsd">FewStepOPSD</a></p></div>`;
    const GAANS = `<div class="ans"><b>Use a group-advantage method — the DiffusionNFT family first.</b>
      <ul><li>MeanFlowNFT and DMDNFT reached high rewards in relatively few iterations in both settings. <span class="src">§6.6</span></li>
      <li>DMD-based variants (v-aux) are faster per iteration on images (304–326 vs. 423–435 s) but slower on video (821 vs. 734–737 s), need memory for \\(v_\\phi\\), and in several runs their larger reward gains coincided with larger held-out degradation. <span class="src">Tab. 7, Tab. 8</span></li>
      <li>FewStepGRPO optimises slowly and had the weakest endpoints; AWM lies in between and limits each update with a PPO-style clip. <span class="src">§6.6</span></li></ul>
      <p class="small" style="margin:0"><a href="#m-meanflownft">MeanFlowNFT</a> · <a href="#m-dmdnft">DMDNFT</a> · <a href="#m-meanflowawm">MeanFlowAWM</a> · <a href="#m-dmdawm">DMDAWM</a> · <a href="#m-fewstepgrpo">FewStepGRPO</a></p></div>`;
    const TTS = `<div class="q"><div class="qt">At test time</div>Sample at the training step count. Aggregate scores show no systematic gain from more steps, though many single samples look cleaner with 2–4× as many; OCR-sensitive prompts can degrade. <span class="src">§6.5</span></div>`;
    const draw = () => {
      let html = "";
      Q.forEach(q => {
        if (q.when && !q.when(st)) return;
        html += `<div class="q"><div class="qt">${q.q}</div><p class="note" style="margin:0 0 10px">${q.hint}</p><div class="opts">${q.opts.map(o => `<button data-k="${q.k}" data-v="${o[0]}" class="${st[q.k] === o[0] ? "on" : ""}">${o[1]}</button>`).join("")}</div></div>`;
      });
      if (st.diff === "no" || st.cheap === "no") html += GAANS + TTS;
      else if (st.diff === "yes" && st.cheap === "yes") html += RGANS + TTS;
      host.innerHTML = html;
      $$("button", host).forEach(b => b.addEventListener("click", () => { st[b.dataset.k] = b.dataset.v; if (b.dataset.k === "diff") delete st.cheap; draw(); }));
      katexRender(host);
    };
    draw();
  }

  // ---------------------------------------------------------------- boot
  async function boot() {
    [PAPER, MEDIA] = await Promise.all([fetch("data/paper.json").then(r => r.json()), fetch("data/media.json").then(r => r.json())]);
    buildMethodPages();
    PAGES = $$(".page").map(p => p.id.slice(2));
    $$(".page").forEach(pager);
    katexRender(document.body);
    buildFilms();
    window.__EXPLAINERS = $$("[data-explainer]").map(el => new Explainer(el));
    $$("img[data-zoom]").forEach(img => img.addEventListener("click", () => openLightbox({ kind: "image", src: img.src })));
    $("#lightbox").addEventListener("click", e => { if (e.target.id === "lightbox" || e.target.classList.contains("close")) closeLightbox(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeLightbox();
      if ($("#lightbox").classList.contains("open") || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const i = PAGES.indexOf((location.hash || "#home").slice(1));
      if (e.key === "ArrowRight" && PAGES[i + 1]) location.hash = "#" + PAGES[i + 1];
      if (e.key === "ArrowLeft" && i > 0) location.hash = "#" + PAGES[i - 1];
    });
    $("#menu-toggle").addEventListener("click", () => document.body.classList.toggle("menu-open"));
    $("#copy-bib").addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText($("#bibtex").textContent); $("#copy-bib").textContent = "Copied ✓"; });
    window.addEventListener("hashchange", route);
    route();
  }
  boot();
})();
