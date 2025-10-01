

Kiến trúc này được thiết kế để tối ưu hóa việc quản lý, tái sử dụng code và dễ dàng mở rộng trong tương lai.

```
/
├── public/
│   └── assets/
│       ├── images/
│       │   ├── ui/             # Các element giao diện (nút bấm, panel, icon)
│       │   ├── background/     # Hình nền cho các scene
│       │   ├── gameplay/       # Spritesheet/Atlas cho gem, blockers, power-ups
│       │   └── map/            # Hình ảnh bản đồ, các icon level
│       ├── sounds/
│       ├── fonts/
│       └── levels/             # File JSON định nghĩa màn chơi
├── src/
│   ├── scenes/                 # Các màn hình chính của game
│   │   ├── BootScene.js        # (Màn hình 4) Tải asset cho Preloader
│   │   ├── PreloaderScene.js   # (Màn hình 4) Tải tất cả asset của game & hiển thị loading bar
│   │   ├── MapScene.js         # (Màn hình 3) Hiển thị bản đồ thế giới, chọn level
│   │   ├── GameScene.js        # (Màn hình 1) Chỉ chứa logic gameplay, bàn cờ
│   │   ├── UIScene.js          # (Màn hình 1) Hiển thị UI trên GameScene (điểm, lượt đi...)
│   │   ├── LeaderboardScene.js # (Màn hình 2) Hiển thị bảng xếp hạng
│   │   └── popups/             # Các scene nhỏ hoạt động như popup
│   │       ├── SettingsPopup.js
│   │       ├── WinPopup.js
│   │       └── LosePopup.js
│   ├── objects/                # Các đối tượng logic và hình ảnh trong GameScene
│   │   ├── Board.js            # Lớp quản lý logic bàn cờ
│   │   ├── gems/               # Các loại gem
│   │   │   ├── Gem.js          # Lớp gem cơ sở
│   │   │   └── PowerupGem.js   # Lớp gem đặc biệt (tên lửa, bom...)
│   │   └── blockers/           # Các loại vật cản
│   │       ├── StoneBlocker.js
│   │       └── VineBlocker.js
│   ├── ui/                     # CÁC COMPONENT GIAO DIỆN TÁI SỬ DỤNG
│   │   ├── Button.js           # Lớp Button cơ sở (xử lý state, âm thanh)
│   │   ├── LevelNode.js        # Component cho 1 level trên MapScene
│   │   ├── PlayerEntry.js      # Component cho 1 hàng trên LeaderboardScene
│   │   ├── ObjectiveItem.js    # Component cho 1 mục tiêu trong bảng "Order"
│   │   └── ProgressBar.js      # Thanh progress bar (dùng ở Preloader và trong game)
│   ├── managers/               # Các lớp quản lý hệ thống toàn cục
│   │   ├── PlayerDataManager.js# Quản lý dữ liệu người chơi (level đã qua, sao, tiền...)
│   │   ├── SoundManager.js     # Quản lý phát nhạc nền, SFX
│   │   ├── SceneManager.js     # Quản lý chuyển cảnh với hiệu ứng
│   │   └── APIManager.js       # Quản lý gọi API (lấy dữ liệu leaderboard)
│   ├── utils/                  # Các hàm tiện ích, hằng số
│   │   ├── constants.js        # Hằng số (GEM_TYPE, SCENE_KEYS...)
│   │   └── helpers.js          # Các hàm tiện ích chung
│   └── main.js                 # Điểm khởi đầu, cấu hình Phaser
...
```

---

### Giải thích Chi tiết Vai trò của Từng Thư mục

#### 1. `src/scenes/` - Các Màn Hình

Đây là các "phòng" chính trong ngôi nhà game của bạn. Mỗi file là một màn hình riêng biệt.

*   `BootScene.js`: Scene đầu tiên, siêu nhẹ. Nhiệm vụ duy nhất của nó là tải các tài nguyên cần thiết cho `PreloaderScene` (ví dụ: ảnh thanh loading, logo).
*   `PreloaderScene.js`: **(Màn hình 4 - Loading)** Tải TẤT CẢ các tài nguyên còn lại của game. Hiển thị thanh tiến trình. Sau khi xong, nó sẽ chuyển đến `MapScene`.
*   `MapScene.js`: **(Màn hình 3 - Bản đồ Level)**
    *   Hiển thị bản đồ thế giới có thể cuộn.
    *   Đọc dữ liệu từ `PlayerDataManager` để biết người chơi đang ở level nào, level nào đã qua, bao nhiêu sao.
    *   Tạo ra các `LevelNode` (từ thư mục `ui/`) cho người chơi bấm vào.
    *   Khi người chơi chọn level, nó sẽ tải file JSON tương ứng và khởi động `GameScene` & `UIScene`.
