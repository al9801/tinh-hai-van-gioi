# Handoff — Tinh Hải Vạn Giới
Cập nhật: 2026-09-17 00:00

Web hub roleplay riêng của hai người, theme biển đêm & trời sao. SPA thuần
(`index.html` + `app.js` + `styles.css`) + Firebase Auth Google + Firestore realtime.
Repo `al9801/tinh-hai-van-gioi`, live https://al9801.github.io/tinh-hai-van-gioi/
(GitHub Actions tự deploy khi push `main`).

## Trạng thái
- Bản chạy: v62. Cụm việc gần nhất (v57–v62): PWA cài màn hình chính + tối ưu giao diện điện thoại.
- PWA xong: `manifest.json`, `sw.js`, `icon-192.png`/`icon-512.png`; cài lên home screen được (icon ⭐).
- Mobile xong: lưới cổng 2 cột, thanh công cụ soạn thảo cuộn ngang, nút map view thành chip icon 1 hàng, sort thành icon ⇅, pager căn giữa, safe-area cho header.
- Dán: bỏ ám màu nền + Ctrl/Cmd+Shift+V dán thô (v59).
- Không có việc code đang mở dở.

## Việc kế tiếp
- Không có việc bắt buộc. Chờ phản hồi người dùng về giao diện điện thoại.
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
