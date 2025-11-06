  // src/objects/board/BoardInput.js
  export class BoardInput {
    // Áp dụng hiệu ứng chọn: scale 1.3 và nghiêng qua lại -15..15
    applySelectionVisual(gemSprite) {
      if (!gemSprite) return
      if (!gemSprite.getData('originalScale')) {
        gemSprite.setData('originalScale', gemSprite.scaleX)
      }
      const originalScale = gemSprite.getData('originalScale')
      gemSprite.setScale(originalScale * 1.2)
      gemSprite.setAngle(0)
      // Dừng tween cũ nếu có
      const oldTween = gemSprite.getData('selectTween')
      if (oldTween) oldTween.stop()
      const tween = this.scene.tweens.add({
        targets: gemSprite,
        angle: { from: -15, to: 15 },
        duration: 250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      })
      gemSprite.setData('selectTween', tween)
      if (this.selectionFrame) this.selectionFrame.setVisible(false)
    }

    // Gỡ hiệu ứng chọn và khôi phục
    clearSelectionVisual(gemObject) {
            const sprite = gemObject?.sprite
            if (!sprite) return
      
            const tween = sprite.getData('selectTween')
            if (tween) tween.stop()
            
            // --- SỬA LỖI Ở ĐÂY ---
            // sprite.removeData('selectTween') // <== LỖI
            sprite.data.remove('selectTween')  // <== SỬA LẠI
            // --- KẾT THÚC SỬA LỖI ---
      
            const originalScale = sprite.getData('originalScale') || 1
            // Dọn dẹp luôn key originalScale
            sprite.data.remove('originalScale') 
      
            sprite.setScale(originalScale)
            sprite.setAngle(0)
            if (this.selectionFrame) this.selectionFrame.setVisible(false)
          }
    
    isCellBlockedForMovement(row, col) {
      const blocker = this.blockerGrid?.[row]?.[col]
      if (!blocker) return false
      // stone và rope đều chặn di chuyển (swap/chọn)
      return blocker.type === 'stone' || blocker.type === 'rope'
    }

    handleGemClick(row, col) {
    // Nếu đang chọn booster ở GameScene, nhường quyền xử lý cho hệ thống booster
    if (this.scene && this.scene.activeBooster) return
    if (this.boardBusy) return
      // Không cho chọn hoặc swap vào ô bị block (stone/rope)
      if (this.isCellBlockedForMovement(row, col)) {
        if (this.selectedGem) {
          this.clearSelectionVisual(this.selectedGem)
          this.selectedGem = null
        }
        return
      }
      const clickedGemObject = this.grid[row][col]
      if (!clickedGemObject || clickedGemObject.type !== 'gem') {
        if (this.selectedGem) {
          this.clearSelectionVisual(this.selectedGem)
          this.selectedGem = null
        }
        return
      }
      if (this.selectedGem === clickedGemObject) {
        this.clearSelectionVisual(this.selectedGem)
        this.selectedGem = null
        console.log('Deselected gem.')
        return
      }
      console.log(`Gem clicked: ${clickedGemObject.value} at ${row},${col}`)
      if (!this.selectedGem) {
        this.selectedGem = clickedGemObject
        const gemSprite = clickedGemObject.sprite
        this.applySelectionVisual(gemSprite)
        console.log('Selected first gem:', clickedGemObject.value)
      } else {
        this.selectionFrame.setVisible(false)
        if (this.areNeighbors(this.selectedGem, clickedGemObject)) {
          // Kiểm tra block tại cả hai ô trước khi swap
          const selRow = this.selectedGem.sprite.getData('row')
          const selCol = this.selectedGem.sprite.getData('col')
          if (this.isCellBlockedForMovement(selRow, selCol) || this.isCellBlockedForMovement(row, col)) {
            this.clearSelectionVisual(this.selectedGem)
            this.selectedGem = null
            return
          }
          console.log('Gems are neighbors, swapping...')
          this.clearSelectionVisual(this.selectedGem)
          this.swapGems(this.selectedGem, clickedGemObject)
          this.selectedGem = null
        } else {
          console.log('Gems are not neighbors, selecting new gem')
          // Luôn gỡ hiệu ứng của gem cũ trước
          this.clearSelectionVisual(this.selectedGem)
          // Sau đó mới kiểm tra ô mới
          if (this.isCellBlockedForMovement(row, col)) {
            // Click vào ô bị chặn -> chỉ bỏ chọn
            this.selectedGem = null
          } else {
            // Ô hợp lệ -> chọn gem mới và áp hiệu ứng
            this.selectedGem = clickedGemObject
            const gemSprite = clickedGemObject.sprite
            this.applySelectionVisual(gemSprite)
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

    /**
     * Hủy bỏ lựa chọn gem hiện tại trên board.
     * Dùng khi có một hành động bên ngoài (như chọn booster) yêu cầu.
     */
    clearSelection() {
      if (this.selectedGem) {
        console.log('Board selection cleared due to booster selection.');
        this.clearSelectionVisual(this.selectedGem);
        this.selectedGem = null;
      }
    }
  
    /**
     * [HÀM MỚI] Lấy tọa độ của ô hàng xóm
     * @param {number} row 
     * @param {number} col 
     * @param {string} direction 'up' | 'down' | 'left' | 'right'
     * @returns {object | null} {row, col} hoặc null nếu không hợp lệ
     */
    getNeighborCell(row, col, direction) {
      let targetRow = row;
      let targetCol = col;
      if (direction === 'left') targetCol--;
      else if (direction === 'right') targetCol++;
      else if (direction === 'up') targetRow--;
      else if (direction === 'down') targetRow++;
      // this.isValidCell đến từ Board.js (mixin)
      if (this.isValidCell && this.isValidCell(targetRow, targetCol)) {
        return { row: targetRow, col: targetCol };
      }
      return null; // Hàng xóm không hợp lệ (ra ngoài biên)
    }
  }


