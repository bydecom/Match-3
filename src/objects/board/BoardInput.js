// src/objects/board/BoardInput.js
export class BoardInput {
  isCellBlockedForMovement(row, col) {
    const blocker = this.blockerGrid?.[row]?.[col]
    if (!blocker) return false
    // stone và rope đều chặn di chuyển (swap/chọn)
    return blocker.type === 'stone' || blocker.type === 'rope'
  }

  handleGemClick(row, col) {
    if (this.boardBusy) return
    // Không cho chọn hoặc swap vào ô bị block (stone/rope)
    if (this.isCellBlockedForMovement(row, col)) {
      if (this.selectedGem) {
        this.selectionFrame.setVisible(false)
        this.selectedGem = null
      }
      return
    }
    const clickedGemObject = this.grid[row][col]
    if (!clickedGemObject || clickedGemObject.type !== 'gem') {
      if (this.selectedGem) {
        this.selectionFrame.setVisible(false)
        this.selectedGem = null
      }
      return
    }
    if (this.selectedGem === clickedGemObject) {
      this.selectionFrame.setVisible(false)
      this.selectedGem = null
      console.log('Deselected gem.')
      return
    }
    console.log(`Gem clicked: ${clickedGemObject.value} at ${row},${col}`)
    if (!this.selectedGem) {
      this.selectedGem = clickedGemObject
      const gemSprite = clickedGemObject.sprite
      this.selectionFrame.setPosition(
        gemSprite.x - this.cellSize / 2,
        gemSprite.y - this.cellSize / 2
      )
      this.selectionFrame.setVisible(true)
      console.log('Selected first gem:', clickedGemObject.value)
    } else {
      this.selectionFrame.setVisible(false)
      if (this.areNeighbors(this.selectedGem, clickedGemObject)) {
        // Kiểm tra block tại cả hai ô trước khi swap
        const selRow = this.selectedGem.sprite.getData('row')
        const selCol = this.selectedGem.sprite.getData('col')
        if (this.isCellBlockedForMovement(selRow, selCol) || this.isCellBlockedForMovement(row, col)) {
          this.selectedGem = null
          return
        }
        console.log('Gems are neighbors, swapping...')
        this.swapGems(this.selectedGem, clickedGemObject)
      } else {
        console.log('Gems are not neighbors, selecting new gem')
        // Không cho chuyển selection sang một ô bị block
        if (this.isCellBlockedForMovement(row, col)) {
          this.selectedGem = null
        } else {
          this.selectedGem = clickedGemObject
          const gemSprite = clickedGemObject.sprite
          this.selectionFrame.setPosition(
            gemSprite.x - this.cellSize / 2,
            gemSprite.y - this.cellSize / 2
          )
          this.selectionFrame.setVisible(true)
        }
      }
    }
    this.scene.events.emit('gemSelected', { row, col, type: clickedGemObject.value })
  }

  areNeighbors(gem1, gem2) {
    const row1 = gem1.sprite.getData('row')
    const col1 = gem1.sprite.getData('col')
    const row2 = gem2.sprite.getData('row')
    const col2 = gem2.sprite.getData('col')
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1
  }

  handleBlockerClick(row, col, blockerType) {
    console.log(`Blocker clicked: ${blockerType} at ${row},${col}`)
    this.scene.events.emit('blockerSelected', { row, col, type: blockerType })
  }
}


