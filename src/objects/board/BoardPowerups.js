// src/objects/board/BoardPowerups.js
import { GEM_TYPES, GRID_SIZE } from '../../utils/constants'

export class BoardPowerups {
  // ... (Các hàm isPowerup, transformIntoPowerup, activatePowerupCombo, activatePowerup, etc. không thay đổi)
  // ... (Bạn có thể giữ nguyên tất cả các hàm từ đầu file cho đến hàm damageCell)

  isPowerup(gemObject) {
    if (!gemObject) return false
    const value = gemObject.value
    return value === GEM_TYPES.BOMB || value === GEM_TYPES.COLOR_BOMB || value === GEM_TYPES.STRIPE
  }

  transformIntoPowerup(gemObject, powerupType) {
    gemObject.type = 'gem'
    gemObject.value = powerupType
    gemObject.sprite.setTexture(`gem_${powerupType}`)
    gemObject.sprite.setData('type', powerupType)
    console.log(`Transformed gem into ${powerupType} power-up`)
  }

  activatePowerupCombo(powerup1, powerup2) {
    const type1 = powerup1.value
    const type2 = powerup2.value
    const allGemsToExplode = new Set([powerup1, powerup2])
    if (type1 === GEM_TYPES.BOMB && type2 === GEM_TYPES.BOMB) {
      const explosion1 = this.getGemsInArea(powerup1.sprite.getData('row'), powerup1.sprite.getData('col'), 2)
      explosion1.forEach(gem => allGemsToExplode.add(gem))
    } else if (type1 === GEM_TYPES.COLOR_BOMB && type2 === GEM_TYPES.COLOR_BOMB) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.grid[r][c] && this.grid[r][c].type === 'gem') {
            allGemsToExplode.add(this.grid[r][c])
          }
        }
      }
    } else {
      const colorBomb = (type1 === GEM_TYPES.COLOR_BOMB) ? powerup1 : powerup2
      const bomb = (colorBomb === powerup1) ? powerup2 : powerup1
      const targetColor = this.levelData.availableGems[0] || GEM_TYPES.RED
      const bombsToActivate = [bomb]
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const gem = this.grid[r][c]
          if (gem && gem.type === 'gem' && gem.value === targetColor) {
            this.transformIntoPowerup(gem, GEM_TYPES.BOMB)
            bombsToActivate.push(gem)
          }
        }
      }
      bombsToActivate.forEach(b => this.activateBomb(b, allGemsToExplode))
    }
    this.removeGemSprites(allGemsToExplode)
    this.scene.time.delayedCall(300, () => this.applyGravityAndRefill())
  }

  activatePowerup(powerupGem, otherGem) {
    if (this.boardBusy) return
    this.boardBusy = true
    this.scene.input.enabled = false
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('boardBusy', true)
    }
    const powerupType = powerupGem.value
    const otherType = otherGem.value
    if (powerupType === GEM_TYPES.COLOR_BOMB || otherType === GEM_TYPES.COLOR_BOMB) {
      const colorBomb = (powerupType === GEM_TYPES.COLOR_BOMB) ? powerupGem : otherGem
      const other = (colorBomb === powerupGem) ? otherGem : powerupGem
      this.activateColorBomb(colorBomb, other)
      return
    }
    if (powerupType === GEM_TYPES.BOMB && otherType === GEM_TYPES.BOMB) {
      const allGemsToExplode = new Set()
      this.activateBomb(powerupGem, allGemsToExplode)
      this.activateBomb(otherGem, allGemsToExplode)
      this.removeGemSprites(allGemsToExplode)
      this.scene.time.delayedCall(300, () => this.applyGravityAndRefill())
    } else if (powerupType === GEM_TYPES.BOMB) {
      const allGemsToExplode = new Set()
      this.activateBomb(powerupGem, allGemsToExplode)
      this.removeGemSprites(allGemsToExplode)
      this.scene.time.delayedCall(300, () => this.applyGravityAndRefill())
    }
  }

  activateBomb(bombObject, alreadyExploded = new Set()) {
    if (alreadyExploded.has(bombObject)) return
    alreadyExploded.add(bombObject)
    const bombRow = bombObject.sprite.getData('row')
    const bombCol = bombObject.sprite.getData('col')
    for (let r = bombRow - 1; r <= bombRow + 1; r++) {
      for (let c = bombCol - 1; c <= bombCol + 1; c++) {
        const destroyedGem = this.damageCell(r, c)
        if (destroyedGem) {
          alreadyExploded.add(destroyedGem)
        }
      }
    }
    const chainReactionBombs = Array.from(alreadyExploded).filter(gem => 
      gem.value === GEM_TYPES.BOMB && 
      gem !== bombObject
    )
    chainReactionBombs.forEach(nextBomb => {
      this.activateBomb(nextBomb, alreadyExploded)
    })
  }

  activateColorBomb(colorBombObject, swappedObject) {
    if (!this.boardBusy) {
      this.boardBusy = true
      this.scene.input.enabled = false
      if (this.scene && this.scene.game && this.scene.game.events) {
        this.scene.game.events.emit('boardBusy', true)
      }
    }
    const gemsToRemove = new Set()
    const swappedObjectType = swappedObject.value
    if (swappedObjectType === GEM_TYPES.COLOR_BOMB) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const destroyedGem = this.damageCell(r, c)
          if (destroyedGem) {
            gemsToRemove.add(destroyedGem)
          }
        }
      }
    } else if (swappedObjectType === GEM_TYPES.BOMB) {
      const allGemsToExplode = new Set()
      allGemsToExplode.add(colorBombObject)
      allGemsToExplode.add(swappedObject)
      const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES).filter(t => ![GEM_TYPES.BOMB, GEM_TYPES.COLOR_BOMB, GEM_TYPES.STRIPE].includes(t))
      const targetColor = Phaser.Math.RND.pick(availableGems)
      const bombsToActivate = []
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const gem = this.grid[r][c]
          if (gem && gem.type === 'gem' && gem.value === targetColor) {
            this.transformIntoPowerup(gem, GEM_TYPES.BOMB)
            bombsToActivate.push(gem)
          }
        }
      }
      bombsToActivate.forEach(bomb => {
        this.activateBomb(bomb, allGemsToExplode)
      })
      this.addWiggleEffect(Array.from(allGemsToExplode), () => {
        this.removeGemSprites(allGemsToExplode)
        this.scene.time.delayedCall(300, () => {
          this.applyGravityAndRefill()
        })
      })
      return
    } else {
      const targetColor = swappedObjectType
      gemsToRemove.add(colorBombObject)
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const gem = this.grid[r][c]
          if (gem && gem.type === 'gem' && (gem.value === targetColor || gem === swappedObject)) {
            const destroyedGem = this.damageCell(r, c)
            if (destroyedGem) {
              gemsToRemove.add(destroyedGem)
            }
          }
        }
      }
    }
    this.addWiggleEffect(Array.from(gemsToRemove), () => {
      this.removeGemSprites(gemsToRemove)
      this.scene.time.delayedCall(300, () => {
        this.applyGravityAndRefill()
      })
    })
  }
  
  // Hàm này giữ nguyên, nó hoạt động đúng cho các vụ nổ match-3 và bomb
  damageCell(row, col) {
    if (row < 0 || row >= 9 || col < 0 || col >= 9) return null
    const blocker = this.blockerGrid?.[row]?.[col]
    if (blocker) {
      const destroyed = blocker.takeDamage()
      if (destroyed) {
        this.blockerGrid[row][col] = null
        if (blocker.type === 'rope') this.ropeDestroyedThisTurn = true
      } else {
        return null // Dừng lại nếu blocker chưa bị phá hủy
      }
    }
    const gem = this.grid[row]?.[col]
    if (gem) {
      return gem 
    }
    return null
  }

  // << HÀM MỚI: Phá hủy MỌI THỨ tại một ô, dành riêng cho booster >>
  /**
   * Phá hủy blocker và/hoặc gem tại một ô. Blocker sẽ được xóa bằng animation an toàn.
   * @returns {object | null} Trả về gem object nếu có để xử lý animation.
   */
    // << THAY THẾ TOÀN BỘ HÀM forceDestroyCell CŨ BẰNG PHIÊN BẢN MỚI NÀY >>
  /**
   * Phá hủy ngay lập tức MỌI THỨ tại một ô (cả logic và sprite).
   * Hàm này sẽ tự xử lý animation và dọn dẹp.
   * Nó không trả về gì cả (void).
   */
  forceDestroyCell(row, col) {
    if (!this.isValidCell(row, col)) return;

    // --- Xử lý Blocker ---
    const blocker = this.blockerGrid[row]?.[col];
    if (blocker) {
      this.blockerGrid[row][col] = null; // Xóa tham chiếu logic
      if (blocker.type === 'rope') {
        this.ropeDestroyedThisTurn = true;
      }
      // Tạo animation xóa sprite
      this.scene.tweens.add({
        targets: blocker,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => blocker.destroy()
      });
    }

    // --- Xử lý Gem ---
    const gem = this.grid[row]?.[col];
    if (gem && gem.sprite) {
      this.grid[row][col] = null; // Xóa tham chiếu logic
      // Tạo animation xóa sprite
      this.scene.tweens.add({
        targets: gem.sprite,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          if (gem.sprite) gem.sprite.destroy();
        }
      });
    }
  }

  // --- BOOSTERS (ĐÃ ĐƯỢC ĐƠN GIẢN HÓA) ---

  // << THAY THẾ HÀM useHammer CŨ BẰNG PHIÊN BẢN ĐƠN GIẢN NÀY >>
  useHammer(row, col) {
    if (this.boardBusy) return;
    this.boardBusy = true;
    this.scene.input.enabled = false;

    // Bước 1: Ra lệnh phá hủy mọi thứ tại ô đó.
    this.forceDestroyCell(row, col);

    // Bước 2: Hẹn giờ để kích hoạt gravity sau khi animation phá hủy có thời gian chạy.
    this.scene.time.delayedCall(250, () => {
        this.applyGravityAndRefill();
    });
  }
  
  // << CẬP NHẬT LUÔN HÀM useRocket ĐỂ DÙNG CHUNG LOGIC MỚI >>
  useRocket(row, col) { // `row` không được sử dụng nhưng giữ để nhất quán
    if (this.boardBusy) return;
    this.boardBusy = true;
    this.scene.input.enabled = false;

    console.log(`Using Rocket at column ${col} and its neighbors.`);

    // 1. Xác định các cột sẽ bị ảnh hưởng
    const affectedColumns = [col]; // Luôn bao gồm cột được nhắm tới

    // Thêm cột bên trái nếu nó tồn tại (chỉ số > 0)
    if (col > 0) {
      affectedColumns.push(col - 1);
    }

    // Thêm cột bên phải nếu nó tồn tại (chỉ số < 8)
    if (col < GRID_SIZE - 1) {
      affectedColumns.push(col + 1);
    }

    // 2. Quét qua tất cả các cột bị ảnh hưởng
    affectedColumns.forEach(currentCol => {
      // Trong mỗi cột, quét từ trên xuống dưới và phá hủy mọi thứ
      for (let r = 0; r < GRID_SIZE; r++) {
        this.forceDestroyCell(r, currentCol);
      }
    });

    // 3. Kích hoạt gravity sau một khoảng trễ ngắn để animation kịp chạy
    this.scene.time.delayedCall(250, () => {
      this.applyGravityAndRefill();
    });
  }


  useSwap(gem1, gem2) {
    if (this.boardBusy) return
    this.swapGems(gem1, gem2, { isBooster: true })
  }

  useShuffle() {
    if (this.boardBusy) return
    this.boardBusy = true
    this.scene.input.enabled = false
    const allGems = []
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c] && this.grid[r][c].type === 'gem') {
          allGems.push(this.grid[r][c])
        }
      }
    }
    Phaser.Utils.Array.Shuffle(allGems)
    let idx = 0
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c] && this.grid[r][c].type === 'gem') {
          const g = allGems[idx++]
          this.grid[r][c] = g
          g.sprite.setData({ row: r, col: c })
          this.scene.tweens.add({
            targets: g.sprite,
            x: this.offsetX + c * this.cellSize + this.cellSize / 2,
            y: this.offsetY + r * this.cellSize + this.cellSize / 2,
            duration: 500,
            ease: 'Power2'
          })
        }
      }
    }
    // this.scene.time.delayedCall(600, () => this.checkForNewMatches())
  }
  
  damageBlockerAt(row, col) {
    const blocker = this.blockerGrid?.[row]?.[col]
    if (!blocker) return
    const destroyed = blocker.takeDamage()
    if (destroyed) {
      this.blockerGrid[row][col] = null
      if (blocker.type === 'rope') this.ropeDestroyedThisTurn = true
    }
  }

  getGemsInArea(centerRow, centerCol, radius) {
    const gemsInArea = []
    for (let r = centerRow - radius; r <= centerRow + radius; r++) {
      for (let c = centerCol - radius; c <= centerCol + radius; c++) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          const gem = this.grid[r][c]
          if (gem) gemsInArea.push(gem)
        }
      }
    }
    return gemsInArea
  }
}


