// src/objects/vfx/BoosterVFXManager.js
import Phaser from 'phaser'
import { BOOSTER_TYPES } from '../../utils/constants'

export class BoosterVFXManager {
  constructor(scene, board) {
    this.scene = scene
    this.board = board
    this.vfxObjects = []
  }

  // Chỉ dọn dẹp các đối tượng hình ảnh mà không phát sự kiện
  // Dùng khi chuyển đổi giữa các booster
  clearCurrentVFX() {
    this.vfxObjects.forEach(obj => { if (obj && obj.destroy) obj.destroy() })
    this.vfxObjects = []
  }

  // Dọn dẹp tất cả hiệu ứng VÀ báo cho hệ thống hủy chọn
  clearEffects() {
    this.clearCurrentVFX() // Tái sử dụng hàm trên
    this.scene.game.events.emit('boosterSelectionCleared')
  }

  // Dọn dẹp các hiệu ứng preview (dùng cho Rocket, Swap)
  clearPreview() {
    this.vfxObjects.forEach(obj => { if (obj && obj.destroy) obj.destroy() })
    this.vfxObjects = []
  }


// === HAMMER ===
playHammerEffect(row, col, onComplete) {
    const targetPos = this.board.getCellPosition(row, col);

    // --- LOGIC MỚI - ĐẢO NGƯỢC HƯỚNG VÀ SỬA ORIGIN ---

    // 1. Vị trí KẾT THÚC (đầu búa chạm vào mục tiêu)
    const finalX = targetPos.x-10;
    const finalY = targetPos.y+20;
    const finalAngle = 20; // Góc khi đập xuống, hơi chéo từ phải qua

    // 2. Vị trí BẮT ĐẦU (bay từ trên-trái xuống)
    // Đảo ngược hướng so với lần trước
    const initialX = targetPos.x - 80; // Bắt đầu từ bên TRÁI
    const initialY = targetPos.y - 80; // Vẫn bắt đầu từ bên trên
    const initialAngle = -60; // Góc ban đầu, giơ lên từ bên trái

    // 3. TẠO SPRITE VỚI ORIGIN MỚI
    const hammerSprite = this.scene.add.sprite(initialX, initialY, 'booster_hammer')
        .setAngle(initialAngle)
        .setOrigin(0.8, 0.8) // << THAY ĐỔI QUAN TRỌNG: Điểm xoay giờ ở gần ĐẦU BÚA
        .setScale(0.18)      // Giữ nguyên scale hoặc chỉnh lại nếu cần
        .setDepth(10);

    // 4. CHUỖI ANIMATION ĐÃ ĐƯỢC CẬP NHẬT
    this.scene.tweens.chain({
        tweens: [
            // Animation 1: Búa bay vào và đập xuống
            {
                targets: hammerSprite,
                x: finalX,
                y: finalY,
                angle: finalAngle,
                duration: 300,
                ease: 'Cubic.easeIn'
            },
            // Animation 2: Nảy lên nhẹ
            {
                targets: hammerSprite,
                angle: finalAngle - 10, // Nảy ngược lại
                duration: 150,
                ease: 'Cubic.easeOut'
            },
            // Animation 3: Biến mất
            {
                targets: hammerSprite,
                alpha: 0,
                duration: 200,
                delay: 50,
                onComplete: () => {
                    hammerSprite.destroy();
                    if (onComplete) onComplete();
                }
            }
        ]
    });
}

  // === SWAP ===
  showSwapPreview(row, col) {
    this.clearPreview()
    const gem = this.board.grid[row]?.[col]
    if (!gem) return
    const pos = this.board.getCellPosition(row, col)
    const circle = this.scene.add.graphics().setDepth(4)
    circle.lineStyle(4, 0xFFD700, 1)
    circle.strokeCircle(pos.x, pos.y, this.board.cellSize * 0.5)
    this.scene.tweens.add({ targets: circle, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 })
    this.vfxObjects.push(circle)
  }

