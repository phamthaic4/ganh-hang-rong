# Changelog

## M1 — Lõi kinh tế (2026-10-25)

- `src/data/stalls.json`: 8 quầy theo bảng PLAN mục 5.2.
- `src/core`: `economy` (giá floor(baseCost×growth^n), mua nhiều bằng tổng cấp số nhân đóng, mua tối đa qua logarit + hiệu chỉnh biên, mốc nhân đôi riêng 25/50/100/200/300/400 và toàn cục 25/50/100/200, thu/chu kỳ, thu/giây, mua unit + thuê người phụ), `tick` (tick theo timestamp thực, bỏ qua đồng hồ lùi, hoàn thành nhiều chu kỳ chính xác), `tap` (chạm hoàn thành chu kỳ khi chưa có người phụ, 5% khi có, giới hạn 10 chạm có thưởng/giây toàn cục), `format` (K, M, B, T, aa, ab…, hết chữ thì e), `save` (version + khung migrate từng bước), `state`.
- `src/platform/storage.ts`: interface Storage + memoryStorage (mock test) + localStorageAdapter + safeStorage fallback.
- 43 test Vitest phủ mọi công thức; mô phỏng 24h không tràn số (Decimal xuyên suốt).
- Quyết định: tiền khởi đầu = 4 (PLAN không ghi; phải ≥ giá quầy đầu để game khởi động được).
- Quyết định: giới hạn 10 chạm/giây áp cho mọi chạm có thưởng (chống auto-clicker, đúng tinh thần PLAN 5.2).
- Sửa lỗi M0: bật GitHub Pages (build_type=workflow) qua API và rerun workflow — site sống tại https://phamthaic4.github.io/ganh-hang-rong/ .

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
