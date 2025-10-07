// src/scenes/UIScene.js
import Phaser from 'phaser';
import { BOOSTER_TYPES } from '../utils/constants';
import { ProgressBar } from '../ui/ProgressBar';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.selectedBoosterType = null; // Biến trạng thái booster đang chọn
    // << XÓA BIẾN isBoardBusy Ở ĐÂY, UIScene không cần tự theo dõi nữa >>
    // this.isBoardBusy = false; 
    this.boosterIcons = [];
    this.progressBar = null;
  }

  create() {
    const { width, height } = this.scale;

    // === SỬ DỤNG DỮ LIỆU BẠN CUNG CẤP ===
    const gameScene = this.scene.get('GameScene');
    const levelData = gameScene?.levelData;
    if (levelData && levelData.starTimes) {
      // 2) Kích thước thực tế trên màn hình
      const barWidth = 295; // dùng chiều rộng mong muốn cố định theo yêu cầu
      const barHeight = 119*0.20;
      // 3) Vị trí theo debug: căn giữa theo chiều ngang, y theo phần trăm
      const barX = 139; // căn giữa
      const barY = 322; // vị trí Y cố định

      // 4) Tạo progress bar với thông số chính xác
      // Truyền CHỈ width; ProgressBar sẽ tự tính height theo tỉ lệ texture
      this.progressBar = new ProgressBar(this, barX, barY, barWidth, barHeight, levelData.starTimes);
    }
    else {
      // Không có cấu hình thời gian: tránh đăng ký cập nhật thanh tiến trình
      this.progressBar = null;
    }

    // Đăng ký listener qua handler tách riêng để dễ off khi shutdown
    // Chỉ đăng ký nếu có progressBar (tức là có starTimes)
    if (levelData && levelData.starTimes) {
      this.game.events.on('updateTimer', this.handleUpdateTimer, this)
    }

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
    this.game.events.on('boardBusy', this.handleBoardBusy, this)
    
    // Lắng nghe để đồng bộ hóa khi GameScene hủy booster
    this.game.events.on('boosterSelectionCleared', this.handleBoosterCleared, this)
    
    // << THÊM LISTENER MỚI NÀY VÀO CUỐI HÀM create() >>
    this.game.events.on('screenShake', this.handleScreenShake, this)
    // << KẾT THÚC THÊM MỚI >>
  }

  handleUpdateTimer(currentTime) {
    if (this.progressBar) {
      this.progressBar.setValue(currentTime)
    }
  }

  handleBoardBusy(isBusy) {
    if (isBusy) {
      this.selectedBoosterType = null
      this.disableAllBoosters()
    } else {
      this.time.delayedCall(100, () => {
        this.enableAllBoosters()
      })
    }
  }

  handleBoosterCleared() {
    this.selectedBoosterType = null
    this.updateBoosterIconsVisuals()
  }

  handleScreenShake(shakeData) {
    this.cameras.main.shake(shakeData.duration, shakeData.intensity)
  }

  shutdown() {
    console.log('UIScene is shutting down, removing global listeners...')
    this.game.events.off('updateTimer', this.handleUpdateTimer, this)
    this.game.events.off('boardBusy', this.handleBoardBusy, this)
    this.game.events.off('boosterSelectionCleared', this.handleBoosterCleared, this)
    this.game.events.off('screenShake', this.handleScreenShake, this)
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