# Handoff — Tinh Hải Vạn Giới
Cập nhật: 2026-09-26 (v82)

Web hub roleplay riêng của hai người, theme biển đêm & trời sao. SPA thuần
(`index.html` + `app.js` + `styles.css`) + Firebase Auth Google + Firestore realtime.
Repo `al9801/tinh-hai-van-gioi`, live https://al9801.github.io/tinh-hai-van-gioi/
(GitHub Actions tự deploy khi push `main`).

## Trạng thái
- Bản chạy: v82. Nút **Mở rộng (toàn màn hình)** tách khỏi chip công cụ thành nút riêng có chữ, tô gold, đặt đầu `.htmlmap-bar` (`#hf-full`, `data-hf="full"`) — user bấm nhiều nhất mà trước đây là icon nhỏ sát nút xoá 🗑, dễ chạm nhầm. Chip `#hf-tools` giờ chỉ còn `download`. paint() toggle `#hf-full` theo `curHtml` (như tools). Mobile ≤430px: nút lên hàng riêng trên cùng, ghim trái bằng `margin-right:auto`. Logic click giữ nguyên (delegation trên `.htmlmap-bar`).
- Bản chạy trước: v81. **Bản đồ / Hồ sơ nhiều trang + tải xuống, thanh toàn icon.** `renderHtmlFileTab` viết lại: danh sách trang lưu trên doc map (`htmlPages` / `profilePages` = `[{id,name}]`), nội dung ở `mapfiles/{id}` — trang đầu dùng id gốc (`{mapId}` / `{mapId}__hoso`), trang thêm `…__p<base36>`. Map cũ chỉ có cờ `hasHtml`/`hasProfile` → tự coi là 1 trang (`hfPagesOf`); cờ vẫn được ghi để thẻ cổng/tab mặc định dùng tiếp. Thanh = chip lật trang `‹ n/N › | ＋ ⟳ 🗑` (tái dùng `.page-nav-chip`/`.pgn-btn`) + chip `⛶ ⬇`, icon Lucide SVG inline (`HF_IC`). Phím ←→ lật (listener global thêm selector `.hf-nav`). `deleteMap` dọn cả trang thêm. Không cần đổi firestore.rules (mapfiles/{id} đã mở chung). Verify demo: thêm/lật/thay/gỡ tới rỗng/tải xuống, 375px không tràn.
- Bản chạy trước: v80. **Thanh cuộn kéo được** ở mép phải (`#scrollbar`/`#scrollbar-thumb` trong index.html) — native scrollbar ẩn trên macOS / không có trên cảm ứng nên user "vuốt rất lâu mới tới đáy". Tự vẽ: `scrollbarUpdate()` ẩn/hiện theo `scrollHeight-innerHeight<400`, tính chiều cao/vị trí thumb theo tỷ lệ; kéo cả chuột (`mousedown/move/up`) lẫn cảm ứng (`touchstart/move/up`, touchmove non-passive để preventDefault). Hook vào listener scroll + `resize` + cuối `route()` (đo lại sau 350ms cho ảnh tải trễ). Thanh hiện thường trực khi trang dài (không tự-ẩn — user muốn THẤY nó). BẪY đã dính: `wireScrollbar()` ban đầu để IIFE chạy ngay ~dòng 132 → TDZ vì `$` khai báo dòng 146 → cả app trắng. Chuyển thành function, gọi ở cuối file cạnh `boot()`. Verify chuột+cảm ứng kéo tới đỉnh/đáy, ẩn ở trang ngắn (home).
- Bản chạy trước: v79. Thêm 2 tiện ích soạn thảo: (1) **Chặn mất chữ** — `editorDirty` (app.js ~dòng 46) bật khi gõ, tắt khi lưu xong/mount khung mới; `beforeunload` global flush + `e.returnValue=""` hỏi lại khi còn dirty; `visibilitychange` flush lúc ẩn tab (mobile không có hộp thoại beforeunload). Bỏ listener beforeunload cũ đặt per-editor. (2) **Mở web nhảy về chỗ soạn dở** — `noteLastEdit()` ghi `location.hash` vào localStorage `thvg-last-edit` khi gõ; `pageMem` giờ persist (`thvg-page-mem`) qua tải lại; `maybeResumeLastEdit()` chạy sau snapshot maps/drafts đầu tiên (`mapsLoaded`/`draftsLoaded`), CHỈ nhảy khi mở web ở hash rỗng/`#/` và cổng/nháp còn tồn tại — mở link cụ thể thì tôn trọng. Verify đủ 4 ca bằng trình duyệt thật.
- Bản chạy trước: v78. v78: mảng xám status bar iPhone VẪN còn sau khi gỡ cài lại (v77 đổi nền header không ăn) → kết luận không phải header mà là iOS phủ material lên vùng status bar ở chế độ `black-translucent`. Đổi `apple-mobile-web-app-status-bar-style` → **`black`** (thanh tối đặc, content nằm dưới, không lớp phủ). CHỜ user xác nhận trên máy thật (không repro được trong pane). Nếu VẪN còn: nghi iOS 26 Liquid Glass status bar cấp OS — web không đè được; cân nhắc bỏ `viewport-fit=cover` hoặc chấp nhận. Lưu ý: với `black`, safe-area-inset-top≈0 nên header padding-top về 12px, trăng vẫn ở 118px là đủ.
- Bản chạy trước: v77. v77: iPhone PWA hiện **mảng xám ở dải status bar** (Android không) — do `black-translucent` cho nội dung chui dưới status bar + header là KÍNH MỜ (`rgba(6,12,26,.82)`+`backdrop-filter:blur`) blur ánh trăng/nền sáng sau lưng → xám. Fix `@720px .app-header{background:#0a1228; backdrop-filter:none}` (đặc, khớp theme-color) → status bar tối liền mạch như Android. (Desktop giữ kính mờ.)
- Bản chạy trước: v76. v76: trăng NỀN `.moon` (top:7vh ~57px) bị header mobile (safe-area + nav xuống hàng ~140px) đè cắt nửa trên → `@720px .moon{top:calc(env(safe-area-inset-top)+118px); width/height:94px}` cho tròn vành dưới header. (Đây là trăng nền trong `.ocean-bg`, KHÁC trăng trong icon app.)
- Bản chạy trước: v75. v73: preview nháp bẻ chuỗi dài ở cả bản gốc. v74→v75: **icon app mới**. v74 (bản 1) bị chê xấu (sao vàng giữa). v75 (chốt): **Cá Voi Sao lượn dưới TRĂNG TRÒN** — cá voi là silhouette rắc chòm sao (dùng lại path cá voi của app), viền lưng ánh trăng, vệt sao ở đuôi, bỏ hẳn ngôi sao giữa. File nguồn `icon-source.svg` LƯU TRONG REPO để chỉnh sau. Favicon inline = mô-típ trăng+cá thu nhỏ. `?v=75` cho icon trong manifest/apple-touch để bust cache.
- QUY TRÌNH đổi icon (máy KHÔNG có rsvg/imagemagick/cairosvg): sửa `icon-source.svg` → chạy server python nhỏ trong scratchpad phục vụ harness.html (canvas `drawImage` render SVG→PNG) + nhận POST base64 ghi thẳng PNG (base64 quá lớn để trả qua tool) → `sips -Z 192 icon-192.png` tạo bản nhỏ → copy vào repo. LƯU Ý cổng: 8791 bị app node khác chiếm, dùng cổng lạ (8642). Icon cài trên home screen chỉ đổi khi GỠ cài lại (OS cache).
- Bản chạy trước: v72. v71: danh sách nháp `.drafts-grid` chia 2 ô ≤600px như Biển Cổng (thu gọn thẻ, meta xếp dọc owner/ngày, bỏ dấu `·` bằng `span:nth-child(2){display:none}`). v72 VÁ: thẻ nháp chứa URL dài không dấu cách kéo phình 1 cột → hai cột lệch hẳn (ảnh thật). Nguyên nhân: `1fr` có min = min-content. Fix: `repeat(2, minmax(0,1fr))` cho cả `.drafts-grid` lẫn `.map-grid` + `overflow-wrap:anywhere` cho `.draft-card-preview/title`. BÀI HỌC: grid 2 ô luôn dùng `minmax(0,1fr)` khỏi nội dung kéo lệch.
- v70 (đợt trước): Cụm v68–v70 (sau khi đóng vai tester soi toàn bộ mobile ở 375px):
  - **Toolbar soạn thảo giấu 14/22 nút** sau cuộn ngang → thêm nút `.tb-more` (mũi tên › gold nhấp nháy, sticky phải, nép trái nút 💾) trong mountEditor; JS `updMore()` toggle `.hidden` theo `scrollWidth/clientWidth/scrollLeft` (chạy rAF + setTimeout 200/600 vì layout/font chưa xong ở rAF đầu → từng ẩn nhầm); bấm nút = `scrollBy 70%`. Chỉ hiện ≤720px (base `.tb-more{display:none}`).
  - **Thẻ cổng home**: bỏ nhãn "Chạm gần nhất:" trên mobile (`.mcf-lbl{display:none}`, giữ ở tooltip), bọc ngày trong `.mcf-time{white-space:nowrap}` để xuống dòng nguyên cụm (khỏi bẻ "10:34"), `.map-grid` gap dọc 20px, `.fish-row` nhỏ lại (bottom:-8px).
  - **Presence** (`.presence-dock`): top:86px đè header mobile → dời `bottom:150px right:14px`, bubble 34px. LƯU Ý: override PHẢI đặt SAU định nghĩa base trong file (base ở ~dòng 1489) — đặt trong `@media 720px` phía trên đó thì THUA thứ tự file (cùng specificity). Đây là lần thứ 2 dính bẫy này (xem sort-sel).
  - **Câu chữ modal Lịch sử**: bỏ "bên trái" (sai khi mobile xếp dọc) → "Chọn một mốc thời gian để xem lại bản cũ."
  - Đã verify tất cả bằng trình duyệt thật (JS đo + ảnh).
