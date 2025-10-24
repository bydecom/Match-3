// src/scenes/PreloaderScene.js
import Phaser from 'phaser';

const MIN_LOAD_TIME = 2000; // Giảm thời gian chờ một chút

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

        // Chờ font web sẵn sàng (UTMCookies) để tránh giật font khi vào scene tiếp theo
        const fontLoadPromise = this.waitForFont('UTMCookies');

        Promise.all([minTimePromise, loadCompletePromise, fontLoadPromise]).then(() => {
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
        this.load.image('setting_button', 'assets/images/ui/setting_button_scale.png');
        
        // Load Pause UI assets
        this.load.image('pause_ui', 'assets/images/ui/pause/UI.png');
        this.load.image('pause_continue', 'assets/images/ui/pause/countinue.png');
        this.load.image('pause_quit', 'assets/images/ui/pause/quit.png');
        this.load.image('pause_restart', 'assets/images/ui/pause/Restart.png');
        this.load.image('pause_exit', 'assets/images/ui/pause/exit.png');
        this.load.image('pause_bar', 'assets/images/ui/pause/Bar.png');
        this.load.image('pause_music', 'assets/images/ui/pause/music.png');
        this.load.image('pause_sound', 'assets/images/ui/pause/sound.png');
        
        // Load Level Review UI assets
        this.load.image('level_review_ui', 'assets/images/ui/level_review/UI.png');
        
        // Load Play button
        this.load.image('play_button', 'assets/images/ui/level_review/play.png');
        
        // Load gem images for objectives
        this.load.image(`gem_red`, 'assets/images/gameplay/gems/red.png');
        this.load.image(`gem_green`, 'assets/images/gameplay/gems/green.png');
        this.load.image(`gem_blue`, 'assets/images/gameplay/gems/blue.png');
        this.load.image(`gem_purple`, 'assets/images/gameplay/gems/purple.png');
        this.load.image(`gem_yellow`, 'assets/images/gameplay/gems/yellow.png');
        this.load.image(`gem_orange`, 'assets/images/gameplay/gems/orange.png');
        
        // Load power-up images for objectives
        this.load.image(`gem_bomb`, 'assets/images/gameplay/gems/bomb.png');
        this.load.image(`gem_color_bomb`, 'assets/images/gameplay/gems/color_bomb.png');
        this.load.image(`gem_stripe`, 'assets/images/gameplay/gems/stripe.png');
        
        // Load blocker images for objectives
        this.load.image(`blocker_stone_1`, 'assets/images/gameplay/blockers/blocker_stone_2.png');
        this.load.image(`blocker_stone_2`, 'assets/images/gameplay/blockers/blocker_stone_1.png');
        this.load.image(`blocker_rope`, 'assets/images/gameplay/blockers/blocker_rope.png');
        
        // Load booster icons for Level Review
        this.load.image('booster_hammer', 'assets/images/ui/booster_hammer.png');
        this.load.image('booster_swap', 'assets/images/ui/booster_swap.png');
        this.load.image('booster_rocket', 'assets/images/ui/booster_rocket.png');
        this.load.image('booster_shuffle', 'assets/images/ui/booster_shuffle.png');
        this.load.image('booster_background', 'assets/images/ui/level_review/booster_background.png');
        this.load.image('quantity_background', 'assets/images/ui/level_review/quantity_background.png');
        this.load.image('add_icon', 'assets/images/ui/level_review/add_icon.png');
        
        // Load UI Progress Bar assets
        this.load.image('progress_bar_background', 'assets/images/ui/progress_bar_background.png');
        this.load.image('progress_bar_fill', 'assets/images/ui/progress_bar_fill.png');
        this.load.image('star_off', 'assets/images/ui/star_off.png');
        this.load.image('star_on', 'assets/images/ui/star_on.png');
        
        // Load loading background images
        this.load.image('loading_background_1', 'assets/screen/loading_1.png');
        this.load.image('loading_background_2', 'assets/screen/loading_2.png');
        this.load.image('loading_background_3', 'assets/screen/loading_3.png');
        this.load.image('loading_background_4', 'assets/screen/loading_4.png');
        this.load.image('loading_background_5', 'assets/screen/loading_5.png');
        this.load.image('loading_background_6', 'assets/screen/loading_6.png');
        
        // Load progress bar image for level loading
        this.load.image('loading_level_progressbar', 'assets/screen/progress-bar.png');

        // Load assets cho màn hình bản đồ mới
        this.load.image('map_part1', 'assets/images/map/map.png');
        // this.load.image('map_part1', 'assets/images/map/map_part_1.png');
        this.load.image('map_part2', 'assets/images/map/map_part_2.png');
        
        // --- THÊM ASSETS MỚI CHO MAPSCENE ---
        this.load.image('level_lock', 'assets/images/map/level_lock.png');
        this.load.image('level_unlock', 'assets/images/map/level_unlock.png');
        this.load.image('star_1', 'assets/images/map/star_1.png');
        this.load.image('star_2', 'assets/images/map/star_2.png');
        this.load.image('star_3', 'assets/images/map/star_3.png');
        
        // Load UI assets cho ResourceDisplay
        this.load.image('coin', 'assets/screen/coin.png');
        this.load.image('heart', 'assets/screen/heart.png'); 

        // VFX - steam
        this.load.image('vfx_steam_1_1_bot_nuoc', 'assets/images/map/vfx/steam/1.1. Bot nuoc.png');
        this.load.image('vfx_steam_1_2_bot_nuoc', 'assets/images/map/vfx/steam/1.2. Bot nuoc.png');
        this.load.image('vfx_steam_1_3_bot_nuoc', 'assets/images/map/vfx/steam/1.3. Bot nuoc.png');
        this.load.image('vfx_steam_1_4_bot_nuoc', 'assets/images/map/vfx/steam/1.4.  Bot nuoc.png');
        // --- NEW: Banana tree variants and wooden stumps for Steam area ---
        // Bạn đã cung cấp 3 ảnh: cay_chuoi1, cay_chuoi2, coc_go
        // Đặt key ngắn gọn để dùng trong MapVFXManager
        this.load.image('steam_cay_chuoi1', 'assets/images/map/vfx/steam/cay_chuoi1.png');
        this.load.image('steam_cay_chuoi2', 'assets/images/map/vfx/steam/cay_chuoi2.png');
        this.load.image('steam_coc_go', 'assets/images/map/vfx/steam/coc_go.png');
        this.load.image('vfx_steam_10_mat_nuoc_loang_1', 'assets/images/map/vfx/steam/10. Mat nuoc loang 1.png');
        this.load.image('vfx_steam_11_mat_nuoc_loang_1', 'assets/images/map/vfx/steam/11. Mat nuoc loang 1.png');
        this.load.image('vfx_steam_13_mat_nuoc_loang_3', 'assets/images/map/vfx/steam/13. Mat nuoc loang 3.png');
        this.load.image('vfx_steam_15_nuoc_chay_chan_thac', 'assets/images/map/vfx/steam/15. Nuoc chay chan thac.png');
        this.load.image('vfx_steam_16_nuoc_chay_chan_thac', 'assets/images/map/vfx/steam/16. nuoc chay chan thac.png');
        this.load.image('vfx_steam_17_nuoc_loang_chan_thac', 'assets/images/map/vfx/steam/17. Nuoc loang chan thac.png');
        this.load.image('vfx_steam_3_nuoc_dau_ngon_thac', 'assets/images/map/vfx/steam/3. Nuoc dau ngon thac.png');
        this.load.image('vfx_steam_4_nuoc_dau_ngon_thac', 'assets/images/map/vfx/steam/4. Nuoc dau ngon thac.png');
        this.load.image('vfx_steam_5_giot_nuoc_ngon_thac', 'assets/images/map/vfx/steam/5. Giot nuoc ngon thac.png');
        this.load.image('vfx_steam_6_nuoc_chay_giua_ngon_thac', 'assets/images/map/vfx/steam/6. Nuoc chay giua ngon thac.png');
        this.load.image('vfx_steam_7_nuoc_chay_giua_angon_thac', 'assets/images/map/vfx/steam/7. Nuoc chay giua angon thac.png');
        this.load.image('vfx_steam_8_nuoc_chay_giua_ngon_thac', 'assets/images/map/vfx/steam/8. Nuoc chay giua ngon thac.png');
        this.load.image('vfx_steam_9_nuoc_chay_giua_ngon_thac', 'assets/images/map/vfx/steam/9. Nuoc chay giua ngon thac.png');
        this.load.image('vfx_steam_mat_nuoc_loang_2', 'assets/images/map/vfx/steam/Mat nuoc loang 2.png');
        this.load.image('vfx_steam_mat_nuoc_loang_4', 'assets/images/map/vfx/steam/Mat nuoc loang 4.png');
        this.load.image('vfx_steam_thac_nuoc', 'assets/images/map/vfx/steam/Thac nuoc.png');

        // VFX - decanter
        this.load.image('vfx_decanter_dong_nuoc_chinh', 'assets/images/map/vfx/decanter/Dong nuoc chinh.png');
        this.load.image('vfx_decanter_giot_nuoc_1', 'assets/images/map/vfx/decanter/Giot nuoc 1.png');
        this.load.image('vfx_decanter_giot_nuoc_2', 'assets/images/map/vfx/decanter/Giot nuoc 2.png');
        this.load.image('vfx_decanter_giot_nuoc_3', 'assets/images/map/vfx/decanter/Giot nuoc 3.png');
        this.load.image('vfx_decanter_giot_nuoc_4', 'assets/images/map/vfx/decanter/Giot nuoc 4.png');
        this.load.image('vfx_decanter_nuoc_chay_1', 'assets/images/map/vfx/decanter/Nuoc chay 1.png');
        this.load.image('vfx_decanter_nuoc_chay_2', 'assets/images/map/vfx/decanter/Nuoc chay 2.png');
        this.load.image('vfx_decanter_nuoc_chay_3', 'assets/images/map/vfx/decanter/Nuoc chay 3.png');
        this.load.image('vfx_decanter_nuoc_chay_4', 'assets/images/map/vfx/decanter/Nuoc chay 4.png');

        // VFX - bambo
        this.load.image('vfx_bambo_cay_tre', 'assets/images/map/vfx/bambo/Cay tre.png');
        this.load.image('vfx_bambo_mat_sau_quai_trong_dong', 'assets/images/map/vfx/bambo/Mat sau quai trong dong.png');
        this.load.image('vfx_bambo_quai_trong_dong_1', 'assets/images/map/vfx/bambo/Quai trong dong 1.png');
        this.load.image('vfx_bambo_quai_trong_dong_2', 'assets/images/map/vfx/bambo/Quai trong dong 2.png');

        // VFX - banana
        this.load.image('vfx_banana_buong_chuoi', 'assets/images/map/vfx/banana/Buong chuoi.png');
        this.load.image('vfx_banana_cay_chuoi', 'assets/images/map/vfx/banana/Cay chuoi.png');

        // Load level data
        this.load.json('level_1', 'assets/levels/level_1.json');
        this.load.json('level_2', 'assets/levels/level_2.json');
        this.load.json('level_3', 'assets/levels/level_3.json');
        this.load.json('level_4', 'assets/levels/level_4.json');
        this.load.json('level_5', 'assets/levels/level_5.json');
    }

    // Chờ font web sẵn sàng. Nếu trình duyệt không hỗ trợ, bỏ qua để không chặn preload
    waitForFont(fontName) {
        try {
            if (document && document.fonts && document.fonts.load) {
                // Kích hoạt tải font và đợi ready
                const triggerLoad = document.fonts.load(`20px ${fontName}`);
                const ready = document.fonts.ready;
                return Promise.all([triggerLoad, ready]).then(() => {
                    console.log(`[Preloader] Font '${fontName}' đã sẵn sàng.`);
                }).catch((err) => {
                    console.warn(`[Preloader] Không thể xác nhận trạng thái font '${fontName}':`, err);
                });
            }
        } catch (e) {
            console.warn('[Preloader] document.fonts không khả dụng:', e);
        }
        return Promise.resolve();
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