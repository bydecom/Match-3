# 📊 Phân Tích Code & Cấu Trúc Dự Án Match-3 Game

## 🎯 Tổng Quan Hiện Tại

**Framework:** Phaser 3 + Vite  
**Ngôn ngữ:** JavaScript (ES6+)  
**Kiến trúc:** OOP + Event-Driven + Data-Driven (level JSON)  
**Trạng thái:** 🚀 Chơi được; match-3 đầy đủ (match, swap, gravity, refill, chain), power-ups (Bomb/Color Bomb + combo Bomb+Bomb 5x5) với VFX chuyên dụng, booster (Hammer/Swap/Rocket/Shuffle) với VFX, blocker (Đá, Dây leo) với hệ thống ưu tiên sát thương, input management thông minh (pointer-based), PowerupVFXManager cho hiệu ứng power-up, `gemLayer` + mask để clip vùng chơi, có timer theo level

---

## 📁 Cấu Trúc Thư Mục

```
src/
├── main.js
├── scenes/
│   ├── BootScene.js
│   ├── PreloaderScene.js
│   ├── MapScene.js
│   ├── GameScene.js
│   ├── MainScene.js                # Demo scene (không dùng trong flow chính)
│   ├── UIScene.js                  # Overlay booster UI (đã dùng trong GameScene)
│   ├── LeaderboardScene.js         # (trống)
│   └── popups/ (Lose/Win/Settings) # (chưa dùng)
├── objects/
│   ├── Board.js                    # Lõi gameplay, mixin 5 module
│   ├── board/
│   │   ├── BoardCreator.js
│   │   ├── BoardInput.js           # Input management + clearSelection()
│   │   ├── BoardMatcher.js         # Matching với blocker logic
│   │   ├── BoardPowerups.js        # Power-ups + Booster + damageCell()
│   │   └── BoardState.js           # State management + gravity logic
│   ├── gems/ (Gem.js, PowerupGem.js) # (trống)
│   ├── blockers/ (StoneBlocker.js, RopeBlocker.js, BaseBlocker.js) # OOP blockers
│   └── vfx/
│       ├── BoosterVFXManager.js    # Visual effects cho boosters
│       └── PowerupVFXManager.js    # Visual effects cho power-ups (Bomb/Color Bomb)
├── managers/ (APIManager, PlayerDataManager, SceneManager, SoundManager) # (trống)
└── utils/
    ├── constants.js
    └── helpers.js
```

Tài nguyên (asset) được đặt trong `public/assets`, được load bởi `PreloaderScene`.

---

## 🔄 Luồng Khởi Động & Chuyển Cảnh

```
main.js → BootScene → PreloaderScene → MapScene → GameScene
```

### `src/main.js`
- Cấu hình `Phaser.Game` (scale FIT, 576x1024), parent `#app`.
- Khởi tạo game sau khi người dùng click nút `#fullscreen-button` (cố gắng vào fullscreen, ẩn nút).
- Scene thứ tự: `BootScene`, `PreloaderScene`, `MapScene`, `GameScene`, `UIScene` (UIScene chạy overlay song song với GameScene).

### `src/scenes/BootScene.js`
- preload(): load ảnh nền loading `loading_background`.
- create(): chuyển ngay sang `PreloaderScene`.

### `src/scenes/PreloaderScene.js`
- Màn hình loading (ảnh nền + text %), tiến trình hiển thị tối thiểu 5s (đồng bộ cả thời gian và sự kiện load).
- Tải tài nguyên:
  - UI/Map: `level_background`, `map1_background`, `playground1_background`, `playground1_border`, `cell`.
  - Gems: `gem_red`, `gem_green`, `gem_blue`, `gem_purple`, `gem_yellow`, `gem_orange`.
  - Power-ups: `gem_bomb`, `gem_color_bomb`.
  - Blockers: `blocker_stone_1`, `blocker_stone_2`, `blocker_rope`.
  - Booster icons: `booster_hammer`, `booster_swap`, `booster_rocket`, `booster_shuffle`.
  - Level JSON: `level_1` → `level_5`.
- Trước khi chuyển cảnh: dọn tất cả listener (điểm không thể quay đầu), fade out rồi `start('MapScene')`.
- Xử lý `contextrestored` và `resize` bằng cách dọn listener và quay `BootScene` để an toàn.

