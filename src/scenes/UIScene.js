// src/scenes/UIScene.js
import Phaser from 'phaser';
import { BOOSTER_TYPES } from '../utils/constants';
import { ProgressBar } from '../ui/ProgressBar';
import { ObjectiveItem } from '../ui/ObjectiveItem'; // << THÊM IMPORT

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.selectedBoosterType = null; // Biến trạng thái booster đang chọn
    // << XÓA BIẾN isBoardBusy Ở ĐÂY, UIScene không cần tự theo dõi nữa >>
    // this.isBoardBusy = false; 
    this.boosterIcons = [];
    this.progressBar = null;
    this.objectiveItems = {}; // << THÊM ĐỂ LƯU TRỮ CÁC ITEM NHIỆM VỤ
    this.levelCompletedShown = false; // Cờ ngăn mở WinPopup nhiều lần
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

    // === PHẦN MỚI: TẠO BẢNG NHIỆM VỤ ===
    this.createObjectivesPanel(levelData);

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
    
    // << THÊM LISTENER MỚI CHO NHIỆM VỤ >>
    this.game.events.on('objectiveUpdated', this.handleObjectiveUpdate, this);
    // Khi hoàn thành toàn bộ mục tiêu -> mở WinPopup
    this.game.events.on('levelCompleted', this.handleLevelCompleted, this);
    
    // << CÁC LISTENER NÀY KHÔNG CÒN CẦN THIẾT NỮA, VÌ 'objectiveUpdated' ĐÃ BAO HÀM TẤT CẢ >>
    // << BẠN CÓ THỂ XÓA HOẶC COMMENT CHÚNG ĐI >>
    // this.game.events.on('powerupActivated', this.handlePowerupActivated, this);
    // this.game.events.on('blockerCountUpdated', this.handleBlockerCountUpdated, this);
    
    // 'matchSummary' vẫn có thể hữu ích cho hiệu ứng, nhưng không phải để cập nhật state
    this.game.events.on('matchSummary', this.handleMatchSummary, this);
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

  /**
   * Tạo và hiển thị bảng các nhiệm vụ của màn chơi.
   */
  createObjectivesPanel(levelData) {
    if (!levelData || !levelData.objectives) return;

    // Vị trí bắt đầu của grid nhiệm vụ (ví dụ: góc trên bên trái)
    const startX = 90;
    const startY = 130;
    const spacingX = 60;
    const spacingY = 60;
    const itemsPerRow = 2; // Grid 2x3

    levelData.objectives.forEach((objData, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;
      
      // Tạo key duy nhất cho mỗi nhiệm vụ, ví dụ: "gem_red" hoặc "blocker_stone"
      const objectiveKey = `${objData.target}_${objData.type}`;
      
      const item = new ObjectiveItem(this, x, y, objData);
      this.objectiveItems[objectiveKey] = item;
    });
  }
  
  /**
   * Xử lý sự kiện khi một nhiệm vụ được cập nhật từ GameScene.
   * @param {object} updateData - { key, remaining }
   */
  handleObjectiveUpdate(updateData) {
    const { key, remaining } = updateData;
    const item = this.objectiveItems[key];
    
    if (item) {
      const oldCount = item.currentCount;
      const difference = oldCount - remaining;
      console.log(`[UIScene] Objective updated: ${key} | ${oldCount} → ${remaining} (trừ ${difference})`);
      item.updateCount(remaining);
    }

    // Dự phòng: nếu tất cả mục tiêu đều hoàn thành theo UI, phát sự kiện thắng một lần
    if (!this.levelCompletedShown && this.areAllObjectivesCleared()) {
      this.game.events.emit('levelCompleted');
    }
  }

  // << XÓA HOẶC COMMENT CÁC HÀM XỬ LÝ THỪA THÃI NÀY >>
  /*
  // Nhận sự kiện theo dõi kích hoạt power-up: nếu có mục tiêu dạng powerup_*, cập nhật luôn
  handlePowerupActivated(data) {
    const { type, count } = data;
    const key = `powerup_${type}`;
    const item = this.objectiveItems[key];
    if (item) {
      // Với mục tiêu đếm số lần kích hoạt, remaining giảm khi count tăng
      const initial = item.initialCount ?? item.currentCount;
      const remaining = Math.max(0, initial - count);
      const oldCount = item.currentCount;
      const difference = oldCount - remaining;
      console.log(`[UIScene] Power-up activated: ${key} | ${oldCount} → ${remaining} (trừ ${difference}) | Total activated: ${count}`);
      item.updateCount(remaining);
    }
  }

  // Nhận sự kiện cập nhật số blocker còn lại trên bảng: nếu có mục tiêu blocker_*, đồng bộ remaining
  handleBlockerCountUpdated(data) {
    const { type, remaining } = data;
    const key = `blocker_${type}`;
    const item = this.objectiveItems[key];
    if (item) {
      const oldCount = item.currentCount;
      const difference = oldCount - remaining;
      console.log(`[UIScene] Blocker destroyed: ${key} | ${oldCount} → ${remaining} (trừ ${difference})`);
      item.updateCount(remaining);
    }
  }
  */

  // Nhận tóm tắt một hành động match: cập nhật nhanh UI theo số liệu tổng
  handleMatchSummary(summary) {
    console.log(`[UIScene] Match summary received:`, summary);
    
    // 1) Cập nhật đếm gem (Có thể giữ lại để làm hiệu ứng, nhưng an toàn hơn là bỏ)
    // Để an toàn, chúng ta sẽ dựa hoàn toàn vào 'objectiveUpdated'
    /* << TẠM THỜI VÔ HIỆU HÓA PHẦN NÀY >>
    if (summary.gemCounts) {
      Object.entries(summary.gemCounts).forEach(([color, destroyed]) => {
        const key = `gem_${color}`;
        const item = this.objectiveItems[key];
        if (item && item.currentCount > 0) {
          const oldCount = item.currentCount;
          const remaining = Math.max(0, item.currentCount - destroyed);
          const difference = oldCount - remaining;
          console.log(`[UIScene] Gem destroyed: ${key} | ${oldCount} → ${remaining} (trừ ${difference}) | Destroyed: ${destroyed}`);
          item.updateCount(remaining);
        }
      });
    }
    */
  
    // 2) Đồng bộ blocker (Có thể giữ lại vì blocker được đồng bộ theo số còn lại, không phải số bị phá)
    if (summary.blockerCounts) {
      Object.entries(summary.blockerCounts).forEach(([type, remaining]) => {
        const key = `blocker_${type}`;
        const item = this.objectiveItems[key];
        if (item) {
          // So sánh để tránh cập nhật không cần thiết
          if (item.currentCount !== remaining) {
              const oldCount = item.currentCount;
              const difference = oldCount - remaining;
              console.log(`[UIScene] Blocker count synced from summary: ${key} | ${oldCount} → ${remaining} (trừ ${difference})`);
              item.updateCount(remaining);
          }
        }
      });
    }

    // 3) << VÔ HIỆU HÓA HOÀN TOÀN PHẦN GÂY LỖI NÀY >>
    /*
    if (summary.powerups) {
      summary.powerups.forEach(p => {
        const key = `powerup_${p === 0 ? 'bomb' : String(p).toLowerCase()}`;
        const item = this.objectiveItems[key];
        if (item) {
          const remaining = Math.max(0, item.currentCount - 1);
          const oldCount = item.currentCount;
          const difference = oldCount - remaining;
          console.log(`[UIScene] Power-up from match summary: ${key} | ${oldCount} → ${remaining} (trừ ${difference})`);
          item.updateCount(remaining);
        }
      });
    }
    */
  }

  // Tính số sao dựa vào thời gian còn lại
  calculateStars() {
    const gameScene = this.scene.get('GameScene');
    const levelData = gameScene?.levelData;
    const currentTime = gameScene?.currentTime ?? 0;
    if (!levelData || !levelData.starTimes) return 1;
    const { threeStars, twoStars, oneStar } = levelData.starTimes;
    if (currentTime >= threeStars) return 3;
    if (currentTime >= twoStars) return 2;
    if (currentTime >= oneStar) return 1;
    return 1;
  }

  handleLevelCompleted() {
    // Ngắt chọn booster nếu có
    this.handleBoosterCleared();
    
    if (this.levelCompletedShown) return;
    this.levelCompletedShown = true;
    
    console.log(`[UIScene] Level completed! Waiting for UI to update...`);
    
    // Delay để UI cập nhật hoàn tất trước khi hiện popup
    // Đảm bảo tất cả animation của objective items đã hoàn tất
    this.time.delayedCall(800, () => {
      // Kiểm tra lại để đảm bảo tất cả nhiệm vụ đã hoàn thành
      if (this.areAllObjectivesCleared()) {
        // Tính sao và mở popup
        const stars = this.calculateStars();
        const gameScene = this.scene.get('GameScene');
        const levelId = gameScene?.levelData?.levelId || this.scene.settings?.data?.levelId || 1;
        console.log(`[UIScene] Showing win popup after UI update delay - Level: ${levelId}, Stars: ${stars}`);
        this.scene.launch('WinPopup', { levelId, stars });
      } else {
        console.log(`[UIScene] Objectives not fully cleared yet, retrying...`);
        // Nếu chưa hoàn thành, thử lại sau 200ms
        this.time.delayedCall(200, () => {
          if (this.areAllObjectivesCleared()) {
            const stars = this.calculateStars();
            const gameScene = this.scene.get('GameScene');
            const levelId = gameScene?.levelData?.levelId || this.scene.settings?.data?.levelId || 1;
            this.scene.launch('WinPopup', { levelId, stars });
          }
        });
      }
    });
  }

  shutdown() {
    console.log('UIScene is shutting down, removing global listeners...')
    this.game.events.off('updateTimer', this.handleUpdateTimer, this)
    this.game.events.off('boardBusy', this.handleBoardBusy, this)
    this.game.events.off('boosterSelectionCleared', this.handleBoosterCleared, this)
    this.game.events.off('screenShake', this.handleScreenShake, this)
    this.game.events.off('objectiveUpdated', this.handleObjectiveUpdate, this); // << DỌN DẸP LISTENER
    this.game.events.off('levelCompleted', this.handleLevelCompleted, this);
    
    // << DỌN DẸP TƯƠNG ỨNG >>
    // this.game.events.off('powerupActivated', this.handlePowerupActivated, this)
    // this.game.events.off('blockerCountUpdated', this.handleBlockerCountUpdated, this)

    this.game.events.off('matchSummary', this.handleMatchSummary, this)
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
  
  // Kiểm tra tất cả mục tiêu trên UI đã về 0
  areAllObjectivesCleared() {
    const items = Object.values(this.objectiveItems);
    if (items.length === 0) return false;
    return items.every(it => (it?.currentCount ?? 0) <= 0);
  }
}