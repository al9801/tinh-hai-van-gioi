# Handoff — Tinh Hải Vạn Giới
Cập nhật: 2026-09-17 (v70)

Web hub roleplay riêng của hai người, theme biển đêm & trời sao. SPA thuần
(`index.html` + `app.js` + `styles.css`) + Firebase Auth Google + Firestore realtime.
Repo `al9801/tinh-hai-van-gioi`, live https://al9801.github.io/tinh-hai-van-gioi/
(GitHub Actions tự deploy khi push `main`).

## Trạng thái
- Bản chạy: v70. Cụm v68–v70 (sau khi đóng vai tester soi toàn bộ mobile ở 375px):
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
