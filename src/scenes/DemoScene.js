// src/scenes/DemoScene.js
import Phaser from 'phaser';
import { MapVFXManager } from '../objects/vfx/MapVFXManager';

export class DemoScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DemoScene' });
        this.vfxManager = null;
    }

    create() {
        const { width, height } = this.scale;

        // Thêm ảnh nền demo (dùng map_part1 làm nền) - scale giống MapScene
        const background = this.add.image(width / 2, height / 2, 'map_part1')
            .setOrigin(0.5, 0.5);
        
        // Scale giống MapScene: bắt buộc chiều rộng bằng chiều rộng game
        background.displayWidth = width;
        background.scaleY = background.scaleX; // Giữ đúng tỷ lệ ảnh

        // --- KHỞI TẠO VFX CHO DEMO ---
        this.vfxManager = new MapVFXManager(this);
        this.vfxManager.startAllMapVFX();

        // Dọn dẹp VFX khi scene shutdown
        this.events.once('shutdown', () => {
            if (this.vfxManager) {
                this.vfxManager.shutdown();
            }
        });

        // Thêm text hướng dẫn
        this.add.text(width / 2, 50, 'DEMO VFX - Nhấn ESC để thoát', {
            font: '24px UTMCookies',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Thêm phím ESC để thoát
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop();
        });
    }
}
