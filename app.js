// ============================================================
//  ĐẠI NGÀN VẠN GIỚI — logic ứng dụng
//  Firebase Auth (Google) + Firestore realtime
//  Thêm ?demo=1 vào URL để xem thử giao diện với dữ liệu mẫu
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, limitToLast, getDoc, setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ── Trạng thái chung ─────────────────────────────────── */
const CFG = window.FIREBASE_CONFIG || {};
const ACCOUNTS = window.ACCOUNTS || {};
const DEFAULT_GAS = window.DEFAULT_GAS_LINK || "https://aistudio.google.com/";
const DEMO = new URLSearchParams(location.search).has("demo");

let auth = null, db = null;
let me = null;              // { email, icon, name }
let maps = [];              // danh sách map (realtime)
let drafts = [];            // danh sách nháp Thư Phòng (realtime)
let unsubMaps = null, unsubDrafts = null, unsubChat = null;
let editingMapId = null;    // map đang mở trong modal (null = tạo mới)
let mountedRoute = "";      // route đã dựng DOM (tránh re-mount editor khi snapshot về)

// trạng thái ghi chú 💧 + truyền âm 🫧 (khai báo sớm vì dùng ngay lúc khởi động)
let activeCmt = null;       // { page, doSave, api } của editor mở
let flushEditor = null;     // doSave của editor hiện tại — gọi trước khi unmount để không mất chữ

// nhớ chỗ đứng gần nhất trong từng khu — nút điều hướng đưa về đúng trang đang mở dở
let lastSeaHash = "#/";           // Biển Cổng: home hoặc map đang mở
let lastLibHash = "#/thu-phong";  // Thư Phòng: danh sách hoặc nháp đang viết

// nhớ vị trí cuộn của từng view + tab đang mở của từng map (không reset khi qua lại)
let scrollKey = null;
const viewScroll = {};
let mapTabMemory = {};
try { mapTabMemory = JSON.parse(localStorage.getItem("thvg-tab-mem") || "{}"); } catch {}
function rememberTab(id, tab) {
  mapTabMemory[id] = tab;
  try { localStorage.setItem("thvg-tab-mem", JSON.stringify(mapTabMemory)); } catch {}
}
window.addEventListener("scroll", () => {
  if (scrollKey) viewScroll[scrollKey] = window.scrollY;
}, { passive: true });
let cmtPop = null;
let cmtPopCloser = null;
let chatMsgs = [];
let chatInit = false;
let chatOpen = false;
let chatUnread = 0;
let stickers = [];
let unsubStickers = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* ── Trời sao + sinh quang ────────────────────────────── */
(function spawnSky() {
  const host = $("#fireflies");
  // sao lấp lánh rải khắp trời
  for (let i = 0; i < 60; i++) {
    const s = document.createElement("span");
    s.className = "star" + (Math.random() < 0.15 ? " gold" : "");
    const size = (1 + Math.random() * 1.8).toFixed(1);
    s.style.width = s.style.height = size + "px";
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 80 + "%";
    s.style.setProperty("--dur", (2.5 + Math.random() * 4).toFixed(1) + "s");
    s.style.setProperty("--delay", (-Math.random() * 6).toFixed(1) + "s");
    host.appendChild(s);
  }
  // đốm sinh quang trôi như plankton phát sáng
  for (let i = 0; i < 16; i++) {
    const f = document.createElement("span");
    f.className = "firefly" + (Math.random() < 0.3 ? " gold" : "");
    f.style.left = Math.random() * 100 + "%";
    f.style.top = 30 + Math.random() * 65 + "%";
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
// link thiếu https:// sẽ bị trình duyệt hiểu là đường dẫn trong site → mở ra trang 404
function normalizeUrl(u) {
  u = (u || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : "https://" + u;
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
/* nén ảnh phía client thành data-URL (Firestore giới hạn ~1MB/document) */
function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Không đọc được ảnh"));
    img.src = url;
  });
}
async function shrinkImage(file, maxDim, targetChars) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Không đọc được file"));
    r.readAsDataURL(file);
  });
  const img = await loadImage(dataUrl);
  let scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  let best = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    let out = canvas.toDataURL("image/webp", 0.82);
    if (!out.startsWith("data:image/webp")) { // trình duyệt không nén được webp
      out = (file.type === "image/png" && attempt === 0)
        ? canvas.toDataURL("image/png")      // giữ nền trong suốt nếu còn nhỏ
        : canvas.toDataURL("image/jpeg", 0.8);
    }
    best = out;
    if (out.length <= targetChars) return out;
    scale *= 0.7; // còn nặng → thu nhỏ thêm rồi thử lại
  }
  return best;
}

/* ── Lọc HTML dán vào editor: giữ bảng/đậm/nghiêng/danh sách, bỏ rác Google Docs/Word ── */
const KEEP_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "H1", "H2", "H3",
  "UL", "OL", "LI", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH",
  "HR", "PRE", "CODE", "A", "IMG",
]);