*   `GameScene.js`: **(Màn hình 1 - Gameplay)**
    *   Là "sân khấu" chính nhưng **không có UI**.
    *   Chỉ chứa background và đối tượng `Board`.
    *   Xử lý toàn bộ logic game: input vuốt/chạm, kiểm tra match, kích hoạt power-up...
*   `UIScene.js`: **(Màn hình 1 - Giao diện Gameplay)**
    *   Chạy **song song và đè lên trên** `GameScene`.
    *   Hiển thị tất cả các yếu tố UI: bảng "Order", điểm số, số lượt đi, thanh progress sao, các nút booster.
    *   Lắng nghe các sự kiện từ `GameScene` để cập nhật thông tin.
*   `LeaderboardScene.js`: **(Màn hình 2 - Bảng xếp hạng)**
    *   Gọi `APIManager` để lấy dữ liệu xếp hạng.
    *   Sử dụng component `PlayerEntry` (từ `ui/`) để hiển thị danh sách người chơi.
    *   Xử lý logic chuyển tab (Global, Vietnam, Server).

#### 2. `src/objects/` - Các Đối Tượng Trong Thế Giới Game

Đây là các "diễn viên" trên sân khấu `GameScene`.

*   `Board.js`: Đạo diễn của màn kịch. Quản lý vị trí, trạng thái của tất cả gem và blocker. Chứa các thuật toán cốt lõi (tìm match, refill...).
*   `gems/`: Chứa các loại đá quý. Sử dụng kế thừa OOP. `PowerupGem` sẽ kế thừa từ `Gem` và override phương thức `activate()`.
*   `blockers/`: Chứa các vật cản. Mỗi vật cản là một class riêng, có thể có `health` (số lần cần tác động để phá vỡ).

#### 3. `src/ui/` - Các Mảnh Ghép Giao Diện Tái Sử Dụng (Rất quan trọng!)

Thay vì vẽ đi vẽ lại các nút bấm hay các panel, chúng ta tạo ra các "component" có thể tái sử dụng ở nhiều nơi.

*   `Button.js`: Một lớp cơ sở để tạo nút bấm, tự động xử lý hiệu ứng khi di chuột vào, khi bấm xuống, và phát âm thanh click.
*   `LevelNode.js`: Một nút level trên bản đồ. Nó tự quản lý trạng thái của mình (khóa, mở, số sao đạt được). `MapScene` sẽ tạo ra nhiều instance của lớp này.
*   `PlayerEntry.js`: Một hàng trong bảng xếp hạng. Nó nhận dữ liệu (avatar, tên, level, điểm) và tự hiển thị. `LeaderboardScene` chỉ cần tạo ra một danh sách các `PlayerEntry`.
*   `ObjectiveItem.js`: Một icon mục tiêu (ví dụ: 23 viên đá đỏ) trong bảng "Order" của `UIScene`.

#### 4. `src/managers/` - Các "Bộ Não" Quản Lý Toàn Cục

Đây là các hệ thống chạy ngầm, quản lý các khía cạnh quan trọng của toàn bộ game, không phụ thuộc vào một scene cụ thể nào.

*   `PlayerDataManager.js`: Giao tiếp với `localStorage` (hoặc server) để **lưu và tải** tiến trình của người chơi. Các scene như `MapScene` và `UIScene` sẽ hỏi manager này để biết người chơi có bao nhiêu tiền, đã qua level nào.
*   `SoundManager.js`: Một nơi duy nhất để quản lý tất cả âm thanh. Các scene khác chỉ cần gọi ví dụ `SoundManager.play('click')` thay vì phải tự load và quản lý âm thanh.
*   `APIManager.js`: Chịu trách nhiệm giao tiếp với server. Nó xử lý việc gửi request, nhận response, và xử lý lỗi. `LeaderboardScene` sẽ sử dụng manager này.

Với cấu trúc này, dự án của bạn sẽ cực kỳ rõ ràng, mỗi file có một nhiệm vụ duy nhất, giúp bạn dễ dàng tìm kiếm, sửa lỗi và thêm tính năng mới mà không làm ảnh hưởng đến các phần khác. Chúc bạn thành công với dự án game tuyệt vời này