- Cụm v64–v67 (tối ưu mobile đợt 2, đã test thật ở 375px):
  - Thư Phòng: tựa `.page-title` chiếm trọn hàng đầu (`.drafts-head-row > div{flex:1 1 100% !important}` — override INLINE `style="flex:1"` trong app.js, đây là lý do fix đầu tiên không ăn), hàng dưới = ô tìm + nút "Trải trang giấy mới" thu thành icon-btn ✎ tròn 44px.
  - Trang nháp (renderDraftView): 3 nút ghim/đẩy/xoá chuyển sang `icon-btn` (`.ib-ic`/`.ib-tx`), ≤600px thành chip tròn 44px 📌🌊🗑 (`.map-actions .icon-btn`), ẩn `.ib-tx`. updateDraftMeta + trạng thái loading của #btn-draft-to-map cập nhật qua `.ib-tx` thay vì `textContent` (khỏi xoá spans). Ẩn `.map-actions .spacer` mobile.
  - Bảng trong doc: `@media 600px .doc-page table{table-layout:fixed;width:100%}` + `word-break/overflow-wrap` — ĐÃ verify: bảng 6 cột + URL dài không tràn (scrollWidth==clientWidth). Fix có từ v63 nhưng user thấy bản CACHE cũ (xem mục cache dưới).
  - Vuốt lật trang (mountPagedEditor): touchstart/touchend trên `slot`, vuốt ngang dứt khoát (|dx|≥60, |dx|>1.8|dy|, <700ms) → click `.pgn-btn[data-pgn=prev/next]`; vuốt trái = trang sau. BỎ QUA khi touchstart trên `.editor-toolbar`/`.page-nav-wrap` (toolbar cuộn ngang nằm trong slot). Đã verify cả 4 ca (trái/phải/dọc/chậm/toolbar).
