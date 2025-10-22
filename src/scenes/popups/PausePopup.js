import Phaser from 'phaser';

export class PausePopup extends Phaser.Scene {
    constructor() {
        super({ key: 'PausePopup' });
        this.levelId = 1; // Giá trị mặc định
        this.musicVolume = 0.5; // Âm lượng nhạc mặc định
        this.soundVolume = 0.5; // Âm lượng âm thanh mặc định
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
            .setInteractive()
            .setDepth(1);

        // 3. Tạo background UI cho popup
        const uiBackground = this.add.image(width / 2, height / 2, 'pause_ui')
            .setOrigin(0.5)
            .setDepth(2);

        // 4. Tạo nút đóng (X) ở góc trên bên phải
        const closeButton = this.add.image(width / 2 + 200, height / 2 - 200, 'pause_exit')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(3);

        closeButton.on('pointerdown', () => {
            this.closePopup();
        });

        // 5. Tạo thanh trượt âm nhạc
        this.createMusicSlider(width, height);

        // 6. Tạo thanh trượt âm thanh
        this.createSoundSlider(width, height);

        // 7. Tạo các nút chức năng
        this.createActionButtons(width, height);

        // 8. Đảm bảo game resume khi popup tắt
        this.events.on('shutdown', this.onResumeGame, this);
    }

    createMusicSlider(width, height) {
        // Vị trí thanh trượt âm nhạc
        const sliderX = width / 2;
        const sliderY = height / 2 - 50;

        // Tạo thanh trượt
        const sliderBar = this.add.image(sliderX, sliderY, 'pause_bar')
            .setOrigin(0.5)
            .setDepth(3);

        // Tạo nút kéo thả âm nhạc
        const musicHandle = this.add.image(sliderX - 100 + (this.musicVolume * 200), sliderY, 'pause_music')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(4);

        // Lưu thông tin slider
        this.musicSlider = {
            bar: sliderBar,
            handle: musicHandle,
            startX: sliderX - 100,
            endX: sliderX + 100,
            currentValue: this.musicVolume
        };

        // Thêm sự kiện kéo thả
        this.input.setDraggable(musicHandle);
        musicHandle.on('drag', (pointer, dragX, dragY) => {
            const newX = Phaser.Math.Clamp(dragX, this.musicSlider.startX, this.musicSlider.endX);
            musicHandle.setX(newX);
            
            // Cập nhật giá trị âm lượng
            this.musicVolume = (newX - this.musicSlider.startX) / (this.musicSlider.endX - this.musicSlider.startX);
            this.musicSlider.currentValue = this.musicVolume;
            
            console.log('Music Volume:', this.musicVolume);
        });
    }

    createSoundSlider(width, height) {
        // Vị trí thanh trượt âm thanh
        const sliderX = width / 2;
        const sliderY = height / 2 + 20;

        // Tạo thanh trượt
        const sliderBar = this.add.image(sliderX, sliderY, 'pause_bar')
            .setOrigin(0.5)
            .setDepth(3);

        // Tạo nút kéo thả âm thanh
        const soundHandle = this.add.image(sliderX - 100 + (this.soundVolume * 200), sliderY, 'pause_sound')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(4);

        // Lưu thông tin slider
        this.soundSlider = {
            bar: sliderBar,
            handle: soundHandle,
            startX: sliderX - 100,
            endX: sliderX + 100,
            currentValue: this.soundVolume
        };

        // Thêm sự kiện kéo thả
        this.input.setDraggable(soundHandle);
        soundHandle.on('drag', (pointer, dragX, dragY) => {
            const newX = Phaser.Math.Clamp(dragX, this.soundSlider.startX, this.soundSlider.endX);
            soundHandle.setX(newX);
            
            // Cập nhật giá trị âm lượng
            this.soundVolume = (newX - this.soundSlider.startX) / (this.soundSlider.endX - this.soundSlider.startX);
            this.soundSlider.currentValue = this.soundVolume;
            
            console.log('Sound Volume:', this.soundVolume);
        });
    }

    createActionButtons(width, height) {
        // Vị trí các nút
        const buttonY = height / 2 + 120;
        const buttonSpacing = 120;

        // Nút Tiếp tục
        const continueButton = this.add.image(width / 2 - buttonSpacing, buttonY, 'pause_continue')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(3);

        continueButton.on('pointerdown', () => {
            this.closePopup();
        });

        // Nút Chơi lại
        const restartButton = this.add.image(width / 2, buttonY, 'pause_restart')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(3);

        restartButton.on('pointerdown', () => {
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            this.scene.start('LevelLoaderScene', { levelId: this.levelId });
        });

        // Nút Thoát
        const quitButton = this.add.image(width / 2 + buttonSpacing, buttonY, 'pause_quit')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(3);

        quitButton.on('pointerdown', () => {
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            this.scene.start('MapScene');
        });
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

