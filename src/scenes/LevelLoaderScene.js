// src/scenes/LevelLoaderScene.js
import Phaser from 'phaser';

export class LevelLoaderScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelLoaderScene' });
        this.levelId = 1;
    }

    init(data) {
        this.levelId = data.levelId;
    }

    preload() {
        console.log("LevelLoaderScene: Bắt đầu load assets gameplay...");
        
        // ------------------------------------------------------------------
        // [BƯỚC 1]: VẼ GIAO DIỆN LOADING NGAY (TRƯỚC KHI TẢI FILE)
        // ------------------------------------------------------------------
        const { width, height } = this.scale;

        // 1. Chọn ngẫu nhiên một ảnh nền từ 1 đến 6
        const randomIndex = Phaser.Math.Between(1, 6);
        this.selectedBgIndex = randomIndex; // Lưu lại để dùng trong create nếu cần

        // 2. Hiển thị ảnh nền đã chọn (các ảnh này đã load ở PreloaderScene)
        const bg = this.add.image(width / 2, height / 2, `loading_background_${randomIndex}`);
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale).setScrollFactor(0);

        // 3. Xác định vị trí Y cho thanh progress bar
        let progressBarY = 593; // Vị trí Y mặc định
        
        if (randomIndex === 6 || randomIndex === 1) {
            progressBarY = 620;
        } else if (randomIndex === 5) {
            progressBarY = 639;
        }

        // 4. Tạo thanh progress bar
        const progressBar = this.add.image(290, progressBarY, 'loading_level_progressbar')
            .setScale(0.34, 0.39);

        // Tính toán kích thước thực tế
        const barDisplayWidth = progressBar.width * progressBar.scaleX;
        const barDisplayHeight = progressBar.height * progressBar.scaleY;

        // 5. Tạo mặt nạ (mask) để hiển thị tiến độ
        const mask = this.make.graphics();
        progressBar.setMask(mask.createGeometryMask());

        // Lưu lại để dùng trong event progress
        this.progressMask = mask;
        this.progressBar = progressBar;
        this.barDisplayWidth = barDisplayWidth;
        this.barDisplayHeight = barDisplayHeight;
        
        // Biến theo dõi tiến độ
        this.actualProgress = 0; // Tiến độ tải thực tế (từ Phaser)
        this.fakeProgress = 0;   // Tiến độ animation giả (để đảm bảo thanh bar chạy đủ lâu)
        this.isLoadComplete = false; // Đã tải xong chưa
        this.loadStartTime = Date.now(); // Thời gian bắt đầu tải

        // 6. Lắng nghe sự kiện tiến độ tải thực tế
        this.load.on('progress', (value) => {
            this.actualProgress = value;
        });
        
        this.load.on('complete', () => {
            this.isLoadComplete = true;
            console.log("LevelLoaderScene: Tải assets hoàn tất!");
        });

        // 7. Tạo animation giả để thanh bar luôn chạy ít nhất 2.5 giây
        this.tweens.add({
            targets: this,
            fakeProgress: 1,
            duration: 2500, // 2.5 giây
            ease: 'Linear',
            onUpdate: () => {
                // Chỉ dùng fakeProgress để đảm bảo animation chạy mượt từ 0->100%
                // Không dùng actualProgress vì nó nhảy lên 100% ngay lập tức (tải nhanh)
                // Logic kiểm tra tải xong đã được xử lý ở onComplete rồi
                const displayProgress = this.fakeProgress;
                
                this.progressMask.clear();
                this.progressMask.fillStyle(0xffffff);
                this.progressMask.fillRect(
                    this.progressBar.x - this.barDisplayWidth / 2,
                    this.progressBar.y - this.barDisplayHeight / 2,
                    this.barDisplayWidth * displayProgress,
                    this.barDisplayHeight
                );
            },
            onComplete: () => {
                // Khi animation chạy xong, kiểm tra xem đã tải xong chưa
                if (this.isLoadComplete) {
                    this.transitionToGame();
                } else {
                    // Nếu chưa tải xong, đợi sự kiện 'complete'
                    this.load.once('complete', () => {
                        this.transitionToGame();
                    });
                }
            }
        });

        // ------------------------------------------------------------------
        // [BƯỚC 2]: SAU ĐÓ MỚI BẮT ĐẦU TẢI FILE NẶNG (NHẠC, ASSETS...)
        // ------------------------------------------------------------------
        
        // Tải nhạc nền cho level hiện tại
        const strIndex = this.levelId.toString().padStart(2, '0');
        const musicKey = `map_${strIndex}`;
        this.load.audio(musicKey, `assets/sounds/maps/map_${strIndex}.m4a`);
        console.log(`LevelLoaderScene: Đang tải nhạc nền cho level ${this.levelId}: ${musicKey}`);
        
        // Load note images for Stripe effect
        this.load.image('note1', 'assets/images/vfx/note1.png');
        this.load.image('note2', 'assets/images/vfx/note2.png');
        this.load.image('note3', 'assets/images/vfx/note3.png');
        this.load.image('note4', 'assets/images/vfx/note4.png');
    }

    create() {
        // ------------------------------------------------------------------
        // [BƯỚC 3]: KHI TẢI XONG (do Phaser gọi tự động)
        // ------------------------------------------------------------------
        // Lưu ý: Hàm này sẽ chạy ngay khi load.start() hoàn tất
        // Nhưng chúng ta KHÔNG chuyển scene ở đây nữa
        // Mà chờ animation thanh bar chạy xong trong preload()
        console.log("LevelLoaderScene: Load queue hoàn tất, đang chờ animation...");
    }

    /**
     * Chuyển sang GameScene sau khi cả animation và loading đều xong
     */
    transitionToGame() {
        const elapsedTime = Date.now() - this.loadStartTime;
        const minLoadTime = 2500; // Thời gian tối thiểu 2.5 giây
        
        console.log(`LevelLoaderScene: Đã tải xong và animation hoàn tất (${elapsedTime}ms)`);
        
        // Nếu tổng thời gian đã đủ, chuyển scene luôn
        // Nếu chưa đủ, đợi thêm để đủ thời gian tối thiểu
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);
        
        this.time.delayedCall(remainingTime + 300, () => {
            this.cameras.main.fadeOut(200, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('GameScene', { levelId: this.levelId });
            });
        });
    }
}