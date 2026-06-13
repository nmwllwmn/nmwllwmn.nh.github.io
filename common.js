const STORE_KEY = "last-checkin-webarg-v2";
const NOTE_KEY = "last-checkin-investigation-notes-v1";
const NOTE_BOX_KEY = "last-checkin-investigation-note-box-v1";
const BGM_KEY = "last-checkin-bgm-v2";
const MAX_STAGE = 40;
const BGM_TRACKS = {
  // Pixabay download is Cloudflare-protected in this environment; keep the intended source documented and use Signal to Noise as a playable fallback.
  ambient: {
    title: "Dark Ambient Background Mystery",
    artist: "Lilliben",
    source: "https://pixabay.com/music/ambient-dark-ambient-background-mystery-365195/",
    audio: "https://www.scottbuckley.com.au/library/wp-content/uploads/2020/04/sb_signaltonoise.mp3",
    note: "Fallback playback uses Signal to Noise until the Pixabay MP3 file is available locally."
  },
  truth: {
    title: "Signal to Noise",
    artist: "Scott Buckley",
    source: "https://www.scottbuckley.com.au/library/signal-to-noise/",
    audio: "https://www.scottbuckley.com.au/library/wp-content/uploads/2020/04/sb_signaltonoise.mp3"
  },
  hidden: {
    title: "The Old Ones",
    artist: "Scott Buckley",
    source: "https://www.scottbuckley.com.au/library/the-old-ones/",
    audio: "https://www.scottbuckley.com.au/library/wp-content/uploads/2018/10/sb_theoldones.mp3"
  }
};

const defaultState = {
  stage: 0,
  notes: "",
  evidence: {},
  flags: {}
};

const evidenceLabels = {
  A: "林舟 S05-S07 为 Web Import",
  B: "2023 旧路线含 S08",
  C: "许听雨参加过 2023 试跑",
  D: "21:38 北桥监控异常",
  E: "IMP-2202 由沈泊执行"
};

const clueProgressSteps = [
  { weight: 4, done: (state) => state.flags.phoneUnlocked },
  { weight: 8, done: (state) => state.flags.readLinzhouWechat },
  { weight: 4, done: (state) => state.flags.readTeamDoubt || state.flags.foundImportBatchHint },
  { weight: 4, done: (state) => state.flags.readThreatSms },
  { weight: 6, done: (state) => state.flags.albumLockOpened },
  { weight: 12, done: (state) => state.evidence.A },
  { weight: 12, done: (state) => state.evidence.B },
  { weight: 12, done: (state) => state.evidence.C },
  { weight: 6, done: (state) => state.flags.phoneMailLoggedIn },
  { weight: 6, done: (state) => state.flags.foundNvrLogin },
  { weight: 12, done: (state) => state.evidence.D || state.flags.foundImp2202 },
  { weight: 14, done: (state) => state.evidence.E || state.flags.foundShenbo }
];

function loadGame() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {
    return { ...defaultState };
  }
}

