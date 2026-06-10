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
  scheduleThreatEvents();
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
  updateWidget();
  scheduleThreatEvents();
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

function isSafeFromThreats(state = loadGame()) {
  return Boolean(state.flags.rescuedLinzhou || state.flags.sudokuSecretSolved || state.flags.reportedMysteryMan);
}

function scheduleThreatEvents() {
  if (window.threatEventTimer) clearTimeout(window.threatEventTimer);
  window.threatEventTimer = setTimeout(runThreatEvents, 240);
}

function runThreatEvents() {
  const state = loadGame();
  const page = document.body.dataset.page || "";
  const safe = isSafeFromThreats(state);
  const quietPage = page === "phone-archive";

  if (quietPage) return;

  if (state.stage >= 32 && !state.flags.threatSmsSeen && !safe) {
    markThreatFlag("threatSmsSeen");
    showThreatSmsBarrage();
  }

  if (state.stage >= 36 && !state.flags.threatCallSeen && !safe) {
    markThreatFlag("threatCallSeen");
    showThreatCall();
  }

  if (state.stage >= 40 && !state.flags.knockoutSeen && !safe && page !== "phone-archive") {
    markThreatFlag("knockoutSeen");
    showKnockout();
  }
}

function markThreatFlag(key) {
  const state = loadGame();
  state.flags[key] = true;
  saveGame(state);
  updateWidget();
}

function showThreatSmsBarrage() {
  const messages = [
    "不要再查了。",
    "林舟已经完赛。",
    "删掉你看到的东西。",
    "北桥没有第八个点。",
    "最后警告。"
  ];
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