- v63 cũ: iOS input ≥16px (hết zoom), chat sheet mobile (100dvh).
- Cụm v57–v63: PWA cài màn hình chính + tối ưu giao diện điện thoại đợt 1.
- v63: (1) HẾT tự phóng to khi chạm ô nhập trên iOS — mọi input text ép `font-size:16px` ở `@media 720px` (chat/tìm/modal trước đây <16px là thủ phạm zoom). (2) Bảng dán KHỎI bị xén — `@media 600px`: `.doc-page table{table-layout:fixed}` + `word-break/overflow-wrap` cho td/th (sanitizePastedHtml đã bỏ hết width cột nên chia đều + xuống dòng là đủ). (3) Truyền Âm trên phone mở dạng sheet gần full, cao `min(72dvh, 100dvh-96px)`, chat-form chừa `safe-area-inset-bottom`. (4) Nhãn footer sửa lệch v56→v63.
- PWA xong: `manifest.json`, `sw.js`, `icon-192.png`/`icon-512.png`; cài lên home screen được (icon ⭐).
- Mobile xong: lưới cổng 2 cột, thanh công cụ soạn thảo cuộn ngang, nút map view thành chip icon 1 hàng, sort thành icon ⇅, pager căn giữa, safe-area cho header.
- Dán: bỏ ám màu nền + Ctrl/Cmd+Shift+V dán thô (v59).
- Không có việc code đang mở dở.

## Việc kế tiếp
- Không có việc bắt buộc. Chờ phản hồi người dùng về giao diện điện thoại.
- Còn 1 điểm nhỏ chưa động: pill ghi chú "💧N" nổi đè góc trên-phải trang giấy khi soạn (dùng được, chỉ hơi lửng lơ). Sửa nếu user than.
- KHI VERIFY DEPLOY: bản mới lên GitHub Pages nhưng service worker vẫn phục vụ INDEX cache cũ → trình duyệt tải `styles.css?v=<cũ>`. Muốn thấy bản mới ngay phải cache-bust URL (thêm `&fresh=N`) hoặc Cmd/Ctrl+Shift+R. Lúc test bằng trình duyệt: kiểm `getComputedStyle`/`link[href]` để chắc đã ăn `?v` mới, đừng tin ảnh chụp lần đầu.
- Nếu người dùng than icon sort/chip khó hiểu: cân nhắc thêm nhãn nhỏ dưới icon.
- Khi sửa js/css BẤT KỲ: tăng `?v=N` trong `index.html` (5 chỗ: manifest, styles, firebase-config, app.js, sw.js), commit + push.

