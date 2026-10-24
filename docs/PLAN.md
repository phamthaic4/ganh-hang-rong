# Gánh Hàng Rong: kế hoạch xây dựng cho agent

Idle game web 2D (Phaser 3 + TypeScript), chia thành các mốc nhỏ M0–M14 để mỗi mốc là một phiên làm việc với agent. Mọi con số trong tài liệu là giá trị khởi đầu, được chỉnh bằng bộ mô phỏng ở M2, không phải sự thật đã kiểm chứng.

## 1. Cách dùng

1. Tạo repo, lưu file này thành `docs/PLAN.md` (xuất Markdown từ Doc).
2. Mỗi phiên chỉ giao **một mốc**. Prompt mẫu:

> Đọc AGENTS.md và mục "Mxx" trong docs/PLAN.md. Chỉ làm đúng phạm vi của mốc này, không làm sớm các mốc sau. Chạy `npm run check`, rồi báo cáo ngắn: đã làm gì, tiêu chí nghiệm thu nào đạt, còn gì dang dở.

3. Chỉ sang mốc sau khi mọi tiêu chí của mốc trước đạt. Commit sau mỗi mốc.
4. Có hai **cổng quyết định** (sau M7 và M10) để không đầu tư dài hạn khi game chưa có tín hiệu.

## 2. Nguyên tắc kiến trúc (để agent dễ code)

- Logic game nằm trong `src/core`, TypeScript thuần, **không import Phaser**. Test được bằng Vitest.
- Mọi số liệu (quầy, nâng cấp, sự kiện, nhân viên, vùng, nhiệm vụ) nằm trong `src/data/*.json`. Cân bằng chỉ sửa JSON.
- Phaser chỉ vẽ và nhận input, đọc state từ core.
- Save có `version` và hàm `migrate`, nên thêm tính năng không phá save cũ.
- Phần phụ thuộc nền tảng (quảng cáo, lưu trữ, analytics) đi qua interface trong `src/platform`.
- Số lớn dùng thư viện `break_infinity.js` (kiểu `Decimal`) ngay từ M1; JavaScript thường tràn ở khoảng 1e308.
- `npm run check` = tsc + eslint + vitest + build + kiểm tra dung lượng bản build dưới 8MB.

## 3. AGENTS.md (dán vào repo)

```
- Đọc docs/PLAN.md, mục của mốc được giao, trước khi code.
- Chỉ làm trong phạm vi mốc. Việc ngoài phạm vi: ghi vào docs/BACKLOG.md, không làm.
- Không thêm thư viện ngoài danh sách trong PLAN. Cần thêm thì dừng và hỏi.
- Logic trong src/core (không import Phaser). Dữ liệu trong src/data.
- Viết test cho mọi công thức. Không sửa test để cho qua.
- Mỗi file dưới ~300 dòng, tách module thay vì nhồi một file.
- Không tự suy ra dữ kiện bên ngoài (lịch âm, API của SDK portal). Thiếu thì hỏi.
- Chạy npm run check trước khi báo xong. Cập nhật CHANGELOG.md.
- Không dùng thương hiệu hoặc tài sản có bản quyền.
```

## 4. Công nghệ và cấu trúc thư mục

Phaser 3, TypeScript, Vite, Vitest, ESLint, `break_infinity.js`. Deploy thử bằng GitHub Pages.

```
src/core      state, economy, prestige, events, offline, save
src/data      stalls.json upgrades.json events.json staff.json sets.json
              regions.json quests.json achievements.json seasons.json
              i18n/vi.json i18n/en.json
src/scenes    Boot, Game, UI
src/ui        components
src/platform  ads, storage, analytics (interface + mock)
tools/sim     bộ mô phỏng cân bằng (CLI)
docs          PLAN.md BACKLOG.md CHANGELOG.md
```

## 5. Thiết kế game (toàn bộ)

### 5.1 Vòng lặp

Chạm quầy để nấu → khách mua → có tiền → mua thêm quầy và nâng cấp → thuê người phụ để quầy tự chạy → prestige để chạy nhanh hơn, mở luật mới.

