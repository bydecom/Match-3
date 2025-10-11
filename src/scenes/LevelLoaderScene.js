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

    create() {
        const { width, height } = this.scale;

        // 1. Chọn ngẫu nhiên một ảnh nền từ 1 đến 6
        // const randomIndex = Phaser.Math.Between(1, 6);
        const randomIndex = 2;


        // 2. Hiển thị ảnh nền đã chọn
        const bg = this.add.image(width / 2, height / 2, `loading_background_${randomIndex}`);
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale).setScrollFactor(0);

        // 3. Xác định vị trí Y cho thanh progress bar
        let progressBarY = 576; // Vị trí Y mặc định cho các màn hình khác
        
        // NẾU là màn hình loading 5, SỬ DỤNG VỊ TRÍ Y MỚI
        if (randomIndex === 6 || randomIndex === 1) {
            progressBarY = 604; // Cập nhật vị trí Y theo thông số bạn cung cấp
        } else if (randomIndex === 5) {
            progressBarY = 623; // Cập nhật vị trí Y theo thông số bạn cung cấp
        }

        // 4. Tạo thanh progress bar với vị trí và scale đã được điều chỉnh
        const progressBar = this.add.image(290, progressBarY, 'loading_level_progressbar')
            .setScale(0.28, 0.22);

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