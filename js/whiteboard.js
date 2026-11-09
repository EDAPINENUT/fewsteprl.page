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
    const response = await fetch("data/whiteboard-chapters.json?v=english-kurisu-v3");
    if (!response.ok) throw new Error("Chapter metadata unavailable");
    data = await response.json();
  } catch (_) {
    status.textContent = "Use the video controls to play the full explanation.";
    selectedPlay.disabled = true;
    fullPlay.onclick = () => video.play().catch(() => {});
    return;
  }
  const chapters = data.chapters;
  const durationLabel = clock(Math.round(data.duration));
  root.querySelector("[data-whiteboard-duration]").textContent = `ANIMATED WHITEBOARD · ${durationLabel}`;
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
      labels.className = "whiteboard-chapter-label"; labels.textContent = chapter.en;
      button.append(time, labels); list.append(button); buttons[index] = button;
      button.onclick = () => selectChapter(index, true);
    });
    nav.append(section);
  }
  function update() {
    const chapter = chapters[selected];
    buttons.forEach((b, i) => { if (i === selected) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    status.textContent = `${mode === "all" ? "Playing all · " : "Selected chapter · "}${chapter.en}`;
    related.href = `#${chapter.related}`;
    selectedPlay.textContent = !video.paused && mode === "chapter" ? "Pause chapter" : "Play selected chapter";
    fullPlay.textContent = !video.paused && mode === "all" ? "Pause playback" : `Play all · ${durationLabel}`;
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