## Đang dở dang
- Không có.

## Quyết định
- 2026-09-20 Resume dùng `editorDirty` là cờ bool (bật ở input, tắt ở doSave) thay vì so `page.innerHTML !== lastSaved` — vì ảnh hydrate làm innerHTML luôn khác lastSaved (storage-HTML), so chuỗi sẽ báo dirty giả.
- 2026-09-16 PWA service worker dùng network-first (cache `thvg-shell-v1`) vì đề bust cache `?v=N`; network-first để online luôn lấy bản mới, chỉ dùng cache khi offline.
- 2026-09-16 Điện thoại ẩn nút "Mở Google AI Studio" inline (`#mv-gas`) vì đã có bong bóng nổi `#gas-fab` 🌀 làm đúng việc đó — tránh trùng.
- 2026-09-16 Ẩn 2 pill lật trang `.page-side` ở rìa trên mobile (đè toolbar), chỉ hiện lại khi `.editor-wrap.reading`; lật trang thường dùng cụm `.page-nav-chip` (‹1/2›+🗑) và phím ←→.
- 2026-09-16 Bỏ giữ `background-color` khi dán (`sanitizePastedHtml`) vì chữ cop từ web/Docs bị ám nền; muốn tô sáng dùng nút 🖍.
- 2026-09-16 Mobile ≤600px: `.map-grid` ép 2 cột (base auto-fill minmax 255px = 1 cột trên phone → lôm côm).
- 2026-09-17 Sort trên mobile = nút icon ⇅: `.browse-bar .sort-sel` đặt `color:transparent` + `appearance:none`, phủ `.sort-ic`; specificity `.browse-bar` để thắng rule base đứng sau trong file.
- Nền tảng (cũ, đã kiểm chứng): dùng data-URL nén client-side thay Firebase Storage (project mới đòi Blaze); chunk nội dung khi >900KB BYTE; nội dung lưu "storage HTML" (ảnh là `data-iid` tham chiếu, hydrate khi load).

## Đã thử, không dùng
- Nhúng AI Studio trong iframe — Google chặn (x-frame-options: DENY). Bong bóng 🌀 chỉ mở tab mới.
- Gói Google AI Pro cho API key — không áp (chỉ cho AI Studio UI).
- Phòng chơi Gemini + nút "Song song" — gỡ sạch ở v38, đừng đề xuất lại.
- Giữ màu nền khi dán — gây ám nền, bỏ ở v59.
- `.page-side` ở rìa trên mobile — đè lên thanh công cụ, đã ẩn.
- Đăng ký service worker trong khung xem trước localhost của Claude — lỗi "unknown error" (sandbox chặn); chỉ chạy trên GitHub Pages HTTPS. Test PWA phải trên máy thật/HTTPS.

## Ràng buộc ngoài
- `firestore.rules` phải Publish thủ công trong Firebase Console mỗi lần đổi. Rule `history` (v51) và guest emails cần đã publish, nếu chưa thì tính năng lịch sử / cá ghé thăm lỗi đọc.
- Thêm cá ghé thăm mới: sửa CẢ `window.GUESTS` trong `firebase-config.js` LẪN `guests()` trong `firestore.rules` + Publish.
- Firestore đếm BYTE không phải ký tự (giới hạn ~1MB/doc; file HTML map/hồ sơ ≤0.9MB).
- Safe-area (đồng hồ khỏi đè logo) chỉ có tác dụng ở bản đã cài PWA standalone, không thấy khi mở trong trình duyệt thường.
- Máy có `gh` CLI đăng nhập sẵn tài khoản al9801.

## Tham chiếu nhanh
- Tài khoản chủ: `dinhhieungan@gmail.com` = 🦇 Dơi, `kimtuoc259@gmail.com` = ⭐ Cá Voi Sao (trong `firebase-config.js` ACCOUNTS).
- Demo không cần Firebase: `?demo=1`; xem góc cá ghé thăm thêm `&guest=1`.
- Pattern nút gọn mobile: `.icon-btn` + `<span class="ib-ic">` + `<span class="ib-tx">` (ẩn `.ib-tx` ở ≤600px thành chip icon).
- Media query mobile chính trong `styles.css`: `@media (max-width: 720px)`, `@media (max-width: 600px)`, `@media (max-width: 430px)`.
- Memory dự án: `~/.claude/.../memory/du-an-tinh-hai-van-gioi.md` (giữ đồng bộ với file này).
- CẢNH BÁO tái diễn: khi thay khối lớn bằng string-replace dễ nuốt nhầm hàm giữa (đã dính updateMapMeta v42, toggleRecommend v48). Sau refactor lớn: `node --check app.js` VÀ test click nút chính (tiến cử, lưu).