### 5.2 Quầy tầng 1

Công thức: `cost(n) = floor(baseCost × growth^n)`; thu mỗi chu kỳ = `baseIncome × n × nhân`; chu kỳ dài `cycleSec`. Mua x1 / x10 / x100 / tối đa. Tổng chi phí mua nhiều là tổng cấp số nhân, không lặp từng cái.

| Quầy | baseCost | growth | baseIncome | cycleSec | Người phụ (giá) |
| --- | --- | --- | --- | --- | --- |
| Xôi lạc | 4 | 1.07 | 1 | 1 | 50 |
| Bánh mì | 60 | 1.15 | 60 | 3 | 1.000 |
| Chè | 720 | 1.14 | 540 | 6 | 15.000 |
| Bún riêu | 8.640 | 1.13 | 4.320 | 12 | 100.000 |
| Cơm tấm | 103.680 | 1.12 | 51.840 | 24 | 1,2 triệu |
| Phở | 1,24 triệu | 1.11 | 622 nghìn | 96 | 13 triệu |
| Bún chả | 14,9 triệu | 1.10 | 7,46 triệu | 384 | 140 triệu |
| Lẩu | 179 triệu | 1.09 | 89,6 triệu | 1536 | 1,5 tỷ |

**Mốc nhân đôi:** khi một quầy đạt 25, 50, 100, 200, 300, 400 đơn vị thì thu của quầy đó ×2. Khi *mọi* quầy cùng đạt 25, 50, 100, 200 thì thu toàn bộ ×2.

**Chạm:** quầy chưa có người phụ: mỗi chạm hoàn thành một chu kỳ. Quầy đã có người phụ chạy tự động; chạm vẫn cho thưởng nhỏ bằng 5% một chu kỳ (giới hạn 10 chạm/giây).

### 5.3 Ba tầng prestige

|  | P1 Mở quán | P2 Mở chi nhánh | P3 Thương hiệu |
| --- | --- | --- | --- |
| Điều kiện | thu cả lượt ≥ 1e6 | tổng Tiếng thơm kiếm trong lượt P2 ≥ 25 | tổng Chi nhánh kiếm trong lượt P3 ≥ 20 |
| Tiền tệ | Tiếng thơm (T) | Chi nhánh (B) + Phiếu tuyển dụng | Sao thương hiệu (S) |
| Công thức nhận | `floor(sqrt(thuLượt / 1e6))` | `floor(sqrt(T_lượt / 25))` | `floor(cbrt(B_lượt / 20))` |
| Thưởng | thu ×(1 + 0,10·T) | thu ×(1 + 0,25·B); mở Nhân viên và Set | thu ×(1 + 0,50·S); mở vùng mới |
| Reset | tiền, quầy, người phụ, nâng cấp | toàn bộ P1 (kể cả T) | toàn bộ P1 và P2 (kể cả B, Phiếu) |
| Giữ lại | T, thành tựu, sổ món, nhân viên đã mở, cài đặt | B, nhân viên đã mở, thành tựu, sổ món | S, vùng đã mở, nhân viên đã mở, thành tựu, sổ món |

**Hệ số hiệu chỉnh:** các hằng số 1e6, 25, 20 và 0,10 / 0,25 / 0,50 nằm trong `src/data/prestige.json` để chỉnh bằng bộ mô phỏng.

**Mục tiêu thời gian (sẽ kiểm bằng M2):** P1 lần 1 ở phút 10–15; lần P1 thứ hai nhanh hơn ít nhất 30%; P2 lần 1 vào ngày chơi thứ 1–2; P3 lần 1 sau khoảng 1–2 tuần; mỗi vài ngày mở thêm một vùng.

**P2 mang luật mới:**

