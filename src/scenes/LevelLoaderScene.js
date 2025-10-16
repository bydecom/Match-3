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
        
        // Load note images for Stripe effect
        this.load.image('note1', 'assets/images/vfx/note1.png');
        this.load.image('note2', 'assets/images/vfx/note2.png');
        this.load.image('note3', 'assets/images/vfx/note3.png');
        this.load.image('note4', 'assets/images/vfx/note4.png');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Chọn ngẫu nhiên một ảnh nền từ 1 đến 6
        const randomIndex = Phaser.Math.Between(1, 6);


        // 2. Hiển thị ảnh nền đã chọn
        const bg = this.add.image(width / 2, height / 2, `loading_background_${randomIndex}`);
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale).setScrollFactor(0);

        // 3. Xác định vị trí Y cho thanh progress bar
        let progressBarY = 593; // Vị trí Y mặc định cho các màn hình khác
        
        // NẾU là màn hình loading 5, SỬ DỤNG VỊ TRÍ Y MỚI
        if (randomIndex === 6 || randomIndex === 1) {
            progressBarY = 620; // Cập nhật vị trí Y theo thông số bạn cung cấp
        } else if (randomIndex === 5) {
            progressBarY = 639; // Cập nhật vị trí Y theo thông số bạn cung cấp
        }

        // 4. Tạo thanh progress bar với vị trí và scale đã được điều chỉnh
        const progressBar = this.add.image(290, progressBarY, 'loading_level_progressbar')
            .setScale(0.34, 0.39);

        // Tính toán kích thước thực tế của thanh bar
        const barDisplayWidth = progressBar.width * progressBar.scaleX;
        const barDisplayHeight = progressBar.height * progressBar.scaleY;

        // 5. Tạo và áp dụng mặt nạ
        const mask = this.make.graphics();
        progressBar.setMask(mask.createGeometryMask());

        // 6. Tạo animation cho mặt nạ để lấp đầy thanh bar
        this.tweens.add({
            targets: mask,
            x: '+=0',
            duration: 2000,
            ease: 'Linear',
            onUpdate: (tween) => {
                mask.clear();
                mask.fillStyle(0xffffff);
                mask.fillRect(
                    progressBar.x - barDisplayWidth / 2,
                    progressBar.y - barDisplayHeight / 2,
                    barDisplayWidth * tween.progress,
                    barDisplayHeight
                );
            },
            onComplete: () => {
                // 7. Khi loading xong, chuyển sang GameScene
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('GameScene', { levelId: this.levelId });
                });
            }
        });
    }
}