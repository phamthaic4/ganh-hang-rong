# Changelog

## M0 — Khởi tạo hạ tầng (2026-10-25)

- Khởi tạo dự án Vite + TypeScript, cấu trúc thư mục theo PLAN.md mục 4.
- Phiên bản đã chọn (Node bản địa: v24.15.0, npm 11.12.1), ghim exact:
  - Vite **8.3.5** (ổn định mới nhất; engines yêu cầu Node ^20.19 || >=22.12 — đạt).
  - TypeScript **6.0.3** (6.x mới nhất; 7.0.2 bị loại vì typescript-eslint yêu cầu `typescript <6.1.0`).
  - Phaser **3.90.0** (bản 3.x ổn định mới nhất; `latest` trên npm là Phaser 4.2.1 nhưng PLAN cố định Phaser 3).
  - Vitest **5.0.5** (peer vite ^6.4 || ^7 || ^8 — đạt).
  - ESLint **10.13.0** + typescript-eslint **8.72.0** (peer eslint ^8.57 || ^9 || ^10 — đạt).
  - break_infinity.js **2.2.0**.
- `npm run check` = typecheck + lint + test + build + kiểm tra dist < 8MB.
- Màn hình Phaser 1280×720, Scale.FIT, hiển thị chữ "Gánh Hàng Rong".
- Workflow GitHub Actions deploy GitHub Pages (base tương đối `./` nên chạy được ở mọi subpath).
