import Phaser from 'phaser';

export class SettingsPopup extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsPopup' });
        this.levelId = 1; // Giá trị mặc định
    }

    // Nhận dữ liệu từ GameScene
    init(data) {
        this.levelId = data.levelId;
    }

    create() {
        const { width, height } = this.scale;

        // 1. Tạm dừng các scene bên dưới để không thể tương tác
        this.scene.pause('GameScene');
        this.scene.pause('UIScene');

        // 2. Tạo một lớp nền mờ che phủ toàn bộ màn hình
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive();

        // 3. Tạo khung cho popup
        const popupPanel = this.add.graphics();
        popupPanel.fillStyle(0x2c3e50, 1);
        popupPanel.fillRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 16);
        popupPanel.setDepth(1);

        // 4. Thêm tiêu đề
        this.add.text(width / 2, height / 2 - 100, 'Tạm dừng', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '32px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5).setDepth(2);

        // --- TẠO CÁC NÚT CHỨC NĂNG ---
        const buttonStyle = {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '24px',
            color: '#ffffff',
            padding: { x: 20, y: 10 }
        };

        // 5. Nút Chơi lại
        const restartButton = this.add.text(width / 2, height / 2 - 20, 'Chơi lại', {
            ...buttonStyle,
            backgroundColor: '#3498db'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(2);

        restartButton.on('pointerdown', () => {
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            this.scene.start('GameScene', { levelId: this.levelId });
        });

        // 6. Nút Về bản đồ
        const backButton = this.add.text(width / 2, height / 2 + 40, 'Về bản đồ', {
            ...buttonStyle,
            backgroundColor: '#f1c40f'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(2);

        backButton.on('pointerdown', () => {
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            this.scene.start('MapScene');
        });

        // 7. Nút Tiếp tục
        const continueButton = this.add.text(width / 2, height / 2 + 100, 'Tiếp tục', {
            ...buttonStyle,
            backgroundColor: '#2ecc71'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(2);

        continueButton.on('pointerdown', () => {
            this.closePopup();
        });

        // 8. Đảm bảo game resume khi popup tắt
        this.events.on('shutdown', this.onResumeGame, this);
    }

    closePopup() {
        this.events.off('shutdown', this.onResumeGame, this);
        this.onResumeGame();
        this.scene.stop();
    }

    onResumeGame() {
        if (this.scene.isPaused('GameScene')) {
            this.scene.resume('GameScene');
        }
        if (this.scene.isPaused('UIScene')) {
            this.scene.resume('UIScene');
        }
    }
}

