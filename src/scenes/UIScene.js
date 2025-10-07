// src/scenes/UIScene.js
import Phaser from 'phaser';
import { BOOSTER_TYPES } from '../utils/constants';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.selectedBoosterType = null; // Biến trạng thái booster đang chọn
    // << XÓA BIẾN isBoardBusy Ở ĐÂY, UIScene không cần tự theo dõi nữa >>
    // this.isBoardBusy = false; 
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

      // << SỬA LẠI TOÀN BỘ LOGIC CLICK NÀY >>
      icon.on('pointerdown', () => {
        // UIScene chỉ cần biết về việc chọn/hủy chọn, không cần biết board có bận hay không
        const clickedType = icon.getData('boosterType');
        console.log(`Booster clicked: ${clickedType}`);
        
        if (this.selectedBoosterType === clickedType) {
          this.selectedBoosterType = null;
          this.game.events.emit('boosterSelectionCleared');
        } else {
          this.selectedBoosterType = clickedType;
          this.game.events.emit('boosterSelected', clickedType);
        }
        this.updateBoosterIconsVisuals();
      });
    });

    // << SỬA LẠI LISTENER NÀY >>
    this.game.events.on('boardBusy', (isBusy) => {
      if (isBusy) {
        this.selectedBoosterType = null; // Khi board bận, hủy luôn lựa chọn booster
        this.disableAllBoosters();
      } else {
        // Chờ 100ms như bạn yêu cầu
        this.time.delayedCall(100, () => {
          this.enableAllBoosters();
        });
      }
    });
    
    // Lắng nghe để đồng bộ hóa khi GameScene hủy booster
    this.game.events.on('boosterSelectionCleared', () => {
      this.selectedBoosterType = null;
      this.updateBoosterIconsVisuals();
    });
    
    // << THÊM LISTENER MỚI NÀY VÀO CUỐI HÀM create() >>
    this.game.events.on('screenShake', (shakeData) => {
      // UIScene tự rung camera của chính nó
      this.cameras.main.shake(shakeData.duration, shakeData.intensity);
    }, this);
    // << KẾT THÚC THÊM MỚI >>
  }

  // << CÁC HÀM NÀY ĐÃ ĐÚNG, GIỮ NGUYÊN >>
  disableAllBoosters() {
    console.log("Disabling all boosters...");
    
    // Khi board bận, chúng ta không quan tâm booster nào đang được chọn,
    // chỉ cần khóa tất cả.
    this.boosterIcons.forEach(icon => {
      icon.disableInteractive();
      icon.setAlpha(0.5);
      icon.clearTint();
      this.tweens.add({
        targets: icon,
        scale: icon.getData('originalScale'),
        duration: 100
      });
    });
  }

  enableAllBoosters() {
    console.log("Enabling all boosters...");

    // Bật lại tương tác cho TẤT CẢ các icon.
    this.boosterIcons.forEach(icon => {
      icon.setInteractive();
    });

    // Sau đó, gọi hàm cập nhật giao diện để nó áp dụng lại logic mờ/sáng
    // dựa trên `selectedBoosterType` hiện tại.
    this.updateBoosterIconsVisuals();
  }

  // Hàm cập nhật giao diện các icon booster
  // << SỬA LẠI HÀM updateBoosterIconsVisuals >>
  updateBoosterIconsVisuals() {
    // Hàm này KHÔNG nên bật/tắt interactive.
    // Nó chỉ chịu trách nhiệm về GIAO DIỆN (alpha, tint, scale).

    // Nếu không có booster nào được chọn, tất cả sáng bình thường.
    if (!this.selectedBoosterType) {
      this.boosterIcons.forEach(icon => {
        icon.setAlpha(1.0);
        icon.clearTint();
        this.tweens.add({ targets: icon, scale: icon.getData('originalScale'), duration: 100 });
      });
    } 
    // Nếu có booster đang được chọn
    else {
      this.boosterIcons.forEach(icon => {
        const iconType = icon.getData('boosterType');
        if (iconType === this.selectedBoosterType) {
          // Nổi bật cái được chọn
          icon.setAlpha(1.0);
          icon.setTint(0xffffff);
          this.tweens.add({ targets: icon, scale: icon.getData('originalScale') * 1.1, duration: 100 });
        } else {
          // Mờ đi các cái khác
          icon.setAlpha(0.6);
          icon.clearTint();
          this.tweens.add({ targets: icon, scale: icon.getData('originalScale'), duration: 100 });
        }
      });
    }
  }
}