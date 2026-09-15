const API_BASE = "";

const LEGEND_ZH = {
  "Ballistic": "彈道", "Bangalore": "邦加羅爾", "Catalyst": "摧化姬", "Conduit": "導管",
  "Crypto": "暗碼士", "Fuse": "轟哥", "Horizon": "天際線", "Lifeline": "生命線",
  "Loba": "羅芭", "Mad Maggie": "瘋狂瑪吉", "Mirage": "幻象", "Newcastle": "紐卡索",
  "Octane": "辛烷", "Revenant": "亡靈", "Bloodhound": "尋血犬", "Seer": "席爾",
  "Gibraltar": "直布羅陀", "Pathfinder": "探路者", "Wraith": "惡靈", "Caustic": "腐蝕",
  "Wattson": "華森", "Rampart": "蕾帕特", "Valkyrie": "瓦爾基里", "Ash": "艾許",
  "Vantage": "萬塔捷", "Alter": "變幻", "Sparrow": "雀影", "Axle": "艾瑟兒",
};
function legendZh(name) {
  return LEGEND_ZH[name] || name;
}

// true if `owned` contains every legend in LEGEND_ZH (order/duplicates don't matter)
function ownsAllLegends(owned) {
  const ownedSet = new Set(owned || []);
  return Object.keys(LEGEND_ZH).every((l) => ownedSet.has(l));
}

function ownedLegendsChipsHtml(owned) {
  const list = owned || [];
  if (!list.length) return `<span class="muted">尚無資料</span>`;
  if (ownsAllLegends(list)) return `<span class="chip">全部</span>`;
  return list.map((l) => `<span class="chip">${escapeHtml(legendZh(l))}</span>`).join("");
}

// Legend filter grid: 28 legends grouped into 5 classes, rendered in paired rows
// (assault+skirmisher / recon+support+controller). Order within each class
// confirmed against the user's reference image — do not re-derive it.
const LEGEND_CLASSES = [
  { key: "assault", label: "ASSAULT", legends: ["Bangalore", "Revenant", "Fuse", "Mad Maggie", "Ballistic"] },
  { key: "skirmisher", label: "SKIRMISHER", legends: ["Pathfinder", "Wraith", "Octane", "Horizon", "Ash", "Alter", "Axle"] },
  { key: "recon", label: "RECON", legends: ["Bloodhound", "Crypto", "Valkyrie", "Seer", "Vantage", "Sparrow"] },
  { key: "support", label: "SUPPORT", legends: ["Gibraltar", "Lifeline", "Mirage", "Loba", "Newcastle", "Conduit"] },
  { key: "controller", label: "CONTROLLER", legends: ["Caustic", "Wattson", "Rampart", "Catalyst"] },
];

// Local legend portrait images (backend serves apex_char_img/ at /legend-img/).
// Filenames are `apex-grid-tile-legends-{Name}.jpg`, PascalCase, except two
// naming exceptions in the actual files: "Mad Maggie" has no space in its
// filename, and "sparrow" is lowercase.
const LEGEND_IMG_FILENAME = {
  "Mad Maggie": "MadMaggie",
  "Sparrow": "sparrow",
};
function legendIconUrl(name) {
  const filenamePart = LEGEND_IMG_FILENAME[name] || name;
  return `/legend-img/apex-grid-tile-legends-${encodeURIComponent(filenamePart)}.jpg`;
}

// small inline line-icon per class, following the same inline-SVG pattern used
// elsewhere in this file (pencil/trash icons on the overview table)
const LEGEND_CLASS_ICON_SVG = {
  assault:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-3 4-3 8a3 3 0 1 0 6 0c0-1.2-.6-2-1.2-2.7.3 1.7-.8 2.7-1.8 2.7-1.4 0-2-1.3-1-2.6C12 6 12.5 4 12 2z"></path></svg>',
  controller:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"></path></svg>',
  skirmisher:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 10 12 4 18"></polyline><polyline points="12 6 18 12 12 18"></polyline></svg>',
  recon:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="6" height="10" rx="3"></rect><rect x="15" y="9" width="6" height="10" rx="3"></rect><path d="M9 12h6"></path><path d="M7 9V7a2 2 0 0 1 2-2h1"></path><path d="M17 9V7a2 2 0 0 0-2-2h-1"></path></svg>',
  support:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>',
};

const state = {
  accounts: [],
  overviewOpen: false,
  overviewPage: 0,
  overviewPageSize: 5,
  sortBy: "level",
  sortDir: "desc",
  sortPage: 0,
  sortPageSize: 5,
  searchQuery: "",
  searchDir: "desc",
  searchPage: 0,
  searchPageSize: 5,
  selectedLegends: new Set(),
  editingAccountId: null,
  detailAccountId: null,
};

// ---------- API helpers ----------

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

async function loadAccounts() {
  state.accounts = await apiGet("/accounts");
}

// ---------- Carousel swap animation ----------

