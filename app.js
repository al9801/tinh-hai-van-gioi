// ============================================================
//  ĐẠI NGÀN VẠN GIỚI — logic ứng dụng
//  Firebase Auth (Google) + Firestore realtime
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ── Trạng thái chung ─────────────────────────────────── */
const CFG = window.FIREBASE_CONFIG || {};
const ACCOUNTS = window.ACCOUNTS || {};
const DEFAULT_GAS = window.DEFAULT_GAS_LINK || "https://aistudio.google.com/";

let auth = null, db = null;
let me = null;              // { email, icon, name, displayName }
let maps = [];              // danh sách map (realtime)
let drafts = [];            // danh sách nháp Thư Phòng (realtime)
let unsubMaps = null, unsubDrafts = null;
let editingMapId = null;    // map đang mở trong modal (null = tạo mới)
let mountedRoute = "";      // route đã dựng DOM (tránh re-mount editor khi snapshot về)

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* ── Đom đóm ──────────────────────────────────────────── */
(function spawnFireflies() {
  const host = $("#fireflies");
  for (let i = 0; i < 22; i++) {
    const f = document.createElement("span");
    f.className = "firefly";
    f.style.left = Math.random() * 100 + "%";
    f.style.top = 20 + Math.random() * 75 + "%";
    f.style.setProperty("--dx", (Math.random() * 120 - 60).toFixed(0) + "px");
    f.style.setProperty("--dy", (Math.random() * -90 - 20).toFixed(0) + "px");
    f.style.setProperty("--dur", (7 + Math.random() * 9).toFixed(1) + "s");
    f.style.setProperty("--delay", (-Math.random() * 12).toFixed(1) + "s");
    f.style.setProperty("--peak", (0.35 + Math.random() * 0.5).toFixed(2));
    host.appendChild(f);
  }
})();

/* ── Tiện ích ─────────────────────────────────────────── */
function show(id) {
  $$(".screen").forEach((s) => s.classList.add("hidden"));
  $(id).classList.remove("hidden");
}
let toastTimer = null;
function toast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast" + (isError ? " toast-error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3200);
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtTime(ts) {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent.trim();
}
function totemBadges(recommends) {
  const rec = recommends || {};
  return Object.entries(ACCOUNTS)
    .filter(([email]) => rec[email])
    .map(([email, a]) =>
      `<span class="totem-badge" title="${esc(a.name)} (${esc(email)}) đã tiến cử">${a.icon}</span>`)
    .join("");
}
function friendlyAuthError(e) {
  const code = e?.code || "";
  if (code.includes("popup-closed") || code.includes("cancelled")) return "Cửa sổ đăng nhập đã bị đóng.";
  if (code.includes("unauthorized-domain"))
    return "Tên miền này chưa được thêm vào Authorized domains trong Firebase Console (Authentication → Settings).";
  if (code.includes("network")) return "Lỗi mạng — thử lại nhé.";
  return "Không đăng nhập được: " + (e?.message || e);
}

/* ── Khởi động ────────────────────────────────────────── */
if (!CFG.apiKey || /PASTE/.test(CFG.apiKey)) {
  show("#screen-setup");
} else {
  const app = initializeApp(CFG);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      teardown();
      show("#screen-login");
      return;
    }
    const email = (user.email || "").toLowerCase();
    const acct = ACCOUNTS[email];
    if (!acct) {
      teardown();
      $("#denied-email").textContent = user.email || "(không rõ)";
      show("#screen-denied");
      return;
    }
    me = { email, icon: acct.icon, name: acct.name, displayName: user.displayName || acct.name };
    enterForest();
  });
}

$("#btn-login")?.addEventListener("click", async () => {
  $("#login-error").classList.add("hidden");
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    const el = $("#login-error");
    el.textContent = friendlyAuthError(e);
    el.classList.remove("hidden");
  }
});
$("#btn-denied-logout")?.addEventListener("click", () => signOut(auth));
$("#btn-logout")?.addEventListener("click", () => signOut(auth));

