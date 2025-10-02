// src/scenes/PreloaderScene.js
import Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
        this.background = null;
    }

    // init và preload không cần thay đổi gì so với code gốc của bạn
    init() {
        // Có thể để trống
    }

    preload() {
        // Chúng ta sẽ thiết lập listener trong create() để đảm bảo mọi thứ đã sẵn sàng
    }

    create() {
        console.log("PreloaderScene created");
        this.createLoadingScreen();

        // --- GIẢI PHÁP ---

        // 1. Lắng nghe sự kiện CONTEXT RESTORED
        // Dành cho trường hợp mất context thực sự (hiếm gặp hoặc khi test)
        this.sys.game.renderer.on('contextrestored', this.handleContextRestored, this);

        // 2. Lắng nghe sự kiện RESIZE
        // Dành cho trường hợp nhấn F11 trên các trình duyệt hiện đại
        this.scale.on('resize', this.handleResize, this);
    }

    handleContextRestored() {
        console.log("SỰ KIỆN: WebGL Context đã được khôi phục! Bắt đầu lại từ BootScene...");
        // Khi mất context, cách an toàn nhất là quay lại BootScene để tải lại asset
        this.scale.off('resize', this.handleResize, this);
        this.sys.game.renderer.off('contextrestored', this.handleContextRestored, this);
    
        // Sau đó mới thực hiện hành động
        this.scene.restart('PreloaderScene');
    }

    handleResize() {
        console.log("SỰ KIỆN: Cửa sổ đã thay đổi kích thước! Bắt đầu lại từ BootScene...");
        // Khi resize, hình ảnh cũng có thể bị mất.
        // Việc quay lại BootScene cũng là giải pháp an toàn nhất để đảm bảo mọi thứ được vẽ lại đúng.
        // Chúng ta dùng start thay vì restart để đảm bảo vòng đời sạch sẽ.
        this.scale.off('resize', this.handleResize, this);
        this.sys.game.renderer.off('contextrestored', this.handleContextRestored, this);
        this.scene.restart('PreloaderScene');
    }

    shutdown() {
        // Quan trọng: Luôn dọn dẹp TẤT CẢ listener khi scene bị hủy
        console.log("PreloaderScene shutdown. Removing listeners.");
        this.scale.off('resize', this.handleResize, this);
        this.sys.game.renderer.off('contextrestored', this.handleContextRestored, this);
    }

    // --- Các hàm tiện ích của bạn (giữ nguyên) ---
    createLoadingScreen() {
        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.background = this.add.image(0, 0, 'loading_background');
        this.resizeBackground(this.scale.width, this.scale.height);
        
        const gameWidth = this.scale.gameSize.width;
        const gameHeight = this.scale.gameSize.height;
        this.add.text(gameWidth / 2, gameHeight / 2 + 150, 'Loading...', {
            font: '24px Arial', fill: '#ffffff'
        }).setOrigin(0.5);
    }

    resizeBackground(gameWidth, gameHeight) {
        if (!this.background) return;
        this.background.setPosition(gameWidth / 2, gameHeight / 2);
        const scale = Math.max(gameWidth / this.background.width, gameHeight / this.background.height);
        this.background.setScale(scale);
    }
}