// src/ui/LevelNode.js
import Phaser from 'phaser';

export class LevelNode extends Phaser.GameObjects.Container {
    constructor(scene, x, y, levelId, isLocked = false, stars = 0) {
        super(scene, x, y);
        
        this.levelId = levelId;
        this.isLocked = isLocked;
        this.stars = stars;
        this.button = null;
        this.levelText = null;
        this.starImages = [];
        
        this.createLevelNode();
        scene.add.existing(this);
    }
    
    createLevelNode() {
        // Chọn ảnh nền cho nút dựa vào trạng thái khóa/mở
        const buttonTexture = this.isLocked ? 'level_lock' : 'level_unlock';
        
        // Tạo button chính
        this.button = this.scene.add.image(0, 0, buttonTexture)
            .setScale(0.4)
            .setInteractive({ useHandCursor: !this.isLocked });
        
        this.add(this.button);
        
        // Nếu level đã mở, hiển thị số level và các ngôi sao
        if (!this.isLocked) {
            // Hiển thị số level
            this.levelText = this.scene.add.text(0, -6, this.levelId, {
                font: '28px UTMCookies',
                fill: '#ffffff',
            }).setOrigin(0.5).setDepth(1);
            
            this.add(this.levelText);
            
            // Hiển thị các ngôi sao đạt được
            this.createStars();
            
            // Thêm hiệu ứng và sự kiện click
            this.addButtonEvents();
        }
    }
    
    createStars() {
        const starPositions = [
            { x: -25, y: -38 }, // Vị trí ngôi sao 1
            { x: -2, y: -49 },   // Vị trí ngôi sao 2
            { x: 23, y: -37 }   // Vị trí ngôi sao 3
        ];
        
        for (let i = 0; i < 3; i++) {
            if (this.stars >= i + 1) {
                const starTexture = `star_${i + 1}`;
                const star = this.scene.add.image(starPositions[i].x, starPositions[i].y, starTexture)
                    .setScale(0.4);
                
                this.starImages.push(star);
                this.add(star);
            }
        }
    }
    
    addButtonEvents() {
        this.button.on('pointerover', () => {
            this.button.setScale(0.42);
        });
        
        this.button.on('pointerout', () => {
            this.button.setScale(0.4);
        });
        
        this.button.on('pointerdown', () => {
            this.scene.cameras.main.fadeOut(300, 0, 0, 0);
            this.scene.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.scene.start('LevelLoaderScene', { levelId: this.levelId });
            });
        });
    }
    
    // Phương thức để cập nhật trạng thái level
    updateLevelState(isLocked, stars) {
        this.isLocked = isLocked;
        this.stars = stars;
        
        // Xóa các thành phần cũ
        this.removeAll(true);
        this.starImages = [];
        
        // Tạo lại level node với trạng thái mới
        this.createLevelNode();
    }
    
    // Phương thức để lấy thông tin level
    getLevelInfo() {
        return {
            id: this.levelId,
            isLocked: this.isLocked,
            stars: this.stars
        };
    }
}