### `src/scenes/MapScene.js`
- Vẽ nền đơn giản, danh sách 5 nút map: "Màn 1..5". Click chọn map sẽ `start('GameScene', { levelId })`.

### `src/scenes/GameScene.js`
- Hiển thị `map1_background` (depth 0), nền playground (depth 0) và border (depth 3).
- Tạo `gemLayer` (depth 2) và áp dụng `GeometryMask` hình chữ nhật khớp vùng board để clip toàn bộ gem trong khung chơi.
- Tạo `Board` ở giữa khung chơi, truyền `powerupVFXManager` và `gemLayer`; load level theo `levelId` (mặc định 1) từ cache.
- Khởi chạy `UIScene` overlay; có nút "Quay lại" về `MapScene` (UI depth 10+).
- Quản lý `BoosterVFXManager` (booster VFX) và `PowerupVFXManager` (power-up VFX).
- Input booster pointer-based: sử dụng `pointerdown/move/up` và `hitTest` trên cả `children.list` và `gemLayer.list` để preview/target chính xác (đặc biệt cho Rocket/Swap). Lắng nghe `boardBusy` để dọn preview; hỗ trợ `screenShake` qua `game.events`.
- Hỗ trợ timer theo level: `startTimer()` đọc `levelData.starTimes.startTime`, emit `updateTimer` mỗi giây cho UI, dừng khi hết giờ.
- Hàm chính: `createBoard`, `loadLevelData`, `setupBoardEvents`, `onBoosterSelected`, `clearActiveBooster`, `onPointerDown/Move/Up`, `loadLevelFromJSON`.

---

## 🎮 Lõi Gameplay: `objects/Board.js` + Mixins

`Board` là lớp trung tâm, được lắp (mixin) từ 5 module: `BoardCreator`, `BoardInput`, `BoardMatcher`, `BoardPowerups`, `BoardState` thông qua `applyMixins`.

### Thuộc tính chính
- `scene`, `offsetX`, `offsetY`, `cellSize`, `powerupVFXManager`, `gemLayer` (layer chứa toàn bộ gem, đã được mask trong `GameScene`).
- `grid` 9x9 (mảng 2D), `blockerGrid` 9x9 (OOP blocker), `gems` (sprite), `blockers` (legacy sprite), `levelData`.
- `selectedGem`, `selectionFrame` (graphics highlight, depth 5), `ropeDestroyedThisTurn` (cờ cho cơ chế lây lan dây leo).
- `boardBusy` (cờ khóa logic game), helper functions: `getCellPosition`, `getBoardDimensions`, `isValidCell`.

### Hàm công khai quan trọng
- `loadLevel(levelData)`: xóa board, vẽ cell nền, đi qua `gridLayout` để tạo gem/blocker/ô trống, sau cùng `fillEmptyCells()`.
- `handleInput(inputData)`: router input từ scene (`gem_click`, `blocker_click`).

### `board/BoardCreator.js`
- `createSelectionFrame()`: khung chọn (graphics) depth 5, ẩn mặc định.
- `createAllCells()`: vẽ 81 ô nền `cell` (depth 1), setData đánh dấu.
- `getGemTypeByNumber(n)`, `getBlockerTypeByNumber(n)`.
- `createGem/At(...)`: tạo sprite gem `gem_<type>`, interactive, depth 2, lưu vào `grid` và `gems`.
- `createStoneBlocker(row, col, health=2)`, `createRopeBlocker(row, col)`: khởi tạo OOP blocker (`StoneBlocker`, `RopeBlocker`) và ghi vào `blockerGrid`.
- `getRandomGemTypeWithoutMatch(row, col)`: "smart random" để tránh tạo match ngay từ đầu.
- (Legacy) `createBlocker(...)` còn giữ cho rectangle mock, nhưng gameplay dùng OOP blockers.

### `board/BoardInput.js`
- Chặn chọn/swap vào ô có blocker (đá/rope) qua `isCellBlockedForMovement`.
- `handleGemClick(...)`: chọn/bỏ chọn; nếu kề nhau thì `swapGems`; luôn emit `gemSelected`.
- `areNeighbors(...)`: khoảng cách Manhattan = 1.
- `handleBlockerClick(...)`: emit `blockerSelected`.
- `clearSelection()`: hủy lựa chọn gem hiện tại (dùng khi chọn booster).
- Kiểm tra `activeBooster` để nhường quyền xử lý cho hệ thống booster.

