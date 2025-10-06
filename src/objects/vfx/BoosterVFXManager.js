// src/objects/vfx/BoosterVFXManager.js
import Phaser from 'phaser'
import { BOOSTER_TYPES } from '../../utils/constants'

export class BoosterVFXManager {
  constructor(scene, board) {
    this.scene = scene
    this.board = board
    this.vfxObjects = []
  }

  // Dọn dẹp tất cả hiệu ứng và hủy lựa chọn booster
  clearEffects() {
    this.vfxObjects.forEach(obj => { if (obj && obj.destroy) obj.destroy() })
    this.vfxObjects = []
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
  showRocketPreview(row, col) {
    this.clearPreview()
    if (!this.board.isValidCell(row, col)) return
    const graphics = this.scene.add.graphics().setDepth(4)
    const { height } = this.board.getBoardDimensions()
    const pos = this.board.getCellPosition(row, col)
    // Chỉ vẽ cột dọc
    graphics.fillStyle(0xFFD700, 0.3)
    graphics.fillRect(
      pos.x - this.board.cellSize / 2,
      this.board.offsetY,
      this.board.cellSize,
      height
    )
    // Làm nổi bật ô hiện tại
    graphics.fillStyle(0xFFD700, 0.2)
    graphics.fillRect(
      pos.x - this.board.cellSize / 2,
      pos.y - this.board.cellSize / 2,
      this.board.cellSize,
      this.board.cellSize
    )
    graphics.lineStyle(3, 0xFFD700, 0.8)
    graphics.strokeRect(
      pos.x - this.board.cellSize / 2,
      pos.y - this.board.cellSize / 2,
      this.board.cellSize,
      this.board.cellSize
    )
    this.vfxObjects.push(graphics)
  }

  // === SHUFFLE ===
  showShuffleConfirmation() {
    this.clearPreview()
    const { width, height } = this.board.getBoardDimensions()
    const border = this.scene.add.graphics().setDepth(10)
    border.lineStyle(8, 0xFFD700, 1)
    border.strokeRect(this.board.offsetX, this.board.offsetY, width, height)
    this.scene.tweens.add({ targets: border, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 })
    const text = this.scene.add.text(
      this.scene.scale.width / 2,
      this.board.offsetY - 40,
      'Tap board to confirm Shuffle',
      { fontSize: '24px', color: '#fff', backgroundColor: '#000', padding: { x: 10, y: 5 } }
    ).setOrigin(0.5).setDepth(10)
    this.vfxObjects.push(border, text)
  }
}


