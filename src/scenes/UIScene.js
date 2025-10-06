// src/scenes/UIScene.js
import Phaser from 'phaser';
import { BOOSTER_TYPES } from '../utils/constants';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.selectedBoosterType = null; // Biến trạng thái booster đang chọn
    this.boosterIcons = [];
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
          .setOrigin(0.5)
          .setScale(buttonInfo.scale);

      // Lưu loại booster vào icon để dễ truy cập
      icon.setData('boosterType', buttonInfo.type);
      icon.setData('originalScale', buttonInfo.scale);

      this.boosterIcons.push(icon);

      // Logic click mới: chọn/hủy chọn booster
      icon.on('pointerdown', () => {
        const clickedType = icon.getData('boosterType');
        console.log(`Booster clicked: ${clickedType}`);

        // Nếu click vào booster đang được chọn -> Hủy chọn
        if (this.selectedBoosterType === clickedType) {
          this.selectedBoosterType = null;
          this.game.events.emit('boosterSelectionCleared');
        } 
        // Nếu click vào booster mới -> Chọn nó
        else {
          this.selectedBoosterType = clickedType;
          this.game.events.emit('boosterSelected', clickedType);
        }

        // Cập nhật giao diện của TẤT CẢ các icon
        this.updateBoosterIconsVisuals();
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
    
    // Lắng nghe để đồng bộ hóa khi GameScene hủy booster
    this.game.events.on('boosterSelectionCleared', () => {
      this.selectedBoosterType = null;
      this.updateBoosterIconsVisuals();
    });
  }

  // Hàm cập nhật giao diện các icon booster
  updateBoosterIconsVisuals() {
    // Nếu không có booster nào được chọn, tất cả icon sáng bình thường
    if (!this.selectedBoosterType) {
      this.boosterIcons.forEach(icon => {
        icon.setAlpha(1.0)
        icon.clearTint()
        this.tweens.add({
          targets: icon,
          scale: icon.getData('originalScale'),
          duration: 100,
          ease: 'Quad.easeOut'
        })
      })
      return
    }

    this.boosterIcons.forEach(icon => {
      const iconType = icon.getData('boosterType');
      
      // Nếu icon này là icon đang được chọn
      if (iconType === this.selectedBoosterType) {
        icon.setAlpha(1.0); // Sáng rõ
        icon.setTint(0xffffff); // Thêm tint trắng để nổi bật
        // Thêm hiệu ứng "pop" nhỏ
        this.tweens.add({ 
          targets: icon, 
          scale: icon.getData('originalScale') * 1.1, 
          duration: 100, 
          ease: 'Quad.easeOut' 
        });
      } 
      // Nếu là các icon khác
      else {
        icon.setAlpha(0.6); // Mờ đi
        icon.clearTint();   // Bỏ tint
        // Quay về scale gốc
        this.tweens.add({ 
          targets: icon, 
          scale: icon.getData('originalScale'), 
          duration: 100, 
          ease: 'Quad.easeOut' 
        });
      }
    });
  }
}