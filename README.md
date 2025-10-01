
---

# 💎 Match-3 Game Engine "Jungle Gems"

Dự án này là một bộ khung (engine) hoàn chỉnh để xây dựng một game Match-3 chuyên nghiệp, có chiều sâu, sử dụng **Phaser 3** và **Vite**. Kiến trúc của dự án được xây dựng dựa trên các nguyên tắc thiết kế phần mềm hiện đại, đảm bảo tính linh hoạt, dễ bảo trì và mở rộng cho các tính năng phức tạp trong tương lai.

<img width="1151" height="2048" alt="image" src="https://github.com/user-attachments/assets/179cf084-f840-477d-b6cd-3f6830cbd28d" />


## Mục lục

1.  [Tổng quan Kiến trúc](#1-tổng-quan-kiến-trúc)
2.  [Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
3.  [Cài đặt & Khởi chạy](#3-cài-đặt--khởi-chạy)
4.  [Cấu trúc Thư mục Chi tiết](#4-cấu-trúc-thư-mục-chi-tiết)
5.  [Hướng dẫn Triển khai Tính năng Cốt lõi](#5-hướng-dẫn-triển-khai-tính-năng-cốt-lõi)
    *   [Thiết kế Màn chơi (Data-Driven)](#thiết-kế-màn-chơi-data-driven)
    *   [Hệ thống Nhiệm vụ (Objectives)](#hệ-thống-nhiệm-vụ-objectives)
    *   [Hệ thống Gem Đặc biệt (Power-ups)](#hệ-thống-gem-đặc-biệt-power-ups)
    *   [Hệ thống Vật phẩm Hỗ trợ (Boosters)](#hệ-thống-vật-phẩm-hỗ-trợ-boosters)
6.  [Luồng Giao tiếp Sự kiện (Event-Driven Communication)](#6-luồng-giao-tiếp-sự-kiện-event-driven-communication)
7.  [Lộ trình Phát triển](#7-lộ-trình-phát-triển)

---

## 1. Tổng quan Kiến trúc

Dự án tuân thủ 4 nguyên tắc thiết kế chính:

*   **Lập trình Hướng đối tượng (OOP):** Mỗi thành phần trong game (Gem, Blocker, Board) là một class riêng biệt với thuộc tính và phương thức rõ ràng. Chúng ta sử dụng kế thừa để tạo ra các biến thể (ví dụ `RocketGem` kế thừa từ `Gem`).
*   **Thiết kế Hướng Dữ liệu (Data-Driven):** Toàn bộ thông tin của một màn chơi (bố cục, nhiệm vụ, số lượt đi) được định nghĩa trong các file `JSON` riêng biệt, tách rời hoàn toàn khỏi code logic. Điều này cho phép tạo và chỉnh sửa màn chơi mà không cần can thiệp vào code.
*   **Tách biệt Trách nhiệm (Separation of Concerns):** Logic game (`GameScene` và `Board`) được tách biệt hoàn toàn khỏi giao diện người dùng (`UIScene`). Chúng giao tiếp với nhau qua một hệ thống sự kiện trung gian.
*   **Giao tiếp Hướng Sự kiện (Event-Driven):** Các thành phần không gọi trực tiếp lẫn nhau. Thay vào đó, chúng phát ra các sự kiện (ví dụ: `gemsMatched`) và các thành phần khác sẽ lắng nghe và phản ứng lại. Điều này giúp giảm sự phụ thuộc và làm cho code cực kỳ linh hoạt.

## 2. Công nghệ sử dụng

*   **Framework:** [Phaser 3](https://phaser.io/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Ngôn ngữ:** JavaScript (ES6+)

## 3. Cài đặt & Khởi chạy

**Yêu cầu:** Node.js (phiên bản 16 trở lên).

1.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```
2.  **Chạy môi trường phát triển (hot-reload):**
    ```bash
    npm run dev
    ```
3.  **Build phiên bản production:**
    ```bash
    npm run build
    ```
    Game sẽ được đóng gói vào thư mục `dist/`.

## 4. Cấu trúc Thư mục Chi tiết

```
/
├── public/
│   └── assets/
│       ├── images/         # Hình ảnh, UI, texture atlases
│       ├── sounds/         # File âm thanh
│       └── levels/         # CÁC FILE JSON ĐỊNH NGHĨA MÀN CHƠI
│           ├── level_1.json
│           └── ...
├── src/
│   ├── scenes/             # Các màn hình chính của game
│   │   ├── PreloaderScene.js # Tải tài nguyên
│   │   ├── GameScene.js      # Nơi diễn ra gameplay chính (Controller)
│   │   └── UIScene.js        # Chỉ hiển thị UI (Điểm, Lượt đi, Nút bấm)
│   ├── objects/            # Các lớp đối tượng trong game
│   │   ├── Gem.js            # Lớp Gem cơ sở
│   │   ├── Board.js          # BỘ NÃO CỦA GAME, quản lý lưới logic
│   │   ├── powerups/         # Các loại gem đặc biệt kế thừa từ Gem
│   │   │   ├── RocketGem.js
│   │   │   └── BombGem.js
│   │   └── blockers/         # Các loại vật cản
│   │       ├── StoneBlocker.js
│   │       └── VineBlocker.js
│   ├── managers/           # (Tùy chọn) Các lớp quản lý toàn cục
│   │   └── SoundManager.js   # Quản lý việc phát âm thanh
│   ├── utils/              # Hàm tiện ích và hằng số
│   │   └── constants.js
│   └── main.js             # Điểm khởi đầu, cấu hình Phaser
...
```

## 5. Hướng dẫn Triển khai Tính năng Cốt lõi

### Thiết kế Màn chơi (Data-Driven)

Mỗi màn chơi được định nghĩa trong một file `JSON` tại `public/assets/levels/`.

#### Cấu trúc file `level_x.json`:

```json
{
  "levelId": 10,
  "moves": 25,
  "objectives": [
    { "target": "gem", "type": "red", "count": 20 },
    { "target": "blocker", "type": "stone", "count": 5 }
  ],
  "gridLayout": [
    [null, 7, 1, 2, 7, null],
    [   7, 1, 2, 3, 4,    7],
    [   1, 2, 3, 4, 1,    2],
    [   2, 3, 4, 1, 2,    3],
    [   7, 4, 1, 2, 3,    7],
    [null, 7, 2, 3, 7, null]
  ],
  "availableGems": ["red", "green", "blue", "purple"]
}
```

*   **`gridLayout`**: Biểu diễn bàn chơi.
    *   **Số dương (`1`, `2`...)**: Các loại gem hoặc vật cản được đặt sẵn.
    *   **`0`**: Một ô sẽ được điền bằng gem ngẫu nhiên.
    *   **`null`**: Một ô "lỗ hổng", không thuộc bàn chơi. **Cách này cho phép tạo ra bất kỳ hình dạng bàn chơi nào (chữ thập, trái tim...).**

### Hệ thống Nhiệm vụ (Objectives)

Mảng `objectives` trong file JSON định nghĩa điều kiện chiến thắng.
*   **`target: "gem"`**: Thu thập đủ số lượng gem theo `type` (màu sắc).
*   **`target: "blocker"`**: Phá đủ số lượng vật cản theo `type` (`stone`, `vine`...).
*   **Luồng hoạt động**: `Board` phá vỡ đối tượng -> `GameScene` phát sự kiện `objectiveUpdated` -> `UIScene` lắng nghe và cập nhật giao diện.

### Hệ thống Gem Đặc biệt (Power-ups)

Đây là các gem được tạo ra khi match nhiều hơn 3.

*   **Kiến trúc**: Sử dụng kế thừa trong OOP. `RocketGem`, `BombGem` đều kế thừa từ lớp `Gem` cơ sở.
*   **Logic**:
    1.  `Board` sau khi tìm thấy một match (ví dụ: match-4), sẽ không xóa ngay gem ở vị trí đó.
    2.  Thay vào đó, nó sẽ thay thế một trong các gem đó bằng một instance của `RocketGem`.
    3.  Khi người chơi match hoặc kích hoạt `RocketGem`, phương thức `activate(board)` của chính `RocketGem` sẽ được gọi để thực thi logic phá hàng/cột.

### Hệ thống Vật phẩm Hỗ trợ (Boosters)

Đây là các item người chơi chủ động sử dụng (búa, găng tay đổi chỗ...).

*   **Luồng hoạt động**:
    1.  Người chơi bấm vào icon Booster trên `UIScene`.
    2.  `UIScene` phát sự kiện `boosterSelected` (ví dụ: `hammer`).
    3.  `GameScene` lắng nghe, chuyển sang "chế độ dùng booster" và thay đổi con trỏ chuột.
    4.  Người chơi bấm vào một ô trên bàn cờ.
    5.  `GameScene` nhận tọa độ, gọi `board.useBooster('hammer', row, col)`.
    6.  `Board` thực thi logic của booster tương ứng.
    7.  `GameScene` reset lại trạng thái, quay về chế độ chơi bình thường.

## 6. Luồng Giao tiếp Sự kiện (Event-Driven Communication)

Đây là "mạch máu" của toàn bộ game, giúp các thành phần giao tiếp mà không phụ thuộc trực tiếp vào nhau.

| Tên sự kiện | Dữ liệu đi kèm (payload) | Ai phát ra? | Ai lắng nghe? | Mục đích |
| :--- | :--- | :--- | :--- | :--- |
| **`gemsMatched`** | `{ score, gemType, count }` | `Board` | `UIScene`, `SoundManager` | Cập nhật điểm, phát âm thanh match |
| **`objectiveUpdated`** | `{ target, type, remaining }` | `GameScene` | `UIScene` | Cập nhật UI nhiệm vụ |
| **`moveUsed`** | `{ movesLeft }` | `GameScene` | `UIScene` | Cập nhật số lượt đi còn lại |
| **`boosterSelected`** | `boosterType` (e.g., 'hammer') | `UIScene` | `GameScene` | Báo cho game biết người chơi muốn dùng booster |
| **`levelWin`** | `{}` | `GameScene` | `UIScene` | Hiển thị màn hình chiến thắng |
| **`levelLose`** | `{}` | `GameScene` | `UIScene` | Hiển thị màn hình thua cuộc |

## 7. Lộ trình Phát triển

*   [ ] Hoàn thiện màn hình chọn màn chơi (Level Select Screen).
*   [ ] Thêm các loại vật cản mới (Băng, Xích, Hộp gỗ...).
*   [ ] Thêm các loại gem đặc biệt mới (Bom màu, Máy bay giấy...).
*   [ ] Xây dựng hệ thống lưu game (`localStorage`).
*   [ ] Tối ưu hóa hiệu năng bằng Texture Atlas và Object Pooling.
*   [ ] Thêm hiệu ứng hạt (particle effects) cho các vụ nổ thêm hoành tráng.
