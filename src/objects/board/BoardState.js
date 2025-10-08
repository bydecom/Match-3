// src/objects/board/BoardState.js
import { GEM_TYPES, GRID_SIZE } from '../../utils/constants'

export class BoardState {
  initGrid() {
    this.grid = []
    this.blockerGrid = []
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row] = []
      this.blockerGrid[row] = []
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grid[row][col] = null
        this.blockerGrid[row][col] = null
      }
    }
  }


  clearBoard() {
    this.gems.forEach(gem => { if (gem && gem.destroy) gem.destroy() })
    this.gems = []
    this.blockers.forEach(blocker => { if (blocker && blocker.destroy) blocker.destroy() })
    this.blockers = []
    // Hủy các blocker OOP trong blockerGrid nếu còn
    if (this.blockerGrid) {
      for (let r = 0; r < this.blockerGrid.length; r++) {
        for (let c = 0; c < this.blockerGrid[r].length; c++) {
          const b = this.blockerGrid[r][c]
          if (b && b.destroy) b.destroy()
        }
      }
    }
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

  swapGems(gem1, gem2, options = {}) {
    if (this.boardBusy) return
    this.boardBusy = true
    this.scene.input.enabled = false
    // Báo cho UI biết board đang bận xử lý
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('boardBusy', true)
    }
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
        this.decideActionAfterSwap(gem1, gem2, swapPosition, options)
      }
    })
  }

  // Hoán đổi trả lại khi không có match/power-up được kích hoạt
  swapBack(gem1, gem2) {
    const gem1Sprite = gem1.sprite
    const gem2Sprite = gem2.sprite
    const gem1CurrentX = gem1Sprite.x
    const gem1CurrentY = gem1Sprite.y
    const gem2CurrentX = gem2Sprite.x
    const gem2CurrentY = gem2Sprite.y
    // Đưa sprite quay về vị trí ban đầu (đang là vị trí của sprite còn lại)
    this.scene.tweens.add({ targets: gem1Sprite, x: gem2CurrentX, y: gem2CurrentY, duration: 250, ease: 'Power2' })
    this.scene.tweens.add({
      targets: gem2Sprite,
      x: gem1CurrentX,
      y: gem1CurrentY,
      duration: 250,
      ease: 'Power2',
      onComplete: () => {
        // Cập nhật lại grid về trạng thái trước swap
        this.updateGridAfterSwap(gem1, gem2)
        // Mở khóa ngay, KHÔNG tính là kết thúc lượt
        this.boardBusy = false
        this.scene.input.enabled = true
        if (this.scene && this.scene.game && this.scene.game.events) {
          this.scene.game.events.emit('boardBusy', false)
        }
      }
    })
  }

  decideActionAfterSwap(gem1, gem2, swapPosition, options = {}) {
    let powerupToActivate = null
    let otherGem = null

    // Sau khi cập nhật grid, lấy lại 2 viên ở vị trí mới
    const gem1AtNewPos = this.grid[gem1.sprite.getData('row')][gem1.sprite.getData('col')]
    const gem2AtNewPos = this.grid[gem2.sprite.getData('row')][gem2.sprite.getData('col')]

    // Luôn xác định match sau swap
    const matchGroups = this.findAllMatches()

    // Chỉ xác định power-up cần kích hoạt nếu KHÔNG phải booster swap
    if (!options.isBooster) {
      if (this.isPowerup(gem1AtNewPos)) {
        powerupToActivate = gem1AtNewPos
        otherGem = gem2AtNewPos
      } else if (this.isPowerup(gem2AtNewPos)) {
        powerupToActivate = gem2AtNewPos
        otherGem = gem1AtNewPos
      }
    }

    // Chỉ swap back khi không có match và không kích hoạt power-up, và không phải booster
    if (matchGroups.length === 0 && !powerupToActivate && !options.isBooster) {
      this.swapBack(gem1, gem2)
      return
    }

    this.startActionChain(matchGroups, powerupToActivate, otherGem, swapPosition)
  }

  startActionChain(initialMatchGroups, powerupToActivate, otherGem, swapPosition) {
    let allGemsToRemove = new Set()
    let powerupsToCreate = []

    // Luôn xử lý match và lên kế hoạch tạo power-up
    if (initialMatchGroups.length > 0) {
      const { gemsRemoved, powerupsCreated } = this.processMatchGroups(initialMatchGroups, swapPosition)
      gemsRemoved.forEach(gem => allGemsToRemove.add(gem))
      powerupsToCreate = powerupsCreated
    }

    // Luôn xử lý kích hoạt power-up
    if (powerupToActivate) {
      const explosionSet = this.getPowerupActivationSet(powerupToActivate, otherGem)
      explosionSet.forEach(gem => allGemsToRemove.add(gem))
    }

    // Callback sau khi VFX hoàn tất: chỉ xóa và tạo, không bảo vệ tại đây nữa
    const onVFXComplete = () => {
      this.removeGemSprites(allGemsToRemove)
      this.createPowerupsAfterWiggle(powerupsToCreate)
      this.scene.time.delayedCall(150, () => { this.applyGravityAndRefill() })
    }

    // --- BẮT ĐẦU SỬA TỪ KHỐI LOGIC KIỂM TRA POWER-UP ---
    if (powerupToActivate) {
        // KIỂM TRA TRƯỚC TIÊN: CÓ PHẢI LÀ COMBO KHÔNG?
        if (this.isPowerup(otherGem)) {
            const type1 = powerupToActivate.value
            const type2 = otherGem.value

            // COMBO BOMB + BOMB
            if (type1 === GEM_TYPES.BOMB && type2 === GEM_TYPES.BOMB) {
                // powerupToActivate là viên gem được chọn (selected)
                // otherGem là viên gem ở vị trí đích (target)
                this.powerupVFXManager.playDoubleBombEffect(powerupToActivate, otherGem, allGemsToRemove, onVFXComplete)
            } 
            else {
                // Nếu là các combo khác chưa có VFX, tạm thời dùng hiệu ứng wiggle cũ
                this.addWiggleEffect(Array.from(allGemsToRemove), onVFXComplete)
            }
        }
        // NẾU KHÔNG PHẢI COMBO, MÀ LÀ KÍCH HOẠT ĐƠN
        else {
            if (powerupToActivate.value === GEM_TYPES.BOMB) {
                this.powerupVFXManager.playBombEffect(powerupToActivate, allGemsToRemove, onVFXComplete)
            } else if (powerupToActivate.value === GEM_TYPES.COLOR_BOMB) {
                this.powerupVFXManager.playColorBombEffect(powerupToActivate, allGemsToRemove, onVFXComplete)
            } else {
                // Trường hợp power-up khác trong tương lai, tạm thời dùng logic cũ
                onVFXComplete()
            }
        }
    } 
    // Nếu chỉ là một match-3 thông thường, không có power-up
    else if (allGemsToRemove.size > 0) {
        this.addWiggleEffect(Array.from(allGemsToRemove), onVFXComplete);
    } 
    // Nếu không có gì để xóa (ví dụ: chỉ tạo power-up)
    else if (powerupsToCreate.length > 0) {
        this.createPowerupsAfterWiggle(powerupsToCreate)
        this.applyGravityAndRefill()
    } else {
        this.endOfTurn();
    }
  }

  // Biến đổi gem tại các vị trí đã chọn thành power-up sau khi hiệu ứng lắc hoàn tất
  createPowerupsAfterWiggle(powerupsToCreate) {
    powerupsToCreate.forEach(powerupInfo => {
      const row = powerupInfo.row
      const col = powerupInfo.col
      const gemAtPowerupPos = this.grid[row]?.[col]

      if (gemAtPowerupPos && gemAtPowerupPos.type === 'gem') {
        // Biến đổi viên gem hiện có thành power-up
        this.transformIntoPowerup(gemAtPowerupPos, powerupInfo.type)
        console.log(`Created ${powerupInfo.type} at ${row},${col}`)
      } else {
        // Nếu ô trống (trường hợp hiếm) thì tạo mới power-up
        this.createGem(row, col, powerupInfo.type)
      }
    })
  }

  processMatchGroups(matchGroups, swapPosition = null) {
    const gemsToRemoveFromMatch = new Set();
    const powerupsToCreate = [];

    matchGroups.forEach(group => {
      let powerupCreationPos = null;

      // ƯU TIÊN 1: Vị trí do người chơi SWAP vào
      if (swapPosition) {
        const gemAtSwapPos = this.grid[swapPosition.row]?.[swapPosition.col];
        if (gemAtSwapPos && group.includes(gemAtSwapPos)) {
          powerupCreationPos = swapPosition;
        }
      }

      // ƯU TIÊN 2: L/T-shape (điểm giao)
      if (!powerupCreationPos && group.length >= 4) {
        let intersectionGem = null;
        for (const gem of group) {
          const row = gem.sprite.getData('row');
          const col = gem.sprite.getData('col');
          const hasHorizontalNeighbor = group.find(g => g.sprite.getData('row') === row && Math.abs(g.sprite.getData('col') - col) === 1);
          const hasVerticalNeighbor = group.find(g => Math.abs(g.sprite.getData('row') - row) === 1 && g.sprite.getData('col') === col);
          if (hasHorizontalNeighbor && hasVerticalNeighbor) { intersectionGem = gem; break; }
        }
        if (intersectionGem) {
          powerupCreationPos = { row: intersectionGem.sprite.getData('row'), col: intersectionGem.sprite.getData('col') };
        }
      }

      // ƯU TIÊN 3: Đường thẳng, lấy giữa
      if (!powerupCreationPos && group.length >= 4) {
        if (group.length === 4) {
          const middleIndex = Phaser.Math.RND.pick([1, 2]);
          const middleGem = group[middleIndex];
          powerupCreationPos = { row: middleGem.sprite.getData('row'), col: middleGem.sprite.getData('col') };
        } else {
          const middleGem = group[Math.floor(group.length / 2)];
          powerupCreationPos = { row: middleGem.sprite.getData('row'), col: middleGem.sprite.getData('col') };
        }
      }

      // Quyết định loại power-up
      if (powerupCreationPos) {
        if (group.length === 4) powerupsToCreate.push({ type: GEM_TYPES.BOMB, ...powerupCreationPos });
        else if (group.length >= 5) powerupsToCreate.push({ type: GEM_TYPES.COLOR_BOMB, ...powerupCreationPos });
      }

      // Gom tất cả gem trong group vào danh sách xóa ban đầu
      group.forEach(gem => gemsToRemoveFromMatch.add(gem));
    });

    // Gây sát thương blocker lân cận (giữ nguyên logic hiện có)
    const gemsAndAdjacentCells = new Set();
    gemsToRemoveFromMatch.forEach(gem => {
      const r = gem.sprite.getData('row');
      const c = gem.sprite.getData('col');
      gemsAndAdjacentCells.add(`${r},${c}`);
      gemsAndAdjacentCells.add(`${r-1},${c}`);
      gemsAndAdjacentCells.add(`${r+1},${c}`);
      gemsAndAdjacentCells.add(`${r},${c-1}`);
      gemsAndAdjacentCells.add(`${r},${c+1}`);
    });
    gemsAndAdjacentCells.forEach(coord => {
      const [r, c] = coord.split(',').map(Number);
      const blocker = this.blockerGrid?.[r]?.[c];
      if (blocker) {
        const destroyed = blocker.takeDamage();
        if (destroyed) {
          this.blockerGrid[r][c] = null;
          if (blocker.type === 'rope') this.ropeDestroyedThisTurn = true;
        }
      }
    });

    // Bảo vệ: loại bỏ gem tại vị trí tạo power-up khỏi danh sách xóa
    if (powerupsToCreate.length > 0) {
      const powerupPositions = new Set(powerupsToCreate.map(p => `${p.row},${p.col}`));
      gemsToRemoveFromMatch.forEach(gem => {
        if (!gem || !gem.sprite) return;
        const pos = `${gem.sprite.getData('row')},${gem.sprite.getData('col')}`;
        if (powerupPositions.has(pos)) gemsToRemoveFromMatch.delete(gem);
      });
    }

    return { gemsRemoved: gemsToRemoveFromMatch, powerupsCreated: powerupsToCreate };
  }

  // << THAY THẾ HÀM removeGemSprites BẰNG PHIÊN BẢN AN TOÀN NÀY >>
  removeGemSprites(gemsToRemove) {
    gemsToRemove.forEach(gemObject => {
      // === BƯỚC KIỂM TRA AN TOÀN QUAN TRỌNG ===
      // Chỉ xử lý nếu gemObject là một đối tượng hợp lệ VÀ có thuộc tính sprite
      if (gemObject && gemObject.sprite) {
        const row = gemObject.sprite.getData('row')
        const col = gemObject.sprite.getData('col')
        
        // Xóa tham chiếu trong grid
        if (this.grid[row] && this.grid[row][col] === gemObject) {
          this.grid[row][col] = null
        }

        // Tạo animation biến mất
        this.scene.tweens.add({
          targets: gemObject.sprite,
          scale: 0,
          alpha: 0, // Thêm cả alpha để đảm bảo biến mất hoàn toàn
          duration: 200,
          onComplete: () => {
            // Hủy sprite sau khi animation kết thúc
            gemObject.sprite.destroy()
          }
        })
      }
    })
  }

  /**
   * Xóa sprite của một blocker với hiệu ứng animation.
   * @param {any} blockerObject Đối tượng blocker cần xóa (sprite hoặc có destroy()).
   */
  removeBlockerSprite(blockerObject) {
    if (blockerObject && typeof blockerObject.destroy === 'function') {
      this.scene.tweens.add({
        targets: blockerObject,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          blockerObject.destroy()
        }
      })
    }
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

  
  // << THAY THẾ TOÀN BỘ HÀM applyGravityAndRefill BẰNG PHIÊN BẢN CUỐI CÙNG NÀY >>
  // << THAY THẾ TOÀN BỘ HÀM applyGravityAndRefill BẰNG PHIÊN BẢN HOÀN CHỈNH NÀY >>
  // << THAY THẾ TOÀN BỘ HÀM applyGravityAndRefill BẰNG PHIÊN BẢN NÀY >>
  // src/objects/board/BoardState.js