### `board/BoardMatcher.js`
- `findAllMatches()`: quét hàng/cột, gom cụm ≥3, hợp nhất chữ T/L (bỏ qua power-ups).
- `canMatchAt(row, col)`: kiểm tra ô có thể match không (đá nguyên khối chặn match).

### `board/BoardPowerups.js`
- `isPowerup`, `transformIntoPowerup`.
- Kích hoạt power-up/combos: Bomb+Bomb, Color+Color, Color+Bomb; một phần kick-off combo được phối hợp trong `BoardState.startActionChain()` để đồng bộ VFX.
- `damageCell(row, col)`: hàm trung tâm gây sát thương với ưu tiên Blocker > Gem.
- Tác động blocker: tất cả power-up/booster sử dụng `damageCell()` thay vì `damageBlockerAt()`.
- Booster trên Board: `useHammer`, `useRocket`, `useSwap`, `useShuffle`. VFX/emit `boardBusy` do `GameScene` điều phối; Board tập trung tính toán và xóa/spawn.
- `getGemsInArea(r,c,radius)` tiện ích gom gem theo vùng.

### `board/BoardState.js`
- `initGrid()`: tạo `grid` và `blockerGrid` 9x9 rỗng.
- `clearBoard()`: hủy gem/blocker sprite/OOP, xóa ô nền, reset chọn.
- `fillEmptyCells()`: điền ngẫu nhiên theo `availableGems`.
- `updateGridAfterSwap`, `swapGems` (khóa input + emit `boardBusy=true`), `decideActionAfterSwap`, `swapBack` (unlock không tính lượt).
- `startActionChain(initialMatchGroups, powerupToActivate, otherGem, swapPosition)`: hợp nhất kết quả match và power-up; gọi VFX chuyên dụng trước khi xóa/tạo; sau VFX: `removeGemSprites` → `createPowerupsAfterWiggle` → `applyGravityAndRefill`.
- Tích hợp `PowerupVFXManager` cho Bomb, Color Bomb và combo Bomb+Bomb (5x5 quanh tâm sau swap) qua `playBombEffect`, `playColorBombEffect`, `playDoubleBombEffect`.
- `processMatchGroups(...)`: ưu tiên vị trí tạo power-up (vị trí swap > điểm giao T/L > vị trí giữa), loại (4→Bomb, ≥5→Color Bomb); dùng `damageCell()` để gây sát thương blocker lân cận và bảo vệ ô tạo power-up khỏi bị xóa.
- `addWiggleEffect`, `removeGemSprites` (phiên bản an toàn kiểm tra tồn tại sprite), `createPowerupsAfterWiggle` (biến đổi gem sẵn có, fallback tạo mới nếu trống).
- `applyGravityAndRefill()`: đá 2 máu chặn gravity; rơi theo cột, tính toán `newGrid`, tween rơi với tốc độ theo khoảng cách; refill spawn từ trên, alpha=0 và chỉ hiện khi bắt đầu rơi; gọi `checkForNewMatches` ngay khi tween cuối hoàn tất; fallback gọi ngay nếu không có tween.
- `checkForNewMatches()`: tiếp tục chain nếu còn, ngược lại `endOfTurn()`.
- `endOfTurn()`: nếu không phá rope trong lượt, cho mọi rope lây lan một lần (snapshot + `plannedSpawns`); reset cờ, bật input, emit `boardBusy=false`.
- `getPowerupActivationSet(...)`: trả về tập gem bị ảnh hưởng cho các biến thể power-up/combo; Bomb+Bomb sử dụng vùng 5x5 quanh vị trí mới của power-up sau swap.

### Thứ tự render (depth)
1. Ô nền `cell` (1)
2. `gemLayer` chứa Gem/Blocker (2), có `GeometryMask` clip trong khung board
3. Viền khung chơi (3)
4. Khung chọn (5)
5. UI overlay, nút điều hướng (10+)

---

## 🧩 Utils

### `utils/constants.js`
- `SCENE_KEYS`, `GEM_TYPES`, `BLOCKER_TYPES` (`stone`, `vine`), `GRID_SIZE = 9`, `CELL_SIZE = 60`.
- `BOOSTER_TYPES`: `hammer`, `swap`, `rocket`, `shuffle`.

### `utils/helpers.js`
- `applyMixins(derivedCtor, constructors)`: copy descriptor các method từ prototype các baseCtor vào derivedCtor.prototype.

---

## 📦 Managers, UI, Gems, Blockers

