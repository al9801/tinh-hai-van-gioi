# 🌲 Đại Ngàn Vạn Giới

Cổng thế giới riêng của hai kẻ giữ rừng 🦇 🐋 — nơi lưu các MAP (thế giới roleplay cho Google AI Studio), prompt, và những trang nháp ý tưởng.

- **Rừng Cổng** — lưới các cánh cổng, mỗi cổng là một map. Huy hiệu linh thú ở góc thẻ là dấu "tiến cử" của từng người (cả hai cùng tiến cử → hai huy hiệu đậu cạnh nhau).
- **Mỗi map** — nút mở Google AI Studio ngay đầu trang, nút tiến cử, và 3 trang giấy kiểu docx: *Nội dung Map · Prompt · Ý tưởng nháp*. Tự động lưu, đồng bộ realtime giữa hai tài khoản.
- **Thư Phòng Cổ Mộc** — kho nháp chung, mỗi nháp là một trang giấy docx.
- Chỉ email trong danh sách mới bước qua Cổng Rừng (đăng nhập Google + chặn cứng bằng Firestore Rules).

---

## Cài đặt lần đầu (~7 phút, chỉ làm 1 lần)

### Bước 1 — Tạo dự án Firebase
1. Mở https://console.firebase.google.com → **Add project** (Tạo dự án).
2. Đặt tên tuỳ ý, ví dụ `dai-ngan-van-gioi`. **Tắt** Google Analytics cho gọn → Create.

### Bước 2 — Bật đăng nhập Google
1. Menu trái: **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → chọn **Google** → **Enable** → chọn support email → Save.

### Bước 3 — Cho phép tên miền GitHub Pages
1. Vẫn trong **Authentication** → tab **Settings** → **Authorized domains** → **Add domain**.
2. Thêm: `<username>.github.io` (thay `<username>` bằng tên tài khoản GitHub của bạn).

### Bước 4 — Tạo Firestore
1. Menu trái: **Build → Firestore Database** → **Create database**.
2. Chọn **Production mode** → Next → region `asia-southeast1 (Singapore)` → Enable.

### Bước 5 — Dán Rules (chặn cứng người lạ)
1. Trong Firestore → tab **Rules**.
2. Xoá hết, dán toàn bộ nội dung file **`firestore.rules`** trong repo này vào → **Publish**.

### Bước 6 — Lấy config dán vào trang
1. Bấm ⚙️ (Project settings) → tab **General** → kéo xuống **Your apps** → bấm biểu tượng **`</>`** (Web).
2. Đặt nickname tuỳ ý → **Register app** (KHÔNG cần Firebase Hosting).
3. Copy khối `firebaseConfig = { ... }` hiện ra.
4. Mở file **`firebase-config.js`** trong repo, thay các dòng `PASTE_...` bằng giá trị vừa copy.
5. Commit + push:
   ```bash
   git add firebase-config.js && git commit -m "Nối rừng với Firebase" && git push
   ```

> 💡 `apiKey` của Firebase web **không phải bí mật** — an toàn nằm ở Firestore Rules (bước 5), nên để trong repo public vẫn ổn.

### Đổi / thêm người được vào
Sửa **2 chỗ** (phải khớp nhau):
1. `firebase-config.js` → `window.ACCOUNTS` (email + icon linh thú).
2. Firebase Console → Firestore → Rules → thêm email vào danh sách → Publish.

---

## Chạy thử trên máy

```bash
cd dai-ngan-van-gioi && python3 -m http.server 8080
```
Mở http://localhost:8080 (localhost đã nằm sẵn trong Authorized domains của Firebase).

## Cấu trúc

| File | Vai trò |
|---|---|
| `index.html` | Khung trang + các màn hình |
| `styles.css` | Toàn bộ giao diện rừng đại ngàn |
| `app.js` | Đăng nhập, realtime, editor docx, tiến cử |
| `firebase-config.js` | **File duy nhất cần sửa** — config + danh sách email |
| `firestore.rules` | Rules dán vào Firebase Console |
