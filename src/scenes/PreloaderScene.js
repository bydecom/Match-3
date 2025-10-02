// src/scenes/PreloaderScene.js
import Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
        this.background = null;
    }
    
    preload() {
        // --- BƯỚC 1: TẢI CÁC ASSET CẦN ĐỂ VẼ MÀN HÌNH LOADING ---
        // (Bước này đã được BootScene làm, nhưng ta sẽ xử lý giao diện ở create)
        
        // --- BƯỚC 2: BẮT ĐẦU TẢI TẤT CẢ TÀI NGUYÊN GAME ---
        // Đây là nơi bạn đặt tất cả các lệnh this.load...
        this.loadAssets();
    }

    create() {
        // --- BƯỚC 3: HIỂN THỊ GIAO DIỆN LOADING ---
        // Hàm này sẽ được gọi sau khi preload() hoàn tất.
        this.createLoadingScreen();

        // --- BƯỚC 4: XỬ LÝ KHI TẢI XONG (VỚI MIN TIME) ---
        // Tạo một promise cho thời gian chờ tối thiểu (ví dụ: 2 giây)
        const minTimePromise = new Promise(resolve => {
            setTimeout(resolve, 2000); // 2000ms = 2 giây
        });

        // Tạo một promise cho sự kiện 'complete' của loader
        const loadCompletePromise = new Promise(resolve => {
            this.load.on('complete', resolve);
        });

        // Chờ cả hai promise hoàn thành
        Promise.all([minTimePromise, loadCompletePromise]).then(() => {
            console.log("Tải xong và đã đợi đủ thời gian tối thiểu!");

            // --- ĐÂY LÀ NƠI BẠN QUYẾT ĐỊNH SẼ LÀM GÌ TIẾP ---

            // **LỰA CHỌN A: Dừng lại vĩnh viễn (để test)**
            // (Không làm gì cả)
            
            // **LỰA CHỌN B: Chuyển sang scene tiếp theo (cho game thật)**
            /*
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MainScene');
            });
            */
        });
    }

    // --- CÁC HÀM TIỆN ÍCH ---

    loadAssets() {
        // Vòng lặp giả lập để test
        for (let i = 0; i < 100; i++) {
            this.load.image(`dummy_asset_${i}`, 'assets/images/ui/loading.png');
        }
        // Sau này bạn sẽ thay bằng code tải thật
        // this.load.atlas(...);
        // this.load.audio(...);
    }

    createLoadingScreen() {
        // Áp dụng hiệu ứng fade in để hiện ra mượt mà
        this.cameras.main.fadeIn(300, 0, 0, 0);
        
        // Vẽ background và cài đặt co giãn
        this.background = this.add.image(0, 0, 'loading_background');
        this.scale.on('resize', this.resizeBackground, this);
        this.resizeBackground(this.scale.width, this.scale.height);

        // Vẽ các thành phần UI
        const gameWidth = this.scale.gameSize.width;
        const gameHeight = this.scale.gameSize.height;
        const percentText = this.add.text(gameWidth / 2, gameHeight / 2 + 150, 'Loading 0%', {
            font: '24px Arial', fill: '#ffffff'
        }).setOrigin(0.5);

        // Lắng nghe sự kiện progress để cập nhật UI
        this.load.on('progress', (value) => {
            percentText.setText(`Loading ${Math.round(value * 100)}%`);
        });
    }

    resizeBackground(gameWidth, gameHeight) {
        if (!this.background) return;
        this.background.setPosition(gameWidth / 2, gameHeight / 2);
        const scale = Math.max(gameWidth / this.background.width, gameHeight / this.background.height);
        this.background.setScale(scale);
    }
}