// src/scenes/PreloaderScene.js
import Phaser from 'phaser';

const MIN_LOAD_TIME = 5000;

export class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
        this.background = null;
        this.logo = null;
        this.progressBarBg = null;
        this.progressBar = null;
        this.barTextureWidth = 0;
        this.barTextureHeight = 0;
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
        const targetProgress = Math.max(timeProgress, this.realProgress);
        
        if (this.displayProgress < targetProgress) {
             this.displayProgress += (targetProgress - this.displayProgress) * 0.1;
        }

        // Cập nhật crop để lấp đầy thanh progress bar (nhẹ hơn so với GeometryMask)
        if (this.progressBar && this.barTextureWidth > 0) {
            const cropWidth = Math.max(0, Math.min(1, this.displayProgress)) * this.barTextureWidth;
            this.progressBar.setCrop(0, 0, cropWidth, this.barTextureHeight);
        }
    }

    createLoadingScreen() {
        console.log("Vẽ màn hình loading...");
        this.background = this.add.image(0, 0, 'loading_background');
        this.resizeBackground(this.scale.width, this.scale.height);
        
        const gameWidth = this.scale.gameSize.width;
        const gameHeight = this.scale.gameSize.height;

        // Logo ở giữa, lệch lên trên
        this.logo = this.add.image(gameWidth / 2, gameHeight / 2 - 310, 'loading_logo').setOrigin(0.5);
        // Scale logo để không vượt quá 60% bề rộng màn hình
        const maxLogoWidth = gameWidth * 0.4;
        if (this.logo.width > 0 && this.logo.width > maxLogoWidth) {
            const logoScale = 0.4;
            this.logo.setScale(logoScale);
        }

        // Hiệu ứng lướt lên xuống nhẹ nhàng cho logo
        this.tweens.add({
            targets: this.logo,
            y: '+=10',
            duration: 2000,
            delay: 500, 
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Progress bar background và bar ở dưới logo
        const progressY = gameHeight / 2 - 130;
        this.progressBarBg = this.add.image(gameWidth / 2, progressY, 'loading_progress_bar_background').setOrigin(0.5);
        this.progressBar = this.add.image(gameWidth / 2, progressY, 'loading_progress_bar').setOrigin(0.5);

        // Scale theo bề rộng màn hình (tối đa 70%)
        const maxBarWidth = gameWidth * 0.5;
        const baseBarWidth = this.progressBar.width;
        if (baseBarWidth > 0 && baseBarWidth > maxBarWidth) {
            const barScale = maxBarWidth / baseBarWidth;
            this.progressBarBg.setScale(barScale);
            this.progressBar.setScale(barScale);
        }

        // Dùng crop theo kích thước texture (tối ưu hiệu năng)
        this.barTextureWidth = this.progressBar.width;
        this.barTextureHeight = this.progressBar.height;
        this.progressBar.setCrop(0, 0, 0, this.barTextureHeight);

        this.load.on('progress', (value) => {
            this.realProgress = value;
        });
    }
    
    loadAssets() {
        this.load.maxParallelDownloads = 4
        console.log("Bắt đầu ra lệnh tải assets...");
        this.load.image(`level_background`, 'assets/screen/level.png');
        this.load.image(`map1_background`, 'assets/images/map/map1-background.png');
        this.load.image(`playground1_border`, 'assets/images/map/playground-border.png');
        this.load.image(`playground1_background`, 'assets/images/map/playground.png');
        
        // Tải asset cho theme board của level 5
        this.load.image(`playground2_border`, 'assets/images/map/playground2_border.png');
        this.load.image(`playground2_background`, 'assets/images/map/playground2_background.png');
        
        this.load.image(`cell`, 'assets/images/map/cell.png');
        
        // Nút cài đặt
        this.load.image('setting_button', 'assets/images/ui/setting_button.png');
        // Load UI Progress Bar assets
        this.load.image('progress_bar_background', 'assets/images/ui/progress_bar_background.png');
        this.load.image('progress_bar_fill', 'assets/images/ui/progress_bar_fill.png');
        this.load.image('star_off', 'assets/images/ui/star_off.png');
        this.load.image('star_on', 'assets/images/ui/star_on.png');
        
        // Load loading background images
        this.load.image('loading_background_1', 'assets/screen/loading1.png');
        this.load.image('loading_background_2', 'assets/screen/loading2.png');
        this.load.image('loading_background_3', 'assets/screen/loading3.png');
        this.load.image('loading_background_4', 'assets/screen/loading4.png');
        this.load.image('loading_background_5', 'assets/screen/loading5.png');
        this.load.image('loading_background_6', 'assets/screen/loading6.png');
        
        // Load progress bar image for level loading
        this.load.image('loading_level_progressbar', 'assets/screen/progress-bar.png');

        // Load assets cho màn hình bản đồ mới
        this.load.image('map_part1', 'assets/images/map/map_part_1.png');
        this.load.image('map_part2', 'assets/images/map/map_part_2.png'); // Sử dụng cùng ảnh tạm thời
        // Nút bấm cho mỗi level (sử dụng cell.png làm nút tạm thời)
        this.load.image('level_node_button', 'assets/images/map/cell.png'); 

        // Load level data
        this.load.json('level_1', 'assets/levels/level_1.json');
        this.load.json('level_2', 'assets/levels/level_2.json');
        this.load.json('level_3', 'assets/levels/level_3.json');
        this.load.json('level_4', 'assets/levels/level_4.json');
        this.load.json('level_5', 'assets/levels/level_5.json');
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
            console.log("Fade out xong, chính thức bắt đầu MapScene.");
            this.scene.start('MapScene');
        });
    }

    resizeBackground(gameWidth, gameHeight) {
        if (!this.background) return;
        this.background.setPosition(gameWidth / 2, gameHeight / 2);
        const scale = Math.max(gameWidth / this.background.width, gameHeight / this.background.height);
        this.background.setScale(scale);
    }
}