function swapCarousel(containerEl, content, axis = "x", direction = 1) {
  const old = containerEl.querySelector(".carousel-set.current");
  const isNode = content instanceof Node;
  const fill = (el) => {
    if (isNode) {
      el.innerHTML = "";
      el.appendChild(content);
    } else {
      el.innerHTML = content;
    }
  };

  if (!old) {
    const wrap = document.createElement("div");
    wrap.className = "carousel-set current";
    fill(wrap);
    containerEl.innerHTML = "";
    containerEl.appendChild(wrap);
    return;
  }

  // Lock both dimensions to their current rendered size before the swap.
  // While old/next are position:absolute (see .carousel-set.leaving/incoming
  // in styles.css), neither contributes to the container's content-based
  // sizing — and since ancestor .panel flex items have no min-width:0
  // override, their width collapses to non-table content (e.g. just the
  // header row) for the whole transition without this explicit lock,
  // producing a visible width/height snap on every page change.
  const rect = containerEl.getBoundingClientRect();
  containerEl.style.height = rect.height + "px";
  containerEl.style.width = rect.width + "px";

  const next = document.createElement("div");
  next.className = "carousel-set incoming";
  fill(next);
  next.style.transform = axis === "x" ? `translateX(${direction * 100}%)` : `translateY(${direction * 100}%)`;
  next.style.opacity = "0";
  containerEl.appendChild(next);

  old.classList.remove("current");
  old.classList.add("leaving");
  old.style.transform = axis === "x" ? `translateX(${-direction * 100}%)` : `translateY(${-direction * 100}%)`;
  old.style.opacity = "0";

  // force reflow before animating in
  void next.offsetWidth;
  requestAnimationFrame(() => {
    next.style.transform = "translate(0, 0)";
    next.style.opacity = "1";
  });

  setTimeout(() => {
    old.remove();
    next.classList.remove("incoming");
    next.classList.add("current");
    next.style.transform = "";
    next.style.opacity = "";
    containerEl.style.height = "";
    containerEl.style.width = "";
  }, 420);
}

// ---------- Overview panel ----------

function accountDisplayName(a) {
  return a.tag || a.player_name;
}

function isSynced(a) {
  return a.rank_name != null || a.last_synced_at != null;
}

const CN_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
function prestigeToChinese(n) {
  if (n == null || n <= 0) return "";
  if (n < 10) return CN_DIGITS[n];
  if (n < 20) return "十" + CN_DIGITS[n - 10];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return CN_DIGITS[tens] + "十" + (ones ? CN_DIGITS[ones] : "");
}

function formatLevel(a) {
  if (a.level == null) return "—";
  return a.prestige ? `${prestigeToChinese(a.prestige)}轉 · ${a.level}級` : `${a.level}級`;
}

function formatRank(a) {
  return a.rank_display || "尚未同步";
}

// Pads a single-digit "- N%" progress reading with an invisible leading zero
// so it takes the same width as a double-digit "- NN%" one and columns of
// these stay aligned regardless of the actual percentage.
function formatRankPadded(a) {
  const rank = formatRank(a);
  const m = rank.match(/^(.*) - (\d{1,3})%$/);
  if (!m) return escapeHtml(rank);
  const [, prefix, digits] = m;
  if (digits.length !== 1) return escapeHtml(rank);
  return `${escapeHtml(prefix)} - <span class="digit-pad">0</span>${digits}%`;
}

function rankBadgeHtml(a) {
  return a.rank_img ? `<img class="rank-badge" src="${escapeHtml(a.rank_img)}" alt="">` : "";
}

function formatTotalStat(value) {
  return value != null ? String(value) : "—";
}

function careerWins(a) {
  const entry = a.total_raw && a.total_raw.career_wins;
  return entry && entry.value != null ? entry.value : null;
}

function renderOverviewSummary() {
  const counts = {};
  for (const a of state.accounts) {
    counts[a.platform] = (counts[a.platform] || 0) + 1;
  }
  const parts = Object.entries(counts).map(([platform, n]) => `${n} 個 ${platform} 帳號`);
  const text = parts.length ? parts.join(" · ") : "尚無帳號";
  document.getElementById("overview-summary").textContent = text;
}

function buildOverviewRow(a) {
  const tr = document.createElement("tr");

  const tdName = document.createElement("td");
  tdName.textContent = a.player_name;

  const tdPlatform = document.createElement("td");
  tdPlatform.textContent = a.platform;

  const tdNote = document.createElement("td");
  tdNote.className = "note-cell";
  tdNote.textContent = a.note && a.note.trim() ? a.note : "啥都沒 有啥看 ._.";
  tdNote.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    openNoteModal(a.id);
  });

  const tdStatus = document.createElement("td");
  tdStatus.className = "status-cell";
  const statusDot = document.createElement("span");
  statusDot.className = "status-dot " + (isSynced(a) ? "synced" : "unsynced");
  statusDot.title = isSynced(a) ? "已同步" : "未找到";
  tdStatus.appendChild(statusDot);

  const tdActions = document.createElement("td");
  const editBtn = document.createElement("button");
  editBtn.className = "btn-icon";
  editBtn.title = "編輯";
  editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditModal(a.id);
  });
  const delBtn = document.createElement("button");
  delBtn.className = "btn-icon";
  delBtn.title = "刪除";
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleDelete(a.id);
  });
  tdActions.appendChild(editBtn);
  tdActions.appendChild(delBtn);

  tr.appendChild(tdName);
  tr.appendChild(tdPlatform);
  tr.appendChild(tdNote);
  tr.appendChild(tdStatus);
  tr.appendChild(tdActions);

  tr.addEventListener("dblclick", (e) => {
    if (e.target.closest("button")) return;
    openDetailModal(a.id);
  });

  return tr;
}