- `managers/*`: hiện trống.
- `scenes/UIScene.js`: ĐÃ dùng. Hiển thị 4 booster (hammer/swap/rocket/shuffle) tại vị trí cố định theo phần trăm màn hình; lắng nghe `boardBusy` để khóa/mở tương tác; quản lý `selectedBoosterType` và visual feedback.
- `LeaderboardScene.js`: trống.
- `objects/gems/*`: trống (sử dụng image trực tiếp trong `BoardCreator`).
- `objects/blockers/*`: ĐÃ tích hợp OOP (`StoneBlocker`, `RopeBlocker`, `BaseBlocker`), render bằng texture, có máu/hành vi (đá chặn rơi; rope lây lan cuối lượt nếu không bị phá).
- `objects/vfx/BoosterVFXManager.js`: Quản lý hiệu ứng visual cho boosters (Hammer swing, Swap preview, Rocket highlight, Shuffle confirmation).
- `objects/vfx/PowerupVFXManager.js`: Quản lý hiệu ứng visual cho power-ups (Bomb phóng to + rung camera, Color Bomb hút gem + lắc lư).

### `objects/vfx/PowerupVFXManager.js`
- `playBombEffect(bombGem, affectedGems, onComplete)`: hiệu ứng Bomb với phóng to, rung camera, làm gem biến mất.
- `playColorBombEffect(colorBombGem, affectedGems, onComplete)`: hiệu ứng Color Bomb với phóng to + lắc lư, hút tất cả gem cùng màu về trung tâm.
- `playDoubleBombEffect(bombA, bombB, affectedGems, onComplete)`: hiệu ứng combo Bomb+Bomb (vùng nổ 5x5 quanh tâm sau swap) với shake.
- `startSuckingGems(affectedGems, targetPos, onComplete)`: animation hút gem với delay ngẫu nhiên và callback đồng bộ.
- Tích hợp với `BoardState.startActionChain()` để đồng bộ VFX với logic game.

---

## 🗂️ Dữ Liệu Level & Asset

### Level JSON (`public/assets/levels/level_1..5.json`)
- Được load cache `level_1` → `level_5` trong `PreloaderScene`.
- Trường chính:
  - `gridLayout` (9x9): `null` (lỗ), `0` (trống để fill), `1..n` (gem theo `GEM_TYPES`).
  - `blockerLayout` (tuỳ chọn 9x9): `1`=rope, `2|3`=stone (thiết kế hiện tại quy về đá 2 máu).
  - `availableGems`: danh sách gem cho refill/shuffle.

### Asset
- Nguồn tại `public/assets/images/...` và `public/assets/levels`.
- Key texture trùng tên với code: `gem_*`, `blocker_*`, `booster_*`, `map1_background`, `playground1_*`, `cell`, `progress_bar_*`, `star_on/off`.

---

## ✅ Trạng Thái Tính Năng

- Đã có: tạo board, chọn/swap, tìm match, xóa, gravity, refill, chain reaction; power-ups (Bomb/Color Bomb) + combos (Bomb+Bomb 5x5) với VFX chuyên dụng; booster (Hammer/Swap/Rocket/Shuffle) với VFX; blocker (Đá chặn rơi, Dây leo lây lan) với hệ thống ưu tiên sát thương; input management thông minh (pointer-based); smart random generation; board state locking; PowerupVFXManager cho hiệu ứng power-up; `gemLayer` + mask; timer theo level.
- Chưa có: UI điểm/số lượt/mục tiêu, âm thanh, quản lý người chơi, điều kiện thắng/thua, drag & drop, hiệu ứng/animation nâng cao, thiết kế level/điều kiện phức tạp hơn, leaderboard.

---

## 🔧 Gợi Ý Phát Triển Tiếp

- Thêm UI hiển thị moves/score/objectives, overlay trên `GameScene`.
- Hoàn thiện `managers/*` (âm thanh, dữ liệu người chơi, API).
- Kéo/thả để swap, hỗ trợ mobile.
- Tối ưu hiệu năng: object pooling cho gem, texture atlas.
- Mở rộng power-up và hiệu ứng (particles, screen shake, trail effects).
- Thêm animation cho gem rơi và power-up activation.
- Cải thiện PowerupVFXManager với hiệu ứng particles và sound effects.
- Cải thiện UX: drag & drop, haptic feedback.

---

*Cập nhật theo mã nguồn hiện tại*