function sanitizePastedHtml(html) {
  const src = new DOMParser().parseFromString(html, "text/html").body;
  const out = document.createElement("div");
  cleanChildren(src, out);
  return out.innerHTML;
}
function cleanChildren(srcParent, outParent) {
  [...srcParent.childNodes].forEach((n) => cleanNode(n, outParent));
}
function cleanNode(n, out) {
  if (n.nodeType === Node.TEXT_NODE) { out.appendChild(document.createTextNode(n.textContent)); return; }
  if (n.nodeType !== Node.ELEMENT_NODE) return;
  let tag = n.tagName;
  const style = (n.getAttribute("style") || "").toLowerCase();
  if (["SCRIPT", "STYLE", "META", "LINK", "TITLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON"].includes(tag)) return;
  // Google Docs bọc toàn bộ nội dung trong <b style="font-weight:normal"> — không phải chữ đậm
  if (tag === "B" && style.includes("font-weight:normal")) tag = "SPAN";

  // giữ đậm/nghiêng/gạch khai báo qua style của span (kiểu Google Docs)
  let target = out;
  const wraps = [];
  if (tag !== "B" && tag !== "STRONG" && /font-weight\s*:\s*(bold|[6-9]00)/.test(style)) wraps.push("strong");
  if (tag !== "I" && tag !== "EM" && /font-style\s*:\s*italic/.test(style)) wraps.push("em");
  if (/text-decoration[^;]*underline/.test(style)) wraps.push("u");
  if (/text-decoration[^;]*line-through/.test(style)) wraps.push("s");
  for (const w of wraps) { const el = document.createElement(w); target.appendChild(el); target = el; }
  // giữ màu highlight nền (kiểu bôi màu trong Google Docs)
  const bg = style.match(/background(?:-color)?\s*:\s*([^;]+)/);
  if (bg) {
    const v = bg[1].trim();
    if (/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(v) &&
        !/^(transparent|white|#fff(?:fff)?|inherit|initial|unset|none)$/i.test(v)) {
      const el = document.createElement("span");
      el.style.backgroundColor = v;
      target.appendChild(el);
      target = el;
    }
  }

  if (KEEP_TAGS.has(tag)) {
    if (tag === "IMG") {
      const s = n.getAttribute("src") || "";
      if (/^(data:image\/|https?:\/\/)/i.test(s)) {
        const img = document.createElement("img");
        img.src = s;
        target.appendChild(img);
      }
      return;
    }
    const el = document.createElement(tag.toLowerCase());
    if (tag === "A") {
      const href = normalizeUrl(n.getAttribute("href") || "");
      if (href) { el.href = href; el.target = "_blank"; el.rel = "noopener"; }
    }
    if (tag === "TD" || tag === "TH") {
      ["colspan", "rowspan"].forEach((a) => { const v = n.getAttribute(a); if (v) el.setAttribute(a, v); });
    }
    target.appendChild(el);
    cleanChildren(n, el);
  } else if (["DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "MAIN"].includes(tag)) {
    const el = document.createElement("p"); // block lạ → đoạn văn
    target.appendChild(el);
    cleanChildren(n, el);
    if (!el.textContent.trim() && !el.querySelector("img,table")) el.remove();
  } else {
    cleanChildren(n, target); // span/font/thẻ lạ → bóc vỏ, giữ ruột
  }
}

function friendlyAuthError(e) {
  const code = e?.code || "";
  if (code.includes("popup-closed") || code.includes("cancelled")) return "Cửa sổ đăng nhập đã bị đóng.";
  if (code.includes("unauthorized-domain"))
    return "Tên miền này chưa được thêm vào Authorized domains trong Firebase Console (Authentication → Settings).";
  if (code.includes("network")) return "Lỗi mạng — thử lại nhé.";
  return "Không đăng nhập được: " + (e?.message || e);
}

/* ── Kho dữ liệu: Firestore thật hoặc demo tại chỗ ────── */
const store = DEMO ? demoStore() : firestoreStore();

function firestoreStore() {
  return {
    subscribe() {
      unsubMaps = onSnapshot(
        query(collection(db, "maps"), orderBy("order")),
        (snap) => { maps = snap.docs.map((d) => ({ id: d.id, ...d.data() })); route(true); },
        (err) => {
          console.error(err);
          toast("Không đọc được dữ liệu — kiểm tra Firestore Rules (README bước 5).", true);
        });
      unsubDrafts = onSnapshot(
        query(collection(db, "drafts"), orderBy("updatedAt", "desc")),
        (snap) => { drafts = snap.docs.map((d) => ({ id: d.id, ...d.data() })); route(true); },
        (err) => console.error(err));
    },
    async addMap(data) {
      const ref = await addDoc(collection(db, "maps"),
        { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return ref.id;
    },
    updateMap: (id, patch) =>
      updateDoc(doc(db, "maps", id), { ...patch, updatedAt: serverTimestamp() }),
    // tiến cử / xếp thứ tự: không đụng updatedAt (không phải "sửa nội dung")
    setRecommends: (id, recommends) => updateDoc(doc(db, "maps", id), { recommends }),
    setOrder: (id, order) => updateDoc(doc(db, "maps", id), { order }),
    async deleteMap(id) {
      await deleteDoc(doc(db, "maps", id));
      deleteDoc(doc(db, "mapfiles", id)).catch(() => {}); // dọn luôn file HTML nếu có
    },
    // file HTML của map lưu riêng 1 doc (mapfiles/{mapId}) để doc map chính không phình to
    getMapHtml: (id) => getDoc(doc(db, "mapfiles", id)).then((s) => (s.exists() ? s.data().html : null)),
    saveMapHtml: (id, html) => setDoc(doc(db, "mapfiles", id), { html, by: me.email, at: serverTimestamp() }),
    deleteMapHtml: (id) => deleteDoc(doc(db, "mapfiles", id)),
    // ảnh trong trang lưu kho riêng (images/{iid}) — né trần 1MB/document của Firestore
    saveImage: (iid, data) => setDoc(doc(db, "images", iid), { data, by: me.email, at: serverTimestamp() }),
    getImage: (iid) => getDoc(doc(db, "images", iid)).then((s) => (s.exists() ? s.data().data : null)),
    async addDraft(data) {
      const ref = await addDoc(collection(db, "drafts"),
        { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return ref.id;
    },
    updateDraft: (id, patch) =>
      updateDoc(doc(db, "drafts", id), { ...patch, updatedAt: serverTimestamp() }),
    deleteDraft: (id) => deleteDoc(doc(db, "drafts", id)),
    subscribeChat(cb) {
      unsubChat = onSnapshot(
        query(collection(db, "chat"), orderBy("at"), limitToLast(150)),
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error(err));
    },
    // payload: { text } hoặc { stickerId }
    sendChat: (payload) => addDoc(collection(db, "chat"), { ...payload, by: me.email, at: serverTimestamp() }),
    subscribeStickers(cb) {
      unsubStickers = onSnapshot(
        query(collection(db, "stickers"), orderBy("at")),
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => console.error(err));
    },
    addSticker: (data) => addDoc(collection(db, "stickers"), { data, by: me.email, at: serverTimestamp() }),
    deleteSticker: (id) => deleteDoc(doc(db, "stickers", id)),
  };
}

function demoStore() {
  const now = () => { const d = new Date(); return { toDate: () => d }; };
  const uid = () => "demo-" + Math.random().toString(36).slice(2, 9);
  const emails = Object.keys(ACCOUNTS);
  maps = [
    {
      id: "demo-1", order: 1, title: "Map 1 — Trấn Vực Sâm Lâm",
      world: "Khu rừng ranh giới nơi mọi lời hứa đều mọc thành cây.",
      gasLink: DEFAULT_GAS,
      recommends: { [emails[0]]: true, [emails[1]]: true },
      content: `<h2>Trấn Vực Sâm Lâm</h2><p>Rừng ranh giới ngăn giữa <mark class="cmt cmt-end" data-cid="demo-c1">cõi người và cõi mộng</mark>…</p>`,
      prompt: "<p>Bạn là <b>Thủ Mộc Nhân</b>, kẻ canh giữ cánh cổng…</p>",
      ideas: "",
      hasHtml: true,
      comments: { "demo-c1": { items: [
        { by: emails[1], text: "Chỗ này tả thêm cảnh ranh giới mờ dần vào đêm trăng tròn nhé?", at: new Date().toISOString() },
      ] } },
      updatedAt: now(),
    },
    {
      id: "demo-2", order: 2, title: "Map 2 — Hải Vực Lưu Quang",
      world: "Thành phố nổi trên lưng cá voi cổ đại, đèn lồng thay mặt trời.",
      gasLink: DEFAULT_GAS,
      recommends: { [emails[1]]: true },
      content: "", prompt: "", ideas: "", updatedAt: now(),
    },
    {
      id: "demo-3", order: 3, title: "Map 3 — Thành Đêm Không Ngủ",
      world: "Đô thị hiện đại, nhưng cứ nửa đêm là mọc thêm một con phố mới.",
      gasLink: DEFAULT_GAS,
      recommends: {},
      content: "", prompt: "", ideas: "", updatedAt: now(),
    },
  ];
  drafts = [
    { id: "demo-d1", title: "Ý tưởng arc nhân vật Sylas", owner: emails[0],
      content: "<p>Sylas không nói dối — nhưng luôn nói thiếu một nửa…</p>", updatedAt: now() },
    { id: "demo-d2", title: "Nháp luật phép cõi mộng", owner: emails[1],
      content: "<p>Phép chỉ hoạt động khi có người tin…</p>", updatedAt: now() },
  ];
  const touch = (obj) => { obj.updatedAt = now(); };
  let chatArr = [
    { id: "demo-m1", by: emails[1], text: "Map 2 tối nay mở thử không? 🌊", at: now() },
    { id: "demo-m2", by: emails[0], text: "Ừ, tôi vừa sửa lại prompt rồi đó!", at: now() },
  ];
  let chatCb = null;
  let stickerArr = [];
  let stickerCb = null;
  const htmlFiles = {
    "demo-1": `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:radial-gradient(700px 400px at 60% 20%,#12305c,#070d1e);color:#cfe6f5;font-family:Georgia,serif;display:grid;place-items:center;min-height:100vh;text-align:center">
<div><div style="font-size:3rem">🗺️</div><h1 style="letter-spacing:.1em">BẢN ĐỒ DEMO</h1>
<p>Đây là nơi file map <b>.html</b> tương tác của bạn hiển thị.<br>Ở bản thật, hãy bấm "⬆ Tải HTML lên" và chọn file map của bạn.</p></div>
</body></html>`,
  };
  return {
    demo: true,
    subscribe() {},
    subscribeChat(cb) { chatCb = cb; cb(chatArr.slice()); },
    async sendChat(payload) { chatArr.push({ id: uid(), by: me.email, ...payload, at: now() }); chatCb?.(chatArr.slice()); },
    subscribeStickers(cb) { stickerCb = cb; cb(stickerArr.slice()); },
    async addSticker(data) { stickerArr.push({ id: uid(), data, by: me.email, at: now() }); stickerCb?.(stickerArr.slice()); },
    async deleteSticker(id) { stickerArr = stickerArr.filter((s) => s.id !== id); stickerCb?.(stickerArr.slice()); },
    async addMap(data) { const id = uid(); maps.push({ id, ...data, updatedAt: now() }); route(true); return id; },
    async updateMap(id, patch) { const m = maps.find((x) => x.id === id); if (m) { Object.assign(m, patch); touch(m); } route(true); },
    async setRecommends(id, recommends) { const m = maps.find((x) => x.id === id); if (m) m.recommends = recommends; route(true); },
    async setOrder(id, order) { const m = maps.find((x) => x.id === id); if (m) m.order = order; maps.sort((a, b) => (a.order || 0) - (b.order || 0)); },
    async deleteMap(id) { maps = maps.filter((x) => x.id !== id); delete htmlFiles[id]; route(true); },
    async getMapHtml(id) { return htmlFiles[id] || null; },
    async saveMapHtml(id, html) { htmlFiles[id] = html; },
    async deleteMapHtml(id) { delete htmlFiles[id]; },
    async saveImage(iid, data) { this._imgs = this._imgs || {}; this._imgs[iid] = data; },
    async getImage(iid) { return (this._imgs || {})[iid] || null; },
    async addDraft(data) { const id = uid(); drafts.unshift({ id, ...data, updatedAt: now() }); route(true); return id; },
    async updateDraft(id, patch) { const d = drafts.find((x) => x.id === id); if (d) { Object.assign(d, patch); touch(d); } route(true); },
    async deleteDraft(id) { drafts = drafts.filter((x) => x.id !== id); route(true); },
  };
}

/* ── Khởi động (gọi ở CUỐI file, sau khi mọi thứ đã khai báo) ── */
function boot() {
  if (DEMO) {
    const [email, acct] = Object.entries(ACCOUNTS)[0];
    me = { email, ...acct };
    enterForest();
    setTimeout(() => toast("🌊 Đang xem bản DEMO — mọi thay đổi sẽ tan khi tải lại trang."), 600);
    return;
  }
  if (!CFG.apiKey || /PASTE/.test(CFG.apiKey)) {
    show("#screen-setup");
    return;
  }
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
    me = { email, icon: acct.icon, name: acct.name };
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
$("#btn-logout")?.addEventListener("click", () => {
  if (DEMO) { location.href = location.pathname; return; }
  signOut(auth);
});

function teardown() {
  me = null;
  unsubMaps?.(); unsubMaps = null;
  unsubDrafts?.(); unsubDrafts = null;
  unsubChat?.(); unsubChat = null;
  unsubStickers?.(); unsubStickers = null;
  maps = []; drafts = []; stickers = [];
  chatMsgs = []; chatInit = false; chatUnread = 0;
  mountedRoute = "";
}

function enterForest() {
  $("#user-totem").textContent = me.icon;
  $("#user-totem").title = `${me.name} — ${me.email}`;
  $("#user-name").textContent = me.name + (DEMO ? " (demo)" : "");
  show("#screen-app");
  store.subscribe();
  store.subscribeChat(onChatMsgs);
  store.subscribeStickers((arr) => {
    stickers = arr;
    renderStickerGrid();
    renderChatList(); // vá lại tin sticker đến trước khi kho sticker tải xong
  });
  route();
}

/* ── Router ───────────────────────────────────────────── */
window.addEventListener("hashchange", () => route());

// nút điều hướng: quay về đúng trang đang mở dở trong khu đó;
// bấm lần nữa (khi đã ở đó) mới ra màn hình tổng
$('[data-nav="home"]')?.addEventListener("click", (e) => {
  e.preventDefault();
  const cur = location.hash || "#/";
  location.hash = (cur === lastSeaHash) ? "#/" : lastSeaHash;
});
$('[data-nav="drafts"]')?.addEventListener("click", (e) => {
  e.preventDefault();
  const cur = location.hash || "#/";
  location.hash = (cur === lastLibHash) ? "#/thu-phong" : lastLibHash;
});

function parseHash() {
  const h = (location.hash || "#/").replace(/^#/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts[0] === "map" && parts[1]) return { view: "map", id: parts[1], tab: parts[2] || "" };
  if (parts[0] === "thu-phong" && parts[1]) return { view: "draft", id: parts[1] };
  if (parts[0] === "thu-phong") return { view: "drafts" };
  return { view: "home" };
}

// soft=true: dữ liệu mới về — chỉ cập nhật phần hiển thị,
// KHÔNG dựng lại editor đang gõ dở.
function route(soft = false) {
  if (!me) return;
  const r = parseHash();
  const key = r.view + ":" + (r.id || "") + ":" + (r.tab || "");

  $$(".nav-link").forEach((a) => a.classList.remove("active"));
  if (r.view === "home" || r.view === "map") $('[data-nav="home"]')?.classList.add("active");
  if (r.view === "drafts" || r.view === "draft") $('[data-nav="drafts"]')?.classList.add("active");

  // ghi nhớ chỗ đứng trong từng khu
  if (r.view === "home") lastSeaHash = "#/";
  else if (r.view === "map") lastSeaHash = location.hash;
  if (r.view === "drafts") lastLibHash = "#/thu-phong";
  else if (r.view === "draft") lastLibHash = location.hash;

  if (soft && key === mountedRoute) {
    if (r.view === "home") renderHome();          // home không có editor → render lại thoải mái
    else if (r.view === "drafts") renderDraftsList();
    else if (r.view === "map") {
      // dữ liệu vừa về sau khi lỡ hiện màn "không tồn tại" → dựng lại cho đúng
      if (findMap(r.id) && !$("#mv-title")) renderMapView(r);
      else updateMapMeta(r);                      // bình thường: chỉ cập nhật tiêu đề/huy hiệu/nút
    }
    else if (r.view === "draft") {
      if (findDraft(r.id) && !$("#draft-title")) renderDraftView(r);
      else updateDraftMeta(r);
    }
    return;
  }
  if (scrollKey) viewScroll[scrollKey] = window.scrollY; // chụp vị trí cuộn ngay lúc rời view
  flushEditor?.(); flushEditor = null;  // sắp dựng lại view → lưu ngay chữ đang gõ dở, không để mất
  mountedRoute = key;

  // đọc vị trí cuộn đã nhớ TRƯỚC khi dựng (dựng xong mới bật ghi lại)
  const newSK = scrollKeyFor(r);
  const savedY = viewScroll[newSK] || 0;
  scrollKey = null;

  if (r.view === "home") renderHome();
  else if (r.view === "map") renderMapView(r);
  else if (r.view === "drafts") renderDraftsList();
  else if (r.view === "draft") renderDraftView(r);

  scrollKey = newSK;
  if (!soft) {
    // instant: nhảy thẳng về chỗ cũ, không animate (tránh bị ngắt giữa chừng)
    window.scrollTo({ top: savedY, behavior: "instant" });
    // nội dung tải trễ (iframe/ảnh) có thể làm trang ngắn lúc đầu → chỉnh lại lần nữa
    if (savedY) setTimeout(() => window.scrollTo({ top: viewScroll[newSK] ?? savedY, behavior: "instant" }), 300);
  }
}

function scrollKeyFor(r) {
  if (r.view === "home") return "home";
  if (r.view === "drafts") return "drafts";
  if (r.view === "map") return `map:${r.id}:${resolveMapTab(r.id, r.tab)}`;
  if (r.view === "draft") return `draft:${r.id}`;
  return "other";
}

/* ── HOME: Rừng Cổng ──────────────────────────────────── */
let dragMapId = null;

function renderHome() {
  const cards = maps.map((m, i) => `
    <a class="map-card" href="#/map/${m.id}" data-id="${m.id}" draggable="true">
      <span class="totem-corner">${totemBadges(m.recommends)}</span>
      <div class="map-card-num">✦ Cánh cổng ${i + 1} ✦</div>
      <div class="map-card-title">${esc(m.title)}</div>
      <div class="map-card-world">${esc(m.world || "Thế giới chưa được mô tả…")}</div>
      <div class="map-card-foot">${m.hasHtml ? `<span class="has-map-chip">🧭 có bản đồ</span> · ` : ""}${m.updatedAt ? "Chạm gần nhất: " + fmtTime(m.updatedAt) : ""}</div>
    </a>`).join("");

  $("#main").innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Biển <span class="accent">Cổng</span></h1>
      <p class="page-sub">Mỗi cánh cổng dẫn vào một thế giới.</p>
    </div>
    <div class="map-grid">
      ${cards}
      <button class="map-card new-card" id="btn-new-map">
        <span class="new-card-plus">✦</span>
        <span class="new-card-label">Mở cánh cổng mới</span>
      </button>
    </div>
    ${maps.length === 0 ? `<p class="empty-state">Biển sao còn tĩnh lặng — hãy mở cánh cổng đầu tiên.</p>` : ""}`;

  $("#btn-new-map").addEventListener("click", () => openMapModal(null));

  // kéo thả sắp xếp thứ tự cổng
  $$(".map-card[data-id]").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      dragMapId = card.dataset.id;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragMapId); // Firefox cần có data mới kéo được
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      $$(".map-card.drag-over").forEach((c) => c.classList.remove("drag-over"));
    });
    card.addEventListener("dragover", (e) => {
      if (!dragMapId || dragMapId === card.dataset.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      card.classList.add("drag-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", async (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      await reorderMaps(dragMapId, card.dataset.id);
      dragMapId = null;
    });
  });
}

// thả cổng src vào vị trí của cổng dst → đánh lại order = vị trí mới (1, 2, 3…)
async function reorderMaps(srcId, dstId) {
  if (!srcId || !dstId || srcId === dstId) return;
  const seq = [...maps].sort((a, b) => (a.order || 0) - (b.order || 0));
  const from = seq.findIndex((m) => m.id === srcId);
  const to = seq.findIndex((m) => m.id === dstId);
  if (from < 0 || to < 0) return;
  const [moved] = seq.splice(from, 1);
  seq.splice(to, 0, moved);
  try {
    await Promise.all(seq
      .map((m, i) => (m.order !== i + 1 ? store.setOrder(m.id, i + 1) : null))
      .filter(Boolean));
    toast("✦ Đã xếp lại các cánh cổng.");
    route(true); // demo cần vẽ lại ngay; bản thật snapshot sẽ tự về
  } catch (e) { toast("Không xếp lại được: " + e.message, true); }
}

/* ── MAP VIEW ─────────────────────────────────────────── */
const SUBTABS = [
  { key: "map",     label: "🗺️ Nội dung Map", field: "content", ph: "Ghi lại thế giới này: địa danh, thế lực, luật lệ, bí sử…" },
  { key: "prompt",  label: "📜 Prompt",        field: "prompt",  ph: "Dán / soạn prompt nhân vật cho Google AI Studio ở đây…" },
  { key: "y-tuong", label: "💭 Ý tưởng nháp",  field: "ideas",   ph: "Nháp tự do: ý tưởng, tình tiết, nhân vật chưa chốt…" },
];

function findMap(id) { return maps.find((m) => m.id === id); }

function resolveMapTab(id, tab) {
  return tab || mapTabMemory[id] || (findMap(id)?.hasHtml ? "ban-do" : "map");
}

function renderMapView({ id, tab }) {
  const m = findMap(id);
  if (!m) {
    $("#main").innerHTML = `<p class="empty-state">Cánh cổng này không tồn tại — có lẽ đã bị sóng cuốn mất.<br><br><a class="btn btn-ghost" href="#/">← Về Biển Cổng</a></p>`;
    return;
  }
  // tab: ưu tiên tab trong URL → tab đã nhớ của map này → mặc định theo có/không bản đồ
  const tabKey = resolveMapTab(id, tab);
  if (tab) rememberTab(id, tab); // người dùng chủ động chọn tab → ghi nhớ cho lần sau
  const isMapHtmlTab = tabKey === "ban-do";
  const st = SUBTABS.find((t) => t.key === tabKey) || SUBTABS[0];
  const allTabs = [{ key: "ban-do", label: "🧭 Bản đồ HTML" }, ...SUBTABS];

  $("#main").innerHTML = `
    <div class="map-view-head">
      <a class="breadcrumb" href="#/">← Biển Cổng</a>
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
      ${allTabs.map((t) => `<button class="subtab ${t.key === (isMapHtmlTab ? "ban-do" : st.key) ? "active" : ""}" data-tab="${t.key}">${t.label}</button>`).join("")}
    </div>
    <div class="editor-wrap" id="editor-slot"></div>`;

  $$(".subtab").forEach((b) =>
    b.addEventListener("click", () => { location.hash = `#/map/${id}/${b.dataset.tab}`; }));
  $("#btn-edit-map").addEventListener("click", () => openMapModal(id));
  $("#btn-rec").addEventListener("click", () => toggleRecommend(id));

  if (isMapHtmlTab) {
    activeCmt = null; // tab bản đồ không có editor
    renderMapHtmlTab(m);
  } else {
    mountEditor($("#editor-slot"), {
      html: m[st.field] || "",
      placeholder: st.ph,
      showCopy: st.key === "prompt",
      save: (html) => store.updateMap(id, { [st.field]: html }),
      comments: {
        data: () => findMap(id)?.comments || {},
        save: (obj) => store.updateMap(id, { comments: obj }),
      },
    });
  }
  updateMapMeta({ id, tab });
}

/* ── Tab Bản đồ HTML: upload / xem / gỡ file map .html ── */
async function renderMapHtmlTab(m) {
  const slot = $("#editor-slot");
  const routeKey = mountedRoute;
  let curHtml = null;

  slot.innerHTML = `
    <div class="htmlmap-bar">
      <span class="rec-status" id="htmlmap-info">Đang lặn xuống lấy bản đồ…</span>
      <span class="spacer"></span>
      <button class="btn btn-ghost hidden" id="btn-map-full">⛶ Toàn màn hình</button>
      <label class="btn btn-gold" title="Chọn file map .html (tự chứa, dưới 0.9MB)">⬆ Tải HTML lên
        <input type="file" id="inp-maphtml" accept=".html,.htm,text/html" hidden>
      </label>
      <button class="btn btn-danger-ghost hidden" id="btn-maphtml-del">Gỡ bản đồ…</button>
    </div>
    <div id="htmlmap-body"></div>`;

  const info = slot.querySelector("#htmlmap-info");
  const body = slot.querySelector("#htmlmap-body");
  const btnFull = slot.querySelector("#btn-map-full");
  const btnDel = slot.querySelector("#btn-maphtml-del");

  const paint = () => {
    if (curHtml) {
      body.innerHTML = `<iframe class="htmlmap-frame" sandbox="allow-scripts" title="Bản đồ ${esc(m.title)}"></iframe>`;
      body.querySelector("iframe").srcdoc = curHtml;
      info.textContent = `Bản đồ HTML · ${Math.round(curHtml.length / 1024)}KB`;
      btnFull.classList.remove("hidden");
      btnDel.classList.remove("hidden");
    } else {
      body.innerHTML = `
        <div class="htmlmap-empty">
          <div style="font-size:2.2rem">🧭</div>
          <p>Cánh cổng này chưa có bản đồ HTML.<br>Bấm <b>⬆ Tải HTML lên</b> để thả file map tương tác của bạn xuống biển.</p>
        </div>`;
      info.textContent = "Chưa có bản đồ.";
      btnFull.classList.add("hidden");
      btnDel.classList.add("hidden");
    }
  };

  try { curHtml = await store.getMapHtml(m.id); }
  catch (e) { info.textContent = "Không tải được bản đồ: " + e.message; return; }
  if (mountedRoute !== routeKey) return; // người dùng đã rời tab trong lúc chờ
  paint();

  slot.querySelector("#inp-maphtml").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!/\.html?$/i.test(f.name) && !(f.type || "").includes("html")) {
      toast("Hãy chọn một file .html.", true); return;
    }
    const text = await f.text();
    if (text.length > 900_000) {
      toast(`File nặng ${Math.round(text.length / 1024)}KB — vượt giới hạn ~0.9MB/bản đồ của Firestore. Hãy nén bớt (bỏ ảnh nhúng nặng) rồi thử lại.`, true);
      return;
    }
    try {
      info.textContent = "Đang thả bản đồ xuống biển…";
      await store.saveMapHtml(m.id, text);
      await store.updateMap(m.id, { hasHtml: true });
      curHtml = text;
      paint();
      toast("🧭 Bản đồ đã neo vào cánh cổng.");
    } catch (err) { toast("Không lưu được bản đồ: " + err.message, true); }
  });

  btnFull.addEventListener("click", () => {
    if (!curHtml) return;
    const url = URL.createObjectURL(new Blob([curHtml], { type: "text/html" }));
    window.open(url, "_blank");
  });

  btnDel.addEventListener("click", async () => {
    if (!confirm("Gỡ bản đồ HTML khỏi cánh cổng này? (File gốc trên máy bạn không bị ảnh hưởng)")) return;
    try {
      await store.deleteMapHtml(m.id);
      await store.updateMap(m.id, { hasHtml: false });
      curHtml = null;
      paint();
      toast("Bản đồ đã được kéo lên khỏi biển.");
    } catch (err) { toast("Không gỡ được: " + err.message, true); }
  });
}

// cập nhật phần "sống" của map view khi dữ liệu mới về (không đụng editor)
function updateMapMeta({ id }) {
  const m = findMap(id);
  if (!m || !$("#mv-title")) return;
  $("#mv-title").textContent = m.title || "(chưa đặt tên)";
  $("#mv-world").textContent = m.world || "";
  $("#mv-gas").href = normalizeUrl(m.gasLink) || DEFAULT_GAS;

  const rec = m.recommends || {};
  const mine = !!rec[me.email];
  const btn = $("#btn-rec");
  btn.classList.toggle("rec-on", mine);
  btn.innerHTML = mine ? `${me.icon} Đã tiến cử ✓` : `${me.icon} Tiến cử map này`;

  const names = Object.entries(ACCOUNTS)
    .filter(([em]) => rec[em])
    .map(([, a]) => `${a.icon} ${a.name}`);
  $("#rec-status").textContent = names.length
    ? "Đã tiến cử: " + names.join(" · ")
    : "Chưa ai tiến cử map này.";
}

async function toggleRecommend(id) {
  const m = findMap(id);
  if (!m) return;
  const rec = { ...(m.recommends || {}) };
  const turningOn = !rec[me.email];
  if (turningOn) rec[me.email] = true;
  else delete rec[me.email];
  try {
    await store.setRecommends(id, rec);
    toast(turningOn ? `${me.icon} Linh thú của bạn đã đậu lên cánh cổng` : "Đã rút lại tiến cử");
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

let savingMap = false; // chống bấm Lưu nhiều lần tạo map trùng
$("#btn-map-save").addEventListener("click", async () => {
  if (savingMap) return;
  const title = $("#inp-map-title").value.trim();
  if (!title) { toast("Cánh cổng cần một cái tên.", true); return; }
  const world = $("#inp-map-world").value.trim();
  const gasLink = normalizeUrl($("#inp-map-gas").value) || DEFAULT_GAS;
  const btn = $("#btn-map-save");
  savingMap = true;
  btn.disabled = true;
  btn.textContent = "Đang lưu…";
  try {
    if (editingMapId) {
      await store.updateMap(editingMapId, { title, world, gasLink });
      toast("Đã lưu cánh cổng.");
    } else {
      const maxOrder = maps.reduce((mx, m) => Math.max(mx, m.order || 0), 0);
      const newId = await store.addMap({
        title, world, gasLink,
        order: maxOrder + 1,
        content: "", prompt: "", ideas: "",
        recommends: {},
        createdBy: me.email,
      });
      toast("✦ Một cánh cổng mới vừa hiện ra giữa biển sao.");
      location.hash = `#/map/${newId}`;
    }
    closeMapModal();
  } catch (e) { toast("Không lưu được: " + e.message, true); }
  finally {
    savingMap = false;
    btn.disabled = false;
    btn.textContent = "Lưu";
  }
});

$("#btn-map-delete").addEventListener("click", async () => {
  const m = findMap(editingMapId);
  if (!m) return;
  const sure = prompt(`Phá bỏ cánh cổng sẽ xoá vĩnh viễn nội dung map, prompt và ý tưởng bên trong.\nGõ đúng tên map để xác nhận:\n\n${m.title}`);
  if (sure !== m.title) { if (sure !== null) toast("Tên không khớp — cánh cổng vẫn nguyên.", true); return; }
  try {
    await store.deleteMap(editingMapId);
    closeMapModal();
    location.hash = "#/";
    toast("Cánh cổng đã tan vào bọt sóng.");
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
        <h1 class="page-title">Thư Phòng <span class="accent">San Hô</span></h1>
        <p class="page-sub">Nơi cất những trang nháp ý tưởng.</p>
      </div>
      <button class="btn btn-gold" id="btn-new-draft">✎ Trải trang giấy mới</button>
    </div>
    <div class="drafts-grid">${cards}</div>
    ${drafts.length === 0 ? `<p class="empty-state">Thư phòng còn trống — trải trang giấy đầu tiên đi.</p>` : ""}`;

  $("#btn-new-draft").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (btn.disabled) return; // chống double-click tạo nháp trùng
    btn.disabled = true;
    try {
      const newId = await store.addDraft({ title: "", content: "", owner: me.email });
      location.hash = `#/thu-phong/${newId}`;
    } catch (err) { toast("Không tạo được nháp: " + err.message, true); btn.disabled = false; }
  });
}

/* ── THƯ PHÒNG: soạn một nháp ─────────────────────────── */
function findDraft(id) { return drafts.find((d) => d.id === id); }

function renderDraftView({ id }) {
  const d = findDraft(id);
  if (!d) {
    $("#main").innerHTML = `<p class="empty-state">Trang nháp này không còn trong thư phòng.<br><br><a class="btn btn-ghost" href="#/thu-phong">← Về Thư Phòng San Hô</a></p>`;
    return;
  }
  $("#main").innerHTML = `
    <div class="map-view-head">
      <a class="breadcrumb" href="#/thu-phong">← Thư Phòng San Hô</a>
      <input id="draft-title" class="draft-title-input" placeholder="Đặt tên cho trang nháp…" value="${esc(d.title)}">
      <div class="map-actions" style="margin-top:6px">
        <span class="rec-status" id="draft-meta"></span>
        <span class="spacer"></span>
        <button class="btn btn-danger-ghost" id="btn-del-draft">Thả trôi trang nháp…</button>
      </div>
    </div>
    <div class="editor-wrap" id="editor-slot"></div>`;

  let titleTimer = null;
  $("#draft-title").addEventListener("input", (e) => {
    clearTimeout(titleTimer);
    titleTimer = setTimeout(() => {
      store.updateDraft(id, { title: e.target.value.trim() })
        .catch((err) => toast("Không lưu được tên: " + err.message, true));
    }, 700);
  });

  $("#btn-del-draft").addEventListener("click", async () => {
    if (!confirm("Thả trôi trang nháp này? Nội dung sẽ chìm vĩnh viễn.")) return;
    try {
      await store.deleteDraft(id);
      location.hash = "#/thu-phong";
      toast("Trang nháp đã trôi theo hải lưu.");
    } catch (e) { toast("Không xoá được: " + e.message, true); }
  });

  mountEditor($("#editor-slot"), {
    html: d.content || "",
    placeholder: "Viết ý tưởng của bạn ở đây — như một trang docx giữa biển sao…",
    save: (html) => store.updateDraft(id, { content: html }),
    comments: {
      data: () => findDraft(id)?.comments || {},
      save: (obj) => store.updateDraft(id, { comments: obj }),
    },
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

/* ── Kho ảnh của trang: tách ảnh nặng ra doc riêng ────── */
const imgCache = {}; // iid → dataURL (đỡ phải tải lại trong phiên)

// nạp lại ảnh cho trang vừa mở (ảnh lưu ở kho, trang chỉ giữ mã data-iid)
async function hydrateImages(root) {
  const imgs = [...root.querySelectorAll("img[data-iid]")].filter((i) => !i.getAttribute("src"));
  for (const img of imgs) {
    const iid = img.dataset.iid;
    try {
      const data = imgCache[iid] ?? (imgCache[iid] = await store.getImage(iid));
      if (data) img.src = data;
      else img.alt = "(ảnh không còn trong kho)";
    } catch { /* mạng lỗi → ảnh hiện lại ở lần mở sau */ }
  }
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
  { hl: true, label: "🖍", title: "Đổ màu highlight cho chữ đang bôi đen" },
  { tbl: true, label: "⊞", title: "Bảng — chèn bảng mới, hoặc chỉnh bảng đang đứng trong đó" },
  { image: true, label: "🖼️", title: "Chèn ảnh (hoặc dán thẳng ảnh vào trang)" },
  { cmd: "removeFormat", label: "⌫ᴬ", title: "Xoá định dạng" },
  { cmd: "undo", label: "↺", title: "Hoàn tác" },
  { cmd: "redo", label: "↻", title: "Làm lại" },
];

function mountEditor(slot, { html, placeholder, save, showCopy = false, comments = null }) {
  slot.innerHTML = `
    <div class="editor-toolbar">
      ${TOOLBAR.map((t) => {
        if (t.sep) return `<span class="tb-sep"></span>`;
        if (t.hl) return `<button class="tb-btn" data-hl="1" title="${t.title}">${t.label}</button>`;
        if (t.tbl) return `<button class="tb-btn" data-tbl="1" title="${t.title}">${t.label}</button>`;
        if (t.image) return `<button class="tb-btn" data-img="1" title="${t.title}">${t.label}</button>`;
        return `<button class="tb-btn" data-cmd="${t.cmd || ""}" data-block="${t.block || ""}" title="${t.title}" ${t.style ? `style="${t.style}"` : ""}>${t.label}</button>`;
      }).join("")}
      ${showCopy ? `<span class="tb-sep"></span><button class="tb-btn" id="tb-copy" title="Copy toàn bộ prompt (dạng chữ thuần) để dán vào AI Studio">⧉ Copy</button>` : ""}
      <span class="tb-status" id="tb-status">Tự động lưu</span>
      <input type="file" accept="image/*" class="tb-img-file" hidden>
    </div>
    <div class="doc-page" id="doc-page" contenteditable="true" data-placeholder="${esc(placeholder)}"></div>`;

  const page = slot.querySelector("#doc-page");
  const status = slot.querySelector("#tb-status");
  page.innerHTML = html;
  hydrateImages(page); // ảnh lưu kho riêng → nạp lại src

  // dạng LƯU TRỮ: ảnh nặng đẩy vào kho images/{iid}, trang chỉ giữ mã tham chiếu
  // (tránh đụng trần 1MB/document của Firestore)
  async function toStorageHtml() {
    const clone = page.cloneNode(true);
    const liveImgs = [...page.querySelectorAll("img")];
    const cloneImgs = [...clone.querySelectorAll("img")];
    for (let k = 0; k < liveImgs.length; k++) {
      const live = liveImgs[k], c = cloneImgs[k];
      if (!c) continue;
      if (live.dataset.iid) { c.removeAttribute("src"); continue; } // đã ở kho
      const src = live.getAttribute("src") || "";
      if (src.startsWith("data:image/") && src.length > 12_000) {
        const iid = "i" + Math.random().toString(36).slice(2, 10);
        await store.saveImage(iid, src);
        imgCache[iid] = src;
        live.dataset.iid = iid; // đánh dấu bản sống để lần sau không đẩy lại
        c.dataset.iid = iid;
        c.removeAttribute("src");
      }
    }
    return clone.innerHTML;
  }

  let saveTimer = null;
  let lastSaved = html; // html từ kho đã ở dạng lưu trữ
  const doSave = async () => {
    status.textContent = "Đang gửi theo hải lưu…";
    status.className = "tb-status saving";
    try {
      const cur = await toStorageHtml();
      if (cur === lastSaved) {
        status.textContent = "✓ Đã lưu";
        status.className = "tb-status saved";
        return;
      }
      await save(cur);
      lastSaved = cur;
      status.textContent = "✓ Đã lưu";
      status.className = "tb-status saved";
    } catch (e) {
      status.textContent = "⚠ Lỗi lưu";
      status.className = "tb-status";
      if (/longer than/i.test(e.message || "")) {
        const kb = Math.round(page.innerHTML.length / 1024);
        toast(`Trang vượt trần 1MB của Firestore (hiện ~${kb}KB). Hãy tải lại trang (Ctrl/Cmd+Shift+R) để chắc chắn đang chạy bản mới nhất rồi gõ thử 1 ký tự — ảnh sẽ tự tách vào kho. Nếu vẫn lỗi, hãy chia bớt nội dung sang tab Ý tưởng nháp.`, true);
      } else {
        toast("Không lưu được: " + e.message, true);
      }
    }
  };
  page.addEventListener("input", () => {
    status.textContent = "Đang viết…";
    status.className = "tb-status";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 900);
  });
  page.addEventListener("blur", () => { clearTimeout(saveTimer); doSave(); });
  flushEditor = () => { clearTimeout(saveTimer); return doSave(); };
  window.addEventListener("beforeunload", () => { clearTimeout(saveTimer); doSave(); }, { once: true });

  // chèn ảnh: nén rồi đặt vào vị trí con trỏ
  let savedImgRange = null;
  const caretToEnd = () => {
    const r = document.createRange();
    r.selectNodeContents(page); r.collapse(false);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  };
  async function insertImageFile(file) {
    if (!file?.type?.startsWith("image/")) { toast("File này không phải ảnh.", true); return; }
    status.textContent = "Đang nén ảnh…";
    status.className = "tb-status saving";
    try {
      const data = await shrinkImage(file, 1000, 260_000);
      page.focus();
      const sel = window.getSelection();
      if (savedImgRange && page.contains(savedImgRange.commonAncestorContainer)) {
        sel.removeAllRanges(); sel.addRange(savedImgRange);
      } else if (!sel.rangeCount || !page.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        caretToEnd();
      }
      document.execCommand("insertHTML", false, `<img src="${data}" alt="">`);
      savedImgRange = null;
      page.dispatchEvent(new Event("input")); // kích hoạt tự động lưu (ảnh sẽ tự tách vào kho riêng)
    } catch (e) {
      status.textContent = "⚠ Lỗi ảnh"; status.className = "tb-status";
      toast("Không chèn được ảnh: " + e.message, true);
    }
  }
  // ── bảng: chèn mới + chỉnh sửa ──
  let tblPop = null;
  const closeTblPop = () => { tblPop?.remove(); tblPop = null; };

  function popShell(rect) {
    closeTblPop();
    const pop = document.createElement("div");
    pop.className = "tbl-pop";
    document.body.appendChild(pop);
    pop.style.left = Math.max(12, Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - 210)) + "px";
    pop.style.top = (rect.bottom + window.scrollY + 6) + "px";
    pop.addEventListener("mousedown", (e) => e.preventDefault()); // giữ caret trong trang
    const closer = (e) => { if (!pop.contains(e.target)) { document.removeEventListener("mousedown", closer); closeTblPop(); } };
    setTimeout(() => document.addEventListener("mousedown", closer), 0);
    tblPop = pop;
    return pop;
  }

  function caretCell() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    const n = sel.anchorNode;
    const el = n && (n.nodeType === 1 ? n : n.parentElement);
    const cell = el?.closest("td,th");
    return cell && page.contains(cell) ? cell : null;
  }

  function insertTable(rows, cols) {
    page.focus();
    const sel = window.getSelection();
    if (!sel.rangeCount || !page.contains(sel.getRangeAt(0).commonAncestorContainer)) caretToEnd();
    const head = "<tr>" + "<th><br></th>".repeat(cols) + "</tr>";
    const body = ("<tr>" + "<td><br></td>".repeat(cols) + "</tr>").repeat(Math.max(0, rows - 1));
    document.execCommand("insertHTML", false, `<table><tbody>${head}${body}</tbody></table><p><br></p>`);
    page.dispatchEvent(new Event("input"));
  }

  function showTableSizePicker(rect) {
    const pop = popShell(rect);
    pop.innerHTML = `<div class="tbl-pop-title">Chèn bảng</div>
      <div class="tbl-grid">${Array.from({ length: 25 }, (_, i) =>
        `<span class="tbl-cell" data-r="${Math.floor(i / 5) + 1}" data-c="${(i % 5) + 1}"></span>`).join("")}</div>
      <div class="tbl-size-label">Rê chuột chọn cỡ</div>`;
    const label = pop.querySelector(".tbl-size-label");
    const cells = [...pop.querySelectorAll(".tbl-cell")];
    cells.forEach((c) => {
      c.addEventListener("mouseenter", () => {
        const R = +c.dataset.r, C = +c.dataset.c;
        cells.forEach((x) => x.classList.toggle("on", +x.dataset.r <= R && +x.dataset.c <= C));
        label.textContent = `${R} hàng × ${C} cột (hàng đầu là tiêu đề)`;
      });
      c.addEventListener("click", () => { insertTable(+c.dataset.r, +c.dataset.c); closeTblPop(); });
    });
  }

  function showTableMenu(rect, cell) {
    const pop = popShell(rect);
    pop.innerHTML = `<div class="tbl-pop-title">Chỉnh bảng</div>
      <button class="tbl-act" data-act="row">➕ Thêm hàng dưới</button>
      <button class="tbl-act" data-act="col">➕ Thêm cột phải</button>
      <button class="tbl-act" data-act="delrow">✖ Xoá hàng này</button>
      <button class="tbl-act" data-act="delcol">✖ Xoá cột này</button>
      <button class="tbl-act tbl-danger" data-act="deltbl">🗑 Xoá cả bảng</button>`;
    pop.addEventListener("click", (e) => {
      const act = e.target.closest(".tbl-act")?.dataset.act;
      if (!act) return;
      const table = cell.closest("table");
      const row = cell.parentElement;
      const idx = cell.cellIndex;
      if (act === "row") {
        const nr = document.createElement("tr");
        nr.innerHTML = "<td><br></td>".repeat(row.children.length);
        row.after(nr);
      } else if (act === "col") {
        table.querySelectorAll("tr").forEach((tr) => {
          const ref = tr.children[Math.min(idx, tr.children.length - 1)];
          const el = document.createElement(ref?.tagName === "TH" ? "th" : "td");
          el.innerHTML = "<br>";
          ref ? ref.after(el) : tr.appendChild(el);
        });
      } else if (act === "delrow") {
        row.remove();
        if (!table.querySelector("tr")) table.remove();
      } else if (act === "delcol") {
        table.querySelectorAll("tr").forEach((tr) => tr.children[idx]?.remove());
        if (!table.querySelector("td,th")) table.remove();
      } else if (act === "deltbl") {
        table.remove();
      }
      page.dispatchEvent(new Event("input"));
      closeTblPop();
    });
  }

  const tblBtn = slot.querySelector("[data-tbl]");
  tblBtn?.addEventListener("mousedown", (e) => e.preventDefault()); // giữ caret
  tblBtn?.addEventListener("click", () => {
    const rect = tblBtn.getBoundingClientRect();
    const cell = caretCell();
    if (cell) showTableMenu(rect, cell);
    else showTableSizePicker(rect);
  });

  // ── đổ màu highlight ──
  const HL_COLORS = ["#f9e79b", "#ffd9a8", "#f6c9c9", "#cdeedd", "#cfe4f7", "#e6d6f5"];
  const hlBtn = slot.querySelector("[data-hl]");
  hlBtn?.addEventListener("mousedown", (e) => e.preventDefault()); // giữ vùng bôi đen
  hlBtn?.addEventListener("click", () => {
    const pop = popShell(hlBtn.getBoundingClientRect());
    pop.innerHTML = `<div class="tbl-pop-title">Đổ màu highlight</div>
      <div class="hl-row">
        ${HL_COLORS.map((c) => `<button class="hl-swatch" data-c="${c}" style="background:${c}"></button>`).join("")}
        <button class="hl-swatch hl-none" data-c="" title="Bỏ màu highlight">✕</button>
      </div>`;
    pop.addEventListener("click", (e) => {
      const b = e.target.closest(".hl-swatch");
      if (!b) return;
      page.focus();
      document.execCommand("hiliteColor", false, b.dataset.c || "transparent");
      page.dispatchEvent(new Event("input"));
      closeTblPop();
    });
  });

  // Tab nhảy giữa các ô; Tab ở ô cuối cùng tự thêm hàng mới
  page.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const cell = caretCell();
    if (!cell) return;
    e.preventDefault();
    const cells = [...cell.closest("table").querySelectorAll("td,th")];
    const i = cells.indexOf(cell);
    let target = e.shiftKey ? cells[i - 1] : cells[i + 1];
    if (!target && !e.shiftKey) {
      const row = cell.parentElement;
      const nr = document.createElement("tr");
      nr.innerHTML = "<td><br></td>".repeat(row.children.length);
      row.after(nr);
      target = nr.firstElementChild;
      page.dispatchEvent(new Event("input"));
    }
    if (target) {
      const r = document.createRange();
      r.selectNodeContents(target);
      r.collapse(true);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
  });

  // ảnh dán kèm đoạn văn thường là link ngoài (Google Docs) → tải về, nén, nhúng vĩnh viễn
  async function inlineRemoteImages() {
    const imgs = [...page.querySelectorAll("img")].filter((i) => /^https?:\/\//i.test(i.getAttribute("src") || ""));
    if (!imgs.length) return;
    status.textContent = `Đang nhúng ${imgs.length} ảnh…`;
    status.className = "tb-status saving";
    let ok = 0;
    for (const img of imgs) {
      try {
        const resp = await fetch(img.getAttribute("src"), { mode: "cors" });
        if (!resp.ok) continue;
        const blob = await resp.blob();
        if (!blob.type.startsWith("image/")) continue;
        img.src = await shrinkImage(blob, 1000, 260_000);
        ok++;
      } catch { /* không tải được (chặn CORS) → giữ link gốc, ảnh vẫn hiển thị */ }
    }
    page.dispatchEvent(new Event("input"));
    if (ok) toast(`🖼️ Đã nhúng ${ok}/${imgs.length} ảnh dán kèm vào trang.`);
  }

  const imgBtn = slot.querySelector("[data-img]");
  const imgInput = slot.querySelector(".tb-img-file");
  imgBtn?.addEventListener("mousedown", () => { // nhớ vị trí con trỏ trước khi mở hộp chọn file
    const sel = window.getSelection();
    if (sel.rangeCount && page.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      savedImgRange = sel.getRangeAt(0).cloneRange();
    }
  });
  imgBtn?.addEventListener("click", () => imgInput.click());
  imgInput?.addEventListener("change", () => {
    const f = imgInput.files[0];
    imgInput.value = "";
    if (f) insertImageFile(f);
  });

  // dán: ảnh → nén & chèn; nội dung Google Docs/Word → giữ bảng + định dạng, lọc rác;
  // còn lại → chữ thuần
  page.addEventListener("paste", (e) => {
    const cd = e.clipboardData || window.clipboardData;
    const items = [...(cd?.items || [])];
    const imgItem = items.find((it) => it.type.startsWith("image/"));
    if (imgItem) {
      e.preventDefault();
      const f = imgItem.getAsFile();
      if (f) insertImageFile(f);
      return;
    }
    const htmlData = cd.getData("text/html");
    if (htmlData) {
      e.preventDefault();
      try {
        const clean = sanitizePastedHtml(htmlData);
        if (clean.trim()) {
          document.execCommand("insertHTML", false, clean);
          setTimeout(inlineRemoteImages, 60); // ảnh link ngoài → tải về nhúng hẳn vào trang
          return;
        }
      } catch { /* lỗi lọc → rơi xuống dán chữ thuần */ }
    }
    e.preventDefault();
    document.execCommand("insertText", false, cd.getData("text/plain"));
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

  // ── ghi chú 💧 kiểu docx ──
  if (comments) {
    activeCmt = { page, doSave, api: comments };
    page.addEventListener("mouseup", () => setTimeout(updateCmtFab, 10));
    page.addEventListener("keyup", () => setTimeout(updateCmtFab, 10));
    page.addEventListener("click", (e) => {
      const m = e.target.closest("mark.cmt");
      if (m) { e.preventDefault(); openThreadPopover(m); }
    });
  } else {
    activeCmt = null;
  }
}

/* ── GHI CHÚ (comment + highlight kiểu docx) ──────────── */
const cmtFab = document.createElement("button");
cmtFab.className = "cmt-fab hidden";
cmtFab.textContent = "💧 Ghi chú";
document.body.appendChild(cmtFab);

function hideCmtFab() { cmtFab.classList.add("hidden"); }

function updateCmtFab() {
  if (!activeCmt) return hideCmtFab();
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return hideCmtFab();
  const range = sel.getRangeAt(0);
  if (!activeCmt.page.contains(range.commonAncestorContainer)) return hideCmtFab();
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return hideCmtFab();
  cmtFab.style.left = Math.min(rect.right + window.scrollX + 6, window.scrollX + window.innerWidth - 130) + "px";
  cmtFab.style.top = (rect.top + window.scrollY - 40) + "px";
  cmtFab.classList.remove("hidden");
}

// bọc từng đoạn text trong vùng bôi đen bằng <mark class="cmt" data-cid>
function wrapRangeWithComment(root, range, cid) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) {
    if (range.intersectsNode(n) && n.textContent.length) nodes.push(n);
  }
  const marks = [];
  for (const node of nodes) {
    let start = 0, end = node.textContent.length;
    if (node === range.startContainer) start = range.startOffset;
    if (node === range.endContainer) end = range.endOffset;
    if (start >= end) continue;
    const r = document.createRange();
    r.setStart(node, start); r.setEnd(node, end);
    const mark = document.createElement("mark");
    mark.className = "cmt";
    mark.dataset.cid = cid;
    try { r.surroundContents(mark); marks.push(mark); } catch { /* bỏ qua đoạn không bọc được */ }
  }
  if (marks.length) marks[marks.length - 1].classList.add("cmt-end");
  return marks.length > 0;
}

function unwrapComment(root, cid) {
  root.querySelectorAll(`mark.cmt[data-cid="${cid}"]`).forEach((m) => {
    while (m.firstChild) m.parentNode.insertBefore(m.firstChild, m);
    m.remove();
  });
  root.normalize();
}

function fmtIso(at) {
  const d = at?.toDate ? at.toDate() : new Date(at);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function closeCmtPopover(runCancel = false) {
  if (cmtPopCloser) { document.removeEventListener("mousedown", cmtPopCloser); cmtPopCloser = null; }
  if (runCancel && cmtPop?._onCancel) cmtPop._onCancel();
  cmtPop?.remove();
  cmtPop = null;
}

function showCommentPopover({ x, y, thread, isNew, onCreate, onReply, onResolve, onCancel }) {
  closeCmtPopover(true);
  const pop = document.createElement("div");
  pop.className = "cmt-pop";
  const items = (thread?.items || []).map((it) => {
    const a = ACCOUNTS[it.by];
    return `<div class="cmt-item">
      <div class="cmt-item-head"><span>${a?.icon || "💬"} ${esc(a?.name || it.by)}</span><span class="cmt-time">${esc(fmtIso(it.at))}</span></div>
      <div class="cmt-item-text">${esc(it.text)}</div>
    </div>`;
  }).join("");
  pop.innerHTML = `
    <div class="cmt-pop-head"><span>💧 ${isNew ? "Ghi chú mới" : "Ghi chú"}</span><button class="btn-icon cmt-x" title="Đóng">✕</button></div>
    ${items ? `<div class="cmt-thread">${items}</div>` : ""}
    <textarea class="cmt-input" rows="2" placeholder="${isNew ? "Viết ghi chú cho đoạn vừa bôi sáng…" : "Trả lời…"}"></textarea>
    <div class="cmt-pop-actions">
      ${isNew ? "" : `<button class="btn btn-danger-ghost cmt-resolve" title="Xoá ghi chú & bỏ bôi sáng">Giải quyết ✓</button>`}
      <span class="spacer"></span>
      <button class="btn btn-gold cmt-send">${isNew ? "Lưu ghi chú" : "Gửi"}</button>
    </div>`;
  document.body.appendChild(pop);
  pop.style.left = Math.max(12, Math.min(x, window.scrollX + window.innerWidth - 320)) + "px";
  pop.style.top = (y + 8) + "px";
  pop._onCancel = onCancel || null;
  cmtPop = pop;

  const input = pop.querySelector(".cmt-input");
  setTimeout(() => input.focus(), 40);
  const submit = async () => {
    const text = input.value.trim();
    if (!text) { if (isNew) closeCmtPopover(true); return; }
    try { await (isNew ? onCreate(text) : onReply(text)); }
    catch (e) { toast("Không lưu được ghi chú: " + e.message, true); }
  };
  pop.querySelector(".cmt-send").addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === "Escape") closeCmtPopover(true);
  });
  pop.querySelector(".cmt-x").addEventListener("click", () => closeCmtPopover(true));
  pop.querySelector(".cmt-resolve")?.addEventListener("click", async () => {
    try { await onResolve(); } catch (e) { toast("Không xoá được: " + e.message, true); }
  });
  cmtPopCloser = (e) => { if (!pop.contains(e.target)) closeCmtPopover(true); };
  setTimeout(() => document.addEventListener("mousedown", cmtPopCloser), 0);
}

cmtFab.addEventListener("mousedown", (e) => {
  e.preventDefault();
  if (!activeCmt) return;
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return hideCmtFab();
  const range = sel.getRangeAt(0).cloneRange();
  const cid = "c" + Math.random().toString(36).slice(2, 10);
  const ctx = activeCmt;
  const ok = wrapRangeWithComment(ctx.page, range, cid);
  sel.removeAllRanges();
  hideCmtFab();
  if (!ok) { toast("Không bôi sáng được vùng này — thử chọn gọn hơn.", true); return; }
  const marks = ctx.page.querySelectorAll(`mark.cmt[data-cid="${cid}"]`);
  const rect = marks[marks.length - 1].getBoundingClientRect();
  showCommentPopover({
    x: rect.left + window.scrollX,
    y: rect.bottom + window.scrollY,
    isNew: true,
    onCreate: async (text) => {
      const obj = { ...ctx.api.data() };
      obj[cid] = { items: [{ by: me.email, text, at: new Date().toISOString() }] };
      await ctx.api.save(obj);
      await ctx.doSave();
      cmtPop._onCancel = null;
      closeCmtPopover();
      toast("💧 Đã thả ghi chú lên trang.");
    },
    onCancel: () => unwrapComment(ctx.page, cid),
  });
});

function openThreadPopover(markEl) {
  if (!activeCmt) return;
  const ctx = activeCmt;
  const cid = markEl.dataset.cid;
  const rect = markEl.getBoundingClientRect();
  const pos = { x: rect.left + window.scrollX, y: rect.bottom + window.scrollY };
  const render = () => {
    showCommentPopover({
      ...pos,
      isNew: false,
      thread: ctx.api.data()[cid] || { items: [] },
      onReply: async (text) => {
        const obj = { ...ctx.api.data() };
        const t = obj[cid] || { items: [] };
        obj[cid] = { items: [...t.items, { by: me.email, text, at: new Date().toISOString() }] };
        await ctx.api.save(obj);
        render(); // vẽ lại thread với câu trả lời mới
      },
      onResolve: async () => {
        unwrapComment(ctx.page, cid);
        const obj = { ...ctx.api.data() };
        delete obj[cid];
        await ctx.api.save(obj);
        await ctx.doSave();
        closeCmtPopover();
        toast("Ghi chú đã được giải quyết — bôi sáng tan vào sóng.");
      },
    });
  };
  render();
}

/* ── TRUYỀN ÂM (popchat) ──────────────────────────────── */
function fmtChatTime(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
}

function renderChatList() {
  const list = $("#chat-list");
  if (!list) return;
  list.innerHTML = chatMsgs.map((m) => {
    const mine = m.by === me?.email;
    const a = ACCOUNTS[m.by];
    let body, stickerCls = "";
    if (m.stickerId) {
      const st = stickers.find((s) => s.id === m.stickerId);
      body = st
        ? `<img class="chat-sticker" src="${st.data}" alt="sticker">`
        : `<div class="chat-text">🖼️ <i>(sticker đã bị xoá khỏi kho)</i></div>`;
      if (st) stickerCls = " sticker-bubble";
    } else {
      body = `<div class="chat-text">${esc(m.text)}</div>`;
    }
    return `<div class="chat-msg ${mine ? "mine" : ""}">
      ${mine ? "" : `<span class="chat-avatar" title="${esc(a?.name || m.by)}">${a?.icon || "🫧"}</span>`}
      <div class="chat-bubble${stickerCls}">
        ${body}
        <div class="chat-time">${fmtChatTime(m.at)}</div>
      </div>
    </div>`;
  }).join("");
  list.scrollTop = list.scrollHeight;
}

function updateChatBadge() {
  const b = $("#chat-badge");
  if (!b) return;
  b.textContent = chatUnread > 9 ? "9+" : String(chatUnread);
  b.classList.toggle("hidden", chatUnread === 0);
}

function notifyBrowser(m) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!document.hidden && chatOpen) return;
  const a = ACCOUNTS[m.by];
  const body = m.stickerId ? "🖼️ Gửi một sticker" : (m.text || "").slice(0, 120);
  // silent: true — hiện thông báo nhưng không phát tiếng
  try { new Notification(`${a?.icon || "🫧"} ${a?.name || m.by}`, { body, silent: true }); } catch {}
}

function onChatMsgs(msgs) {
  const prevLen = chatMsgs.length;
  chatMsgs = msgs;
  renderChatList();
  if (!chatInit) { chatInit = true; return; }
  const fresh = msgs.slice(prevLen).filter((m) => m.by !== me?.email);
  if (!fresh.length) return;
  const last = fresh[fresh.length - 1];
  if (!chatOpen) {
    chatUnread += fresh.length;
    updateChatBadge();
    const a = ACCOUNTS[last.by];
    toast(`${a?.icon || "🫧"} ${a?.name || last.by}: ${last.stickerId ? "đã gửi một sticker 🖼️" : (last.text || "").slice(0, 60)}`);
  }
  notifyBrowser(last);
}

function toggleChat(open) {
  chatOpen = open ?? !chatOpen;
  $("#chat-panel").classList.toggle("hidden", !chatOpen);
  $("#chat-fab").classList.toggle("chat-fab-active", chatOpen);
  if (chatOpen) {
    chatUnread = 0;
    updateChatBadge();
    renderChatList();
    setTimeout(() => $("#chat-input")?.focus(), 60);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
}

$("#chat-fab")?.addEventListener("click", () => toggleChat());
$("#chat-close")?.addEventListener("click", () => toggleChat(false));
$("#chat-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const inp = $("#chat-input");
  const text = inp.value.trim();
  if (!text) return;
  inp.value = "";
  try { await store.sendChat({ text }); }
  catch (err) { toast("Sóng không truyền được: " + err.message, true); inp.value = text; }
});

/* ── Kho sticker 🖼️ ──────────────────────────────────── */
function renderStickerGrid() {
  const grid = $("#sticker-grid");
  if (!grid) return;
  grid.innerHTML = stickers.map((s) => `
    <span class="sticker-item" data-id="${s.id}" title="Ấn để gửi sticker">
      <img src="${s.data}" alt="sticker">
      <button class="sticker-del" data-del="${s.id}" title="Xoá sticker khỏi kho">✕</button>
    </span>`).join("") + `
    <label class="sticker-add" title="Thêm ảnh làm sticker (tự nén)">＋<input type="file" accept="image/*" hidden></label>`;
}

$("#btn-sticker")?.addEventListener("click", () => {
  $("#sticker-picker").classList.toggle("hidden");
  renderStickerGrid();
});

// quay lại ô gõ chữ → khung sticker tự thu mình
$("#chat-input")?.addEventListener("focus", () => {
  $("#sticker-picker")?.classList.add("hidden");
});

$("#sticker-grid")?.addEventListener("click", async (e) => {
  const del = e.target.closest("[data-del]");
  if (del) {
    e.stopPropagation();
    if (!confirm("Xoá sticker này khỏi kho chung? (Tin nhắn cũ từng gửi nó sẽ không hiện được nữa)")) return;
    try { await store.deleteSticker(del.dataset.del); }
    catch (err) { toast("Không xoá được sticker: " + err.message, true); }
    return;
  }
  const item = e.target.closest(".sticker-item");
  if (item) {
    try { await store.sendChat({ stickerId: item.dataset.id }); }
    catch (err) { toast("Sóng không truyền được: " + err.message, true); }
  }
});

$("#sticker-grid")?.addEventListener("change", async (e) => {
  const input = e.target;
  if (input.type !== "file" || !input.files?.[0]) return;
  const f = input.files[0];
  input.value = "";
  if (!f.type.startsWith("image/")) { toast("File này không phải ảnh.", true); return; }
  try {
    toast("Đang nén ảnh thành sticker…");
    const data = await shrinkImage(f, 240, 140_000);
    await store.addSticker(data);
    toast("🖼️ Sticker mới đã vào kho.");
  } catch (err) { toast("Không thêm được sticker: " + err.message, true); }
});

/* Khởi động sau khi toàn bộ module đã được khai báo */
boot();
