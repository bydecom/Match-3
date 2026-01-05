// src/ui/ResourceDisplay.js
import Phaser from 'phaser';
import { SettingsPopup } from '../scenes/popups/SettingsPopup';

export class ResourceDisplay extends Phaser.GameObjects.Container {
    constructor(scene, x, y, playerData) {
        super(scene, x, y);
        
        this.scene = scene;
        this.playerData = playerData;
        
        // Tạo coin display
        this.createCoinDisplay();
        
        // Tạo heart display
        this.createHeartDisplay();
        
        // Tạo nút cài đặt
        this.createSettingsButton();
        
        // Thêm vào scene
        scene.add.existing(this);
        
        // Đặt depth cao để luôn hiển thị trên cùng
        this.setDepth(1000);
        
        // *** GHIM UI VÀO MÀN HÌNH ***
        // Đặt scrollFactor = 0 để ghim UI vào camera
        // Nó sẽ không di chuyển khi camera cuộn
        this.setScrollFactor(0);
    }
    
    
    createCoinDisplay() {
        // Tạo coin icon
        this.coinIcon = this.scene.add.image(280, 30, 'coin');
        this.coinIcon.setScale(0.4);
        this.add(this.coinIcon);
        
        // Tạo text hiển thị số coin
        this.coinText = this.scene.add.text(285, 30, this.playerData.currency.coins.toString(), {
            fontSize: '20px',
            color: '#FFD700',
            fontFamily: 'NABILA',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.coinText.setOrigin(0, 0.5);
        this.add(this.coinText);
    }
    
    createHeartDisplay() {
        // Tạo heart icon
        this.heartIcon = this.scene.add.image(80, 30, 'heart');
        this.heartIcon.setScale(0.4);
        this.add(this.heartIcon);
        
        // Tạo text hiển thị số heart
        this.heartText = this.scene.add.text(105, 30, this.playerData.currency.lives.toString(), {
            fontSize: '20px',
            color: '#FF6B6B',
            fontFamily: 'NABILA',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.heartText.setOrigin(0, 0.5);
        this.add(this.heartText);
    }
    createSettingsButton() {
        const { width } = this.scene.scale;
        
        // Nút cài đặt ở góc trên bên phải (dùng ảnh đã scale sẵn)
        // Tạo nút riêng biệt không thêm vào container để tránh vấn đề click
        this.settingsButton = this.scene.add.image(width - 55, 55, 'setting_button')
            .setInteractive({ useHandCursor: true })
            .setDepth(1001) // Depth cao hơn container để đảm bảo click được
            .setScrollFactor(0); // Ghim vào màn hình giống container
        
        // Lưu scale gốc để dùng cho animation
        this.originalScale = 1.0;
        
        // Thêm sự kiện cho nút cài đặt
        this.settingsButton.on('pointerdown', () => {
            // Scale khi click
            this.scene.tweens.add({ 
                targets: this.settingsButton, 
                scale: this.originalScale * 0.9, 
                duration: 50,
                yoyo: true,
                ease: 'Power2'
            });
            this.scene.scene.launch('SettingsPopup');
        });

        this.settingsButton.on('pointerover', () => {
            // Scale khi hover
            this.scene.tweens.add({ 
                targets: this.settingsButton, 
                scale: this.originalScale * 1.1, 
                duration: 100 
            });
        });

        this.settingsButton.on('pointerout', () => {
            // Về scale gốc khi không hover
            this.scene.tweens.add({ 
                targets: this.settingsButton, 
                scale: this.originalScale, 
                duration: 100 
            });
        });
    }
    
    updateDisplay() {
        // Cập nhật số coin, heart và ticket từ playerData
        this.coinText.setText(this.playerData.currency.coins.toString());
        this.heartText.setText(this.playerData.currency.lives.toString());
    }
    
    setPosition(x, y) {
        super.setPosition(x, y);
        return this;
    }
}