- **Nhân viên:** khe nhân viên: 1 khe ở 1 Chi nhánh, 2 khe ở 3, 3 khe ở 6, 4 khe ở 10. Mỗi 2 Chi nhánh nhận 1 Phiếu; tốn 1 Phiếu để mở vĩnh viễn một nhân viên.
- **Set:** hai quầy liền kề trong danh sách cùng ≥ 25 đơn vị tạo Set, thu của cả hai ×1,5. Có 4 Set (Xôi+Bánh mì "Sáng", Chè+Bún riêu "Trưa", Cơm tấm+Phở "Tối", Bún chả+Lẩu "Đặc sản").

| Nhân viên | Hiệu ứng |
| --- | --- |
| Chị Hai bán xôi | Xôi ×1,25 |
| Bác xe ôm | Cảnh báo giờ cao điểm dài thêm 3 giây |
| Cô Ba nấu chè | Chè ×2 |
| Anh shipper | Hiệu suất offline +10 điểm phần trăm |
| Bà ngoại | Khách đoàn xuất hiện nhiều gấp đôi |
| Cậu sinh viên | Thưởng chạm ×3 |
| Chú công an phường | Sự kiện kiểm tra vỉa hè không còn phạt |
| Chị kế toán | Tiếng thơm nhận được +10% |

**P3 mang vùng:**

| Vùng | Mở ở | Hiệu ứng riêng |
| --- | --- | --- |
| Hà Nội | gốc | không |
| Huế | 1 Sao | giờ cao điểm kéo dài thêm 5 giây |
| Sài Gòn | 3 Sao | thưởng chạm ×2 |
| Hội An | 6 Sao | giới hạn offline +4 giờ |
| Đà Lạt | 10 Sao | sự kiện xấu giảm 50% |
| Cần Thơ | 15 Sao | khách đoàn xuất hiện nhiều gấp đôi |

Mỗi vùng đổi nền và bộ món (tên, hình), cùng 8 slot quầy như tầng 1. Chọn vùng đang chơi trong menu; hiệu ứng của vùng chỉ áp dụng khi đang ở vùng đó.

### 5.4 Giờ cao điểm

Mỗi 90–150 giây (ngẫu nhiên): cảnh báo 5 giây, kéo dài 20 giây, thu ×3. Bấm nút **Chuẩn bị** trong lúc cảnh báo thì thu thêm +50% trong đợt đó.

### 5.5 Sự kiện ngẫu nhiên

Xuất hiện mỗi 3–6 phút, không trùng nhau, không xảy ra trong giờ cao điểm. Hình phạt luôn có trần để không gây khó chịu.

| Sự kiện | Thời lượng | Hiệu ứng |
| --- | --- | --- |
| Mưa | 60 giây | thu ×0,7; nút "Bán trà đá" cho ×2 trong 10 giây |
| Kiểm tra vỉa hè | 5 giây để bấm "Dọn nhanh" | không bấm thì mất 5% tiền hiện có, tối đa bằng 60 giây thu nhập |
| Khách đoàn | 15 giây | thu ×5 |
| Shipper đặt lô | tức thì | nhận số tiền bằng 120 giây thu nhập |

### 5.6 Offline, thưởng ngày, nhiệm vụ

- **Offline:** thu = thu nhập hiện tại × min(thời gian vắng, giới hạn) × hiệu suất. Mặc định giới hạn 8 giờ, hiệu suất 50%. Nếu đồng hồ máy bị chỉnh lùi (thời gian âm) thì bỏ qua.
- **Tăng tốc:** thu ×2 trong 10 phút. Nhận từ nhiệm vụ hoặc quảng cáo có thưởng.
- **Thưởng ngày:** chu kỳ 7 ngày; bỏ một ngày chỉ trừ 1 ngày chuỗi (không về 0).
- **Nhiệm vụ ngày:** 3 nhiệm vụ lấy ngẫu nhiên từ kho trong `quests.json` (ví dụ: chạm 200 lần, mua 50 quầy, vượt 1 giờ cao điểm). Thưởng: tiền bằng 15 phút thu nhập hoặc 1 Tăng tốc.
- **Mục tiêu tuần:** hoàn thành 15 nhiệm vụ ngày trong tuần thì nhận thưởng lớn.

