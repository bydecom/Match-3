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
    const gemsInExplosion = this.getGemsInArea(bombRow, bombCol, 1)
    // Gây sát thương cho blocker (stone/rope) trong vùng nổ 3x3
    const neighborCells = []
    for (let r = bombRow - 1; r <= bombRow + 1; r++) {
      for (let c = bombCol - 1; c <= bombCol + 1; c++) {
        neighborCells.push({ r, c })
      }
    }
    neighborCells.forEach(({ r, c }) => {
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        this.damageBlockerAt(r, c)
      }
    })
    const chainReactionBombs = gemsInExplosion.filter(gem => gem.value === GEM_TYPES.BOMB && !alreadyExploded.has(gem))
    chainReactionBombs.forEach(nextBomb => {
      this.activateBomb(nextBomb, alreadyExploded)
    })
    gemsInExplosion.forEach(gem => alreadyExploded.add(gem))
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
          if (this.grid[r][c] && this.grid[r][c].type === 'gem') {
            gemsToRemove.add(this.grid[r][c])
          }
          // Color bomb (đôi) cũng trừ 1 máu mọi blocker
          this.damageBlockerAt(r, c)
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
            gemsToRemove.add(gem)
            // Color bomb (đơn) trừ 1 máu blocker ngay tại các ô bị ảnh hưởng
            this.damageBlockerAt(r, c)
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

  // --- BOOSTERS ---
  useHammer(row, col) {
    if (this.boardBusy) return
    this.boardBusy = true
    this.scene.input.enabled = false
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('boardBusy', true)
    }
    const gemsToRemove = new Set()
    // Damage blocker trước
    this.damageBlockerAt(row, col)
    // Xóa gem nếu có
    const gem = this.grid[row][col]
    if (gem) gemsToRemove.add(gem)
    if (gemsToRemove.size > 0) {
      this.addWiggleEffect(Array.from(gemsToRemove), () => {
        this.removeGemSprites(gemsToRemove)
        this.scene.time.delayedCall(300, () => this.applyGravityAndRefill())
      })
    } else {
      // Không có gì để xóa: kết thúc lượt ngay
      this.endOfTurn()
    }
  }

  useRocket(row, col) {
    if (this.boardBusy) return
    this.boardBusy = true
    this.scene.input.enabled = false
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('boardBusy', true)
    }
    const gemsToRemove = new Set()
    for (let r = 0; r < GRID_SIZE; r++) {
      this.damageBlockerAt(r, col)
      const g = this.grid[r][col]
      if (g) gemsToRemove.add(g)
    }
    if (gemsToRemove.size > 0) {
      this.addWiggleEffect(Array.from(gemsToRemove), () => {
        this.removeGemSprites(gemsToRemove)
        this.scene.time.delayedCall(300, () => this.applyGravityAndRefill())
      })
    } else {
      // Không có gì để xóa: kết thúc lượt ngay
      this.endOfTurn()
    }
  }

  useSwap(gem1, gem2) {
    if (this.boardBusy) return
    this.boardBusy = true
    this.scene.input.enabled = false
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('boardBusy', true)
    }
    this.updateGridAfterSwap(gem1, gem2)
    const gem1Sprite = gem1.sprite
    const gem2Sprite = gem2.sprite
    this.scene.tweens.add({ targets: gem1Sprite, x: gem2Sprite.x, y: gem2Sprite.y, duration: 300, ease: 'Power2' })
    this.scene.tweens.add({
      targets: gem2Sprite,
      x: gem1Sprite.x,
      y: gem1Sprite.y,
      duration: 300,
      ease: 'Power2',
      onComplete: () => { this.checkForNewMatches() }
    })
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


