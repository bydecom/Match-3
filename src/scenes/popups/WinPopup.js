import Phaser from 'phaser';

export class WinPopup extends Phaser.Scene {
  constructor() {
    super({ key: 'WinPopup' });
    this.levelId = 1;
    this.stars = 1;
  }

  init(data) {
    this.levelId = data?.levelId ?? 1;
    this.stars = Math.max(1, Math.min(3, data?.stars ?? 1));
  }

  create() {
    const { width, height } = this.scale;

    // Tạm dừng các scene bên dưới
    if (this.scene.isActive('GameScene')) this.scene.pause('GameScene');
    if (this.scene.isActive('UIScene')) this.scene.pause('UIScene');

    // Overlay mờ
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();

    // Khung popup
    const panelWidth = 440;
    const panelHeight = 360;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2 - 40;
    const popupPanel = this.add.graphics();
    popupPanel.fillStyle(0x2c3e50, 1);
    popupPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    popupPanel.setDepth(1);

    // Tiêu đề
    this.add.text(width / 2, panelY + 40, 'Chiến thắng!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '36px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(2);

    // Hiển thị sao
    const starY = panelY + 120;
    const starSpacing = 80;
    for (let i = 0; i < 3; i++) {
      const isOn = i < this.stars;
      const key = isOn ? 'star_on' : 'star_off';
      const star = this.add.image(width / 2 + (i - 1) * starSpacing, starY, key)
        .setOrigin(0.5)
        .setScale(0.12)
        .setDepth(2)
        .setAlpha(isOn ? 1 : 0.7);
      if (isOn) {
        this.tweens.add({ targets: star, scale: 0.14, yoyo: true, duration: 180, ease: 'Sine.easeOut' });
      }
    }

    // Nút Chơi lại
    const buttonStyle = {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      padding: { x: 20, y: 10 }
    };

    const restartButton = this.add.text(width / 2, panelY + panelHeight - 110, 'Chơi lại', {
      ...buttonStyle,
      backgroundColor: '#3498db'
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);
    restartButton.on('pointerdown', () => {
      this.stopUnderScenes();
      this.scene.start('LevelLoaderScene', { levelId: this.levelId });
    });

    // Nút Về bản đồ
    const mapButton = this.add.text(width / 2, panelY + panelHeight - 50, 'Về bản đồ', {
      ...buttonStyle,
      backgroundColor: '#2ecc71'
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);
    mapButton.on('pointerdown', () => {
      this.stopUnderScenes();
      this.scene.start('MapScene');
    });
  }

  stopUnderScenes() {
    if (this.scene.isActive('GameScene')) this.scene.stop('GameScene');
    if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
    this.scene.stop();
  }
}