// ... (các hàm khác giữ nguyên) ...

  // << THAY THẾ TOÀN BỘ HÀM applyGravityAndRefill BẰNG PHIÊN BẢN KẾT HỢP NÀY >>
  applyGravityAndRefill() {
    if (this.isShuffling) return; 
    
    const speed = 0.5;      // Tốc độ rơi (pixels per millisecond)
    const waveDelay = 30;   // Delay giữa các cột để tạo hiệu ứng gợn sóng

    // --- BƯỚC 1: TÁI CẤU TRÚC LƯỚI LOGIC (Giữ nguyên logic mới, đã chuẩn) ---
    const newGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    const newBlockerGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    for (let col = 0; col < GRID_SIZE; col++) {
      let writeRow = GRID_SIZE - 1;
      for (let readRow = GRID_SIZE - 1; readRow >= 0; readRow--) {
        if (!this.grid[readRow][col] && !this.blockerGrid[readRow][col]) continue;
        while (writeRow >= 0 && this.levelData.gridLayout[writeRow][col] === null) writeRow--;
        if (writeRow < 0) break;
        const blocker = this.blockerGrid[readRow][col];
        const gem = this.grid[readRow][col];
        if (blocker && blocker.type === 'stone') {
          newBlockerGrid[readRow][col] = blocker;
          if (gem) newGrid[readRow][col] = gem;
          writeRow = readRow - 1;
          continue;
        }
        if (gem) newGrid[writeRow][col] = gem;
        if (blocker) newBlockerGrid[writeRow][col] = blocker;
        writeRow--;
      }
    }
    this.grid = newGrid;
    this.blockerGrid = newBlockerGrid;

    // --- BƯỚC 2: TẠO ANIMATION VỚI LOGIC TỪ CODE CŨ MÀ BẠN THÍCH ---
    let totalTweens = 0;
    let tweensCompleted = 0;

    const onTweenComplete = () => {
        tweensCompleted++;
        if (tweensCompleted === totalTweens) {
            this.checkForNewMatches();
        }
    };

    for (let col = 0; col < GRID_SIZE; col++) {
        let emptyCountInColumn = 0;
        for (let row = GRID_SIZE - 1; row >= 0; row--) {
            const gem = this.grid[row][col];
            const blocker = this.blockerGrid[row][col];
            const endY = this.offsetY + row * this.cellSize + this.cellSize / 2;
            
            // Animate cho gem/blocker cũ cần rơi
            const itemToMove = (gem && gem.sprite.y !== endY) ? gem.sprite : ((blocker && blocker.y !== endY) ? blocker : null);
            if (itemToMove) {
                totalTweens++;
                const distance = Math.abs(endY - itemToMove.y);
                const duration = distance / speed;

                this.scene.tweens.add({
                    targets: itemToMove,
                    y: endY,
                    duration: duration,
                    delay: col * waveDelay,
                    ease: 'Cubic.easeIn',
                    onComplete: onTweenComplete
                });
                itemToMove.setData({ row: row, col: col });
            } 
            // Tạo gem mới cho các ô trống
            else if (!gem && !blocker && this.levelData.gridLayout[row][col] !== null) {
                emptyCountInColumn++;
                const startY = this.offsetY - emptyCountInColumn * this.cellSize;
                const randomGemType = Phaser.Math.RND.pick(this.levelData.availableGems || Object.values(GEM_TYPES));
                
                const newGemSprite = this.createGemAt(row, col, randomGemType, startY);
                newGemSprite.setAlpha(0);
                this.grid[row][col] = { type: 'gem', value: randomGemType, sprite: newGemSprite };

                totalTweens++;
                const distance = Math.abs(endY - startY);
                const duration = distance / speed;

                this.scene.tweens.add({
                    targets: newGemSprite,
                    y: endY,
                    duration: duration,
                    delay: col * waveDelay,
                    ease: 'Cubic.easeIn',
                    onStart: () => newGemSprite.setAlpha(1),
                    onComplete: onTweenComplete
                });
            }
        }
    }

    if (totalTweens === 0) {
        this.checkForNewMatches();
    }
  }

