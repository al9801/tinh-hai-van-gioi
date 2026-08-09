// ============================================================
//  CẤU HÌNH — chỉ cần sửa file này, không cần đụng code khác
// ============================================================

// BƯỚC 1: Dán firebaseConfig lấy từ Firebase Console vào đây
// (Xem hướng dẫn từng bước trong README.md)
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY_VAO_DAY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

// BƯỚC 2: Danh sách email được phép bước qua Cổng Rừng
// + linh thú đại diện của mỗi người (icon gắn lên map khi tiến cử)
window.ACCOUNTS = {
  "dinhhieungan@gmail.com": { icon: "🦇", name: "Dơi Đêm" },
  "kimtuoc259@gmail.com": { icon: "🐋", name: "Cá Voi Sao" },
};

// Link Google AI Studio mặc định khi tạo map mới (mỗi map sửa riêng được)
window.DEFAULT_GAS_LINK = "https://aistudio.google.com/";
