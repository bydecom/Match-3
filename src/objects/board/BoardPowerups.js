// src/objects/board/BoardPowerups.js
import { GEM_TYPES, GRID_SIZE } from '../../utils/constants'

export class BoardPowerups {
  isPowerup(gemObject) {
    if (!gemObject) return false
    const value = gemObject.value
    return value === GEM_TYPES.BOMB || value === GEM_TYPES.COLOR_BOMB
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

    // Vùng nổ 3x3
    for (let r = bombRow - 1; r <= bombRow + 1; r++) {
      for (let c = bombCol - 1; c <= bombCol + 1; c++) {
        const destroyedGem = this.damageCell(r, c)
        if (destroyedGem) {
          alreadyExploded.add(destroyedGem)
        }
      }
    }

    // Kích hoạt bomb dây chuyền
    const chainReactionBombs = Array.from(alreadyExploded).filter(gem => 
      gem.value === GEM_TYPES.BOMB && 
      gem !== bombObject // Tránh đệ quy vô hạn
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

  // === HÀM TRUNG TÂM GÂY SÁT THƯƠNG ===
  /**
   * Gây sát thương lên một ô. Ưu tiên blocker trước.
   * @returns {Phaser.GameObjects.Sprite | null} Trả về gem bị phá hủy (nếu có)
   */
  damageCell(row, col) {
    // Kiểm tra xem ô có hợp lệ không
    if (row < 0 || row >= 9 || col < 0 || col >= 9) return null

    const blocker = this.blockerGrid?.[row]?.[col]
    
    // 1. ƯU TIÊN BLOCKER
    if (blocker) {
      console.log(`Damaging blocker at ${row},${col}`)
      const destroyed = blocker.takeDamage()
      if (destroyed) {
        this.blockerGrid[row][col] = null
        if (blocker.type === 'rope') this.ropeDestroyedThisTurn = true
      }
      // Nếu blocker VẪN CÒN (chưa bị phá hủy), dừng lại ngay. Gem bên dưới an toàn.
      else {
        return null
      }
    }

    // 2. NẾU KHÔNG CÓ BLOCKER (HOẶC VỪA BỊ PHÁ HỦY)
    const gem = this.grid[row]?.[col]
    if (gem) {
      console.log(`Damaging gem at ${row},${col}`)
      return gem // Trả về gem để thêm vào danh sách xóa
    }

    return null
  }

  // --- BOOSTERS ---
  useHammer(row, col) {
    if (this.boardBusy) return

    // 1. KHÓA BOARD NGAY LẬP TỨC
    this.boardBusy = true
    this.scene.input.enabled = false
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('boardBusy', true)
    }

    const gemToRemove = this.grid[row]?.[col]
    const blockerToRemove = this.blockerGrid[row]?.[col]

    const gemsToRemove = new Set()
    let wasBlockerDestroyed = false

    // 2. ƯU TIÊN PHÁ BLOCKER TRƯỚC
    if (blockerToRemove) {
      // Dùng búa là phá hủy ngay lập tức, không cần takeDamage
      console.log(`Hammer used on blocker at ${row},${col}`)
      this.blockerGrid[row][col] = null
      blockerToRemove.destroy() // Hủy đối tượng
      wasBlockerDestroyed = true
    }

    // 3. PHÁ GEM (NẾU CÓ)
    // Nếu ô đó vừa có blocker vừa có gem (ví dụ Rope), búa sẽ phá cả hai
    if (gemToRemove) {
      console.log(`Hammer used on gem at ${row},${col}`)
      gemsToRemove.add(gemToRemove)
    }
    
    // 4. BẮT ĐẦU CHUỖI HÀNH ĐỘNG
    // Nếu không có gì để xóa, mở khóa board ngay
    if (gemsToRemove.size === 0 && !wasBlockerDestroyed) {
      this.endOfTurn()
      return
    }

    // Nếu có gem bị xóa, thực hiện hiệu ứng và xóa sprite
    if (gemsToRemove.size > 0) {
      this.removeGemSprites(gemsToRemove)
    }

    // 5. KÍCH HOẠT GRAVITY VÀ REFILL (QUAN TRỌNG NHẤT)
    // Dùng delayedCall để đảm bảo sprite đã có thời gian để thực hiện animation biến mất
    this.scene.time.delayedCall(300, () => {
      this.applyGravityAndRefill()
    })
  }

  // << THAY THẾ TOÀN BỘ HÀM useRocket CŨ BẰNG HÀM NÀY >>
  useRocket(row, col) {
    if (this.boardBusy) return

    // Logic khóa board và gọi VFX sẽ được chuyển sang GameScene
    // Ở đây, chúng ta chỉ tập trung vào việc thu thập gem cần xóa.
    
    const gemsToRemove = new Set()
    const affectedColumns = [col]

    // Thêm cột bên trái nếu hợp lệ
    if (col > 0) {
      affectedColumns.push(col - 1)
    }
    // Thêm cột bên phải nếu hợp lệ
    if (col < GRID_SIZE - 1) {
      affectedColumns.push(col + 1)
    }

    // Quét qua các cột bị ảnh hưởng
    affectedColumns.forEach(c => {
      // Quét toàn bộ hàng trong mỗi cột
      for (let r = 0; r < GRID_SIZE; r++) {
        const destroyedGem = this.damageCell(r, c)
        if (destroyedGem) {
          gemsToRemove.add(destroyedGem)
        }
      }
    })

    // Bắt đầu chuỗi hành động SAU KHI VFX kết thúc
    // Logic này sẽ được gọi từ callback trong GameScene
    if (gemsToRemove.size > 0) {
      this.removeGemSprites(gemsToRemove)
      this.scene.time.delayedCall(100, () => this.applyGravityAndRefill())
    } else {
      // Nếu chỉ phá blocker, vẫn cần refill
      this.scene.time.delayedCall(100, () => this.applyGravityAndRefill())
    }
  }

  useSwap(gem1, gem2) {
    if (this.boardBusy) return
    // Gọi swapGems với cờ isBooster để không swap-back khi không có match
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
    this.scene.time.delayedCall(600, () => this.checkForNewMatches())
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