### 5.7 Sổ món và thành tựu

- **Sổ món:** mỗi vùng có 8 món; món mở khi quầy tương ứng đạt 25 đơn vị trong vùng đó. Hiển thị % hoàn thành.
- **Thành tựu:** khoảng 40 cái, trong đó 10 cái ẩn (ví dụ bán đủ 100 phần trong một đợt cao điểm; qua cơn mưa không mất khách). Mỗi thành tựu +1% thu toàn bộ.

### 5.8 Sự kiện theo mùa

Tết, Trung thu, Quốc khánh 2/9, Giáng sinh. Khoảng ngày nằm trong `seasons.json`. **Bạn tự điền ngày (lịch âm) cho 2027–2030; agent không được tự suy ra.** Mỗi mùa có skin giới hạn và một nhiệm vụ riêng.

### 5.9 Quảng cáo và theo dõi

- Interface `AdProvider`: `init()`, `isReady(placement)`, `showRewarded(placement): Promise<"rewarded" | "dismissed" | "error">`.
- Vị trí: `offline_x2`, `boost_10m`, `daily_x2`. Không dùng quảng cáo chèn giữa màn chơi.
- Triển khai `Mock` và `None` ở giai đoạn đầu; adapter cho từng portal làm ở M13 theo tài liệu hiện hành của portal.
- Sự kiện analytics: `session_start`, `session_end(duration)`, `return_day_n`, `prestige_n`, `purchase`, `ad_reward`.

## 6. Các mốc

### M0: Khởi tạo hạ tầng

**Làm:** repo Vite + TypeScript + Phaser 3 + Vitest + ESLint; cấu trúc thư mục ở mục 4; `AGENTS.md`; script `npm run check` (gồm kiểm dung lượng build dưới 8MB); workflow deploy GitHub Pages; màn hình trống hiển thị "Gánh Hàng Rong". **Nghiệm thu:** `npm run check` xanh; trang chạy được trên GitHub Pages. **Không làm:** bất kỳ logic game nào.

### M1: Lõi kinh tế (không giao diện)

**Làm:** `src/core`: state, vòng tick theo thời gian thực, quầy, mua x1/x10/x100/max, người phụ, mốc nhân đôi, chạm; `Decimal`; hàm định dạng số (K, M, B, T, aa, ab…); lưu và tải với `version` + `migrate`; đọc dữ liệu từ `stalls.json`. **Nghiệm thu:** test cho công thức giá, thu nhập, mua nhiều, mốc nhân đôi, lưu/tải; chạy mô phỏng 24 giờ không tràn số. **Không làm:** Phaser, prestige.

### M2: Bộ mô phỏng cân bằng

**Làm:** `tools/sim` chạy CLI: mô hình người chơi (chạm 2 lần/giây trong 10 phút đầu, sau đó 4 phiên/ngày mỗi phiên 5 phút, mua theo chiến lược tham lam); in ra thời điểm đạt các cột mốc (mua đầu tiên, người phụ đầu tiên, P1 khả dụng). **Nghiệm thu:** mua nâng cấp đầu tiên < 60 giây; người phụ đầu tiên < 3 phút; thu nhập cả lượt đạt 1e6 trong 10–15 phút. Nếu lệch, chỉnh JSON (không sửa công thức) rồi chạy lại.

### M3: Giao diện tầng 1 (hình chữ nhật)

**Làm:** Phaser `Boot`, `Game`, `UI`; canvas logic 1280×720 co giãn FIT; 8 quầy là hình chữ nhật có nhãn; chạm để nấu; thanh chu kỳ; nút mua; HUD tiền và thu/giây; nút tạm dừng; hoạt động trên điện thoại. **Nghiệm thu:** chơi được từ 0 đến mua cả 8 quầy; lưu tự động mỗi 10 giây và khi đóng tab; không giật khi tiền rất lớn. **Không làm:** hình ảnh, âm thanh.

### M4: Prestige 1 (Mở quán)