function saveGame(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function loadNotebook() {
  const saved = localStorage.getItem(NOTE_KEY);
  if (saved !== null) return saved;
  const legacyNotes = loadGame().notes || "";
  if (legacyNotes) localStorage.setItem(NOTE_KEY, legacyNotes);
  return legacyNotes;
}

function saveNotebook(value) {
  localStorage.setItem(NOTE_KEY, value);
  const state = loadGame();
  state.notes = value;
  saveGame(state);
}

function loadNotebookBox() {
  try {
    return JSON.parse(localStorage.getItem(NOTE_BOX_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function saveNotebookBox(box) {
  localStorage.setItem(NOTE_BOX_KEY, JSON.stringify(box));
}

function clampNotebookRect(rect) {
  const minWidth = 280;
  const minHeight = 320;
  const maxWidth = Math.max(minWidth, window.innerWidth - 24);
  const maxHeight = Math.max(minHeight, window.innerHeight - 24);
  const width = Math.min(Math.max(rect.width || 420, minWidth), maxWidth);
  const height = Math.min(Math.max(rect.height || 440, minHeight), maxHeight);
  const left = Math.min(Math.max(rect.left ?? window.innerWidth - width - 14, 12), window.innerWidth - width - 12);
  const top = Math.min(Math.max(rect.top ?? 72, 12), window.innerHeight - height - 12);
  return { left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) };
}

function clampNotebookToggle(pos) {
  const size = 52;
  const left = Math.min(Math.max(pos.left ?? window.innerWidth - size - 22, 8), window.innerWidth - size - 8);
  const top = Math.min(Math.max(pos.top ?? window.innerHeight - size - 22, 8), window.innerHeight - size - 8);
  return { left: Math.round(left), top: Math.round(top) };
}

function snapNotebookToggle(pos) {
  const size = 52;
  const clamped = clampNotebookToggle(pos);
  const distances = [
    { edge: "left", value: clamped.left - 8 },
    { edge: "right", value: window.innerWidth - (clamped.left + size) - 8 },
    { edge: "top", value: clamped.top - 8 },
    { edge: "bottom", value: window.innerHeight - (clamped.top + size) - 8 }
  ];
  const nearest = distances.reduce((best, item) => item.value < best.value ? item : best, distances[0]);
  if (nearest.edge === "left") return { left: 8, top: clamped.top };
  if (nearest.edge === "right") return { left: window.innerWidth - size - 8, top: clamped.top };
  if (nearest.edge === "top") return { left: clamped.left, top: 8 };
  return { left: clamped.left, top: window.innerHeight - size - 8 };
}

function getNotebookPanelNearToggle(toggle, panel) {
  const saved = loadNotebookBox();
  const current = saved.panel || saved;
  const width = Math.min(Math.max(current.width || 420, 280), Math.max(280, window.innerWidth - 24));
  const height = Math.min(Math.max(current.height || 440, 320), Math.max(320, window.innerHeight - 24));
  const toggleRect = toggle.getBoundingClientRect();
  const gap = 12;
  const candidates = [
    { left: toggleRect.right + gap, top: toggleRect.top + toggleRect.height / 2 - height / 2 },
    { left: toggleRect.left - width - gap, top: toggleRect.top + toggleRect.height / 2 - height / 2 },
    { left: toggleRect.left + toggleRect.width / 2 - width / 2, top: toggleRect.bottom + gap },
    { left: toggleRect.left + toggleRect.width / 2 - width / 2, top: toggleRect.top - height - gap }
  ].map((rect) => clampNotebookRect({ ...rect, width, height }));
  const toggleCenter = { x: toggleRect.left + toggleRect.width / 2, y: toggleRect.top + toggleRect.height / 2 };
  const score = (rect) => {
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    return Math.abs(center.x - toggleCenter.x) + Math.abs(center.y - toggleCenter.y);
  };
  const viewportCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const edgePreference = Math.abs(toggleCenter.x - viewportCenter.x) > Math.abs(toggleCenter.y - viewportCenter.y)
    ? (toggleCenter.x < viewportCenter.x ? 0 : 1)
    : (toggleCenter.y < viewportCenter.y ? 2 : 3);
  return candidates[edgePreference] || candidates.sort((a, b) => score(a) - score(b))[0];
}

function restartExploration(options = {}) {
  const { keepNotebook = true } = options;
  localStorage.removeItem(STORE_KEY);
  if (!keepNotebook) localStorage.removeItem(NOTE_KEY);
  location.href = "index.html";
}

function setStage(stage) {
  const state = loadGame();
  if (stage > state.stage) {
    state.stage = stage;
    saveGame(state);
  }
  updateWidget();
  scheduleThreatEvents();
}

function getRemainingBattery(state = loadGame()) {
  const evidence = state.evidence || {};
  const flags = state.flags || {};
  const coreComplete = Boolean(evidence.A && evidence.B && evidence.C && evidence.D && evidence.E);
  if (coreComplete) return 0;
  const safeState = { ...state, evidence, flags };
  const progress = clueProgressSteps.reduce((total, step) => total + (step.done(safeState) ? step.weight : 0), 0);
  return Math.max(1, 100 - Math.min(99, progress));
}

function setFlag(key, value = true) {
  const state = loadGame();
  state.flags[key] = value;
  saveGame(state);
  updateWidget();
  scheduleThreatEvents();
}

function hasFlag(key) {
  return Boolean(loadGame().flags[key]);
}

function addEvidence(key) {
  const state = loadGame();
  state.evidence[key] = true;
  saveGame(state);
  updateWidget();
}

function hasEvidence(key) {
  return Boolean(loadGame().evidence[key]);
}

function toast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const box = document.createElement("div");
  box.className = "toast";
  box.textContent = message;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function initGameShell(options = {}) {
  const { stage = 0, page = "" } = options;
  document.body.dataset.page = page;
  setStage(stage);
  ensurePhoneBattery(page);
  initNotebook();
  initBgm(page);
  if (!document.querySelector(".game-widget")) {
    const widget = document.createElement("aside");
    widget.className = "game-widget";
    widget.innerHTML = `
      <div class="widget-card">
        <div class="muted mono">调查进度</div>
        <div class="stage-num"><span id="stageNow">00</span> / ${MAX_STAGE}</div>
      </div>
      <div class="widget-card">
        <button class="small-btn" id="resetGame" type="button">重置</button>
        <ul class="evidence-list" id="evidenceList"></ul>
      </div>
    `;
    document.body.appendChild(widget);
  }
  document.querySelector("#resetGame").addEventListener("click", () => {
    localStorage.removeItem(STORE_KEY);
    toast("进度已重置，调查笔记已保留。");
    setTimeout(() => location.href = "index.html", 500);
  });
  updateWidget();
  scheduleThreatEvents();
}

function loadBgmState() {
  try {
    return { enabled: true, volume: 0.62, ...JSON.parse(localStorage.getItem(BGM_KEY) || "{}") };
  } catch {
    return { enabled: true, volume: 0.62 };
  }
}

function saveBgmState(state) {
  localStorage.setItem(BGM_KEY, JSON.stringify(state));
}

function getBgmMood(page) {
  const params = new URLSearchParams(location.search);
  const site = params.get("site") || "";
  const view = params.get("view") || "";
  const place = params.get("place") || "";
  const endingType = params.get("type") || "";
  if (page === "phone-ending" && endingType === "rescue") return "hidden";
  if (page === "phone-ending" || page === "phone-archive") return "truth";
  if (page === "phone-browser" && ["guard", "nvr"].includes(site)) return "hidden";
  if (page === "phone-browser" && ["oldinfo", "archive"].includes(site)) return "truth";
  if (page === "phone-gallery" && ["grid", "photo", "full"].includes(view)) return "hidden";
  if (page === "phone-map" && ["b17", "pump", "imp-2202"].includes(place.toLowerCase())) return "hidden";
  return "ambient";
}

function initBgm(page) {
  if (document.querySelector("#bgmAudio")) return;
  const mood = getBgmMood(page);
  const track = BGM_TRACKS[mood] || BGM_TRACKS.ambient;
  const state = loadBgmState();
  const audio = document.createElement("audio");
  audio.id = "bgmAudio";
  audio.loop = true;
  audio.preload = "none";
  audio.volume = state.volume;
  audio.src = track.audio;
  audio.dataset.mood = mood;
  audio.dataset.title = track.title;
  audio.dataset.artist = track.artist;

  const toggle = document.createElement("button");
  toggle.className = "bgm-toggle";
  toggle.id = "bgmToggle";
  toggle.type = "button";
  toggle.innerHTML = `<span>BGM</span><strong>${state.enabled ? "ON" : "OFF"}</strong>`;
  toggle.title = `${track.title} - ${track.artist}`;

  document.body.appendChild(audio);
  document.body.appendChild(toggle);

  const setVisual = (enabled) => {
    toggle.classList.toggle("active", enabled);
    toggle.querySelector("strong").textContent = enabled ? "ON" : "OFF";
  };
  const tryPlay = async () => {
    if (!loadBgmState().enabled) return;
    setVisual(true);
    startBgmSynth(mood);
    try {
      audio.volume = loadBgmState().volume;
      await audio.play();
      if (!loadBgmState().enabled) return;
      setVisual(true);
    } catch {
      if (!loadBgmState().enabled) return;
      startBgmSynth(mood);
      setVisual(true);
    }
  };
  const enableOnGesture = (event) => {
    if (event?.target?.closest?.("#bgmToggle")) return;
    if (!loadBgmState().enabled) return;
    tryPlay();
  };

  setVisual(state.enabled);
  if (state.enabled) {
    tryPlay();
    document.addEventListener("pointerdown", enableOnGesture, { once: true });
    document.addEventListener("keydown", enableOnGesture, { once: true });
    document.addEventListener("touchstart", enableOnGesture, { once: true });
  }

  toggle.addEventListener("click", async () => {
    const current = loadBgmState();
    const next = { ...current, enabled: !current.enabled };
    saveBgmState(next);
    if (next.enabled) {
      setVisual(true);
      await tryPlay();
      if (audio.paused) toast("BGM 需要再次点击页面后播放。");
    } else {
      audio.pause();
      stopBgmSynth();
      setVisual(false);
    }
  });
  audio.addEventListener("error", () => {
    if (!loadBgmState().enabled) return;
    startBgmSynth(mood);
    setVisual(true);
  });
  audio.addEventListener("playing", () => {
    if (!loadBgmState().enabled) return;
    startBgmSynth(mood);
  });
}

function startBgmSynth(mood = "ambient") {
  if (window.__bgmSynth?.mood === mood && window.__bgmSynth?.context?.state === "running") return;
  stopBgmSynth();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const master = context.createGain();
  const lowpass = context.createBiquadFilter();
  const lowShelf = context.createBiquadFilter();
  const volume = loadBgmState().volume;
  const settings = {
    ambient: { notes: [110, 164.8, 220, 329.6], drift: 0.045, filter: 1450, gain: volume * 0.22, noise: 0.2 },
    truth: { notes: [82.4, 123.5, 196, 247], drift: 0.035, filter: 1180, gain: volume * 0.2, noise: 0.16 },
    hidden: { notes: [73.4, 98, 146.8, 220], drift: 0.055, filter: 920, gain: volume * 0.24, noise: 0.24 }
  }[mood] || { notes: [110, 164.8, 220, 329.6], drift: 0.045, filter: 1300, gain: volume * 0.2, noise: 0.18 };

  master.gain.value = settings.gain;
  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = 180;
  lowShelf.gain.value = 4;
  lowpass.type = "lowpass";
  lowpass.frequency.value = settings.filter;
  lowpass.Q.value = 1.1;
  lowpass.connect(lowShelf);
  lowShelf.connect(master);
  master.connect(context.destination);

  const oscillators = settings.notes.map((frequency, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = index < 2 ? "sine" : "triangle";
    osc.frequency.value = frequency;
    gain.gain.value = [0.34, 0.18, 0.12, 0.08][index] || 0.06;
    osc.connect(gain);
    gain.connect(lowpass);
    osc.start();
    return { osc, gain };
  });

  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.16;
  }
  const noise = context.createBufferSource();
  const noiseGain = context.createGain();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  noiseGain.gain.value = settings.noise;
  noise.connect(noiseGain);
  noiseGain.connect(lowpass);
  noise.start();

  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.type = "sine";
  lfo.frequency.value = settings.drift;
  lfoGain.gain.value = mood === "hidden" ? 120 : 80;
  lfo.connect(lfoGain);
  lfoGain.connect(lowpass.frequency);
  lfo.start();

  const cue = context.createOscillator();
  const cueGain = context.createGain();
  cue.type = "sine";
  cue.frequency.setValueAtTime(mood === "hidden" ? 392 : 523.25, context.currentTime);
  cue.frequency.exponentialRampToValueAtTime(mood === "hidden" ? 196 : 261.63, context.currentTime + 0.18);
  cueGain.gain.setValueAtTime(0.0001, context.currentTime);
  cueGain.gain.exponentialRampToValueAtTime(volume * 0.12, context.currentTime + 0.03);
  cueGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
  cue.connect(cueGain);
  cueGain.connect(master);
  cue.start();
  cue.stop(context.currentTime + 0.32);

  context.resume();
  window.__bgmSynth = { context, mood, oscillators, noise, lfo, cue };
}

function stopBgmSynth() {
  const synth = window.__bgmSynth;
  if (!synth) return;
  [...(synth.oscillators || []).map((item) => item.osc), synth.noise, synth.lfo].forEach((node) => {
    try {
      node.stop();
      node.disconnect();
    } catch {}
  });
  try {
    synth.context.close();
  } catch {}
  window.__bgmSynth = null;
}

function initNotebook() {
  if (!document.querySelector(".notebook-toggle")) {
    const toggle = document.createElement("button");
    toggle.className = "notebook-toggle";
    toggle.id = "notebookToggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "notebookPanel");
    toggle.innerHTML = `<span>记</span><strong>调查笔记</strong>`;
    document.body.appendChild(toggle);
  }

  if (!document.querySelector(".notebook-panel")) {
    const panel = document.createElement("section");
    panel.className = "notebook-panel";
    panel.id = "notebookPanel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="notebook-head">
        <div>
          <h2>调查笔记</h2>
          <p class="muted">记录你觉得不对劲的碎片。内容自动保存在本机浏览器。</p>
        </div>
        <button class="small-btn" id="notebookClose" type="button">收起</button>
      </div>
      <section class="notebook-clues" aria-label="已记录线索">
        <h3>已记录线索</h3>
        <ul id="notebookEvidenceList"></ul>
      </section>
      <textarea id="notebookText" spellcheck="false" placeholder="时间、人名、编号、异常页面，都可以先记下来。"></textarea>
      <div class="notebook-actions">
        <span class="muted" id="notebookStatus">已自动保存</span>
        <button class="small-btn" id="notebookCopy" type="button">复制全部</button>
        <button class="small-btn danger" id="notebookClear" type="button">清空</button>
      </div>
      <div class="notebook-restart">
        <button class="small-btn danger" id="notebookRestart" type="button">重新开始探索</button>
      </div>
      <span class="notebook-resize-handle nw" data-corner="nw" aria-hidden="true"></span>
      <span class="notebook-resize-handle ne" data-corner="ne" aria-hidden="true"></span>
      <span class="notebook-resize-handle sw" data-corner="sw" aria-hidden="true"></span>
      <span class="notebook-resize-handle se" data-corner="se" aria-hidden="true"></span>
    `;
    document.body.appendChild(panel);
  }

  const toggle = document.querySelector("#notebookToggle");
  const panel = document.querySelector("#notebookPanel");
  const text = document.querySelector("#notebookText");
  const status = document.querySelector("#notebookStatus");
  const saveCurrentPanelBox = () => {
    const rect = panel.getBoundingClientRect();
    const saved = loadNotebookBox();
    saveNotebookBox({
      ...saved,
      panel: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    });
  };
  const applyToggleBox = () => {
    const saved = loadNotebookBox();
    const isPhonePage = (document.body.dataset.page || "").startsWith("phone");
    const phoneDefault = { left: 8, top: window.innerHeight - 74 };
    const pos = clampNotebookToggle(isPhonePage ? phoneDefault : (saved.toggle || {}));
    toggle.style.left = `${pos.left}px`;
    toggle.style.top = `${pos.top}px`;
    toggle.style.right = "auto";
    toggle.style.bottom = "auto";
  };
  const applyNotebookBox = () => {
    const saved = loadNotebookBox();
    const legacy = saved.panel || saved;
    const rect = clampNotebookRect(legacy);
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${rect.width}px`;
    panel.style.height = `${rect.height}px`;
  };
  const placePanelNearToggle = () => {
    const rect = getNotebookPanelNearToggle(toggle, panel);
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${rect.width}px`;
    panel.style.height = `${rect.height}px`;
    const saved = loadNotebookBox();
    saveNotebookBox({ ...saved, panel: rect });
  };
  applyToggleBox();
  applyNotebookBox();
  const setOpen = (open) => {
    if (open) placePanelNearToggle();
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.classList.toggle("active", open);
    if (open) text.focus();
  };

  text.value = loadNotebook();
  text.addEventListener("input", (event) => {
    saveNotebook(event.target.value);
    status.textContent = "已自动保存";
  });

  let toggleDragged = false;
  let suppressToggleClick = false;
  toggle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    toggleDragged = false;
    toggle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = toggle.getBoundingClientRect();
    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) toggleDragged = true;
      if (!toggleDragged) return;
      const pos = clampNotebookToggle({ left: startRect.left + dx, top: startRect.top + dy });
      toggle.style.left = `${pos.left}px`;
      toggle.style.top = `${pos.top}px`;
      toggle.style.right = "auto";
      toggle.style.bottom = "auto";
    };
    const onEnd = () => {
      toggle.removeEventListener("pointermove", onMove);
      toggle.removeEventListener("pointerup", onEnd);
      toggle.removeEventListener("pointercancel", onEnd);
      if (toggleDragged) {
        const rect = toggle.getBoundingClientRect();
        const snapped = snapNotebookToggle({ left: rect.left, top: rect.top });
        toggle.style.left = `${snapped.left}px`;
        toggle.style.top = `${snapped.top}px`;
        toggle.style.right = "auto";
        toggle.style.bottom = "auto";
        const saved = loadNotebookBox();
        saveNotebookBox({ ...saved, toggle: snapped });
        suppressToggleClick = true;
        setTimeout(() => {
          suppressToggleClick = false;
        }, 250);
      }
    };
    toggle.addEventListener("pointermove", onMove);
    toggle.addEventListener("pointerup", onEnd);
    toggle.addEventListener("pointercancel", onEnd);
  });
  toggle.addEventListener("click", () => {
    if (suppressToggleClick) {
      return;
    }
    setOpen(panel.hidden);
  });
  document.querySelector("#notebookClose").addEventListener("click", () => setOpen(false));
  document.querySelector("#notebookCopy").addEventListener("click", async () => {
    const value = text.value;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      text.focus();
      text.select();
      document.execCommand("copy");
    }
    status.textContent = "已复制";
  });
  document.querySelector("#notebookClear").addEventListener("click", () => {
    if (!text.value || !confirm("确定清空调查笔记？")) return;
    text.value = "";
    saveNotebook("");
    status.textContent = "已清空";
    text.focus();
  });
  document.querySelector("#notebookRestart").addEventListener("click", () => {
    if (!confirm("确定重新开始探索？调查进度会清空，调查笔记会保留。")) return;
    restartExploration({ keepNotebook: true });
  });
  panel.querySelectorAll(".notebook-resize-handle").forEach((resizeHandle) => {
    resizeHandle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      resizeHandle.setPointerCapture(event.pointerId);
      const corner = resizeHandle.dataset.corner || "se";
      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = panel.getBoundingClientRect();
      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const next = {
          left: startRect.left,
          top: startRect.top,
          width: startRect.width,
          height: startRect.height
        };
        if (corner.includes("e")) next.width = startRect.width + dx;
        if (corner.includes("s")) next.height = startRect.height + dy;
        if (corner.includes("w")) {
          next.left = startRect.left + dx;
          next.width = startRect.width - dx;
        }
        if (corner.includes("n")) {
          next.top = startRect.top + dy;
          next.height = startRect.height - dy;
        }
        const rect = clampNotebookRect(next);
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
        panel.style.width = `${rect.width}px`;
        panel.style.height = `${rect.height}px`;
      };
      const onEnd = () => {
        resizeHandle.removeEventListener("pointermove", onMove);
        resizeHandle.removeEventListener("pointerup", onEnd);
        resizeHandle.removeEventListener("pointercancel", onEnd);
        saveCurrentPanelBox();
      };
      resizeHandle.addEventListener("pointermove", onMove);
      resizeHandle.addEventListener("pointerup", onEnd);
      resizeHandle.addEventListener("pointercancel", onEnd);
    });
  });
  if (window.ResizeObserver) {
    let resizeTimer = 0;
    const observer = new ResizeObserver(() => {
      if (panel.hidden) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        saveCurrentPanelBox();
      }, 120);
    });
    observer.observe(panel);
  }
  window.addEventListener("resize", () => {
    applyToggleBox();
    applyNotebookBox();
  });
}

function updateWidget() {
  const state = loadGame();
  const stageNow = document.querySelector("#stageNow");
  if (stageNow) stageNow.textContent = String(state.stage).padStart(2, "0");
  const battery = getRemainingBattery(state);
  document.querySelectorAll("[data-phone-battery]").forEach((el) => {
    el.textContent = `${battery}%`;
  });
  document.querySelectorAll("[data-phone-battery-bar]").forEach((el) => {
    el.style.setProperty("--battery", `${battery}%`);
    el.classList.toggle("low", battery <= 18);
  });
  const list = document.querySelector("#evidenceList");
  const notebookList = document.querySelector("#notebookEvidenceList");
  const evidenceHtml = Object.entries(evidenceLabels)
    .map(([key, label]) => `<li class="${state.evidence[key] ? "done" : ""}">${state.evidence[key] ? "已获得" : "未获得"} · ${key} ${label}</li>`)
    .join("");
  if (list) {
    list.innerHTML = evidenceHtml;
  }
  if (notebookList) {
    notebookList.innerHTML = evidenceHtml;
  }
}

function updatePhoneSystemBars() {
  const now = new Date();
  const time = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  document.querySelectorAll("[data-phone-system-time]").forEach((el) => {
    el.textContent = time;
  });
}

function ensurePhoneBattery(page) {
  if (!page || !page.startsWith("phone")) return;
  const screen = document.querySelector(".mi-screen:not(.lock-screen):not(.home-screen)");
  if (screen && !screen.querySelector(".phone-system-bar")) {
    const bar = document.createElement("div");
    bar.className = "phone-system-bar";
    bar.innerHTML = `
      <span data-phone-system-time>--:--</span>
      <span class="phone-system-right">5G <i class="status-battery" data-phone-battery-bar></i><span data-phone-battery>100%</span></span>
    `;
    screen.prepend(bar);
  }
  updatePhoneSystemBars();
  if (!window.phoneSystemClockTimer) {
    window.phoneSystemClockTimer = setInterval(updatePhoneSystemBars, 30000);
  }
  updateWidget();
}

function isSafeFromThreats(state = loadGame()) {
  return Boolean(state.flags.rescuedLinzhou || state.flags.albumPhotoReported || state.flags.reportedMysteryMan);
}

function getThreatLevel(state = loadGame()) {
  if (isSafeFromThreats(state)) return "";
  const battery = getRemainingBattery(state);
  if (battery <= 8) return "final";
  if (battery <= 18) return "late";
  if (battery <= 30) return "early";
  return "";
}

function getThreatMessages(level = getThreatLevel()) {
  const groups = {
    early: [
      "别再查北桥。",
      "林舟已经完赛。",
      "你手机快没电了。"
    ],
    late: [
      "删掉你看到的东西。",
      "北桥没有第八个点。",
      "不要打开备份记录。",
      "最后警告。"
    ],
    final: [
      "停下。",
      "你已经越界了。",
      "别来北桥。",
      "最后一次警告。",
      "手机会自己关机。"
    ]
  };
  if (level === "final") return [...groups.early, ...groups.late, ...groups.final];
  if (level === "late") return [...groups.early, ...groups.late];
  if (level === "early") return groups.early;
  return [];
}

function scheduleThreatEvents() {
  if (window.threatEventTimer) clearTimeout(window.threatEventTimer);
  window.threatEventTimer = setTimeout(runThreatEvents, 240);
}

function runThreatEvents() {
  const state = loadGame();
  const page = document.body.dataset.page || "";
  const threatPage = page === "phone";
  const level = getThreatLevel(state);

  if (!threatPage) return;

  if ((level === "early" || level === "late" || level === "final") && !state.flags.threatSmsSeen) {
    markThreatFlag("threatSmsSeen");
    showThreatSmsBarrage("early");
  }

  if ((level === "late" || level === "final") && !state.flags.threatCallSeen) {
    markThreatFlag("threatCallSeen");
    showThreatSmsBarrage("late");
    showThreatCall();
  }

  if (level === "final" && !state.flags.knockoutSeen && page === "phone") {
    markThreatFlag("knockoutSeen");
    showThreatSmsBarrage("final");
    showKnockout();
  }
}

function markThreatFlag(key) {
  const state = loadGame();
  state.flags[key] = true;
  saveGame(state);
  updateWidget();
}

function showThreatSmsBarrage(level = "early") {
  const all = getThreatMessages(level);
  const messages = level === "early" ? all : all.slice(-4);
  const wrap = document.createElement("div");
  wrap.className = "threat-barrage";
  document.body.appendChild(wrap);
  messages.forEach((message, index) => {
    setTimeout(() => {
      const item = document.createElement("article");
      item.className = "threat-sms";
      item.innerHTML = `<strong>未知号码</strong><p>${message}</p>`;
      wrap.appendChild(item);
      setTimeout(() => item.classList.add("show"), 20);
      setTimeout(() => item.remove(), 6400);
    }, index * 620);
  });
  setTimeout(() => wrap.remove(), 8600);
}

function showThreatCall() {
  const old = document.querySelector(".threat-call");
  if (old) old.remove();
  const modal = document.createElement("section");
  modal.className = "threat-call";
  modal.innerHTML = `
    <div class="threat-call-card">
      <div class="threat-call-avatar">?</div>
      <p>未知号码</p>
      <strong>正在呼叫...</strong>
      <span>139****7777</span>
      <div class="threat-call-actions">
        <button class="decline" type="button">挂断</button>
        <button class="accept" type="button">接听</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".decline").addEventListener("click", () => {
    modal.querySelector("strong").textContent = "又打来了。";
    modal.classList.remove("shake");
    void modal.offsetWidth;
    modal.classList.add("shake");
  });
  modal.querySelector(".accept").addEventListener("click", () => {
    modal.querySelector("strong").textContent = "别来北桥。";
    modal.querySelector("span").textContent = "通话已中断";
    setTimeout(() => modal.remove(), 1800);
  });
  setTimeout(() => {
    if (document.body.contains(modal)) modal.remove();
  }, 12000);
}

function showKnockout() {
  const old = document.querySelector(".knockout-screen");
  if (old) old.remove();
  const overlay = document.createElement("section");
  overlay.className = "knockout-screen";
  overlay.innerHTML = `
    <div>
      <p>身后有脚步声。</p>
      <p>手机从手里滑了下去。</p>
      <strong>最后一次签到：S08</strong>
    </div>
  `;
  document.body.appendChild(overlay);
}
