// ============================================================
//  CẤU HÌNH — chỉ cần sửa file này, không cần đụng code khác
// ============================================================

// BƯỚC 1: Dán firebaseConfig lấy từ Firebase Console vào đây
// (Xem hướng dẫn từng bước trong README.md)
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBVLY60RSHrRNXoN7v2hTTJT9dSkFYWCJw",
  authDomain: "tinh-hai-van-gioi.firebaseapp.com",
  projectId: "tinh-hai-van-gioi",
  storageBucket: "tinh-hai-van-gioi.firebasestorage.app",
  messagingSenderId: "483530711647",
  appId: "1:483530711647:web:bc644b1e309745caf5f1ea",
};

// BƯỚC 2: Danh sách email được phép bước qua Cổng Rừng
// + linh thú đại diện của mỗi người (icon gắn lên map khi tiến cử)
window.ACCOUNTS = {
  "dinhhieungan@gmail.com": { icon: "🦇", name: "Dơi" },
  "kimtuoc259@gmail.com": { icon: "⭐", name: "Cá Voi Sao" },
};

// Link Google AI Studio mặc định khi tạo map mới (mỗi map sửa riêng được)
window.DEFAULT_GAS_LINK = "https://aistudio.google.com/";