// ... (phần còn lại của file giữ nguyên) ...
    // // << THAY THẾ TOÀN BỘ HÀM applyGravityAndRefill CŨ BẰNG HÀM MỚI NÀY >>
    // applyGravityAndRefill() {
    //   const speed = 0.5; // pixels per millisecond
    //   let totalTweens = 0;
    //   let tweensCompleted = 0;
  
    //   const onTweenComplete = () => {
    //     tweensCompleted++;
    //     if (tweensCompleted === totalTweens) {
    //       this.checkForNewMatches();
    //     }
    //   };
  
    //   // --- BƯỚC 1: TÁI CẤU TRÚC LƯỚI LOGIC ---
    //   // Tạo 2 lưới logic mới để chứa trạng thái sau khi gravity
    //   const newGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    //   const newBlockerGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  
    //   for (let col = 0; col < GRID_SIZE; col++) {
    //     let nextAvailableRow = GRID_SIZE - 1; // Bắt đầu điền từ dưới lên
  
    //     // Quét từ dưới lên trên trong cột hiện tại
    //     for (let row = GRID_SIZE - 1; row >= 0; row--) {
    //       const blocker = this.blockerGrid[row]?.[col];
    //       const gem = this.grid[row]?.[col];
  
    //       // Ưu tiên xử lý blocker trước
    //       if (blocker) {
    //         // Trường hợp 1: Blocker 2 máu -> CHẶN HOÀN TOÀN
    //         if (blocker.type === 'stone' && blocker.health === 2) {
    //           // Đặt blocker vào vị trí cũ của nó trong lưới MỚI
    //           newBlockerGrid[row][col] = blocker;
    //           // Đặt gem (nếu có) vào vị trí cũ của nó trong lưới MỚI
    //           if (gem) newGrid[row][col] = gem;
    //           // Cập nhật lại hàng trống tiếp theo là hàng ngay trên blocker này
    //           nextAvailableRow = row - 1;
    //           continue; // Chuyển sang ô tiếp theo ở trên
    //         }
    //         // Trường hợp 2: Blocker có thể rơi (đá 1 máu, dây leo, etc.)
    //         else {
    //           newBlockerGrid[nextAvailableRow][col] = blocker;
    //           // Quan trọng: Gem "dính" vào blocker này cũng rơi theo
    //           if (gem) newGrid[nextAvailableRow][col] = gem;
    //           nextAvailableRow--; // Hàng trống tiếp theo dịch lên trên
    //         }
    //       } 
    //       // Nếu ô không có blocker nhưng có gem
    //       else if (gem) {
    //         newGrid[nextAvailableRow][col] = gem;
    //         nextAvailableRow--; // Hàng trống tiếp theo dịch lên trên
    //       }
    //     }
    //   }
  
    //   // Cập nhật lưới logic của board bằng lưới mới
    //   this.grid = newGrid;
    //   this.blockerGrid = newBlockerGrid;
  
    //   // --- BƯỚC 2: TẠO ANIMATION DỰA TRÊN LƯỚI LOGIC MỚI ---
    //   for (let col = 0; col < GRID_SIZE; col++) {
    //     let emptyCountInColumn = 0;
    //     for (let row = GRID_SIZE - 1; row >= 0; row--) {
    //       const blocker = this.blockerGrid[row][col];
    //       const gem = this.grid[row][col];
    //       const endY = this.offsetY + row * this.cellSize + this.cellSize / 2;
  
    //       // Animate Blocker rơi (nếu có và cần rơi)
    //       if (blocker && blocker.y !== endY) {
    //         totalTweens++;
    //         this.scene.tweens.add({
    //           targets: blocker,
    //           y: endY,
    //           duration: Math.abs(endY - blocker.y) / speed,
    //           ease: 'Cubic.easeIn',
    //           onComplete: onTweenComplete
    //         });
    //         // Cập nhật data vị trí logic cho blocker
    //         blocker.setData({ row: row, col: col });
    //       }
          
    //       // Animate Gem rơi (nếu có và cần rơi)
    //       if (gem && gem.sprite.y !== endY) {
    //         totalTweens++;
    //         this.scene.tweens.add({
    //           targets: gem.sprite,
    //           y: endY,
    //           duration: Math.abs(endY - gem.sprite.y) / speed,
    //           ease: 'Cubic.easeIn',
    //           onComplete: onTweenComplete
    //         });
    //         // Cập nhật data vị trí logic cho gem
    //         gem.sprite.setData({ row: row, col: col });
    //       }
  
    //       // --- BƯỚC 3: REFILL CÁC Ô TRỐNG ---
    //       // Một ô được coi là trống nếu nó không có CẢ gem VÀ blocker
    //       if (!gem && !blocker) {
    //         emptyCountInColumn++;
    //         const randomGemType = Phaser.Math.RND.pick(this.levelData.availableGems || Object.values(GEM_TYPES));
    //         const startY = this.offsetY - emptyCountInColumn * this.cellSize;
  
    //         const newGemSprite = this.createGemAt(row, col, randomGemType, startY);
    //         newGemSprite.setAlpha(0); // Ẩn đi lúc đầu
  
    //         this.grid[row][col] = { type: 'gem', value: randomGemType, sprite: newGemSprite };
            
    //         totalTweens++;
    //         this.scene.tweens.add({
    //           targets: newGemSprite,
    //           y: endY,
    //           duration: Math.abs(endY - startY) / speed,
    //           ease: 'Cubic.easeIn',
    //           onStart: () => newGemSprite.setAlpha(1), // Hiện ra khi bắt đầu rơi
    //           onComplete: onTweenComplete
    //         });
    //       }
    //     }
    //   }
  
    //   // Nếu không có animation nào được tạo, nghĩa là board đã ổn định
    //   if (totalTweens === 0) {
    //     this.checkForNewMatches();
    //   }
    // }
  
  // applyGravityAndRefill() {
  //   let longestDropDuration = 0;
  //   const speed = 0.5; // Tốc độ rơi (pixels per millisecond). Tăng từ 1.5 lên 2.5 cho nhanh hơn.
  //   const waveDelay = 0; // Giảm delay gợn sóng từ 60ms xuống 30ms.

  //   // --- BƯỚC 1: TÍNH TOÁN VỊ TRÍ MỚI CHO TẤT CẢ GEM (LOGIC GIỮ NGUYÊN) ---
  //   const newGrid = [];
  //   for (let i = 0; i < GRID_SIZE; i++) newGrid.push(Array(GRID_SIZE).fill(null));

  //   for (let col = 0; col < GRID_SIZE; col++) {
  //       let newRow = GRID_SIZE - 1;
  //       for (let row = GRID_SIZE - 1; row >= 0; row--) {
  //           const blocker = this.blockerGrid[row]?.[col];
  //           if (blocker && blocker.type === 'stone' && blocker.health === 2) {
  //               newRow = row - 1;
  //               continue;
  //           }
  //           const gem = this.grid[row][col];
  //           if (gem) {
  //               newGrid[newRow][col] = gem;
  //               newRow--;
  //           }
  //       }
  //   }
  //   this.grid = newGrid;

  //   // --- BƯỚC 2: TẠO ANIMATION RƠI VÀ REFILL ---
  //   let tweensCompleted = 0;
  //   let totalTweens = 0;

  //   const onTweenComplete = () => {
  //       tweensCompleted++;
  //       if (tweensCompleted === totalTweens) {
  //           // KHI TWEEN CUỐI CÙNG HOÀN TẤT, GỌI checkForNewMatches NGAY LẬP TỨC
  //           this.checkForNewMatches();
  //       }
  //   };

  //   for (let col = 0; col < GRID_SIZE; col++) {
  //       let emptyCountInColumn = 0;
  //       for (let row = GRID_SIZE - 1; row >= 0; row--) {
  //           const gem = this.grid[row][col];
  //           const endY = this.offsetY + row * this.cellSize + this.cellSize / 2;
            
  //           if (gem && gem.sprite.y !== endY) {
  //               // Đây là gem "cũ" cần rơi
  //               gem.sprite.setData('row', row);
  //               const distance = Math.abs(endY - gem.sprite.y);
  //               const duration = distance / speed;

  //               totalTweens++;
  //               this.scene.tweens.add({
  //                   targets: gem.sprite,
  //                   y: endY,
  //                   duration: duration,
  //                   delay: col * waveDelay,
  //                   ease: 'Cubic.easeIn',
  //                   onComplete: onTweenComplete
  //               });

  //           } else if (!gem) {
  //               // Đây là ô trống cần refill
  //               const blocker = this.blockerGrid[row]?.[col];
  //               if (blocker && blocker.type === 'stone' && blocker.health === 2) continue;
                
  //               emptyCountInColumn++;
  //               const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES);
  //               const randomGemType = Phaser.Math.RND.pick(availableGems);
                
  //               // Vị trí bắt đầu "ảo" từ trên cao
  //               const startY = this.offsetY - emptyCountInColumn * this.cellSize;
                
  //               const newGemSprite = this.createGemAt(row, col, randomGemType, startY);
  //               // << GIẢI QUYẾT VẤN ĐỀ "GEM TREO LƠ LỬNG" >>
  //               // Đặt gem vô hình ban đầu
  //               newGemSprite.setAlpha(0);

  //               this.grid[row][col] = { type: 'gem', value: randomGemType, sprite: newGemSprite };

  //               const distance = Math.abs(endY - startY);
  //               const duration = distance / speed;

  //               totalTweens++;
  //               this.scene.tweens.add({
  //                   targets: newGemSprite,
  //                   y: endY,
  //                   duration: duration,
  //                   delay: col * waveDelay,
  //                   ease: 'Cubic.easeIn',
  //                   onStart: () => {
  //                       // << CHỈ HIỆN GEM RA KHI NÓ BẮT ĐẦU RƠI >>
  //                       newGemSprite.setAlpha(1);
  //                   },
  //                   onComplete: onTweenComplete
  //               });
  //           }
  //       }
  //   }

  //   // --- BƯỚC 3: XỬ LÝ TRƯỜNG HỢP KHÔNG CÓ GÌ RƠI ---
  //   // Nếu không có animation nào được tạo, có nghĩa là board đã ổn định.
  //   if (totalTweens === 0) {
  //       this.checkForNewMatches();
  //   }
  // }

  checkForNewMatches() {
    const newMatchGroups = this.findAllMatches()
    if (newMatchGroups.length > 0) {
      console.log('Found new matches after refill, processing...')
      this.startActionChain(newMatchGroups, null, null, null)
    } else {
      this.endOfTurn()
    }
  }

  endOfTurn() {
    // Nếu trong lượt không phá rope nào, cho MỖI rope lây lan 1 lần (theo snapshot)
    if (!this.ropeDestroyedThisTurn) {
      const ropesSnapshot = []
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const b = this.blockerGrid[r]?.[c]
          if (b && b.type === 'rope' && b.spread) ropesSnapshot.push(b)
        }
      }
      // Đặt kế hoạch spawn để tránh trùng; cho phép trùng chỉ khi không còn lựa chọn khác
      const plannedSpawns = new Set()
      ropesSnapshot.forEach(rope => {
        rope.spread(this, plannedSpawns)
      })
    }
    // Reset cờ cho lượt tiếp theo và bật input
    this.ropeDestroyedThisTurn = false
    this.boardBusy = false
    this.scene.input.enabled = true
    // Báo cho UI biết board đã rảnh
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('boardBusy', false)
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
        // --- BẮT ĐẦU SỬA TỪ ĐÂY ---
        // COMBO: BOMB + BOMB (Nổ 5x5)
        // LƯU Ý QUAN TRỌNG:
        // Hàm này được gọi SAU KHI swap đã xảy ra.
        // `powerupGem` (quả bom được chọn) lúc này đã nằm ở vị trí của `otherGem`.
        // Do đó, vị trí của `powerupGem` chính là tâm của vụ nổ.
        
        const centerRow = powerupGem.sprite.getData('row')
        const centerCol = powerupGem.sprite.getData('col')
        
        // Lấy tất cả gem trong bán kính 2 (tức là vùng 5x5) từ tâm mới này
        const explosion = this.getGemsInArea(centerRow, centerCol, 2)
        explosion.forEach(gem => resultSet.add(gem))
        // --- KẾT THÚC SỬA Ở ĐÂY ---
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


