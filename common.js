const STORE_KEY = "last-checkin-webarg-v2";
const MAX_STAGE = 40;

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

function setStage(stage) {
  const state = loadGame();
  if (stage > state.stage) {
    state.stage = stage;
    saveGame(state);
  }
  updateWidget();
}

function setFlag(key, value = true) {
  const state = loadGame();
  state.flags[key] = value;
  saveGame(state);
  updateWidget();
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
  setStage(stage);
  document.body.dataset.page = page;
  const isPhonePage = page.startsWith("phone");
  if (!document.querySelector(".game-widget")) {
    const widget = document.createElement("aside");
    widget.className = "game-widget";
    widget.innerHTML = `
      <div class="widget-card">
        <div class="muted mono">调查进度</div>
        <div class="stage-num"><span id="stageNow">00</span> / ${MAX_STAGE}</div>
      </div>
      <div class="widget-card">
        <button class="small-btn" id="noteToggle" type="button">打开笔记</button>
        <button class="small-btn" id="resetGame" type="button">重置</button>
        <ul class="evidence-list" id="evidenceList"></ul>
      </div>
    `;
    document.body.appendChild(widget);
  }
  if (!document.querySelector(".note-panel")) {
    const panel = document.createElement("section");
    panel.className = "note-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="note-head">
        <div>
          <h2>调查笔记</h2>
          <p class="muted">记录关键词、编号、时间、人名、密码。内容自动保存在本机浏览器。</p>
        </div>
        <button class="small-btn" id="noteClose" type="button">收起</button>
      </div>
      <textarea id="noteText" placeholder="记录关键词、编号、时间、人名、密码。
例如：0606 / S04 / B17 / 21:38 / IMP-2202"></textarea>
      <div class="note-actions">
        <span class="muted" id="noteStatus">已自动保存</span>
      </div>
    `;
    document.body.appendChild(panel);
  }

  const state = loadGame();
  const noteText = document.querySelector("#noteText");
  const noteStatus = document.querySelector("#noteStatus");
  noteText.value = state.notes || "";
  noteText.addEventListener("input", (event) => {
    const next = loadGame();
    next.notes = event.target.value;
    saveGame(next);
    if (noteStatus) {
      noteStatus.textContent = "已自动保存";
    }
  });
  document.querySelector("#noteToggle").addEventListener("click", () => {
    const panel = document.querySelector(".note-panel");
    panel.hidden = !panel.hidden;
    document.querySelector("#noteToggle").textContent = panel.hidden ? "打开笔记" : "收起笔记";
    if (!panel.hidden) document.querySelector("#noteText").focus();
  });
  document.querySelector("#noteClose").addEventListener("click", () => {
    document.querySelector(".note-panel").hidden = true;
    document.querySelector("#noteToggle").textContent = "打开笔记";
  });
  document.querySelector("#resetGame").addEventListener("click", () => {
    localStorage.removeItem(STORE_KEY);
    toast("进度已重置。");
    setTimeout(() => location.href = "index.html", 500);
  });
  if (isPhonePage) initPhoneIsland();
  updateWidget();
}

function setMusicState(next) {
  const state = loadGame();
  state.flags.music = { ...(state.flags.music || {}), ...next };
  saveGame(state);
  updatePhoneIsland();
}

function getMusicState() {
  return loadGame().flags.music || { playing: false, track: 0 };
}

function initPhoneIsland() {
  if (document.querySelector(".phone-music-island")) return;
  const island = document.createElement("aside");
  island.className = "phone-music-island";
  island.innerHTML = `
    <button type="button" id="islandOpen">音乐</button>
  `;
  document.body.appendChild(island);
  document.querySelector("#islandOpen").addEventListener("click", () => {
    window.open("phone-music.html", "_blank", "noopener");
  });
  updatePhoneIsland();
}

function updatePhoneIsland() {
  const island = document.querySelector(".phone-music-island");
  if (!island) return;
  const music = getMusicState();
  island.classList.toggle("playing", Boolean(music.playing));
  const open = document.querySelector("#islandOpen");
  if (open) open.textContent = music.playing ? "音乐播放中" : "音乐";
}

function updateWidget() {
  const state = loadGame();
  const stageNow = document.querySelector("#stageNow");
  if (stageNow) stageNow.textContent = String(state.stage).padStart(2, "0");
  const list = document.querySelector("#evidenceList");
  if (list) {
    list.innerHTML = Object.entries(evidenceLabels)
      .map(([key, label]) => `<li class="${state.evidence[key] ? "done" : ""}">${state.evidence[key] ? "已获得" : "未获得"} · ${key} ${label}</li>`)
      .join("");
  }
}
