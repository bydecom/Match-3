// src/objects/board/BoardPowerups.js
import { GEM_TYPES, GRID_SIZE } from '../../utils/constants'
import { SOUND_KEYS } from '../../utils/SoundAssets'
import AudioManager from '../../managers/AudioManager'

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
      // >>> PHÁT ÂM THANH COMBO COLOR BOMB + COLOR BOMB <<<
      const sfxVolume = AudioManager.getSoundVolume()
      if (sfxVolume > 0) {
        this.scene.sound.play(SOUND_KEYS.BOMB, { volume: sfxVolume * 1.2 })
      }
      
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const destroyedGem = this.damageCell(r, c)
          if (destroyedGem) {
            gemsToRemove.add(destroyedGem)
          }
        }
      }
    } else if (swappedObjectType === GEM_TYPES.BOMB) {
      // >>> PHÁT ÂM THANH COMBO COLOR BOMB + BOMB <<<
      const sfxVolume = AudioManager.getSoundVolume()
      if (sfxVolume > 0) {
        this.scene.sound.play(SOUND_KEYS.BOMB, { volume: sfxVolume })
      }
      
      const allGemsToExplode = new Set()
      allGemsToExplode.add(colorBombObject)
      allGemsToExplode.add(swappedObject)
      const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES).filter(t => ![GEM_TYPES.BOMB, GEM_TYPES.COLOR_BOMB].includes(t))
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
    } else if (swappedObjectType === GEM_TYPES.STRIPE) {
      // >>> TRƯỜNG HỢP 3: COLOR BOMB + STRIPE <<<
      const sfxVolume = AudioManager.getSoundVolume()
      if (sfxVolume > 0) {
        this.scene.sound.play(SOUND_KEYS.STRIPE, { volume: sfxVolume })
      }

      const allGemsToExplode = new Set()
      allGemsToExplode.add(colorBombObject)
      allGemsToExplode.add(swappedObject)

      // Chọn màu mục tiêu ngẫu nhiên (vì Stripe không lưu màu gốc)
      const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES).filter(t => ![GEM_TYPES.BOMB, GEM_TYPES.COLOR_BOMB, GEM_TYPES.STRIPE].includes(t))
      const targetColor = Phaser.Math.RND.pick(availableGems)
      
      const stripesToActivate = []

      // Biến đổi gem cùng màu thành Stripe
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const gem = this.grid[r][c]
          if (gem && gem.type === 'gem' && gem.value === targetColor) {
            this.transformIntoPowerup(gem, GEM_TYPES.STRIPE)
            // Random hướng stripe (ngang/dọc) để đa dạng
            if (Math.random() > 0.5) gem.sprite.setAngle(90)
            stripesToActivate.push(gem)
          }
        }
      }

      // Kích hoạt logic xóa hàng/cột cho mỗi stripe
      stripesToActivate.forEach(stripe => {
        const stripeRow = stripe.sprite.getData('row')
        const stripeCol = stripe.sprite.getData('col')
        const isHorizontal = stripe.sprite.angle === 0
        
        if (isHorizontal) {
          // Xóa toàn bộ hàng
          for (let c = 0; c < GRID_SIZE; c++) {
            const destroyedGem = this.damageCell(stripeRow, c)
            if (destroyedGem) allGemsToExplode.add(destroyedGem)
          }
        } else {
          // Xóa toàn bộ cột
          for (let r = 0; r < GRID_SIZE; r++) {
            const destroyedGem = this.damageCell(r, stripeCol)
            if (destroyedGem) allGemsToExplode.add(destroyedGem)
          }
        }
      })

      this.addWiggleEffect(Array.from(allGemsToExplode), () => {
        this.removeGemSprites(allGemsToExplode)
        this.scene.time.delayedCall(300, () => {
          this.applyGravityAndRefill()
        })
      })
      return
    } else {
      // >>> PHÁT ÂM THANH COMBO COLOR BOMB + GEM THƯỜNG <<<
      const sfxVolume = AudioManager.getSoundVolume()
      if (sfxVolume > 0) {
        this.scene.sound.play(SOUND_KEYS.SPIN_COLLECT, { volume: sfxVolume })
      }
      
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
  
  /**
   * Gây sát thương (1 điểm) lên một ô cụ thể (row, col) theo ưu tiên blocker.
   * - Nếu có blocker: gọi takeDamage(). Nếu chưa vỡ -> dừng và trả về null (BẢO VỆ GEM).
   * - Nếu không có blocker hoặc blocker vừa vỡ -> trả về gem (nếu có) để đưa vào danh sách xóa.
   * @returns {object|null} gem bị phá hủy hoặc null nếu không có/không thể phá do blocker.
   */
  damageCell(row, col) {
    // Kiểm tra ô hợp lệ bằng helper sẵn có
    if (!this.isValidCell || !this.isValidCell(row, col)) return null

    // --- Ưu tiên xử lý Blocker ---
    const blocker = this.blockerGrid?.[row]?.[col]
    if (blocker) {
      const blockerDestroyed = blocker.takeDamage()
      if (blockerDestroyed) {
        // Xóa blocker khỏi lưới
        this.blockerGrid[row][col] = null
        // Cập nhật mục tiêu nếu có type
        if (blocker.type) {
          this.updateObjectiveProgress && this.updateObjectiveProgress('blocker', blocker.type)
        }
        if (blocker.type === 'rope') this.ropeDestroyedThisTurn = true
        // Tiếp tục kiểm tra gem bên dưới
      } else {
        // Blocker chưa bị phá -> dừng, không tác động gem (BẢO VỆ GEM)
        return null
      }
    }

    // --- Xử lý Gem ---
    const gem = this.grid[row]?.[col]
    if (gem && gem.type === 'gem') {
      return gem
    }
    return null
  }

  /**
   * [MỚI] Gây sát thương blocker NHƯNG VẪN LẤY GEM (dùng cho Color Bomb và hiệu ứng hút).
   * - Nếu có blocker: gọi takeDamage() (-1 HP), nhưng VẪN TIẾP TỤC lấy gem.
   * - Trả về gem (nếu có) để xóa, bất kể blocker còn máu hay không.
   * @returns {object|null} gem bị phá hủy hoặc null nếu không có gem.
   */
  damageCellIgnoreBlocker(row, col) {
    // Kiểm tra ô hợp lệ
    if (!this.isValidCell || !this.isValidCell(row, col)) return null

    // --- Gây sát thương Blocker (nếu có) nhưng KHÔNG dừng ---
    const blocker = this.blockerGrid?.[row]?.[col]
    if (blocker) {
      const blockerDestroyed = blocker.takeDamage()
      if (blockerDestroyed) {
        // Xóa blocker khỏi lưới
        this.blockerGrid[row][col] = null
        // Cập nhật mục tiêu nếu có type
        if (blocker.type) {
          this.updateObjectiveProgress && this.updateObjectiveProgress('blocker', blocker.type)
        }
        if (blocker.type === 'rope') this.ropeDestroyedThisTurn = true
      }
      // QUAN TRỌNG: KHÔNG return null ở đây, tiếp tục lấy gem bên dưới
    }

    // --- Xử lý Gem (bất kể blocker còn máu hay không) ---
    const gem = this.grid[row]?.[col]
    if (gem && gem.type === 'gem') {
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
      // Cập nhật mục tiêu blocker và xóa khỏi lưới
      if (blocker.type) {
        this.updateObjectiveProgress('blocker', blocker.type);
      }
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
      // Ghi nhận để tổng hợp cuối lượt
      if (!this.turnStats) this.turnStats = { gemCounts: {}, powerups: [] };
      this.turnStats.blockerTouched = true;
    }

    // --- Xử lý Gem ---
    const gem = this.grid[row]?.[col];
    if (gem && gem.sprite) {
      // << CẬP NHẬT OBJECTIVE TẠI ĐÂY >>
      const isPowerup = 
        gem.value === GEM_TYPES.BOMB ||
        gem.value === GEM_TYPES.STRIPE ||
        gem.value === GEM_TYPES.COLOR_BOMB
      
      if (isPowerup) {
        // Đếm power-up
        const map = {
          [GEM_TYPES.BOMB]: 'bomb',
          [GEM_TYPES.STRIPE]: 'stripe',
          [GEM_TYPES.COLOR_BOMB]: 'color_bomb'
        }
        const key = map[gem.value] || String(gem.value).toLowerCase()
        this.updateObjectiveProgress('powerup', key, 1)
      } else {
        // Đếm gem thường
        this.updateObjectiveProgress('gem', gem.value, 1)
      }
      
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
      
      // Ghi nhận để tổng hợp cuối lượt
      if (!this.turnStats) this.turnStats = { gemCounts: {}, powerups: [] };
      const color = gem.value;
      this.turnStats.gemCounts[color] = (this.turnStats.gemCounts[color] || 0) + 1;
    }
  }

  // --- BOOSTERS (ĐÃ ĐƯỢC ĐƠN GIẢN HÓA) ---

  // << THAY THẾ HÀM useHammer CŨ BẰNG PHIÊN BẢN ĐƠN GIẢN NÀY >>
  useHammer(row, col) {
    if (this.boardBusy) return;
    this.boardBusy = true;
    this.scene.input.enabled = false;

    // Reset thống kê cho lượt booster
    this.turnStats = { gemCounts: {}, powerups: [] };

    // Bước 1: Ra lệnh phá hủy mọi thứ tại ô đó.
    this.forceDestroyCell(row, col);

    // Bước 2: Hẹn giờ để kích hoạt gravity sau khi animation phá hủy có thời gian chạy.
    this.scene.time.delayedCall(250, () => {
        // Tính lại blocker sau khi phá và phát tóm tắt cho UI
        this.recalculateBlockerCounts();
        if (this.scene && this.scene.game && this.scene.game.events) {
          this.scene.game.events.emit('matchSummary', {
            gemCounts: this.turnStats.gemCounts,
            blockerCounts: this.blockerCounts || {},
            powerups: this.turnStats.powerups
          })
        }
        this.applyGravityAndRefill();
    });
  }
  
  // << SỬA LẠI HÀM useRocket ĐỂ CHỈ GÂY 1 DAMAGE VÀO BLOCKER >>
  useRocket(row, col) { // `row` không được sử dụng nhưng giữ để nhất quán
    if (this.boardBusy) return;
    this.boardBusy = true;
    this.scene.input.enabled = false;

    console.log(`Using Rocket at column ${col} and its neighbors.`);

    // Reset thống kê cho lượt booster
    this.turnStats = { gemCounts: {}, powerups: [] };

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
    // SỬ DỤNG damageCell THAY VÌ forceDestroyCell - CHỈ GÂY 1 DAMAGE VÀO BLOCKER
    const gemsToRemove = new Set();
    affectedColumns.forEach(currentCol => {
      // Trong mỗi cột, quét từ trên xuống dưới
      for (let r = 0; r < GRID_SIZE; r++) {
        // damageCell sẽ:
        // - Gây 1 damage vào blocker (nếu có)
        // - Chỉ trả về gem nếu blocker bị phá hủy hoặc không có blocker
        const destroyedGem = this.damageCell(r, currentCol);
        if (destroyedGem) {
          gemsToRemove.add(destroyedGem);
        }
      }
    });

    // 3. Xóa sprite của các gem đã bị phá hủy
    this.removeGemSprites(gemsToRemove);

    // 4. Tính lại blocker và kích hoạt gravity
    this.scene.time.delayedCall(250, () => {
      // Đếm gem để cập nhật objective
      const gemCounts = {};
      gemsToRemove.forEach(gem => {
        if (gem && gem.value && !this.isPowerup(gem)) {
          gemCounts[gem.value] = (gemCounts[gem.value] || 0) + 1;
        }
      });
      
      // Cập nhật objective cho gem
      for (const type in gemCounts) {
        this.updateObjectiveProgress('gem', type, gemCounts[type]);
      }

      // Tính lại blocker sau khi phá và phát tóm tắt cho UI
      this.recalculateBlockerCounts();
      if (this.scene && this.scene.game && this.scene.game.events) {
        this.scene.game.events.emit('matchSummary', {
          gemCounts: gemCounts,
          blockerCounts: this.blockerCounts || {},
          powerups: this.turnStats.powerups || []
        })
      }
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


