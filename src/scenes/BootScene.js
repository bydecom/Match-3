// src/scenes/BootScene.js
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Tải những asset TỐI THIỂU cho màn hình loading
        // Ví dụ: ảnh nền của thanh loading và ảnh thanh loading sẽ được fill
        this.load.image('loading_background', 'assets/screen/loading.png');

    }

    create() {
        // Ngay lập tức chuyển sang PreloaderScene
        this.scene.start('PreloaderScene');
    }
}