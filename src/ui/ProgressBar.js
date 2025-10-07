// src/ui/ProgressBar.js
// src/ui/ProgressBar.js
import Phaser from 'phaser';

// << THAY THẾ TOÀN BỘ CLASS NÀY >>
export class ProgressBar extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height, starTimes) {
        super(scene, x, y);
        scene.add.existing(this);

        this.starTimes = starTimes;
        this.startTime = starTimes.startTime;
        this.barWidth = width; // Chiều rộng tối đa mong muốn
        this.barHeight = height; // Chiều cao tối đa mong muốn
        this.stars = [];

        // 1. TẠO PHẦN LẤP ĐẦY (Fill)
        this.fill = scene.add.image(0, 0, 'progress_bar_fill').setOrigin(0, 0.5);
        
        // --- LOGIC MỚI VỚI SETDISPLAYSIZE ---
        // Lấy kích thước gốc của texture
        const fillTexture = scene.textures.get('progress_bar_fill');
        const originalWidth = fillTexture.source[0].width;
        const originalHeight = fillTexture.source[0].height;

        // Tính chiều cao mới để giữ đúng tỷ lệ khi chiều rộng là 288
        // Đây là chiều cao mong muốn của thanh fill

        // Đặt kích thước cứng cho thanh fill
        this.fill.setDisplaySize(this.barWidth, this.barHeight);
        this.add(this.fill);
        
        // 2. TẠO CÁC NGÔI SAO
        this.createStars();

        // Khởi tạo
        this.setValue(this.startTime);
    }

    createStars() {
        const starPositions = [
            this.starTimes.oneStar / this.startTime,
            this.starTimes.twoStars / this.startTime,
            this.starTimes.threeStars / this.startTime
        ];

        starPositions.forEach((pos, index) => {
            const starX = this.barWidth * pos;
            const star = this.scene.add.image(starX, 0, 'star_on').setOrigin(0.5, 0.5).setScale(0.2);
            this.add(star);
            this.stars[index] = star;
        });
    }

    setValue(currentTime) {
        const progress = Math.max(0, currentTime) / this.startTime;

        // << SỬA LẠI LOGIC CO GIÃN DỰA TRÊN WIDTH >>
        // Tính toán chiều rộng mới của thanh fill dựa trên progress
        const newWidth = this.barWidth * progress;
        
        // Cập nhật displayWidth của thanh fill
        this.fill.displayWidth = newWidth;

        // Cập nhật trạng thái sao
        this.setStarState(2, currentTime >= this.starTimes.threeStars);
        this.setStarState(1, currentTime >= this.starTimes.twoStars);
        this.setStarState(0, currentTime >= this.starTimes.oneStar);
    }


    setStarState(starIndex, isEnabled) {
        const star = this.stars[starIndex];
        // Kiểm tra an toàn đơn giản hơn
        if (!star || !star.active) return;
    
        const currentTexture = star.texture.key;
        const newTexture = isEnabled ? 'star_on' : 'star_off';
    
        if (currentTexture !== newTexture) {
            star.setTexture(newTexture);
    
            if (isEnabled) {
                this.scene.tweens.add({
                    targets: star,
                    scale: 0.2 * 1.2,
                    duration: 150,
                    yoyo: true,
                    ease: 'Quad.easeOut'
                });
            } else {
                this.scene.tweens.add({
                    targets: star,
                    angle: { from: -15, to: 15 },
                    duration: 80,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Sine.easeInOut'
                });
            }
        }
    }
}