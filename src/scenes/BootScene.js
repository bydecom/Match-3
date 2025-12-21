// src/scenes/BootScene.js
import Phaser from 'phaser';
import AudioManager from '../managers/AudioManager';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Tải những asset TỐI THIỂU cho màn hình loading
        // Ví dụ: ảnh nền của thanh loading và ảnh thanh loading sẽ được fill
        this.load.image('loading_background', 'assets/images/map/loading.png');
        this.load.image('loading_logo', 'assets/images/map/logo.png');
        this.load.image('loading_progress_bar', 'assets/images/map/loading_progress_bar.png');
        this.load.image('loading_progress_bar_background', 'assets/images/map/loading_progress_bar_background.png');

    }

    create() {
        // << [AUDIO] Khởi tạo AudioManager với game instance >>
        AudioManager.setGame(this.game);
        
        // Ngay lập tức chuyển sang PreloaderScene
        this.scene.start('PreloaderScene');
    }
}