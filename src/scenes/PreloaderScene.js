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
        this.load.image(`map1_background`, 'assets/images/map/map1-background.png');
        this.load.image(`playground1_border`, 'assets/images/map/playground-border.png');
        this.load.image(`playground1_background`, 'assets/images/map/playground.png');
        
        // Tải asset cho theme board của level 5
        this.load.image(`playground2_border`, 'assets/images/map/playground2_border.png');
        this.load.image(`playground2_background`, 'assets/images/map/playground2_background.png');
        
        this.load.image(`cell`, 'assets/images/map/cell.png');
        
        // Load gem images
        this.load.image(`gem_red`, 'assets/images/gameplay/gems/red.png');
        this.load.image(`gem_green`, 'assets/images/gameplay/gems/green.png');
        this.load.image(`gem_blue`, 'assets/images/gameplay/gems/blue.png');
        this.load.image(`gem_purple`, 'assets/images/gameplay/gems/purple.png');
        this.load.image(`gem_yellow`, 'assets/images/gameplay/gems/yellow.png');
        this.load.image(`gem_orange`, 'assets/images/gameplay/gems/orange.png');
        
        // Load power-up images
        this.load.image(`gem_bomb`, 'assets/images/gameplay/gems/bomb.png');
        this.load.image(`gem_color_bomb`, 'assets/images/gameplay/gems/color_bomb.png');
        this.load.image(`gem_stripe`, 'assets/images/gameplay/gems/stripe.png');
        // Load blocker images (stone levels + rope)
        this.load.image(`blocker_stone_1`, 'assets/images/gameplay/blockers/blocker_stone_2.png');
        this.load.image(`blocker_stone_2`, 'assets/images/gameplay/blockers/blocker_stone_1.png');
        this.load.image(`blocker_rope`, 'assets/images/gameplay/blockers/blocker_rope.png');
        // Load booster icons (UI)
        this.load.image('booster_hammer', 'assets/images/ui/booster_hammer.png');
        this.load.image('booster_swap', 'assets/images/ui/booster_swap.png');
        this.load.image('booster_rocket', 'assets/images/ui/booster_rocket.png');
        this.load.image('booster_shuffle', 'assets/images/ui/booster_shuffle.png');
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

        // Load note images for Stripe effect
        this.load.image('note1', 'assets/images/vfx/note1.png');
        this.load.image('note2', 'assets/images/vfx/note2.png');
        this.load.image('note3', 'assets/images/vfx/note3.png');
        this.load.image('note4', 'assets/images/vfx/note4.png');

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