**Làm:** `prestige.json`; hàm tính Tiếng thơm; reset đúng phạm vi mục 5.3; nút và màn xác nhận (hiện trước số Tiếng thơm sẽ nhận); hiển thị hệ số. **Nghiệm thu:** test cho công thức và phạm vi reset; mô phỏng cho thấy lượt thứ hai đạt P1 nhanh hơn ít nhất 30%; chạm trong 30 giây đầu sau reset cảm thấy nhanh rõ.

### M5: Giờ cao điểm và sự kiện ngẫu nhiên

**Làm:** hệ thống sự kiện đọc `events.json`: hàng đợi, bộ đếm, không trùng nhau; cảnh báo giờ cao điểm, nút Chuẩn bị; 4 sự kiện ở mục 5.5; hình phạt có trần. **Nghiệm thu:** test cho lịch xuất hiện (seed cố định) và cho trần phạt; thu nhập đúng trong cả hai trạng thái.

### M6: Offline, thưởng ngày, nhiệm vụ

**Làm:** thu nhập offline theo 5.6 (xử lý đồng hồ lùi, giới hạn, hiệu suất); Tăng tốc; thưởng ngày 7 ngày với chuỗi bao dung; 3 nhiệm vụ ngày và mục tiêu tuần; giao diện nhận thưởng. **Nghiệm thu:** test với đồng hồ giả (thời gian lùi, vắng rất lâu, đổi ngày); không thể khai thác bằng cách chỉnh giờ để nhận thưởng lặp.

### M7: Art nhẹ và phát hành v0.1

**Làm:** thay hình chữ nhật bằng sprite đơn giản (mục 7), animation bằng tween trong code (nảy, co giãn, hạt tiền); font có dấu tiếng Việt; âm thanh tối thiểu (Web Audio); trang itch.io (ảnh bìa, mô tả); thu thập sự kiện analytics vào console/localStorage. **Nghiệm thu:** chơi mượt 60fps trên máy tầm trung; bản build dưới 8MB; đăng được lên itch.io.

> **Cổng 1:** sau khi v0.1 có người chơi thật (khoảng một tuần hoặc vài trăm lượt), xem thời gian chơi và tỉ lệ quay lại ngày 1. Gợi ý ngưỡng ban đầu (đoán của mình, bạn tự đặt lại): quay lại ngày 1 ≥ 20% và phiên trung vị ≥ 5 phút thì làm M8 trở đi. Không đạt thì sửa tối đa một vòng 15 phút đầu rồi chuyển sang game thứ hai.

### M8: Prestige 2 (Chi nhánh, Nhân viên, Set)

**Làm:** `staff.json`, `sets.json`; công thức Chi nhánh và Phiếu; khe nhân viên; Set; màn Tuyển dụng; reset đúng phạm vi. **Nghiệm thu:** test công thức, khe, Set, phạm vi reset (Tiếng thơm mất, nhân viên đã mở được giữ); mô phỏng đạt P2 lần 1 trong khoảng ngày 1–2.

### M9: Sổ món và thành tựu

**Làm:** `achievements.json` (40 cái, 10 cái ẩn); sổ món theo vùng với % hoàn thành; thông báo khi mở khóa; +1% thu mỗi thành tựu. **Nghiệm thu:** test mở khóa và bonus; thành tựu ẩn không lộ tên trước khi đạt.

### M10: Prestige 3 (Thương hiệu) và vùng

**Làm:** `regions.json`; công thức Sao; reset đúng phạm vi; chọn vùng; hiệu ứng vùng (bảng 5.3); mỗi vùng một bộ tên món và nền. **Nghiệm thu:** test công thức, hiệu ứng vùng chỉ áp dụng khi đang ở vùng đó; mô phỏng đạt P3 lần 1 khoảng 1–2 tuần.

> **Cổng 2:** sau M10, xem số liệu giữ chân dài hạn (ngày 7). Chỉ đầu tư art đầy đủ và mùa lễ hội nếu người chơi còn quay lại.

### M11: Sự kiện theo mùa và đa ngôn ngữ

