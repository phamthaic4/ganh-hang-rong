# Changelog

## M3 — Giao diện tầng 1 (2026-10-25)

- Phaser `Boot → Game` (launch `UI`): canvas 1280×720 FIT, 8 quầy là card chữ nhật có nhãn, chạm để nấu (hoàn thành chu kỳ khi chưa có người phụ, +5% khi có), thanh chu kỳ cho quầy có người phụ, số tiền nhận được bay lên khi chạm (giới hạn 24 text).
- HUD tiền + thu/giây; nút chọn số lượng ×1/×10/×100/MAX; nút Mở/Mua theo quầy đang chọn (hiện giá, tự tắt khi không đủ tiền); nút Thuê người phụ; nút Tạm dừng (bỏ tính thu nhập trong lúc dừng).
- Hiển thị cập nhật 10 lần/giây (format Decimal rẻ — không giật khi tiền lớn).
- Tự lưu mỗi 10 giây, khi đóng tab (beforeunload) và khi ẩn tab (visibilitychange); load save khi mở game.
- `src/game/store.ts`: cầu nối core ↔ Phaser (không import Phaser); `src/ui/button.ts`: nút dùng chung. Mọi logic vẫn trong `src/core`.
- Hook kiểm thử `window.__ghr` / `__ghrGame` (đọc state/scene khi smoke-test).
- Đã kiểm trên trình duyệt: click thật mở quầy + chạm + tạm dừng (phiên foreground); mua/nhãn/giá/×10/người phụ qua method scene; save/load qua reload thật (tiền khôi phục đúng).
- Ghi chú: input chuột chỉ kiểm được ở phiên trình duyệt còn render (webview nền throttling requestAnimationFrame — đặc thù môi trường test, không phải bug game).

## M2 — Bộ mô phỏng cân bằng (2026-10-25)

- `tools/sim`: CLI `npm run sim [-- --days N]` — build bằng tsc có sẵn (CommonJS), mô hình người chơi theo PLAN M2: 10 phút đầu chạm 2 lần/giây, sau đó 4 phiên/ngày × 5 phút, mua tham lam (mở quầy → thuê người phụ → rót unit theo payback Δthu/s/đồng).
- Số liệu gốc trong PLAN cho P1 (1e6) đạt sau 1.6 phút — lệch mạnh. Đã tinh chỉnh **chỉ stalls.json** qua 8 vòng chạy sim (không sửa công thức): nâng cost các quầy bậc 3–8, giảm một nửa baseIncome bậc 3–8, tăng growth các quầy đầu.
- Kết quả cuối: nâng cấp đầu **35 giây** (<60s ✓), người phụ đầu **30 giây** (<3 phút ✓), thu cả lượt 1e6 **11.4 phút** (10–15 phút ✓).

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
