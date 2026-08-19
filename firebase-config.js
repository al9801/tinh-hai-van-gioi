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

// BƯỚC 3: Cá Ghé Thăm 🐟 — khách được duyệt, CHỈ XEM map (không sửa, không thấy
// Thư Phòng / chat). Thêm email vào đây VÀ vào firestore.rules rồi Publish lại rules.
window.GUESTS = [
  "jorneiden226@gmail.com",
  "keycorn23@gmail.com",
];

// Danh tính ngẫu nhiên cho cá ghé thăm (gán tự động theo email, cố định không đổi)
window.SEA_CREATURES = [
  { icon: "🐙", name: "Bạch Tuộc Mơ Mộng" },
  { icon: "🦀", name: "Cua Càng Lửa" },
  { icon: "🦐", name: "Tôm Búng Trăng" },
  { icon: "🐠", name: "Cá Hề Nghiêm Túc" },
  { icon: "🐡", name: "Cá Nóc Phồng Má" },
  { icon: "🦑", name: "Mực Lem Mực" },
  { icon: "🐢", name: "Rùa Trễ Hẹn" },
  { icon: "🦈", name: "Cá Mập Sún Răng" },
  { icon: "🐬", name: "Cá Heo Cười Khẽ" },
  { icon: "🦞", name: "Tôm Hùm Ngại Ngùng" },
  { icon: "🐚", name: "Ốc Nghe Trộm Sóng" },
  { icon: "🪼", name: "Sứa Phát Sáng Nửa Mùa" },
  { icon: "🐳", name: "Cá Voi Con Tập Phun Nước" },
  { icon: "🦭", name: "Hải Cẩu Vỗ Tay" },
  { icon: "🐊", name: "Cá Sấu Đi Lạc" },
  { icon: "🐟", name: "Cá Mòi Vô Danh" },
];

// Link Google AI Studio mặc định khi tạo map mới (mỗi map sửa riêng được)
window.DEFAULT_GAS_LINK = "https://aistudio.google.com/";
