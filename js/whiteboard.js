/* One original MP4, chapter boundaries from the final narration timeline. */
(async function () {
  const root = document.querySelector("[data-whiteboard]");
  if (!root) return;
  const video = root.querySelector("video");
  const nav = root.querySelector("[data-whiteboard-chapters]");
  const status = root.querySelector("[data-chapter-current]");
  const related = root.querySelector("[data-chapter-related]");
  const selectedPlay = root.querySelector("[data-play-chapter]");
  const fullPlay = root.querySelector("[data-play-all]");
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  let data;
  try {
    const response = await fetch("data/whiteboard-chapters.json");
    if (!response.ok) throw new Error("Chapter metadata unavailable");
    data = await response.json();
  } catch (_) {
    status.textContent = "Use the video controls to play the full explanation.";
    selectedPlay.disabled = true;
    fullPlay.onclick = () => video.play().catch(() => {});
    return;
  }
  const chapters = data.chapters;
  let selected = 0, mode = "chapter", boundaryPaused = false;
  const buttons = [];
  for (const group of [...new Set(chapters.map(c => c.group))]) {
    const section = document.createElement("div"); section.className = "whiteboard-chapter-group";
    const heading = document.createElement("h3"); heading.textContent = group; section.append(heading);
    const list = document.createElement("div"); list.className = "whiteboard-chapter-list"; section.append(list);
    chapters.forEach((chapter, index) => {
      if (chapter.group !== group) return;
      const button = document.createElement("button"); button.type = "button"; button.className = "whiteboard-chapter";
      button.dataset.chapter = chapter.id;
      button.setAttribute("aria-label", `${chapter.en}, ${clock(chapter.start)}`);
      const time = document.createElement("span"); time.className = "whiteboard-chapter-time"; time.textContent = clock(chapter.start);
      const labels = document.createElement("span");
      const zh = document.createElement("span"); zh.lang = "zh"; zh.className = "whiteboard-chapter-zh"; zh.textContent = chapter.zh;
      const en = document.createElement("span"); en.className = "whiteboard-chapter-en"; en.textContent = chapter.en;
      labels.append(zh, en); button.append(time, labels); list.append(button); buttons[index] = button;
      button.onclick = () => selectChapter(index, true);
    });
    nav.append(section);
  }
  function update() {
    const chapter = chapters[selected];
    buttons.forEach((b, i) => { if (i === selected) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    status.textContent = `${mode === "all" ? "Playing all · " : "Selected chapter · "}${chapter.zh} / ${chapter.en}`;
    related.href = `#${chapter.related}`;
    selectedPlay.textContent = !video.paused && mode === "chapter" ? "Pause chapter" : "Play selected chapter";
    fullPlay.textContent = !video.paused && mode === "all" ? "Pause playback" : "Play all · 2:34";
  }
  function setTime(time) {
    if (video.readyState) video.currentTime = time;
    else video.addEventListener("loadedmetadata", () => { video.currentTime = time; }, { once: true });
  }
  function play() { video.play().catch(() => { status.textContent = "Press the video play button to begin this chapter."; }); }
  function selectChapter(index, shouldPlay) {
    selected = index; mode = "chapter"; boundaryPaused = false;
    // Browser media clocks round to microseconds; seek just inside the chapter.
    setTime(chapters[index].start + .001);
    if (shouldPlay) play();
    update();
  }
  selectedPlay.onclick = () => {
    if (!video.paused && mode === "chapter") { video.pause(); return; }
    mode = "chapter";
    const chapter = chapters[selected];
    if (boundaryPaused || video.currentTime < chapter.start || video.currentTime >= chapter.end - .04) setTime(chapter.start);
    boundaryPaused = false; play(); update();
  };
  fullPlay.onclick = () => {
    if (!video.paused && mode === "all") { video.pause(); return; }
    mode = "all"; boundaryPaused = false;
    if (video.ended || video.currentTime >= data.duration - .04) setTime(0);
    play(); update();
  };
  function followTime(time) {
    // A previously queued video frame can arrive while a chapter seek is pending.
    if (video.seeking) return;
    if (mode === "chapter" && !video.paused && time >= chapters[selected].end - .025) {
      video.pause(); boundaryPaused = true;
      video.currentTime = Math.max(chapters[selected].start, chapters[selected].end - 1 / 24);
    } else if (mode === "all") {
      const current = chapters.findIndex(c => time >= c.start && time < c.end);
      if (current >= 0 && current !== selected) { selected = current; update(); }
    }
  }
  video.addEventListener("timeupdate", () => followTime(video.currentTime));
  video.addEventListener("seeked", () => {
    if (!boundaryPaused) {
      const current = chapters.findIndex(c => video.currentTime + .0005 >= c.start && video.currentTime + .0005 < c.end);
      if (current >= 0) selected = current;
    }
    update();
  });
  if (video.requestVideoFrameCallback) {
    const tick = () => { followTime(video.currentTime); video.requestVideoFrameCallback(tick); };
    video.requestVideoFrameCallback(tick);
  }
  video.addEventListener("play", () => {
    if (boundaryPaused && mode === "chapter") { boundaryPaused = false; setTime(chapters[selected].start); }
    // Only one narration should play at a time.
    (window.__EXPLAINERS || []).forEach(player => { player.userPaused = true; player.pause(); });
    update();
  });
  video.addEventListener("pause", update);
  video.addEventListener("ended", update);
  video.addEventListener("error", () => { status.textContent = "The video could not load. Use Download MP4 above to open it directly."; });
  nav.addEventListener("keydown", event => {
    const directions = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
    if (!(event.key in directions)) return;
    event.preventDefault(); event.stopPropagation();
    const focused = buttons.indexOf(document.activeElement);
    buttons[Math.max(0, Math.min(buttons.length - 1, focused + directions[event.key]))].focus();
  });
  document.querySelectorAll("[data-watch-chapter]").forEach(link => {
    link.addEventListener("click", () => {
      const index = chapters.findIndex(c => c.id === link.dataset.watchChapter);
      if (index < 0) return;
      selectChapter(index, true);
      requestAnimationFrame(() => root.scrollIntoView({ block: "start", behavior: "smooth" }));
    });
  });
  window.addEventListener("hashchange", () => { if (location.hash && location.hash !== "#home") video.pause(); });
  document.querySelector(".whiteboard-interactive")?.addEventListener("toggle", event => {
    if (event.target.open) video.pause();
  });
  update();
})();

/* The article keeps its interactive SVGs. Place a small unframed presenter over
   the drawing area, scanning around labels rather than covering any text. */
(function () {
  if (!document.body.classList.contains("pixel-whiteboard-site")) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const figures = ["fig-xspace", "fig-forces", "fig-forms"].map(id => document.getElementById(id)).filter(Boolean);
  figures.forEach(fig => {
    const svg = fig.querySelector("svg");
    if (!svg) return;
    const avatar = document.createElement("div"); avatar.className = "whiteboard-figure-presenter"; avatar.setAttribute("aria-hidden", "true"); fig.append(avatar);
    let reactingUntil = 0, lastTap = -1000, scheduled = false;
    const intersects = (a, b) => a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 4 && a.bottom > b.top - 4;
    function position() {
      scheduled = false;
      const plot = svg.getBoundingClientRect(), frame = fig.getBoundingClientRect();
      if (plot.width < 10 || plot.height < 10) { avatar.hidden = true; return; }
      const labels = [...svg.querySelectorAll("text, foreignObject")].map(el => el.getBoundingClientRect()).filter(r => r.width && r.height);
      for (const width of [72, 60, 48, 36]) {
        const height = width * 1.5;
        // The ruler reaches a little left of the body in the tap pose.
        for (let y = plot.bottom - height - 6; y >= plot.top + 6; y -= 9) {
          for (let x = plot.right - width - 6; x >= plot.left + width * .12 + 6; x -= 9) {
            const box = { left: x - width * .12, right: x + width, top: y, bottom: y + height };
            if (labels.some(label => intersects(box, label))) continue;
            Object.assign(avatar.style, { left: `${x - frame.left}px`, top: `${y - frame.top}px`, width: `${width}px`, height: `${height}px` });
            avatar.hidden = false; return;
          }
        }
      }
      avatar.hidden = true;
    }
    const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(position); } };
    new ResizeObserver(schedule).observe(svg);
    new MutationObserver(schedule).observe(svg, { childList: true, subtree: true, characterData: true, attributes: true });
    fig.addEventListener("input", () => { reactingUntil = performance.now() + 1300; schedule(); });
    fig.addEventListener("pointerup", () => { lastTap = performance.now(); reactingUntil = lastTap + 1500; schedule(); });
    window.addEventListener("hashchange", schedule);
    let wasTap = false;
    const animate = () => {
      const now = performance.now();
      if (!avatar.hidden && !reduced) {
        const tap = now - lastTap >= 0 && now - lastTap < 280;
        if (tap) {
          avatar.style.backgroundImage = 'url("assets/presenter/knock.png")'; avatar.style.backgroundSize = "200% 100%"; avatar.style.backgroundPosition = now - lastTap < 100 ? "0% 0%" : "100% 0%";
        } else {
          if (wasTap) { avatar.style.backgroundImage = 'url("assets/presenter/states.png")'; avatar.style.backgroundSize = "400% 200%"; }
          const pose = now < reactingUntil ? (reactingUntil - now > 700 ? 4 : 7) : now % 4700 > 4460 ? 2 : 0;
          avatar.style.backgroundPosition = `${pose % 4 * 100 / 3}% ${Math.floor(pose / 4) * 100}%`;
        }
        wasTap = tap;
      }
      setTimeout(animate, 100);
    };
    position(); if (!reduced) animate();
  });
})();
