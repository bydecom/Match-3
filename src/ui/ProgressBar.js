// src/ui/ProgressBar.js
import Phaser from 'phaser';

export class ProgressBar extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height, starTimes) {
        super(scene, x, y);
        scene.add.existing(this);

        this.starTimes = starTimes;
        this.startTime = starTimes.startTime;
        this.barWidth = width;
        this.barHeight = height;
        this.stars = [];

        // 1. TẠO PHẦN LẤP ĐẦY (Fill) - Luôn full width
        this.fill = scene.add.image(0, 0, 'progress_bar_fill').setOrigin(0, 0.5);
        this.fill.setDisplaySize(this.barWidth, this.barHeight);
        this.add(this.fill);

        // 2. TẠO MASK "INVERSE" - Che phần bên phải
        // Mask này sẽ DI CHUYỂN từ phải sang trái
        this.fillMask = scene.make.graphics();
        this.fill.setMask(this.fillMask.createGeometryMask());

        // 3. TẠO CÁC NGÔI SAO
        this.createStars();

        // 4. Khởi tạo giá trị
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
            const star = this.scene.add.image(starX, 0, 'star_on_pgb').setOrigin(0.5, 0.5).setScale(0.2);
            this.add(star);
            this.stars[index] = star;
        });
    }

    setValue(currentTime) {
        // progress đi từ 1 (đầy) xuống 0 (cạn)
        const progress = Math.max(0, currentTime) / this.startTime;
        
        // visibleWidth: Phần sẽ HIỂN THỊ (từ trái sang phải)
        const visibleWidth = this.barWidth * progress;

        // --- LOGIC: VẼ MASK CHỈ CHE PHẦN BÊN PHẢI ---
        
        // Xóa mask cũ
        this.fillMask.clear();
        
        // Tính tọa độ GLOBAL (vì mask không nằm trong container)
        const globalX = this.x;
        const globalY = this.y;
        
        // Vẽ MASK chỉ che phần HIỂN THỊ (từ X=0 đến X=visibleWidth)
        // Phần còn lại (từ visibleWidth đến barWidth) sẽ BỊ CHE
        this.fillMask.fillStyle(0xffffff);
        
        const startY = globalY - this.barHeight / 2;
        
        // VẼ CHỈ PHẦN HIỂN THỊ - từ bên trái
        this.fillMask.fillRect(globalX, startY, visibleWidth, this.barHeight);
        
        // ---

        // Cập nhật trạng thái sao
        this.setStarState(2, currentTime >= this.starTimes.threeStars);
        this.setStarState(1, currentTime >= this.starTimes.twoStars);
        this.setStarState(0, currentTime >= this.starTimes.oneStar);
    }

    setStarState(starIndex, isEnabled) {
        const star = this.stars[starIndex];
        if (!star || !star.active) return;
    
        const currentTexture = star.texture.key;
        const newTexture = isEnabled ? 'star_on_pgb' : 'star_off_pgb';
    
        if (currentTexture !== newTexture) {
            star.setTexture(newTexture);
    
            if (isEnabled) {
                star.setY(0); // 👈 ĐỔI VỊ TRÍ NGAY LẬP TỨC
                this.scene.tweens.add({
                    targets: star,
                    scale: 0.2 * 1.1,
                    duration: 150,
                    yoyo: true,
                    ease: 'Quad.easeOut'
                });
            } else {
                star.setY(-3); // 👈 ĐỔI VỊ TRÍ NGAY LẬP TỨC
                this.scene.tweens.add({
                    targets: star,
                    angle: { from: -15, to: 0 },
                    duration: 80,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Sine.easeInOut'
                });
            }
        }
    }
}