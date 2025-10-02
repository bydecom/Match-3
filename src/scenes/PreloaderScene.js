// src/scenes/PreloaderScene.js
import Phaser from 'phaser';

const MIN_LOAD_TIME = 5000;

export class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
        this.background = null;
        this.percentText = null;
        this.realProgress = 0;
        this.displayProgress = 0;
        this.startTime = 0;
    }

    preload() {
        console.log("--- BẮT ĐẦU PRELOAD ---");
        this.startTime = this.time.now;
        
        this.createLoadingScreen();

        const loadCompletePromise = new Promise(resolve => {
            this.load.on('complete', () => {
                console.log(">>> SỰ KIỆN: Tải thật đã xong (load.on complete)");
                resolve();
            });
        });

        this.loadAssets();

        const minTimePromise = new Promise(resolve => {
            setTimeout(() => {
                console.log(">>> SỰ KIỆN: Đã hết thời gian chờ tối thiểu");
                resolve();
            }, MIN_LOAD_TIME);
        });

        Promise.all([minTimePromise, loadCompletePromise]).then(() => {
            if (!this.scene.isActive()) {
                console.log("Promise hoàn thành, nhưng scene không còn hoạt động. Bỏ qua.");
                return;
            }

            console.log("--- THÀNH CÔNG: Cả 2 Promise đã hoàn thành! Chuẩn bị chuyển scene. ---");
            if (this.percentText) {
                this.percentText.setText('Loading 100%');
            }
            this.startNextScene();
        });
    }

    create() {
        console.log("--- CREATE ĐƯỢC GỌI (Sau khi preload xong) ---");
        this.sys.game.renderer.on('contextrestored', this.handleContextRestored, this);
        this.scale.on('resize', this.handleResize, this);
    }
   
    update() {
        const elapsedTime = this.time.now - this.startTime;
        const timeProgress = Math.min(1.0, elapsedTime / MIN_LOAD_TIME);
        const targetProgress = timeProgress;
        
        if (this.displayProgress < targetProgress) {
             this.displayProgress += (targetProgress - this.displayProgress) * 0.1;
        }

        if (this.percentText) {
            this.percentText.setText(`Loading ${Math.round(this.displayProgress * 100)}%`);
        }
    }

    createLoadingScreen() {
        console.log("Vẽ màn hình loading...");
        this.background = this.add.image(0, 0, 'loading_background');
        this.resizeBackground(this.scale.width, this.scale.height);
        
        const gameWidth = this.scale.gameSize.width;
        const gameHeight = this.scale.gameSize.height;

        this.percentText = this.add.text(gameWidth / 2, gameHeight / 2 + 150, 'Loading 0%', {
            font: '24px Arial', fill: '#ffffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            this.realProgress = value;
        });
    }
    
    loadAssets() {
        console.log("Bắt đầu ra lệnh tải assets...");
        this.load.image(`level_background`, 'assets/screen/level.png');
    }


    handleContextRestored() {
        console.log("SỰ KIỆN: WebGL Context đã được khôi phục! Bắt đầu lại từ BootScene...");
        this.cleanUpListeners();
        this.scene.start('BootScene');
    }

    handleResize() {
        console.log("SỰ KIỆN: Cửa sổ đã thay đổi kích thước! Bắt đầu lại từ BootScene...");
        this.cleanUpListeners();
        this.scene.start('BootScene');
    }

    shutdown() {
        console.log("PreloaderScene shutdown.");
        this.cleanUpListeners();
    }
    
    cleanUpListeners() {
        this.scale.off('resize', this.handleResize, this);
        this.sys.game.renderer.off('contextrestored', this.handleContextRestored, this);
    }


    startNextScene() {
        console.log("PreloaderScene quyết định chuyển cảnh. Dọn dẹp listener ngay lập tức.");
        
        // --- ĐIỂM SỬA QUAN TRỌNG NHẤT ---
        // Dọn dẹp TẤT CẢ listener ngay tại thời điểm quyết định chuyển cảnh.
        // Đây là "điểm không thể quay đầu". Scene không nên lắng nghe bất cứ thứ gì nữa.
        this.cleanUpListeners();

        // Bây giờ mới bắt đầu hiệu ứng chuyển cảnh một cách an toàn
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            console.log("Fade out xong, chính thức bắt đầu MainScene.");
            this.scene.start('MainScene');
        });
    }

    resizeBackground(gameWidth, gameHeight) {
        if (!this.background) return;
        this.background.setPosition(gameWidth / 2, gameHeight / 2);
        const scale = Math.max(gameWidth / this.background.width, gameHeight / this.background.height);
        this.background.setScale(scale);
    }
}