function buildEmptyOverviewRow() {
  const tr = document.createElement("tr");
  tr.className = "table-row-empty";
  for (let i = 0; i < 5; i++) tr.appendChild(document.createElement("td"));
  return tr;
}

function buildOverviewTableNode(pageItems, pageSize) {
  const table = document.createElement("table");
  table.className = "data-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>名字</th>
        <th>平臺</th>
        <th>資料</th>
        <th class="status-cell">狀態</th>
        <th>操作</th>
      </tr>
    </thead>`;
  const tbody = document.createElement("tbody");
  for (const a of pageItems) tbody.appendChild(buildOverviewRow(a));
  while (tbody.children.length < pageSize) tbody.appendChild(buildEmptyOverviewRow());
  table.appendChild(tbody);
  return table;
}

function renderOverviewTable(direction = 1) {
  const pageSize = state.overviewPageSize;
  const totalPages = Math.max(1, Math.ceil(state.accounts.length / pageSize));
  if (state.overviewPage >= totalPages) state.overviewPage = totalPages - 1;
  if (state.overviewPage < 0) state.overviewPage = 0;

  const start = state.overviewPage * pageSize;
  const pageItems = state.accounts.slice(start, start + pageSize);
  const table = buildOverviewTableNode(pageItems, pageSize);

  const container = document.getElementById("overview-carousel");
  swapCarousel(container, table, "x", direction);

  document.getElementById("overview-page-label").textContent =
    `第 ${state.overviewPage + 1} / ${totalPages} 頁`;
  document.getElementById("overview-prev").disabled = state.overviewPage <= 0;
  document.getElementById("overview-next").disabled = state.overviewPage >= totalPages - 1;
}

let syncRunning = false;

function setSyncGear(show) {
  document.getElementById("sync-gear").classList.toggle("hidden", !show);
}

function showToast(message, duration = 4000) {
  const toast = document.getElementById("sync-toast");
  const messageEl = toast.querySelector(".toast-message");
  const bar = toast.querySelector(".toast-bar");
  messageEl.textContent = message;

  toast.classList.remove("hidden");
  clearTimeout(toast._hideTimer);

  // restart the shrinking bar animation every time the toast (re)shows
  bar.style.animation = "none";
  void bar.offsetWidth;
  bar.style.animation = `toast-bar-shrink ${duration}ms linear forwards`;

  void toast.offsetWidth;
  toast.classList.add("show");
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("show");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.add("hidden"), 300);
  }, duration);
}

function showNotFoundToast(count) {
  if (count <= 0) return;
  showToast(`有 ${count} 個賬戶未找到`);
}

async function runSyncAll({ withButtonState = false } = {}) {
  if (syncRunning) return;
  syncRunning = true;
  setSyncGear(true);
  const btn = document.getElementById("btn-sync-all");
  const originalText = btn.textContent;
  if (withButtonState) {
    btn.disabled = true;
    btn.textContent = "同步中...";
  }
  let failCount = 0;
  let connectionLost = false;
  try {
    // Sync accounts concurrently instead of one-by-one — the external stats
    // API allows 5 req/sec, so a small worker pool stays under that while
    // cutting wall-clock time roughly by the pool size.
    const SYNC_CONCURRENCY = 4;
    const queue = [...state.accounts];
    async function syncWorker() {
      while (queue.length && !connectionLost) {
        const a = queue.shift();
        try {
          await apiPost(`/accounts/${a.id}/sync`);
        } catch (e) {
          console.error(`Sync failed for account ${a.id}`, e);
          if (e instanceof TypeError) {
            // fetch itself failed (server unreachable) — every remaining
            // account would fail the same way, so stop hammering it and
            // report this distinctly from "player not found"
            connectionLost = true;
          } else {
            failCount++;
          }
        }
      }
    }
    await Promise.all(Array.from({ length: SYNC_CONCURRENCY }, syncWorker));
    if (!connectionLost) {
      await loadAccounts();
      renderAll();
      renderShowcase(true);
    }
  } finally {
    if (withButtonState) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
    setSyncGear(false);
    syncRunning = false;
    if (connectionLost) {
      showToast("無法連線到伺服器，同步已中止");
    } else {
      showNotFoundToast(failCount);
    }
  }
}

async function syncAllAccounts() {
  await runSyncAll({ withButtonState: true });
}

async function handleDelete(id) {
  if (!confirm("確定要刪除此帳號嗎？")) return;
  await apiDelete(`/accounts/${id}`);
  await loadAccounts();
  renderAll();
}

// ---------- Sort panel ----------

function sortedAccounts() {
  const key = state.sortBy;
  const dir = state.sortDir;
  const list = state.accounts.filter(isSynced);
  list.sort((a, b) => {
    const av = a[key] ?? -Infinity;
    const bv = b[key] ?? -Infinity;
    return dir === "asc" ? av - bv : bv - av;
  });
  return list;
}

function renderSortHtml(pageItems) {
  const rows = [];
  if (!pageItems.length) {
    rows.push(`<div class="sort-row"><span class="muted">尚無已同步帳號</span><span></span></div>`);
  } else {
    for (const a of pageItems) {
      const isRank = state.sortBy !== "level";
      const value = isRank ? formatRankPadded(a) : escapeHtml(formatLevel(a));
      const badge = isRank ? rankBadgeHtml(a) : "";
      rows.push(
        `<div class="sort-row" data-account-id="${a.id}"><span class="sort-name">${escapeHtml(
          accountDisplayName(a)
        )}</span><span class="sort-value">${badge}${value}</span></div>`
      );
    }
  }
  // always reserve height for a full page of rows, even if fewer are shown
  while (rows.length < state.sortPageSize) {
    rows.push(`<div class="sort-row sort-row-empty"><span></span><span></span></div>`);
  }
  return rows.join("");
}

function renderSortPanel(animate, direction = 1) {
  const list = sortedAccounts();
  const pageSize = state.sortPageSize;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (state.sortPage >= totalPages) state.sortPage = totalPages - 1;
  if (state.sortPage < 0) state.sortPage = 0;

  const start = state.sortPage * pageSize;
  const pageItems = list.slice(start, start + pageSize);
  const html = renderSortHtml(pageItems);

  const container = document.getElementById("sort-carousel");
  swapCarousel(container, html, "x", direction);

  document.getElementById("sort-page-label").textContent = `第 ${state.sortPage + 1} / ${totalPages} 頁`;
  document.getElementById("sort-prev").disabled = state.sortPage <= 0;
  document.getElementById("sort-next").disabled = state.sortPage >= totalPages - 1;
}

// ---------- Card showcase ----------

function pickRandom(arr, n) {
  const copy = [...arr];
  const out = [];
  while (copy.length && out.length < n) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function renderCardHtml(accounts) {
  if (!accounts.length) return `<p class="muted">尚無帳號</p>`;
  const cards = accounts
    .map((a) => {
      const name = accountDisplayName(a);
      const rank = formatRank(a);
      const rankBadge = rankBadgeHtml(a);
      const kd = a.kd != null ? a.kd : "—";
      const wins = formatTotalStat(careerWins(a));
      const totalKills = formatTotalStat(a.total_kills);
      const legend = a.selected_legend ? legendZh(a.selected_legend) : "—";
      const skin = a.selected_legend_skin ?? "—";
      return `
        <div class="account-card" data-account-id="${a.id}">
          <div class="account-card-info">
            <span class="name">${escapeHtml(name)}</span>
            <span>${rankBadge}${escapeHtml(rank)}</span>
            <span>本季KD ${escapeHtml(String(kd))}</span>
            <span class="muted small">生涯勝場 ${escapeHtml(String(wins))}</span>
            <span class="muted small">生涯總擊殺 ${escapeHtml(String(totalKills))}</span>
          </div>
          <div class="account-card-portrait">
            ${a.selected_legend ? `<img src="${legendIconUrl(a.selected_legend)}" alt="${escapeHtml(legend)}">` : ""}
            <div class="portrait-caption">${escapeHtml(legend)}<br>${escapeHtml(skin)}</div>
          </div>
        </div>`;
    })
    .join("");
  return `<div class="showcase-grid">${cards}</div>`;
}

function renderShowcase(animate) {
  const picked = pickRandom(state.accounts.filter(isSynced), 4);
  const html = renderCardHtml(picked);
  const container = document.getElementById("showcase-carousel");
  swapCarousel(container, html, "y");
}

// ---------- Legend filter grid ----------

function buildLegendCardNode(legendName) {
  const card = document.createElement("div");
  card.className = "legend-card";
  card.dataset.legend = legendName;
  card.title = legendZh(legendName);
  const img = document.createElement("img");
  img.src = legendIconUrl(legendName);
  img.alt = legendZh(legendName);
  card.appendChild(img);
  card.addEventListener("click", () => {
    if (state.selectedLegends.has(legendName)) {
      state.selectedLegends.delete(legendName);
      card.classList.remove("selected");
    } else {
      state.selectedLegends.add(legendName);
      card.classList.add("selected");
    }
    state.searchPage = 0;
    renderSearchResults(true);
  });
  return card;
}

function buildLegendClassGroupNode(cls) {
  const group = document.createElement("div");
  group.className = "legend-class-group";

  const cards = document.createElement("div");
  cards.className = "legend-class-cards";
  for (const legend of cls.legends) cards.appendChild(buildLegendCardNode(legend));
  group.appendChild(cards);

  // accent bar + banner travel together as one unit; accent renders above
  // the banner (DOM order = visual order within this column-flex wrap)
  const bannerWrap = document.createElement("div");
  bannerWrap.className = "legend-class-banner-wrap";

  const accent = document.createElement("div");
  accent.className = `legend-class-accent accent-${cls.key}`;
  bannerWrap.appendChild(accent);

  const banner = document.createElement("div");
  banner.className = `legend-class-banner banner-${cls.key}`;
  banner.innerHTML = `${LEGEND_CLASS_ICON_SVG[cls.key]}<span>${escapeHtml(cls.label)}</span>`;
  bannerWrap.appendChild(banner);

  group.appendChild(bannerWrap);

  return group;
}

function buildLegendGridRowNode(...classKeys) {
  const row = document.createElement("div");
  row.className = "legend-grid-row";
  classKeys.forEach((key) => {
    const cls = LEGEND_CLASSES.find((c) => c.key === key);
    row.appendChild(buildLegendClassGroupNode(cls));
  });
  return row;
}

function renderLegendGrid() {
  const wrap = document.getElementById("legend-grid");
  wrap.innerHTML = "";
  wrap.appendChild(buildLegendGridRowNode("assault", "skirmisher"));
  wrap.appendChild(buildLegendGridRowNode("recon", "support", "controller"));
}

// ---------- Search panel ----------

function filteredAccounts() {
  const q = state.searchQuery.trim().toLowerCase();
  const list = state.accounts.filter(isSynced).filter((a) => {
    const matchesQuery =
      !q ||
      a.player_name.toLowerCase().includes(q) ||
      (a.tag && a.tag.toLowerCase().includes(q)) ||
      (a.owned_legends || []).some((l) => l.toLowerCase().includes(q));
    const matchesLegends = [...state.selectedLegends].every((l) =>
      (a.owned_legends || []).includes(l)
    );
    return matchesQuery && matchesLegends;
  });
  const dir = state.searchDir;
  list.sort((a, b) => {
    const av = a.rank_score ?? -Infinity;
    const bv = b.rank_score ?? -Infinity;
    return dir === "asc" ? av - bv : bv - av;
  });
  return list;
}

function renderSearchResultsHtml(pageItems) {
  const rows = [];
  if (!pageItems.length) {
    rows.push(`<div class="sort-row"><span class="muted">沒有符合的帳號</span><span></span></div>`);
  } else {
    for (const a of pageItems) {
      const rank = formatRankPadded(a);
      const rankBadge = rankBadgeHtml(a);
      const kd = a.kd != null ? a.kd : "—";
      rows.push(
        `<div class="sort-row" data-account-id="${a.id}"><span>${escapeHtml(accountDisplayName(a))} (${escapeHtml(
          a.platform
        )})</span><span class="sort-value">${rankBadge}${rank} · 本季KD ${escapeHtml(String(kd))}</span></div>`
      );
    }
  }
  // always reserve height for a full page of rows, even if fewer are shown
  while (rows.length < state.searchPageSize) {
    rows.push(`<div class="sort-row sort-row-empty"><span></span><span></span></div>`);
  }
  return rows.join("");
}

function renderSearchResults(animate, direction = 1) {
  const list = filteredAccounts();
  const pageSize = state.searchPageSize;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (state.searchPage >= totalPages) state.searchPage = totalPages - 1;
  if (state.searchPage < 0) state.searchPage = 0;

  const start = state.searchPage * pageSize;
  const pageItems = list.slice(start, start + pageSize);
  const html = renderSearchResultsHtml(pageItems);

  const container = document.getElementById("search-carousel");
  swapCarousel(container, html, "x", direction);

  document.getElementById("search-page-label").textContent = `第 ${state.searchPage + 1} / ${totalPages} 頁`;
  document.getElementById("search-prev").disabled = state.searchPage <= 0;
  document.getElementById("search-next").disabled = state.searchPage >= totalPages - 1;
}

// ---------- Modals ----------

function openModal(id, { instant = false } = {}) {
  const overlay = document.getElementById(id);
  clearTimeout(overlay._hideTimer);
  overlay.classList.remove("hidden");
  if (instant) {
    overlay.classList.add("open");
    return;
  }
  void overlay.offsetWidth;
  overlay.classList.add("open");
}
function closeModal(id, { instant = false } = {}) {
  const overlay = document.getElementById(id);
  overlay.classList.remove("open");
  clearTimeout(overlay._hideTimer);
  if (instant) {
    overlay.classList.add("hidden");
    return;
  }
  overlay._hideTimer = setTimeout(() => overlay.classList.add("hidden"), 200);
}

function openNoteModal(accountId) {
  const account = state.accounts.find((a) => a.id === accountId);
  if (!account) return;
  state.editingAccountId = accountId;
  document.getElementById("note-textarea").value = account.note || "";
  openModal("modal-note");
}

async function saveNote() {
  const id = state.editingAccountId;
  const note = document.getElementById("note-textarea").value;
  await apiPatch(`/accounts/${id}`, { note });
  await loadAccounts();
  closeModal("modal-note");
  renderAll();
}

function openEditModal(accountId) {
  const account = state.accounts.find((a) => a.id === accountId);
  if (!account) return;
  state.editingAccountId = accountId;
  document.getElementById("edit-platform").value = account.platform;
  document.getElementById("edit-tag").value = account.tag || "";
  document.getElementById("edit-note").value = account.note || "";
  document.getElementById("edit-legends").value = (account.owned_legends || []).join(", ");
  openModal("modal-edit");
}

async function saveEdit() {
  const id = state.editingAccountId;
  const platform = document.getElementById("edit-platform").value;
  const tag = document.getElementById("edit-tag").value.trim();
  const note = document.getElementById("edit-note").value;
  const legends = document
    .getElementById("edit-legends")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await apiPatch(`/accounts/${id}`, { platform, tag: tag || null, note, owned_legends: legends });
  await loadAccounts();
  closeModal("modal-edit");
  renderAll();
}

async function syncFromEditModal() {
  const id = state.editingAccountId;
  try {
    await apiPost(`/accounts/${id}/sync`);
  } catch (e) {
    console.error("Sync failed", e);
    alert("同步失敗，請確認玩家名稱／平臺是否正確，或稍後再試。");
  }
  await loadAccounts();
  renderAll();
}

async function saveAdd() {
  const player_name = document.getElementById("add-player-name").value.trim();
  const platform = document.getElementById("add-platform").value;
  const note = document.getElementById("add-note").value;
  if (!player_name) {
    alert("請輸入名字");
    return;
  }
  const created = await apiPost("/accounts", { platform, player_name, note });
  closeModal("modal-add");
  document.getElementById("add-player-name").value = "";
  document.getElementById("add-platform").value = "PC";
  document.getElementById("add-note").value = "";
  try {
    await apiPost(`/accounts/${created.id}/sync`);
  } catch (e) {
    console.error("Initial sync failed (account still created)", e);
  }
  await loadAccounts();
  renderAll();
}

function transitionToBatchAdd() {
  const addCard = document.querySelector("#modal-add .modal");
  addCard.classList.add("modal-slide-down-out");
  setTimeout(() => {
    addCard.classList.remove("modal-slide-down-out");
    closeModal("modal-add", { instant: true });
    openModal("modal-batch-add", { instant: true });
    const batchCard = document.querySelector("#modal-batch-add .modal");
    batchCard.classList.add("modal-slide-in-right");
    setTimeout(() => batchCard.classList.remove("modal-slide-in-right"), 250);
  }, 250);
}

function transitionToAdd() {
  const batchCard = document.querySelector("#modal-batch-add .modal");
  batchCard.classList.add("modal-slide-down-out");
  setTimeout(() => {
    batchCard.classList.remove("modal-slide-down-out");
    closeModal("modal-batch-add", { instant: true });
    openModal("modal-add", { instant: true });
    const addCard = document.querySelector("#modal-add .modal");
    addCard.classList.add("modal-slide-in-right");
    setTimeout(() => addCard.classList.remove("modal-slide-in-right"), 250);
  }, 250);
}

async function saveBatchAdd() {
  const raw = document.getElementById("batch-add-input").value;
  const names = [...new Set(raw.split(/[^A-Za-z0-9_-]+/).filter(Boolean))];
  if (!names.length) {
    alert("請輸入至少一個帳號名字");
    return;
  }
  let successCount = 0;
  let failCount = 0;
  for (const name of names) {
    try {
      await apiPost("/accounts", { platform: "PC", player_name: name, note: "" });
      successCount++;
    } catch (e) {
      console.error("Batch add failed for", name, e);
      failCount++;
    }
  }
  await loadAccounts();
  renderAll();
  document.getElementById("batch-add-input").value = "";
  closeModal("modal-batch-add");
  showToast(`批量新增完成：成功 ${successCount} 筆${failCount ? `，失敗 ${failCount} 筆` : ""}`);
}

// ---------- Account detail modal ----------

function formatDateTime(iso) {
  if (!iso) return "尚未同步";
  try {
    return new Date(iso).toLocaleString("zh-TW", { hour12: false });
  } catch (e) {
    return iso;
  }
}

function buildDetailPortraitHtml(a) {
  const synced = isSynced(a);
  const legendName = synced && a.selected_legend ? legendZh(a.selected_legend) : "尚未同步";
  const legendSkin = synced && a.selected_legend_skin ? a.selected_legend_skin : "—";
  return `
    <div class="detail-legend-section">
      <div class="account-card-portrait detail-portrait">
        ${synced && a.selected_legend ? `<img src="${legendIconUrl(a.selected_legend)}" alt="${escapeHtml(legendName)}">` : ""}
        <div class="portrait-caption">${escapeHtml(legendName)}<br>${escapeHtml(legendSkin)}</div>
      </div>
    </div>`;
}

function buildDetailHtml(a) {
  const synced = isSynced(a);
  const name = accountDisplayName(a);
  const statusClass = synced ? "synced" : "unsynced";
  const rankText = synced ? formatRank(a) : "尚未同步";
  const rankBadge = synced ? rankBadgeHtml(a) : "";
  const levelText = synced ? formatLevel(a) : "尚未同步";
  const kd = synced && a.kd != null ? a.kd : "—";
  const wins = synced ? formatTotalStat(careerWins(a)) : "—";
  const totalKills = synced ? formatTotalStat(a.total_kills) : "—";
  const ownedChips = ownedLegendsChipsHtml(a.owned_legends);
  const note = a.note && a.note.trim() ? a.note : "啥都沒 有啥看 ._.";
  const lastSynced = formatDateTime(a.last_synced_at);

  return `
    <div class="detail-header">
      <span class="status-dot ${statusClass}"></span>
      <span class="detail-name">${escapeHtml(name)}</span>
      <span class="platform-badge">${escapeHtml(a.platform)}</span>
    </div>
    <div class="detail-rank">${rankBadge}${escapeHtml(rankText)}</div>
    <div class="detail-level muted">${escapeHtml(levelText)}</div>
    <div class="detail-stats">
      <span>本季KD ${escapeHtml(String(kd))}</span>
      <span>生涯勝場 ${escapeHtml(String(wins))}</span>
      <span>生涯總擊殺 ${escapeHtml(String(totalKills))}</span>
    </div>
    <div class="detail-section">
      <h4>已解鎖角色</h4>
      <div class="filter-chips">${ownedChips}</div>
    </div>
    <div class="detail-section">
      <h4>資料</h4>
      <p class="detail-note">${escapeHtml(note)}</p>
    </div>
    <div class="detail-section muted small">上次同步：${escapeHtml(lastSynced)}</div>
    <div class="modal-actions">
      <button id="detail-sync" class="btn btn-ghost">立即同步</button>
      <button id="detail-edit" class="btn btn-primary">編輯</button>
    </div>
  `;
}

function buildLegendStatCardHtml(entry) {
  const lines = (entry.stats || [])
    .map((s) => {
      const pct = s.top_percent != null ? `（前 ${escapeHtml(String(s.top_percent))}%）` : "";
      return `<div class="legend-stat-line">${escapeHtml(s.name)}: ${escapeHtml(String(s.value))}${pct}</div>`;
    })
    .join("");
  return `<div class="legend-stat-card"><h4>${escapeHtml(legendZh(entry.legend))}</h4>${lines}</div>`;
}

function buildLegendStatsHtml(data) {
  const list = (data || []).filter((entry) => entry.legend !== "Global");
  if (!list.length) return `<p class="muted">尚無角色資料</p>`;
  return list.map(buildLegendStatCardHtml).join("");
}

// Debug view: dump a fixed set of fields from the API's `total` block (name,
// key, value) so field meanings can be cross-checked against the in-game
// stats screen — this is what surfaced that `career_kills` is a real
// lifetime counter while `games_played`/`damage`/`kills` are not. Only
// career_* counters and plain "BR Kills"/"BR Damage" trackers — verified
// there is no career-scoped damage counter, so this deliberately excludes
// season-specific, weapon-mastery, and gadget-specific trackers (e.g. NOX gas
// damage, enemies scanned) that would otherwise bury the useful fields.
// Every field is always listed, even when this account's `total` doesn't
// carry it (some accounts' data is sparse, e.g. only `kd` present) — those
// rows just show "-" instead of being omitted, so the shape stays constant.
const TOTAL_RAW_FIELDS = [
  { key: "career_kills", name: "Career Kills" },
  { key: "career_revives", name: "Career Revives" },
  { key: "career_wins", name: "Career Wins" },
  { key: "kills", name: "BR Kills" },
  { key: "specialEvent_kills", name: "BR Kills" },
  { key: "damage", name: "BR Damage" },
  { key: "specialEvent_damage", name: "BR Damage" },
];
function buildTotalRawHtml(account) {
  const total = account.total_raw || {};
  const lines = TOTAL_RAW_FIELDS.map(({ key, name }) => {
    const entry = total[key];
    const value = entry && entry.value != null ? entry.value : "-";
    return `<div class="legend-stat-line">${escapeHtml(name)}（${escapeHtml(key)}）：${escapeHtml(
      String(value)
    )}</div>`;
  }).join("");
  return `<div class="legend-stat-card"><h4>API total 原始資料</h4>${lines}</div>`;
}

async function loadLegendStatsPanel(account) {
  const panel = document.getElementById("detail-legend-stats");
  if (!isSynced(account)) {
    panel.innerHTML = `<p class="muted">尚未同步</p>`;
    return;
  }
  panel.innerHTML = buildDetailPortraitHtml(account) + buildTotalRawHtml(account);
}

function renderDetailModalContent(a) {
  document.getElementById("detail-content").innerHTML = buildDetailHtml(a);
  document.getElementById("detail-sync").addEventListener("click", async () => {
    try {
      await apiPost(`/accounts/${a.id}/sync`);
    } catch (e) {
      console.error("Sync failed", e);
    }
    await loadAccounts();
    renderAll();
    const updated = state.accounts.find((x) => x.id === a.id);
    if (updated) {
      renderDetailModalContent(updated);
      loadLegendStatsPanel(updated);
    }
  });
  document.getElementById("detail-edit").addEventListener("click", () => {
    closeDetailModal();
    openEditModal(a.id);
  });
}

function openDetailModal(accountId) {
  const account = state.accounts.find((a) => a.id === accountId);
  if (!account) return;
  state.detailAccountId = accountId;
  renderDetailModalContent(account);
  loadLegendStatsPanel(account);
  const overlay = document.getElementById("modal-detail");
  overlay.classList.remove("hidden");
  void overlay.offsetWidth;
  overlay.classList.add("open");
}

function closeDetailModal() {
  const overlay = document.getElementById("modal-detail");
  overlay.classList.remove("open");
  clearTimeout(overlay._hideTimer);
  overlay._hideTimer = setTimeout(() => overlay.classList.add("hidden"), 220);
}

function delegateDetailDblClick(containerId, rowSelector) {
  document.getElementById(containerId).addEventListener("dblclick", (e) => {
    const row = e.target.closest(rowSelector);
    if (!row || e.target.closest("button")) return;
    const id = Number(row.dataset.accountId);
    if (id) openDetailModal(id);
  });
}

// ---------- Utility ----------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Wire up + render orchestration ----------

function renderAll() {
  renderOverviewSummary();
  renderOverviewTable();
  renderSortPanel(false);
  renderSearchResults(false);
  // showcase intentionally not re-triggered here; it's on its own 60s timer
}

function setupEventListeners() {
  document.getElementById("btn-sync-all").addEventListener("click", syncAllAccounts);

  document.getElementById("overview-summary").addEventListener("click", () => {
    state.overviewOpen = !state.overviewOpen;
    document.getElementById("overview-table-wrap").classList.toggle("collapsed", !state.overviewOpen);
  });
  document.getElementById("overview-prev").addEventListener("click", () => {
    state.overviewPage -= 1;
    renderOverviewTable(-1);
  });
  document.getElementById("overview-next").addEventListener("click", () => {
    state.overviewPage += 1;
    renderOverviewTable(1);
  });

  document.getElementById("btn-add-account").addEventListener("click", () => openModal("modal-add"));
  document.getElementById("add-save").addEventListener("click", saveAdd);
  document.getElementById("batch-add-link").addEventListener("click", transitionToBatchAdd);
  document.getElementById("batch-add-back").addEventListener("click", transitionToAdd);
  document.getElementById("batch-add-save").addEventListener("click", saveBatchAdd);
  document.getElementById("note-save").addEventListener("click", saveNote);
  document.getElementById("edit-save").addEventListener("click", saveEdit);
  document.getElementById("edit-sync").addEventListener("click", syncFromEditModal);

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    if (overlay.id === "modal-detail") return; // animated close handled separately
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.getElementById("detail-close").addEventListener("click", closeDetailModal);
  document.getElementById("modal-detail").addEventListener("click", (e) => {
    if (e.target.id === "modal-detail") closeDetailModal();
  });

  delegateDetailDblClick("sort-carousel", ".sort-row[data-account-id]");
  delegateDetailDblClick("search-carousel", ".sort-row[data-account-id]");
  delegateDetailDblClick("showcase-carousel", ".account-card[data-account-id]");

  document.getElementById("sort-by").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    state.sortPage = 0;
    renderSortPanel(true);
  });
  document.getElementById("sort-dir").addEventListener("click", (e) => {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    e.target.textContent = state.sortDir === "asc" ? "遞增 ▲" : "遞減 ▼";
    renderSortPanel(true);
  });
  document.getElementById("sort-prev").addEventListener("click", () => {
    state.sortPage -= 1;
    renderSortPanel(true, -1);
  });
  document.getElementById("sort-next").addEventListener("click", () => {
    state.sortPage += 1;
    renderSortPanel(true, 1);
  });

  document.getElementById("legend-clear-all").addEventListener("click", (e) => {
    e.preventDefault();
    state.selectedLegends.clear();
    document.querySelectorAll(".legend-card.selected").forEach((el) => el.classList.remove("selected"));
    state.searchPage = 0;
    renderSearchResults(true);
  });

  document.getElementById("search-input").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    state.searchPage = 0;
    renderSearchResults(true);
  });
  document.getElementById("search-dir").addEventListener("click", (e) => {
    state.searchDir = state.searchDir === "asc" ? "desc" : "asc";
    e.target.textContent = state.searchDir === "asc" ? "段位遞增 ▲" : "段位遞減 ▼";
    state.searchPage = 0;
    renderSearchResults(true);
  });
  document.getElementById("search-prev").addEventListener("click", () => {
    state.searchPage -= 1;
    renderSearchResults(true, -1);
  });
  document.getElementById("search-next").addEventListener("click", () => {
    state.searchPage += 1;
    renderSearchResults(true, 1);
  });
}

async function init() {
  setupEventListeners();
  renderLegendGrid();
  try {
    await loadAccounts();
  } catch (e) {
    console.error("Failed to load accounts. Is the backend running at " + API_BASE + "?", e);
    document.getElementById("overview-summary").textContent =
      "無法連線到後端 API（" + API_BASE + "），請確認伺服器已啟動。";
  }
  renderAll();
  renderShowcase(false);
  setInterval(() => renderShowcase(true), 60000);
  setInterval(() => runSyncAll({ withButtonState: false }), 60000);
}

init();