  // === ROCKET ===
  // << THAY THẾ TOÀN BỘ HÀM showRocketPreview CŨ BẰNG HÀM NÀY >>
  showRocketPreview(row, col) {
    this.clearPreview()
    if (!this.board.isValidCell(row, col)) return

    const graphics = this.scene.add.graphics().setDepth(4)
    const { height } = this.board.getBoardDimensions()

    const affectedColumns = [col]
    if (col > 0) affectedColumns.push(col - 1)
    if (col < this.board.grid.length - 1) affectedColumns.push(col + 1)

    // Vẽ lớp phủ màu vàng cho các cột bị ảnh hưởng
    graphics.fillStyle(0xFFD700, 0.3)
    affectedColumns.forEach(c => {
      const pos = this.board.getCellPosition(0, c) // Lấy vị trí x của cột
      graphics.fillRect(
        pos.x - this.board.cellSize / 2,
        this.board.offsetY,
        this.board.cellSize,
        height
      )
    })

    this.vfxObjects.push(graphics)
  }

  // === SHUFFLE ===
  // << THAY THẾ TOÀN BỘ HÀM NÀY >>
  showShuffleConfirmation() {
    this.clearPreview()
    const { width, height } = this.board.getBoardDimensions()
    
    // 1. TẠO ĐỐI TƯỢNG GRAPHICS ĐỂ VẼ VIỀN
    const border = this.scene.add.graphics().setDepth(10)
    
    // 2. TÙY CHỈNH CÁC THÔNG SỐ CỦA VIỀN
    const lineThickness = 5        // Độ dày của đường viền
    const lineColor = 0xFFD700     // Màu vàng
    const cornerRadius = 10        // << BÁN KÍNH BO GÓC (quan trọng nhất)

    // 3. VẼ HÌNH CHỮ NHẬT BO GÓC
    border.lineStyle(lineThickness, lineColor, 1)
    border.strokeRoundedRect(
      this.board.offsetX, 
      this.board.offsetY, 
      width, 
      height, 
      cornerRadius
    )

    // 4. THÊM HIỆU ỨNG NHẤP NHÁY
    this.scene.tweens.add({
      targets: border,
      alpha: { from: 1, to: 0.3 }, // Nhấp nháy rõ hơn
      duration: 500,
      yoyo: true,
      repeat: -1
    })

    // 5. LƯU ĐỐI TƯỢNG ĐỂ CÓ THỂ XÓA SAU
    this.vfxObjects.push(border)

    // Dòng code tạo Text đã bị xóa bỏ.
  }

  // << THÊM HÀM MỚI NÀY VÀO CLASS >>
  // src/objects/vfx/BoosterVFXManager.js

  // << THAY THẾ TOÀN BỘ HÀM NÀY >>
  /**
   * Hiệu ứng một tên lửa bay từ dưới lên tại cột được chọn.
   * @param {number} col - Cột được người chơi chọn
   * @param {function} onComplete - Callback để gọi khi animation kết thúc
   */
  playRocketEffect(col, onComplete) {
    // Vị trí X của cột được chọn
    const targetX = this.board.getCellPosition(0, col).x;

    // Vị trí Y bắt đầu (bên dưới board) và kết thúc (bên trên board)
    const startY = this.board.offsetY + this.board.getBoardDimensions().height + 50;
    const endY = this.board.offsetY - 50;
    const duration = 600; // Thời gian bay

    // << THAY ĐỔI Ở ĐÂY >>
    // Thay vì gọi shake trực tiếp:
    // this.scene.cameras.main.shake(duration, 0.008);
    // HÃY PHÁT RA MỘT SỰ KIỆN TOÀN CỤC:
    this.scene.game.events.emit('screenShake', { duration: duration, intensity: 0.008 });
    // << KẾT THÚC THAY ĐỔI >>

    // Tạo MỘT tên lửa duy nhất
    const rocketSprite = this.scene.add.sprite(targetX, startY, 'booster_rocket')
        .setAngle(0) // << SỬA LỖI: -90 độ là hướng thẳng lên trên
        .setScale(0.25) // Tăng kích thước lên một chút cho rõ hơn
        .setDepth(10);

    // Có thể thêm particle trail (vệt khói) đi theo tên lửa ở đây nếu muốn
    // Ví dụ: const emitter = this.scene.add.particles('particle_texture').createEmitter({...});
    // emitter.startFollow(rocketSprite);

    // Tạo animation bay lên
    this.scene.tweens.add({
        targets: rocketSprite,
        y: endY,
        duration: duration,
        ease: 'Cubic.easeIn',
        onComplete: () => {
            rocketSprite.destroy();
            // emitter.stop(); // Dừng particle emitter nếu có
            if (onComplete) {
                // KHI TÊN LỬA BAY XONG, GỌI CALLBACK ĐỂ THỰC THI LOGIC PHÁ GEM
                onComplete();
            }
        }
    });
  }


// src/objects/vfx/BoosterVFXManager.js

// ... (các hàm khác giữ nguyên)

