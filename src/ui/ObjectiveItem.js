// src/ui/ObjectiveItem.js
import Phaser from 'phaser';

export class ObjectiveItem extends Phaser.GameObjects.Container {
    constructor(scene, x, y, objectiveData) {
        super(scene, x, y);
        scene.add.existing(this);

        this.objectiveData = objectiveData;
        this.initialCount = objectiveData.count;
        this.currentCount = objectiveData.count;

        // --- Xác định texture cho icon ---
        let iconTexture;
        if (objectiveData.target === 'gem') {
            iconTexture = `gem_${objectiveData.type}`;
        } else if (objectiveData.target === 'blocker') {
            // Giả sử blocker có texture là blocker_stone_1, blocker_rope...
            iconTexture = `blocker_${objectiveData.type}_1`;
            if (!scene.textures.exists(iconTexture)) {
                iconTexture = `blocker_${objectiveData.type}`; // Fallback
            }
        } else if (objectiveData.target === 'powerup') {
            // Hiển thị icon power-up theo cùng hệ texture gem_<type>
            // Ví dụ: gem_bomb, gem_stripe, gem_color_bomb
            iconTexture = `gem_${objectiveData.type}`;
            // Fallback: nếu thiếu, thử dùng key thuần (powerup_<type>)
            if (!scene.textures.exists(iconTexture)) {
                const alt = `powerup_${objectiveData.type}`;
                if (scene.textures.exists(alt)) {
                    iconTexture = alt;
                }
            }
        }

        // --- Tạo Icon ---
        this.icon = scene.add.image(0, 0, iconTexture)
            .setOrigin(0.5)
            .setScale(0.19); // Scale khớp với gem trong board
        this.add(this.icon);

        // --- Tạo Text hiển thị số lượng ---
        this.countText = scene.add.text(30, 30, `${this.currentCount}`, {
            fontFamily: 'UTMCookies',
            fontSize: '25px',
            color: '#ffffff',
            stroke: '#000000',
            fontWeight: 'bold',
            strokeThickness: 6
        }).setOrigin(1, 1); // Góc dưới bên phải
        this.add(this.countText);

        // --- (Tùy chọn) Dấu tick khi hoàn thành ---
        this.checkmark = scene.add.text(0, 0, '✔', {
            fontFamily: 'UTMCookies',
            fontSize: '48px',
            color: '#2ecc71',
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0).setScale(0);
        this.add(this.checkmark);
    }

    /**
     * Cập nhật số lượng còn lại cho nhiệm vụ
     * @param {number} remainingCount - Số lượng còn lại mới
     */
    updateCount(remainingCount) {
        // --- [SỬA LỖI CRASH] ---
        // Kiểm tra xem object, scene và text còn hoạt động không
        if (!this.scene || !this.countText || !this.countText.active) return;
        // -----------------------

        const previous = this.currentCount;
        const next = Math.max(0, remainingCount);

        // Chỉ cập nhật và tạo hiệu ứng khi có thay đổi
        if (next === previous) return;

        this.currentCount = next;
        this.countText.setText(`${this.currentCount}`);

        // Hiệu ứng "pop" nhẹ khi số thay đổi
        // Thêm check an toàn cho tween
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.add({
                targets: this.countText,
                scale: 1.2,
                duration: 100,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        }

        if (this.currentCount <= 0) {
            this.markAsCompleted();
        }
    }

    /**
     * Đánh dấu nhiệm vụ đã hoàn thành
     */
    markAsCompleted() {
        // Check an toàn
        if (!this.scene || !this.countText || !this.countText.active) return;

        this.countText.setVisible(false);
        this.icon.setAlpha(0.5); // Làm mờ icon

        // Hiệu ứng xuất hiện cho dấu tick
        this.checkmark.setAlpha(1);
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.add({
                targets: this.checkmark,
                scale: 1,
                duration: 300,
                ease: 'Bounce.easeOut'
            });
        }
    }
}
