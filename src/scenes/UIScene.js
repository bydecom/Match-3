// src/scenes/UIScene.js
import Phaser from 'phaser';
import { BOOSTER_TYPES } from '../utils/constants';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const { width, height } = this.scale;

    // --- DANH SÁCH CÁC NÚT VỚI VỊ TRÍ VÀ SCALE CỤ THỂ ---
    // Dữ liệu được lấy trực tiếp từ các hình ảnh bạn đã cung cấp.
    // posX và posY là tọa độ theo phần trăm của màn hình.
    const buttons = [
      // Dữ liệu từ Image3 cho booster_hammer
      { key: 'booster_hammer', type: BOOSTER_TYPES.HAMMER, posX: 0.7908, posY: 0.9376, scale: 0.17 },
      
      // Dữ liệu từ Image3 cho booster_swap
      { key: 'booster_swap', type: BOOSTER_TYPES.SWAP, posX: 0.5749, posY: 0.9200, scale: 0.18 },
      
      // Dữ liệu từ Image3 cho booster_rocket
      { key: 'booster_rocket', type: BOOSTER_TYPES.ROCKET, posX: 0.3903, posY: 0.9102, scale: 0.18 },
      
      // Dữ liệu từ Image3 cho booster_shuffle
      { key: 'booster_shuffle', type: BOOSTER_TYPES.SHUFFLE, posX: 0.1728, posY: 0.9376, scale: 0.18 },
    ];
    
    // --- TẠO CÁC NÚT DỰA TRÊN DỮ LIỆU ĐÃ ĐỊNH NGHĨA ---
    this.boosterIcons = [];
    buttons.forEach((buttonInfo) => {
      // Chuyển đổi vị trí từ tỷ lệ phần trăm (%) sang tọa độ pixel
      const xPos = width * buttonInfo.posX;
      const yPos = height * buttonInfo.posY;
      
      const icon = this.add.image(xPos, yPos, buttonInfo.key)
          .setInteractive()
          .setOrigin(0.5); // Căn giữa icon tại tọa độ (x, y)

      // Áp dụng trực tiếp tỷ lệ scale từ dữ liệu
      icon.setScale(buttonInfo.scale);

      // Lưu để bật/tắt tương tác khi board bận
      this.boosterIcons.push(icon);

      // Gán sự kiện click (giữ nguyên logic của bạn)
      icon.on('pointerdown', () => {
        console.log(`Booster clicked: ${buttonInfo.type}`);
        if (buttonInfo.type === BOOSTER_TYPES.SHUFFLE) {
          this.game.events.emit('boosterActivated', buttonInfo.type);
        } else {
          this.game.events.emit('boosterSelected', buttonInfo.type);
        }
      });
    });

    // Lắng nghe trạng thái bận/rảnh của board để khóa/mở các nút booster
    this.game.events.on('boardBusy', (isBusy) => {
      const enable = !isBusy;
      this.boosterIcons.forEach(icon => {
        icon.disableInteractive();
        if (enable) icon.setInteractive();
        icon.setAlpha(enable ? 1 : 0.6);
      });
    });
  }
}