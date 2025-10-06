// src/objects/board/BoardState.js
import { GEM_TYPES, GRID_SIZE } from '../../utils/constants'

export class BoardState {
  initGrid() {
    this.grid = []
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row] = []
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grid[row][col] = null
      }
    }
  }

  clearBoard() {
    this.gems.forEach(gem => { if (gem && gem.destroy) gem.destroy() })
    this.gems = []
    this.blockers.forEach(blocker => { if (blocker && blocker.destroy) blocker.destroy() })
    this.blockers = []
    this.scene.children.list.forEach(child => {
      if (child.getData && child.getData('isCell')) child.destroy()
    })
    this.selectionFrame && this.selectionFrame.setVisible(false)
    this.selectedGem = null
    this.initGrid()
  }

  fillEmptyCells() {
    const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES)
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.grid[row][col] && this.grid[row][col].type === 'empty') {
          const randomGemType = availableGems[Math.floor(Math.random() * availableGems.length)]
          this.createGem(row, col, randomGemType)
        }
      }
    }
  }

  updateGridAfterSwap(gem1, gem2) {
    const gem1Row = gem1.sprite.getData('row')
    const gem1Col = gem1.sprite.getData('col')
    const gem2Row = gem2.sprite.getData('row')
    const gem2Col = gem2.sprite.getData('col')
    this.grid[gem1Row][gem1Col] = gem2
    this.grid[gem2Row][gem2Col] = gem1
    gem1.sprite.setData({ row: gem2Row, col: gem2Col })
    gem2.sprite.setData({ row: gem1Row, col: gem1Col })
  }

  swapGems(gem1, gem2) {
    this.scene.input.enabled = false
    this.selectedGem = null
    this.selectionFrame.setVisible(false)
    const gem1Sprite = gem1.sprite
    const gem2Sprite = gem2.sprite
    const gem1InitialX = gem1Sprite.x
    const gem1InitialY = gem1Sprite.y
    // Ghi nhớ vị trí ĐÍCH: vị trí ban đầu của gem2 (gem1 sẽ di chuyển tới đây)
    const swapPosition = { row: gem2Sprite.getData('row'), col: gem2Sprite.getData('col') }
    this.scene.tweens.add({ targets: gem1Sprite, x: gem2Sprite.x, y: gem2Sprite.y, duration: 300, ease: 'Power2' })
    this.scene.tweens.add({
      targets: gem2Sprite,
      x: gem1InitialX,
      y: gem1InitialY,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.updateGridAfterSwap(gem1, gem2)
        this.decideActionAfterSwap(gem1, gem2, swapPosition)
      }
    })
  }

  decideActionAfterSwap(gem1, gem2, swapPosition) {
    let powerupToActivate = null
    let otherGem = null
    // Sau khi cập nhật grid, xác định lại object tại vị trí mới
    const gem1AtNewPos = this.grid[gem1.sprite.getData('row')][gem1.sprite.getData('col')]
    const gem2AtNewPos = this.grid[gem2.sprite.getData('row')][gem2.sprite.getData('col')]
    if (this.isPowerup(gem1AtNewPos)) { powerupToActivate = gem1AtNewPos; otherGem = gem2AtNewPos }
    else if (this.isPowerup(gem2AtNewPos)) { powerupToActivate = gem2AtNewPos; otherGem = gem1AtNewPos }
    else { otherGem = gem1AtNewPos }
    const matchGroups = this.findAllMatches()
    if (matchGroups.length === 0 && !powerupToActivate) {
      this.swapBack(gem1, gem2)
      return
    }
    this.startActionChain(matchGroups, powerupToActivate, otherGem, swapPosition)
  }

  startActionChain(initialMatchGroups, powerupToActivate, otherGem, swapPosition) {
    let allGemsToRemove = new Set()
    let powerupsToCreate = []
    if (initialMatchGroups.length > 0) {
      const { gemsRemoved, powerupsCreated } = this.processMatchGroups(initialMatchGroups, swapPosition)
      gemsRemoved.forEach(gem => allGemsToRemove.add(gem))
      powerupsToCreate = powerupsCreated
    }
    if (powerupToActivate) {
      const explosionSet = this.getPowerupActivationSet(powerupToActivate, otherGem)
      explosionSet.forEach(gem => allGemsToRemove.add(gem))
    }
    if (allGemsToRemove.size > 0) {
      this.addWiggleEffect(Array.from(allGemsToRemove), () => {
        this.createPowerupsAfterWiggle(powerupsToCreate)
        const powerupPositions = new Set(powerupsToCreate.map(p => `${p.row},${p.col}`))
        const finalGemsToRemove = new Set()
        allGemsToRemove.forEach(gem => {
          const gemPos = `${gem.sprite.getData('row')},${gem.sprite.getData('col')}`
          if (!powerupPositions.has(gemPos)) finalGemsToRemove.add(gem)
        })
        this.removeGemSprites(finalGemsToRemove)
        this.scene.time.delayedCall(300, () => {
          this.applyGravityAndRefill()
        })
      })
    } else if (powerupsToCreate.length > 0) {
      this.createPowerupsAfterWiggle(powerupsToCreate)
      this.applyGravityAndRefill()
    } else {
      this.scene.input.enabled = true
    }
  }

  // Biến đổi gem tại các vị trí đã chọn thành power-up sau khi hiệu ứng lắc hoàn tất
  createPowerupsAfterWiggle(powerupsToCreate) {
    powerupsToCreate.forEach(powerup => {
      const gemAtPowerupPos = this.grid[powerup.row][powerup.col]
      if (gemAtPowerupPos && gemAtPowerupPos.type === 'gem') {
        this.transformIntoPowerup(gemAtPowerupPos, powerup.type)
        console.log(`Created ${powerup.type} power-up at ${powerup.row},${powerup.col}`)
      }
    })
  }

  processMatchGroups(matchGroups, swapPosition = null) {
    const gemsToRemove = new Set();
    const powerupsToCreate = [];

    matchGroups.forEach(group => {
      let powerupCreationPos = null;

      // --- QUY TẮC ƯU TIÊN VỊ TRÍ TẠO POWER-UP ---

      // ƯU TIÊN 1: Vị trí do người chơi SWAP vào.
      if (swapPosition) {
        const gemAtSwapPos = this.grid[swapPosition.row]?.[swapPosition.col];
        if (gemAtSwapPos && group.includes(gemAtSwapPos)) {
          powerupCreationPos = swapPosition;
        }
      }
      
      // ƯU TIÊN 2: Nếu là COMBO (không có swapPosition), tìm ĐIỂM GIAO NHAU (cho chữ T/L).
      if (!powerupCreationPos && group.length >= 4) { // Chỉ xét khi group đủ lớn
        let intersectionGem = null;
        
        // Tìm viên gem có cả hàng xóm ngang và dọc CÙNG NẰM TRONG GROUP
        for (const gem of group) {
          const row = gem.sprite.getData('row');
          const col = gem.sprite.getData('col');
          
          // Lấy các hàng xóm từ chính group đó, không cần truy cập grid
          const hasLeftNeighbor = group.find(g => g.sprite.getData('row') === row && g.sprite.getData('col') === col - 1);
          const hasRightNeighbor = group.find(g => g.sprite.getData('row') === row && g.sprite.getData('col') === col + 1);
          const hasUpNeighbor = group.find(g => g.sprite.getData('row') === row - 1 && g.sprite.getData('col') === col);
          const hasDownNeighbor = group.find(g => g.sprite.getData('row') === row + 1 && g.sprite.getData('col') === col);
          
          if ((hasLeftNeighbor && hasRightNeighbor) && (hasUpNeighbor || hasDownNeighbor)) {
            intersectionGem = gem;
            break; 
          }
          if ((hasUpNeighbor && hasDownNeighbor) && (hasLeftNeighbor || hasRightNeighbor)) {
            intersectionGem = gem;
            break;
          }
        }

        if (intersectionGem) {
          // Nếu tìm thấy điểm giao, đó chính là vị trí tạo power-up
          powerupCreationPos = {
            row: intersectionGem.sprite.getData('row'),
            col: intersectionGem.sprite.getData('col')
          };
        }
      }

      // ƯU TIÊN 3: Nếu không có cả hai ở trên (chỉ là ĐƯỜNG THẲNG), mới lấy vị trí giữa.
      if (!powerupCreationPos && group.length >= 4) {
        if (group.length === 4) {
          // Match 4: Chọn ngẫu nhiên 1 trong 2 viên ở giữa
          const middleIndex = Phaser.Math.RND.pick([1, 2]);
          const middleGem = group[middleIndex];
          powerupCreationPos = {
            row: middleGem.sprite.getData('row'),
            col: middleGem.sprite.getData('col')
          };
        } else { // Match 5+ thẳng
          // Match 5: Chọn chính xác viên ở giữa
          const middleGem = group[Math.floor(group.length / 2)];
          powerupCreationPos = {
            row: middleGem.sprite.getData('row'),
            col: middleGem.sprite.getData('col')
          };
        }
      }

      // --- QUYẾT ĐỊNH LOẠI POWER-UP DỰA TRÊN VỊ TRÍ ĐÃ TÌM ĐƯỢC ---
      if (powerupCreationPos) {
        if (group.length === 4) {
          powerupsToCreate.push({ type: GEM_TYPES.BOMB, ...powerupCreationPos });
        } else if (group.length >= 5) {
          // Tạm thời vẫn coi tất cả match 5+ là Color Bomb
          powerupsToCreate.push({ type: GEM_TYPES.COLOR_BOMB, ...powerupCreationPos });
        }
      }

      // Thêm tất cả gem trong cụm này vào danh sách xóa
      group.forEach(gem => gemsToRemove.add(gem));
    });

    return { gemsRemoved: gemsToRemove, powerupsCreated: powerupsToCreate };
  }

  removeGemSprites(gemsToRemove) {
    gemsToRemove.forEach(gemObject => {
      if (gemObject && gemObject.sprite) {
        const row = gemObject.sprite.getData('row')
        const col = gemObject.sprite.getData('col')
        if (this.grid[row][col] === gemObject) {
          this.grid[row][col] = null
        }
        this.scene.tweens.add({
          targets: gemObject.sprite,
          scale: 0,
          duration: 200,
          onComplete: () => {
            gemObject.sprite.destroy()
          }
        })
      }
    })
  }

  addWiggleEffect(gemsToRemoveArray, onComplete) {
    const regularGems = gemsToRemoveArray.filter(gemObject => {
      if (!gemObject || !gemObject.value) return false
      return true
    })
    if (regularGems.length === 0) { onComplete(); return }
    let completedTweens = 0
    regularGems.forEach((gemObject) => {
      if (gemObject.sprite && gemObject.sprite.active) {
        this.scene.tweens.add({
          targets: gemObject.sprite,
          angle: { from: -15, to: 15 },
          yoyo: true,
          repeat: 2,
          duration: 80,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            completedTweens++
            if (completedTweens === regularGems.length) {
              regularGems.forEach(g => g.sprite.setAngle(0))
              onComplete()
            }
          }
        })
      } else {
        completedTweens++
      }
    })
    if (regularGems.length > 0 && completedTweens === regularGems.length) {
      onComplete()
    }
  }

  applyGravityAndRefill() {
    let fallingGemsCount = 0
    let longestDropDuration = 0
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptySlots = 0
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        const currentCell = this.grid[row][col]
        if (currentCell === null) {
          emptySlots++
        } else if (emptySlots > 0) {
          const gemObject = currentCell
          const newRow = row + emptySlots
          this.grid[newRow][col] = gemObject
          this.grid[row][col] = null
          gemObject.sprite.setData('row', newRow)
          fallingGemsCount++
          const duration = 200 + emptySlots * 50
          if (duration > longestDropDuration) longestDropDuration = duration
          this.scene.tweens.add({
            targets: gemObject.sprite,
            y: this.offsetY + newRow * this.cellSize + this.cellSize / 2,
            duration: duration,
            ease: 'Power2',
            onComplete: () => { fallingGemsCount-- }
          })
        }
      }
    }
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyCount = 0
      for (let row = 0; row < GRID_SIZE; row++) {
        if (this.grid[row][col] === null) {
          emptyCount++
          const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES)
          const randomGemType = Phaser.Math.RND.pick(availableGems)
          const startY = this.offsetY - emptyCount * this.cellSize
          const endY = this.offsetY + row * this.cellSize + this.cellSize / 2
          const newGem = this.createGemAt(row, col, randomGemType, startY)
          this.grid[row][col] = { type: 'gem', value: randomGemType, sprite: newGem }
          fallingGemsCount++
          const duration = 300 + row * 60
          if (duration > longestDropDuration) longestDropDuration = duration
          this.scene.tweens.add({
            targets: newGem,
            y: endY,
            duration: duration,
            ease: 'Power2',
            onComplete: () => { fallingGemsCount-- }
          })
        }
      }
    }
    if (fallingGemsCount === 0) {
      this.checkForNewMatches()
    } else {
      this.scene.time.delayedCall(longestDropDuration, () => { this.checkForNewMatches() })
    }
  }

  checkForNewMatches() {
    const newMatchGroups = this.findAllMatches()
    if (newMatchGroups.length > 0) {
      console.log('Found new matches after refill, processing...')
      this.startActionChain(newMatchGroups, null, null, null)
    } else {
      this.scene.input.enabled = true
    }
  }

  getPowerupActivationSet(powerupGem, otherGem) {
    const resultSet = new Set()
    if (this.isPowerup(otherGem)) {
      resultSet.add(powerupGem)
      resultSet.add(otherGem)
      const type1 = powerupGem.value
      const type2 = otherGem.value
      if (type1 === GEM_TYPES.COLOR_BOMB && type2 === GEM_TYPES.COLOR_BOMB) {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (this.grid[r][c]) resultSet.add(this.grid[r][c])
          }
        }
      } else if (type1 === GEM_TYPES.BOMB && type2 === GEM_TYPES.BOMB) {
        const explosion1 = this.getGemsInArea(powerupGem.sprite.getData('row'), powerupGem.sprite.getData('col'), 2)
        explosion1.forEach(gem => resultSet.add(gem))
      } else {
        const colorBomb = (type1 === GEM_TYPES.COLOR_BOMB) ? powerupGem : otherGem
        const bomb = (colorBomb === powerupGem) ? otherGem : powerupGem
        const colorBombRow = colorBomb.sprite.getData('row')
        const colorBombCol = colorBomb.sprite.getData('col')
        for (let c = Math.max(0, colorBombCol - 1); c <= Math.min(GRID_SIZE - 1, colorBombCol + 1); c++) {
          for (let r = 0; r < GRID_SIZE; r++) {
            const gem = this.grid[r][c]
            if (gem && gem.type === 'gem') { resultSet.add(gem) }
          }
        }
        for (let r = Math.max(0, colorBombRow - 1); r <= Math.min(GRID_SIZE - 1, colorBombRow + 1); r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const gem = this.grid[r][c]
            if (gem && gem.type === 'gem') { resultSet.add(gem) }
          }
        }
        resultSet.add(colorBomb)
        resultSet.add(bomb)
      }
    } else {
      resultSet.add(powerupGem)
      switch (powerupGem.value) {
        case GEM_TYPES.BOMB: {
          const explosion = this.getGemsInArea(powerupGem.sprite.getData('row'), powerupGem.sprite.getData('col'), 1)
          explosion.forEach(gem => resultSet.add(gem))
          break
        }
        case GEM_TYPES.COLOR_BOMB: {
          if (otherGem) {
            const targetColor = otherGem.value
            for (let r = 0; r < GRID_SIZE; r++) {
              for (let c = 0; c < GRID_SIZE; c++) {
                const gem = this.grid[r][c]
                if (gem && gem.type === 'gem' && gem.value === targetColor) { resultSet.add(gem) }
              }
            }
            resultSet.add(otherGem)
          }
          break
        }
      }
    }
    return resultSet
  }
}