  // << THAY THẾ TOÀN BỘ HÀM NÀY >>
  /**
   * Dàn dựng hiệu ứng Shuffle "giả" trên một lớp riêng biệt, bao gồm cả blocker.
   * @param {Phaser.GameObjects.Image[]} originalGemSprites - Mảng các sprite gem GỐC.
   * @param {Phaser.GameObjects.Image[]} originalBlockerSprites - Mảng các sprite blocker GỐC.
   * @param {function} onComplete - Callback để gọi khi TOÀN BỘ hiệu ứng kết thúc.
   */
  playFakeShuffleEffect(originalGemSprites, originalBlockerSprites, onComplete) {
    const boardCenterX = this.board.offsetX + this.board.getBoardDimensions().width / 2;
    const boardCenterY = this.board.offsetY + this.board.getBoardDimensions().height / 2;

    const allClones = [];
    const fakeGems = []; // Tách riêng mảng gem giả để dễ xử lý

    // 1A. Clone blocker và ẩn blocker thật
    originalBlockerSprites.forEach(blocker => {
      if (blocker && blocker.active) {
        const clone = this.scene.add.sprite(blocker.x, blocker.y, blocker.texture.key)
          .setScale(blocker.scale)
          .setDepth(12); // Depth cao
        allClones.push(clone);
        blocker.setVisible(false);
      }
    });

    // 1B. Clone gem, LƯU THAM CHIẾU, và ẩn gem thật
    originalGemSprites.forEach(gem => {
      if (gem && gem.active) {
        const clone = this.scene.add.sprite(gem.x, gem.y, gem.texture.key)
          .setScale(gem.scale)
          .setDepth(11); // Depth thấp hơn
        clone.setData('realGem', gem); // Lưu tham chiếu đến gem thật
        allClones.push(clone);
        fakeGems.push(clone);
        gem.setVisible(false);
      }
    });
    
    // 2. Bình rượu bay vào
    const shufflePot = this.scene.add.sprite(boardCenterX, this.scene.scale.height + 100, 'booster_shuffle')
      .setScale(0.25)
      .setDepth(15);

    this.scene.tweens.add({
      targets: shufflePot,
      y: boardCenterY,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // 3. Hút các gem "giả"
        let suckedCount = 0;
        fakeGems.forEach(clone => {
          this.scene.tweens.add({
            targets: clone,
            x: boardCenterX,
            y: boardCenterY,
            scale: 0,
            duration: 500,
            ease: 'Cubic.easeIn',
            delay: Math.random() * 200,
            onComplete: () => {
              suckedCount++;
              if (suckedCount === fakeGems.length) {
                // 4. Khi đã hút xong, lắc bình
                this.scene.tweens.add({
                  targets: shufflePot,
                  angle: { from: -15, to: 15 },
                  duration: 100,
                  yoyo: true,
                  repeat: 3,
                  ease: 'Sine.easeInOut',
                  delay: 200,
                  onComplete: () => {
                    // *** 5. HIỆU ỨNG NHẢ GEM RA (ĐÃ THÊM LẠI) ***
                    let spitCount = 0;
                    fakeGems.forEach(clone => {
                      const realGem = clone.getData('realGem');
                      clone.setPosition(boardCenterX, boardCenterY); // Bắt đầu từ tâm

                      this.scene.tweens.add({
                        targets: clone,
                        x: realGem.x, // Bay đến vị trí X MỚI của gem thật
                        y: realGem.y, // Bay đến vị trí Y MỚI của gem thật
                        scale: realGem.scale,
                        duration: 500,
                        delay: Math.random() * 300,
                        ease: 'Cubic.easeOut',
                        onComplete: () => {
                          spitCount++;
                          // 6. Khi gem cuối cùng đã bay ra xong
                          if (spitCount === fakeGems.length) {
                            shufflePot.destroy();
                            allClones.forEach(c => c.destroy());
                            if (onComplete) {
                              onComplete();
                            }
                          }
                        }
                      });
                    });
                  }
                });
              }
            }
          });
        });
      }
    });
  }
}