**Làm:** `seasons.json` (bạn điền ngày); skin giới hạn; nhiệm vụ mùa; tất cả chuỗi chữ chuyển sang `i18n/vi.json` và `i18n/en.json`; chọn ngôn ngữ trong menu. **Nghiệm thu:** đổi ngày hệ thống (giả lập) thì mùa bật/tắt đúng; không còn chuỗi chữ cứng trong code.

### M12: Art đầy đủ, âm thanh, hiệu năng

**Làm:** thay sprite theo mục 7; nền cho các vùng; hiệu ứng hạt (tối đa 50 hạt); nhạc nền và âm thanh; giảm tốc khi tab ẩn nhưng vẫn tính thời gian đúng bằng dấu thời gian; gộp ảnh thành atlas. **Nghiệm thu:** 60fps trên máy tầm trung, chấp nhận được trên máy yếu; bản build dưới 8MB.

### M13: Quảng cáo và theo dõi

**Làm:** `AdProvider` và 3 vị trí ở 5.9; triển khai Mock/None; adapter cho portal đã chọn *sau khi agent đọc tài liệu hiện hành của portal*; analytics theo 5.9; thưởng quảng cáo nhân đôi offline, Tăng tốc, thưởng ngày. **Nghiệm thu:** game chơi bình thường khi không có quảng cáo; phần thưởng chỉ trao khi quảng cáo xem xong; không có quảng cáo chèn giữa màn.

### M14: Phát hành portal và vận hành

**Làm:** checklist của portal (kích thước, tỉ lệ, SDK); QA theo mục 8; bản build chính thức; theo dõi số liệu hằng tuần. **Nghiệm thu:** vượt checklist QA; có bảng theo dõi thời gian chơi, quay lại ngày 1 và ngày 7.

## 7. Art và asset

- **Phong cách:** vector phẳng, nét viền dày, bảng màu cố định khoảng 12 màu (định nghĩa trong `palette.json`).
- **Giảm khối lượng art:** thay vì vẽ nhiều khung hình, dùng ảnh đơn và hoạt họa bằng tween trong code (nảy, co giãn, lắc); chỉ giữ vài khung cho người bán và khách. Đây là đề xuất của mình để giảm gánh cho phần agent yếu nhất.
- **Danh sách tối thiểu:**
  - 8 quầy: mỗi quầy 2 trạng thái (nghỉ, đang bán), 256px.
  - Người bán: 1 mẫu, 2 trạng thái.
  - Khách: 3 mẫu gốc, thêm biến thể bằng đổi màu, 128px.
  - Nền: 2 vùng đầu (Hà Nội, Huế) vẽ riêng; các vùng còn lại đổi màu trời và một lớp đạo cụ.
  - Icon giao diện: khoảng 40 cái, 64px.
- **Font:** dùng font miễn phí có dấu tiếng Việt đầy đủ; kiểm tra giấy phép và thử hiển thị mọi dấu.
- **Ảnh do AI tạo:** dùng một đoạn mô tả phong cách chung cho mọi ảnh để đồng nhất; lưu lại prompt và điều khoản của công cụ; không dùng nhân vật có bản quyền.

## 8. QA và quy tắc dừng

**Checklist QA:**

- Lưu và tải qua nhiều phiên bản (thử migrate).
- Đổi đồng hồ máy, vắng rất lâu, mở nhiều tab.
- `localStorage` không dùng được thì chạy bằng bộ nhớ tạm và báo người chơi.
- Điện thoại cảm ứng, xoay màn hình, tab chạy nền.
- Hiển thị số rất lớn, mua x100 / tối đa không làm treo.
- Pin và CPU khi để chạy nền nhiều giờ.

**Quy tắc dừng:** nếu sau Cổng 1 người chơi gần như không quay lại ngày hôm sau, sửa tối đa một vòng rồi chuyển sang game kế tiếp thay vì làm tiếp các mốc dài hạn.

**Backlog (chưa làm):** chế độ thử thách Lễ hội, PWA, ứng dụng desktop pet. Bảng xếp hạng cần server nên không làm.