function teardown() {
  me = null;
  unsubMaps?.(); unsubMaps = null;
  unsubDrafts?.(); unsubDrafts = null;
  maps = []; drafts = [];
  mountedRoute = "";
}

function enterForest() {
  $("#user-totem").textContent = me.icon;
  $("#user-totem").title = `${me.name} — ${me.email}`;
  $("#user-name").textContent = me.name;
  show("#screen-app");

  unsubMaps = onSnapshot(
    query(collection(db, "maps"), orderBy("order")),
    (snap) => {
      maps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      route(/*soft=*/true);
    },
    (err) => {
      console.error(err);
      toast("Không đọc được dữ liệu — kiểm tra Firestore Rules (README bước 5).", true);
    }
  );
  unsubDrafts = onSnapshot(
    query(collection(db, "drafts"), orderBy("updatedAt", "desc")),
    (snap) => {
      drafts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      route(/*soft=*/true);
    },
    (err) => console.error(err)
  );
  route();
}

/* ── Router ───────────────────────────────────────────── */
window.addEventListener("hashchange", () => route());

function parseHash() {
  const h = (location.hash || "#/").replace(/^#/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts[0] === "map" && parts[1]) return { view: "map", id: parts[1], tab: parts[2] || "map" };
  if (parts[0] === "thu-phong" && parts[1]) return { view: "draft", id: parts[1] };
  if (parts[0] === "thu-phong") return { view: "drafts" };
  return { view: "home" };
}

// soft=true: dữ liệu snapshot mới về — chỉ cập nhật phần hiển thị,
// KHÔNG dựng lại editor đang gõ dở.
function route(soft = false) {
  if (!me) return;
  const r = parseHash();
  const key = r.view + ":" + (r.id || "") + ":" + (r.tab || "");

  $$(".nav-link").forEach((a) => a.classList.remove("active"));
  if (r.view === "home") $('[data-nav="home"]')?.classList.add("active");
  if (r.view === "drafts" || r.view === "draft") $('[data-nav="drafts"]')?.classList.add("active");

  if (soft && key === mountedRoute) {
    if (r.view === "home") renderHome();          // home không có editor → render lại thoải mái
    if (r.view === "drafts") renderDraftsList();
    if (r.view === "map") updateMapMeta(r);       // chỉ cập nhật tiêu đề/huy hiệu/nút
    if (r.view === "draft") updateDraftMeta(r);
    return;
  }
  mountedRoute = key;
  if (r.view === "home") renderHome();
  else if (r.view === "map") renderMapView(r);
  else if (r.view === "drafts") renderDraftsList();
  else if (r.view === "draft") renderDraftView(r);
  window.scrollTo({ top: 0 });
}

/* ── HOME: Rừng Cổng ──────────────────────────────────── */
function renderHome() {
  const cards = maps.map((m) => `
    <a class="map-card" href="#/map/${m.id}">
      <span class="totem-corner">${totemBadges(m.recommends)}</span>
      <div class="map-card-num">✦ Cánh cổng ${esc(String(m.order ?? "?"))} ✦</div>
      <div class="map-card-title">${esc(m.title)}</div>
      <div class="map-card-world">${esc(m.world || "Thế giới chưa được mô tả…")}</div>
      <div class="map-card-foot">${m.updatedAt ? "Chạm gần nhất: " + fmtTime(m.updatedAt) : ""}</div>
    </a>`).join("");

  $("#main").innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Rừng <span class="accent">Cổng</span></h1>
      <p class="page-sub">Mỗi cánh cổng dẫn vào một thế giới. Huy hiệu linh thú ở góc là dấu tiến cử của hai kẻ giữ rừng.</p>
    </div>
    <div class="map-grid">
      ${cards || ""}
      <button class="map-card new-card" id="btn-new-map">
        <span class="new-card-plus">✦</span>
        <span class="new-card-label">Mở cánh cổng mới</span>
      </button>
    </div>
    ${maps.length === 0 ? `<p class="empty-state">Khu rừng còn tĩnh lặng — hãy mở cánh cổng đầu tiên.</p>` : ""}`;

  $("#btn-new-map").addEventListener("click", () => openMapModal(null));
}

/* ── MAP VIEW ─────────────────────────────────────────── */
const SUBTABS = [
  { key: "map",    label: "🗺️ Nội dung Map",  field: "content", ph: "Ghi lại thế giới này: địa danh, thế lực, luật lệ, bí sử…" },
  { key: "prompt", label: "📜 Prompt",          field: "prompt",  ph: "Dán / soạn prompt nhân vật cho Google AI Studio ở đây…" },
  { key: "y-tuong", label: "💭 Ý tưởng nháp",   field: "ideas",   ph: "Nháp tự do: ý tưởng, tình tiết, nhân vật chưa chốt…" },
];

function findMap(id) { return maps.find((m) => m.id === id); }

function renderMapView({ id, tab }) {
  const m = findMap(id);
  if (!m) {
    $("#main").innerHTML = `<p class="empty-state">Cánh cổng này không tồn tại — có lẽ đã bị rừng nuốt mất.<br><br><a class="btn btn-ghost" href="#/">← Về Rừng Cổng</a></p>`;
    return;
  }
  const st = SUBTABS.find((t) => t.key === tab) || SUBTABS[0];

  $("#main").innerHTML = `
    <div class="map-view-head">
      <a class="breadcrumb" href="#/">← Rừng Cổng</a>
      <div class="map-title-row">
        <div style="flex:1; min-width: 240px;">
          <h1 class="map-view-title" id="mv-title"></h1>
          <p class="map-view-world" id="mv-world"></p>
        </div>
        <button class="btn-icon" id="btn-edit-map" title="Sửa tên / mô tả / link GAS">✎</button>
      </div>
      <div class="map-actions">
        <a class="btn gas-btn" id="mv-gas" target="_blank" rel="noopener">🌀 Mở Google AI Studio</a>
        <button class="btn rec-btn" id="btn-rec"></button>
        <span class="rec-status" id="rec-status"></span>
      </div>
    </div>
    <div class="subtabs">
      ${SUBTABS.map((t) => `<button class="subtab ${t.key === st.key ? "active" : ""}" data-tab="${t.key}">${t.label}</button>`).join("")}
    </div>
    <div class="editor-wrap" id="editor-slot"></div>`;

  $$(".subtab").forEach((b) =>
    b.addEventListener("click", () => { location.hash = `#/map/${id}/${b.dataset.tab}`; }));
  $("#btn-edit-map").addEventListener("click", () => openMapModal(id));
  $("#btn-rec").addEventListener("click", () => toggleRecommend(id));

  mountEditor($("#editor-slot"), {
    html: m[st.field] || "",
    placeholder: st.ph,
    showCopy: st.key === "prompt",
    save: (html) => updateDoc(doc(db, "maps", id), { [st.field]: html, updatedAt: serverTimestamp() }),
  });
  updateMapMeta({ id, tab });
}

// cập nhật phần "sống" của map view khi snapshot về (không đụng editor)
function updateMapMeta({ id }) {
  const m = findMap(id);
  if (!m || !$("#mv-title")) return;
  $("#mv-title").textContent = m.title || "(chưa đặt tên)";
  $("#mv-world").textContent = m.world || "";
  $("#mv-gas").href = m.gasLink || DEFAULT_GAS;

  const rec = m.recommends || {};
  const mine = !!rec[me.email];
  const btn = $("#btn-rec");
  btn.classList.toggle("rec-on", mine);
  btn.innerHTML = mine ? `${me.icon} Đã tiến cử ✓` : `${me.icon} Tiến cử map này`;

  const others = Object.entries(ACCOUNTS)
    .filter(([em]) => rec[em])
    .map(([, a]) => `${a.icon} ${a.name}`);
  $("#rec-status").textContent = others.length
    ? "Đã tiến cử: " + others.join(" · ")
    : "Chưa ai tiến cử map này.";
}

async function toggleRecommend(id) {
  const m = findMap(id);
  if (!m) return;
  const rec = { ...(m.recommends || {}) };
  if (rec[me.email]) delete rec[me.email];
  else rec[me.email] = true;
  try {
    await updateDoc(doc(db, "maps", id), { recommends: rec });
    toast(rec[me.email] ? `${me.icon} Linh thú của bạn đã đậu lên cánh cổng` : "Đã rút lại tiến cử");
  } catch (e) { toast("Không lưu được tiến cử: " + e.message, true); }
}

/* ── Modal tạo / sửa map ──────────────────────────────── */
function openMapModal(mapId) {
  editingMapId = mapId;
  const m = mapId ? findMap(mapId) : null;
  $("#modal-map-title").textContent = m ? "Chỉnh cánh cổng" : "Mở cánh cổng mới";
  $("#inp-map-title").value = m?.title || "";
  $("#inp-map-world").value = m?.world || "";
  $("#inp-map-gas").value = m?.gasLink || DEFAULT_GAS;
  $("#btn-map-delete").classList.toggle("hidden", !m);
  $("#modal-map").classList.remove("hidden");
  setTimeout(() => $("#inp-map-title").focus(), 60);
}
function closeMapModal() { $("#modal-map").classList.add("hidden"); }

$("#btn-map-cancel").addEventListener("click", closeMapModal);
$("#modal-map").addEventListener("click", (e) => { if (e.target.id === "modal-map") closeMapModal(); });

$("#btn-map-save").addEventListener("click", async () => {
  const title = $("#inp-map-title").value.trim();
  if (!title) { toast("Cánh cổng cần một cái tên.", true); return; }
  const world = $("#inp-map-world").value.trim();
  const gasLink = $("#inp-map-gas").value.trim() || DEFAULT_GAS;
  try {
    if (editingMapId) {
      await updateDoc(doc(db, "maps", editingMapId), { title, world, gasLink, updatedAt: serverTimestamp() });
      toast("Đã lưu cánh cổng.");
    } else {
      const maxOrder = maps.reduce((mx, m) => Math.max(mx, m.order || 0), 0);
      const ref = await addDoc(collection(db, "maps"), {
        title, world, gasLink,
        order: maxOrder + 1,
        content: "", prompt: "", ideas: "",
        recommends: {},
        createdBy: me.email,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      toast("✦ Một cánh cổng mới vừa hiện ra giữa rừng.");
      location.hash = `#/map/${ref.id}`;
    }
    closeMapModal();
  } catch (e) { toast("Không lưu được: " + e.message, true); }
});

$("#btn-map-delete").addEventListener("click", async () => {
  const m = findMap(editingMapId);
  if (!m) return;
  const sure = prompt(`Phá bỏ cánh cổng sẽ xoá vĩnh viễn nội dung map, prompt và ý tưởng bên trong.\nGõ đúng tên map để xác nhận:\n\n${m.title}`);
  if (sure !== m.title) { if (sure !== null) toast("Tên không khớp — cánh cổng vẫn nguyên.", true); return; }
  try {
    await deleteDoc(doc(db, "maps", editingMapId));
    closeMapModal();
    location.hash = "#/";
    toast("Cánh cổng đã tan vào sương.");
  } catch (e) { toast("Không xoá được: " + e.message, true); }
});

/* ── THƯ PHÒNG: danh sách nháp ────────────────────────── */
function renderDraftsList() {
  const cards = drafts.map((d) => {
    const owner = ACCOUNTS[d.owner];
    return `
    <a class="draft-card" href="#/thu-phong/${d.id}">
      <div class="draft-card-title">${esc(d.title || "(nháp chưa đặt tên)")}</div>
      <div class="draft-card-preview">${esc(stripHtml(d.content).slice(0, 180) || "Trang giấy còn trắng…")}</div>
      <div class="draft-card-meta">
        <span>${owner ? owner.icon + " " + esc(owner.name) : esc(d.owner || "")}</span>
        <span>·</span>
        <span>${fmtTime(d.updatedAt)}</span>
      </div>
    </a>`;
  }).join("");

  $("#main").innerHTML = `
    <div class="page-head drafts-head-row">
      <div style="flex:1">
        <h1 class="page-title">Thư Phòng <span class="accent">Cổ Mộc</span></h1>
        <p class="page-sub">Nơi cất những trang nháp ý tưởng — cả hai kẻ giữ rừng đều đọc và viết được.</p>
      </div>
      <button class="btn btn-gold" id="btn-new-draft">✎ Trải trang giấy mới</button>
    </div>
    <div class="drafts-grid">${cards}</div>
    ${drafts.length === 0 ? `<p class="empty-state">Thư phòng còn trống — trải trang giấy đầu tiên đi.</p>` : ""}`;

  $("#btn-new-draft").addEventListener("click", async () => {
    try {
      const ref = await addDoc(collection(db, "drafts"), {
        title: "", content: "",
        owner: me.email,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      location.hash = `#/thu-phong/${ref.id}`;
    } catch (e) { toast("Không tạo được nháp: " + e.message, true); }
  });
}

/* ── THƯ PHÒNG: soạn một nháp ─────────────────────────── */
function findDraft(id) { return drafts.find((d) => d.id === id); }

function renderDraftView({ id }) {
  const d = findDraft(id);
  if (!d) {
    $("#main").innerHTML = `<p class="empty-state">Trang nháp này không còn trong thư phòng.<br><br><a class="btn btn-ghost" href="#/thu-phong">← Về Thư Phòng</a></p>`;
    return;
  }
  $("#main").innerHTML = `
    <div class="map-view-head">
      <a class="breadcrumb" href="#/thu-phong">← Thư Phòng Cổ Mộc</a>
      <input id="draft-title" class="draft-title-input" placeholder="Đặt tên cho trang nháp…" value="${esc(d.title)}">
      <div class="map-actions" style="margin-top:6px">
        <span class="rec-status" id="draft-meta"></span>
        <span class="spacer"></span>
        <button class="btn btn-danger-ghost" id="btn-del-draft">Đốt trang nháp…</button>
      </div>
    </div>
    <div class="editor-wrap" id="editor-slot"></div>`;

  let titleTimer = null;
  $("#draft-title").addEventListener("input", (e) => {
    clearTimeout(titleTimer);
    titleTimer = setTimeout(() => {
      updateDoc(doc(db, "drafts", id), { title: e.target.value.trim(), updatedAt: serverTimestamp() })
        .catch((err) => toast("Không lưu được tên: " + err.message, true));
    }, 700);
  });

  $("#btn-del-draft").addEventListener("click", async () => {
    if (!confirm("Đốt trang nháp này? Nội dung sẽ mất vĩnh viễn.")) return;
    try {
      await deleteDoc(doc(db, "drafts", id));
      location.hash = "#/thu-phong";
      toast("Trang nháp đã hoá tro.");
    } catch (e) { toast("Không xoá được: " + e.message, true); }
  });

  mountEditor($("#editor-slot"), {
    html: d.content || "",
    placeholder: "Viết ý tưởng của bạn ở đây — như một trang docx giữa rừng…",
    save: (html) => updateDoc(doc(db, "drafts", id), { content: html, updatedAt: serverTimestamp() }),
  });
  updateDraftMeta({ id });
}

function updateDraftMeta({ id }) {
  const d = findDraft(id);
  if (!d || !$("#draft-meta")) return;
  const owner = ACCOUNTS[d.owner];
  $("#draft-meta").textContent =
    `${owner ? owner.icon + " " + owner.name : d.owner || ""} · sửa lần cuối ${fmtTime(d.updatedAt) || "—"}`;
}

/* ── EDITOR kiểu docx ─────────────────────────────────── */
const TOOLBAR = [
  { cmd: "bold", label: "B", title: "Đậm (⌘B)", style: "font-weight:700" },
  { cmd: "italic", label: "I", title: "Nghiêng (⌘I)", style: "font-style:italic" },
  { cmd: "underline", label: "U", title: "Gạch chân (⌘U)", style: "text-decoration:underline" },
  { cmd: "strikeThrough", label: "S", title: "Gạch ngang", style: "text-decoration:line-through" },
  { sep: true },
  { block: "h1", label: "H1", title: "Tiêu đề lớn" },
  { block: "h2", label: "H2", title: "Tiêu đề vừa" },
  { block: "h3", label: "H3", title: "Tiêu đề nhỏ" },
  { block: "p", label: "¶", title: "Đoạn văn thường" },
  { sep: true },
  { cmd: "insertUnorderedList", label: "•≡", title: "Danh sách chấm" },
  { cmd: "insertOrderedList", label: "1≡", title: "Danh sách số" },
  { block: "blockquote", label: "❝", title: "Trích dẫn" },
  { cmd: "insertHorizontalRule", label: "―", title: "Đường kẻ ngang" },
  { sep: true },
  { cmd: "removeFormat", label: "⌫ᴬ", title: "Xoá định dạng" },
  { cmd: "undo", label: "↺", title: "Hoàn tác" },
  { cmd: "redo", label: "↻", title: "Làm lại" },
];

function mountEditor(slot, { html, placeholder, save, showCopy = false }) {
  slot.innerHTML = `
    <div class="editor-toolbar">
      ${TOOLBAR.map((t) => t.sep
        ? `<span class="tb-sep"></span>`
        : `<button class="tb-btn" data-cmd="${t.cmd || ""}" data-block="${t.block || ""}" title="${t.title}" ${t.style ? `style="${t.style}"` : ""}>${t.label}</button>`
      ).join("")}
      ${showCopy ? `<span class="tb-sep"></span><button class="tb-btn" id="tb-copy" title="Copy toàn bộ prompt (dạng chữ thuần) để dán vào AI Studio">⧉ Copy</button>` : ""}
      <span class="tb-status" id="tb-status">Tự động lưu</span>
    </div>
    <div class="doc-page" id="doc-page" contenteditable="true" data-placeholder="${esc(placeholder)}"></div>`;

  const page = slot.querySelector("#doc-page");
  const status = slot.querySelector("#tb-status");
  page.innerHTML = html;

  let saveTimer = null;
  let lastSaved = html;
  const doSave = async () => {
    const cur = page.innerHTML;
    if (cur === lastSaved) return;
    status.textContent = "Đang khắc lên vỏ cây…";
    status.className = "tb-status saving";
    try {
      await save(cur);
      lastSaved = cur;
      status.textContent = "✓ Đã lưu";
      status.className = "tb-status saved";
    } catch (e) {
      status.textContent = "⚠ Lỗi lưu";
      status.className = "tb-status";
      toast("Không lưu được: " + e.message, true);
    }
  };
  page.addEventListener("input", () => {
    status.textContent = "Đang viết…";
    status.className = "tb-status";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 900);
  });
  page.addEventListener("blur", () => { clearTimeout(saveTimer); doSave(); });

  // dán = giữ chữ thuần cho sạch trang
  page.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  });

  slot.querySelectorAll(".tb-btn[data-cmd], .tb-btn[data-block]").forEach((b) => {
    b.addEventListener("mousedown", (e) => e.preventDefault()); // giữ selection
    b.addEventListener("click", () => {
      page.focus();
      if (b.dataset.block) document.execCommand("formatBlock", false, b.dataset.block);
      else if (b.dataset.cmd) document.execCommand(b.dataset.cmd, false, null);
    });
  });

  slot.querySelector("#tb-copy")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(page.innerText);
      toast("⧉ Đã copy toàn bộ prompt — dán thẳng vào AI Studio.");
    } catch { toast("Không copy được — hãy bôi đen thủ công.", true); }
  });
}
