// src/objects/board/BoardState.js
import { GEM_TYPES, GRID_SIZE } from '../../utils/constants'

export class BoardState {
  initGrid() {
    this.grid = []
    this.blockerGrid = []
    this.isGravityEffectRunning = false // Cờ chặn auto match khi gravity effect đang chạy
    this.objectives = {}; // << THÊM: Biến theo dõi nhiệm vụ
    // Theo dõi bổ sung
    this.powerupActivations = {}; // { bomb: n, stripe: n, color_bomb: n }
    this.blockerCounts = {}; // { stone: n, rope: n, ... }
    this.levelWon = false; // Cờ thắng để tránh emit nhiều lần
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

  // << THÊM HÀM MỚI: Khởi tạo bộ theo dõi nhiệm vụ >>
  initializeObjectives(levelObjectives) {
    this.objectives = {};
    if (!levelObjectives) return;

    levelObjectives.forEach(obj => {
      const key = `${obj.target}_${obj.type}`;
      this.objectives[key] = { ...obj, remaining: obj.count };
    });
    console.log('Objectives initialized:', this.objectives);

    // Cập nhật đếm blocker hiện có trên bảng ngay khi khởi tạo mục tiêu
    this.recalculateBlockerCounts();
  }

  // << THÊM HÀM MỚI: Cập nhật tiến trình và phát sự kiện >>
  updateObjectiveProgress(target, type, count = 1) {
    const key = `${target}_${type}`;
    if (this.objectives[key] && this.objectives[key].remaining > 0) {
      this.objectives[key].remaining -= count;
      
      // Đảm bảo không bị số âm
      if (this.objectives[key].remaining < 0) {
        this.objectives[key].remaining = 0;
      }

      console.log(`Objective updated: ${key}, remaining: ${this.objectives[key].remaining}`);
      
      // Phát sự kiện toàn cục để UIScene lắng nghe
      this.scene.game.events.emit('objectiveUpdated', {
        key: key,
        remaining: this.objectives[key].remaining
      });
      // Không emit thắng tại đây; sẽ kiểm tra ở cuối lượt (endOfTurn)
    }
  }

  // Xác định xem tất cả mục tiêu đã hoàn thành chưa
  areAllObjectivesCompleted() {
    if (!this.objectives) return false;
    return Object.values(this.objectives).every(obj => (obj?.remaining ?? 0) <= 0);
  }

  // Tính lại số lượng blocker trên toàn bảng và phát sự kiện cập nhật
  recalculateBlockerCounts() {
    const counts = {};
    for (let r = 0; r < this.blockerGrid.length; r++) {
      for (let c = 0; c < this.blockerGrid[r].length; c++) {
        const b = this.blockerGrid[r][c];
        if (b && b.type) {
          counts[b.type] = (counts[b.type] || 0) + 1;
        }
      }
    }
    this.blockerCounts = counts;
    Object.keys(counts).forEach(type => {
      if (this.scene && this.scene.game && this.scene.game.events) {
        this.scene.game.events.emit('blockerCountUpdated', { type, remaining: counts[type] });
      }
    });
  }

  // Ghi nhận một lần kích hoạt power-up và phát sự kiện theo dõi
  trackPowerupActivation(powerupType) {
    if (!powerupType) return;
    const map = {
      [GEM_TYPES.BOMB]: 'bomb',
      [GEM_TYPES.STRIPE]: 'stripe',
      [GEM_TYPES.COLOR_BOMB]: 'color_bomb'
    };
    const key = map[powerupType] || String(powerupType).toLowerCase();
    this.powerupActivations[key] = (this.powerupActivations[key] || 0) + 1;
    // Cập nhật mục tiêu powerup (nếu level có yêu cầu)
    this.updateObjectiveProgress('powerup', key, 1);
    if (this.scene && this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('powerupActivated', { type: key, count: this.powerupActivations[key] });
    }
  }

  createGem(row, col, gemType) {
    const gemSprite = this.createGemAt(row, col, gemType)
    this.grid[row][col] = { type: 'gem', value: gemType, sprite: gemSprite }
  }

  createGemAt(row, col, gemType, startY) {
    const x = this.offsetX + col * this.cellSize + this.cellSize / 2
    const y = startY !== undefined ? startY : this.offsetY + row * this.cellSize + this.cellSize / 2
    console.log(`Creating gem ${gemType} at row:${row}, col:${col}, x:${x}, y:${y}`)
    const gemTextureKey = `gem_${gemType}`
    
    const gem = this.gemLayer.add(
      this.scene.make.image({ x, y, key: gemTextureKey, add: false })
    )
    gem.setDisplaySize(this.cellSize * 0.8, this.cellSize * 0.82)
      .setInteractive()
      .setDepth(2)
    gem.setData({ row, col, type: gemType, isGem: true })
    gem.on('pointerdown', () => {
      const currentRow = gem.getData('row')
      const currentCol = gem.getData('col')
      this.handleGemClick(currentRow, currentCol)
    })
    this.gems.push(gem)
    return gem
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
    const activatedThisAction = []

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
      // Tính tổng gem bị phá theo màu trong hành động này
      const gemCounts = {}
      allGemsToRemove.forEach(gem => {
        if (gem && gem.value) {
          gemCounts[gem.value] = (gemCounts[gem.value] || 0) + 1
        }
      })

      this.removeGemSprites(allGemsToRemove)
      this.createPowerupsAfterWiggle(powerupsToCreate)

      // Phát tóm tắt trước khi gravity chạy
      if (this.scene && this.scene.game && this.scene.game.events) {
        this.scene.game.events.emit('matchSummary', {
          gemCounts,
          blockerCounts: this.blockerCounts || {},
          powerups: activatedThisAction.map(t => t)
        })
      }

      this.scene.time.delayedCall(150, () => { this.applyGravityAndRefill() })
    }

    // --- BẮT ĐẦU SỬA TỪ KHỐI LOGIC KIỂM TRA POWER-UP ---
    if (powerupToActivate) {
      // Ghi nhận kích hoạt power-up
      this.trackPowerupActivation(powerupToActivate.value)
      activatedThisAction.push(powerupToActivate.value)
      if (this.isPowerup(otherGem)) {
        this.trackPowerupActivation(otherGem.value)
        activatedThisAction.push(otherGem.value)
      }
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
            } else if (powerupToActivate.value === GEM_TYPES.STRIPE) {
                this.powerupVFXManager.playStripeEffect(powerupToActivate, allGemsToRemove, onVFXComplete)
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
        // Kiểm tra xem có phải L/T-shape không (đã tìm thấy intersection ở ƯU TIÊN 2)
        const isLTshape = group.length >= 4 && (() => {
          for (const gem of group) {
            const row = gem.sprite.getData('row');
            const col = gem.sprite.getData('col');
            const hasHorizontalNeighbor = group.find(g => g.sprite.getData('row') === row && Math.abs(g.sprite.getData('col') - col) === 1);
            const hasVerticalNeighbor = group.find(g => Math.abs(g.sprite.getData('row') - row) === 1 && g.sprite.getData('col') === col);
            if (hasHorizontalNeighbor && hasVerticalNeighbor) return true;
          }
          return false;
        })();
        
        if (isLTshape) {
          powerupsToCreate.push({ type: GEM_TYPES.BOMB, ...powerupCreationPos });
        } else if (group.length === 4) {
          powerupsToCreate.push({ type: GEM_TYPES.STRIPE, ...powerupCreationPos });
        } else if (group.length >= 5) {
          powerupsToCreate.push({ type: GEM_TYPES.COLOR_BOMB, ...powerupCreationPos });
        }
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
    let blockerDestroyedThisPass = false;
    gemsAndAdjacentCells.forEach(coord => {
      const [r, c] = coord.split(',').map(Number);
      const blocker = this.blockerGrid?.[r]?.[c];
      if (blocker) {
        const destroyed = blocker.takeDamage();
        if (destroyed) {
          // Cập nhật mục tiêu và số lượng blocker còn lại
          if (blocker.type) {
            this.updateObjectiveProgress('blocker', blocker.type);
          }
          this.blockerGrid[r][c] = null;
          blockerDestroyedThisPass = true;
          if (blocker.type === 'rope') this.ropeDestroyedThisTurn = true;
        }
      }
    });
    // Sau khi xử lý xong tất cả blocker, mới tính lại 1 lần để tránh spam sự kiện
    if (blockerDestroyedThisPass) {
      this.recalculateBlockerCounts();
    }

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
        // << LOGIC MỚI: Cập nhật nhiệm vụ gem >>
        this.updateObjectiveProgress('gem', gemObject.value);
        
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
      // << LOGIC MỚI: Cập nhật nhiệm vụ blocker >>
      if (blockerObject.type) {
        this.updateObjectiveProgress('blocker', blockerObject.type);
      }
      
      this.scene.tweens.add({
        targets: blockerObject,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          blockerObject.destroy()
          // Cập nhật lại bộ đếm blocker sau khi hủy
          this.recalculateBlockerCounts()
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

  
// applyGravityAndRefill() {
//     const speed = 0.5;
//     let totalTweens = 0;
//     let tweensCompleted = 0;

//     const onTweenComplete = () => {
//         tweensCompleted++;
//         if (tweensCompleted === totalTweens) {
//             this.checkForNewMatches();
//         }
//     };

//     // BƯỚC 1: TÁI CẤU TRÚC LƯỚI LOGIC (ĐÃ SỬA LỖI GEM CHỒNG GEM)
//     const newGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
//     const newBlockerGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

//     for (let col = 0; col < GRID_SIZE; col++) {
//         let writeRow = GRID_SIZE - 1;
//         for (let readRow = GRID_SIZE - 1; readRow >= 0; readRow--) {
//             // Bỏ qua các ô không thể chứa item (lỗ hổng)
//             if (this.levelData.gridLayout[readRow][col] === null) continue;

//             const blocker = this.blockerGrid[readRow][col];
//             const gem = this.grid[readRow][col];

//             // Nếu ô đang đọc không có gì thì bỏ qua
//             if (!blocker && !gem) continue;
            
//             // Tìm vị trí ghi hợp lệ tiếp theo, bỏ qua các lỗ hổng
//             while (writeRow >= 0 && this.levelData.gridLayout[writeRow][col] === null) {
//                 writeRow--;
//             }
//             if (writeRow < 0) break;
            
//             // === LOGIC XỬ LÝ BLOCKER TĨNH (QUAN TRỌNG NHẤT) ===
//             if (blocker && (blocker.type === 'stone' || blocker.type === 'rope')) {
//                 // Blocker tĩnh luôn được đặt vào vị trí CŨ của nó trong lưới mới
//                 newBlockerGrid[readRow][col] = blocker;

//                 // Nếu có gem bị kẹt dưới blocker, gem đó cũng đứng yên
//                 if (gem) {
//                     newGrid[readRow][col] = gem;
//                 }
                
//                 // Cập nhật writeRow để các gem bên trên không rơi đè lên ô này.
//                 // Điều này áp dụng cho cả stone và rope KHI CÓ GEM BÊN DƯỚI.
//                 // Nếu rope rỗng thì gem trên vẫn có thể rơi vào.
//                 if (blocker.type === 'stone' || (blocker.type === 'rope' && gem)) {
//                     writeRow = readRow - 1;
//                 }
//                 continue; // Chuyển sang ô đọc tiếp theo
//             }
//             // =======================================================
            
//             // Nếu chỉ có gem (không có blocker tĩnh), cho nó rơi xuống
//             if (gem) {
//                 newGrid[writeRow][col] = gem;
//                 writeRow--;
//             }
//         }
//     }
    
//     this.grid = newGrid;
//     this.blockerGrid = newBlockerGrid;

//     // BƯỚC 2 & 3: TẠO ANIMATION VỚI HIỆU ỨNG "CỘT GIẢ NỐI LIỀN"
//     for (let col = 0; col < GRID_SIZE; col++) {
//       let fallInfos = [];
//       let refillCount = 0;

//       // --- PASS 1: Thu thập thông tin gem cũ và đếm số ô cần refill ---
//       for (let row = GRID_SIZE - 1; row >= 0; row--) {
//           if (this.levelData.gridLayout[row][col] === null) continue;

//           const gem = this.grid[row][col];
//           const endY = this.offsetY + row * this.cellSize + this.cellSize / 2;

//           if (gem) {
//               // Nếu là gem cũ cần rơi
//               if (gem.sprite.y !== endY) {
//                   fallInfos.push({
//                       target: gem.sprite,
//                       startY: gem.sprite.y,
//                       endY: endY,
//                       isNew: false,
//                       newRow: row
//                   });
//               }
//           } else {
//               // Nếu là ô trống, tăng biến đếm
//               const blocker = this.blockerGrid[row][col];
//               if (!blocker || blocker.type !== 'stone') {
//                   refillCount++;
//               }
//           }
//       }
      
//       // --- PASS 2: Tạo gem mới cho "cột giả" và thêm vào danh sách rơi ---
//       let lastRefillY = (this.offsetY - 0.5 * this.cellSize); // Vị trí Y bắt đầu của gem mới cao nhất
//       for (let i = 0; i < refillCount; i++) {
//           const newRow = refillCount - 1 - i;
//           if(this.grid[newRow][col]) continue; // An toàn: nếu ô đã có gem thì bỏ qua

//           const startY = lastRefillY - (i + 1) * this.cellSize;
//           const endY = this.offsetY + newRow * this.cellSize + this.cellSize / 2;

//           const randomGemType = Phaser.Math.RND.pick(this.levelData.availableGems || Object.values(GEM_TYPES));
//           const newGemSprite = this.createGemAt(newRow, col, randomGemType, startY);
//           newGemSprite.setAlpha(0); // Ẩn đi lúc đầu
          
//           this.grid[newRow][col] = { type: 'gem', value: randomGemType, sprite: newGemSprite };

//           fallInfos.push({
//               target: newGemSprite,
//               startY: startY,
//               endY: endY,
//               isNew: true
//           });
//       }
      
//       // --- PASS 3: Tính toán và tạo Tweens ---
//       if (fallInfos.length > 0) {
//           let maxDuration = 0;

//           // Tính duration lớn nhất cho cả cột
//           fallInfos.forEach(info => {
//               const distance = Math.abs(info.endY - info.startY);
//               const duration = distance / speed;
//               if (duration > maxDuration) {
//                   maxDuration = duration;
//               }
//           });

//           totalTweens += fallInfos.length;

//           // Tạo tween cho tất cả item trong cột với cùng duration
//           fallInfos.forEach(info => {
//               const tweenConfig = {
//                   targets: info.target,
//                   y: info.endY,
//                   duration: maxDuration,
//                   ease: 'Cubic.easeIn',
//                   onComplete: onTweenComplete
//               };

//               if (info.isNew) {
//                   tweenConfig.onStart = () => info.target.setAlpha(1);
//               } else {
//                   // Cập nhật data cho gem cũ
//                   info.target.setData('row', info.newRow);
//               }

//               this.scene.tweens.add(tweenConfig);
//           });
//       }
//   }

//   if (totalTweens === 0) {
//       this.checkForNewMatches();
//   }
// }
applyGravityAndRefill() {
  // BƯỚC 1: TÁI CẤU TRÚC LƯỚI LOGIC (ĐÃ SỬA LỖI GEM CHỒNG GEM)
  const newGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const newBlockerGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

  for (let col = 0; col < GRID_SIZE; col++) {
      let writeRow = GRID_SIZE - 1;
      for (let readRow = GRID_SIZE - 1; readRow >= 0; readRow--) {
          // Bỏ qua các ô không thể chứa item (lỗ hổng)
          if (this.levelData.gridLayout[readRow][col] === null) continue;   

          const blocker = this.blockerGrid[readRow][col];
          const gem = this.grid[readRow][col];

          // Nếu ô đang đọc không có gì thì bỏ qua
          if (!blocker && !gem) continue;
          
          // Tìm vị trí ghi hợp lệ tiếp theo, bỏ qua các lỗ hổng
          while (writeRow >= 0 && this.levelData.gridLayout[writeRow][col] === null) {
              writeRow--;
          }
          if (writeRow < 0) break;
          
          // === LOGIC XỬ LÝ BLOCKER TĨNH ===
          if (blocker && blocker.type === 'stone') {
              // Stone luôn đứng yên ở vị trí cũ
              newBlockerGrid[readRow][col] = blocker;

              // Nếu có gem bị kẹt dưới stone, gem đó cũng đứng yên
              if (gem) {
                  newGrid[readRow][col] = gem;
              }
              
              // Cập nhật writeRow để gem bên trên không rơi đè lên stone
              writeRow = readRow - 1;
              continue;
          }
          
          // === LOGIC XỬ LÝ ROPE (KHÔNG CHẶN GEM) ===
          if (blocker && blocker.type === 'rope') {
              // Rope giữ nguyên vị trí để lây lan
              newBlockerGrid[readRow][col] = blocker;
              
              // Nếu có gem, gem vẫn rơi xuống bình thường (rope không chặn)
              if (gem) {
                  newGrid[writeRow][col] = gem;
                  writeRow--;
              }
              continue;
          }
          // =======================================================
          
          // Nếu chỉ có gem (không có blocker), cho nó rơi xuống
          if (gem && !blocker) {
              newGrid[writeRow][col] = gem;
              writeRow--;
          }
      }
  }
  
  this.grid = newGrid;
  this.blockerGrid = newBlockerGrid;

  // BƯỚC 2: TẠO GEM MỚI CHO CÁC Ô TRỐNG (THEO CỘT GIẢ)
    const isBlockedFromRefill = (row, col) => {
        for (let r = row - 1; r >= 0; r--) {
            if (this.levelData.gridLayout[r][col] === null) continue;
            const blocker = this.blockerGrid[r][col];
            const gem = this.grid[r][col];
          if (blocker && blocker.type === 'stone') return true;
          if (gem) return false;
      }
        return false;
    };

  // Tạo gem mới theo từng cột để tạo "cột giả" nối đuôi nhau
  for (let col = 0; col < GRID_SIZE; col++) {
      // Thu thập tất cả các ô trống cần refill trong cột này
      const emptySlots = [];
      for (let row = 0; row < GRID_SIZE; row++) {
        if (this.levelData.gridLayout[row][col] === null) continue;

        const gem = this.grid[row][col];
        const blocker = this.blockerGrid[row][col];
          
          if (!gem && (!blocker || blocker.type !== 'stone') && !isBlockedFromRefill(row, col)) {
              emptySlots.push(row);
          }
      }
      
      // Tạo gem cho các ô trống, đặt chúng nối đuôi nhau phía trên
      emptySlots.forEach((row, index) => {
          const randomGemType = Phaser.Math.RND.pick(this.levelData.availableGems || Object.values(GEM_TYPES));
          const targetY = this.offsetY + row * this.cellSize + this.cellSize / 2;
          const targetX = this.offsetX + col * this.cellSize + this.cellSize / 2;
          
          // Đặt gem ở vị trí "cột giả" phía trên - càng nhiều gem thì càng cao
          // Gem đầu tiên ở offsetY - 1*cellSize, gem thứ 2 ở offsetY - 2*cellSize, ...
          const startY = this.offsetY - (emptySlots.length - index) * this.cellSize + this.cellSize / 2;
          
          const newGemSprite = this.createGemAt(row, col, randomGemType, startY);
          newGemSprite.x = targetX;
          newGemSprite.y = startY; // Đặt tại vị trí cột giả
          
          // Lưu vị trí đích vào data
          newGemSprite.setData('targetX', targetX);
          newGemSprite.setData('targetY', targetY);
          
          this.grid[row][col] = { type: 'gem', value: randomGemType, sprite: newGemSprite };
      });
  }

  // BƯỚC 3: CẬP NHẬT DATA CHO TẤT CẢ GEM (bao gồm cả gem mới và gem cũ)
  for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
          const gem = this.grid[row][col];
          if (gem && gem.sprite) {
              const targetY = this.offsetY + row * this.cellSize + this.cellSize / 2;
              const targetX = this.offsetX + col * this.cellSize + this.cellSize / 2;
              
              // Cập nhật data của sprite (vị trí logic mới)
              gem.sprite.setData({ row, col, type: gem.value, isGem: true });
              
              // Chỉ set target nếu chưa có (tránh ghi đè gem mới từ BƯỚC 2)
              if (gem.sprite.getData('targetX') === undefined) {
                  gem.sprite.setData('targetX', targetX);
              }
              if (gem.sprite.getData('targetY') === undefined) {
                  gem.sprite.setData('targetY', targetY);
              }
          }
      }
  }

  // BƯỚC 4: CHẠY HIỆU ỨNG RƠI GIẢ
  this.playFakeGravityEffect(() => {
      this.checkForNewMatches();
  });
}


  /**
   * Lưu vị trí hiện tại của tất cả các gem trước khi apply gravity
   */
  captureCurrentPositions() {
    const positions = []
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const gem = this.grid[row][col]
        if (gem && gem.sprite) {
          positions.push({
            row,
            col,
            x: gem.sprite.x,
            y: gem.sprite.y,
            gemType: gem.value
          })
        }
      }
    }
    return positions
  }

  /**
   * Hiển thị lại các gem thật sau khi animation giả kết thúc
   * và đặt chúng vào đúng vị trí cuối cùng
   */
  revealRealGems() {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const gem = this.grid[row][col]
        if (gem && gem.sprite) {
          // Đặt sprite vào vị trí cuối cùng (nếu có targetX/Y)
          const targetX = gem.sprite.getData('targetX')
          const targetY = gem.sprite.getData('targetY')
          if (targetX !== undefined) {
            gem.sprite.x = targetX
          }
          if (targetY !== undefined) {
            gem.sprite.y = targetY
          }
          
          // Hiển thị sprite (quan trọng: hiển thị TẤT CẢ gem, kể cả gem không bị ẩn)
          gem.sprite.setVisible(true)
          
          // Xóa data targetX/Y sau khi sử dụng xong
          gem.sprite.setData('targetX', undefined)
          gem.sprite.setData('targetY', undefined)
        }
      }
    }
  }

  /**
   * Tạo mask riêng cho layer fake gem
   * CHỈ che khu vực board thật (gridLayout !== null)
   * Vùng phía trên (cột giả) KHÔNG có trong mask -> gem ở đó bị che
   */
  createFakeGravityMask() {
    const maskGraphics = this.scene.make.graphics()
    maskGraphics.fillStyle(0xffffff)
    
    // CHỈ vẽ mask cho khu vực board thật (không bao gồm vùng phía trên)
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // Chỉ vẽ các ô không null trong gridLayout
        if (this.levelData.gridLayout[row][col] !== null) {
          const x = this.offsetX + col * this.cellSize
          const y = this.offsetY + row * this.cellSize
          maskGraphics.fillRect(x, y, this.cellSize, this.cellSize)
        }
      }
    }
    
    const mask = maskGraphics.createGeometryMask()
    return { mask, graphics: maskGraphics }
  }

  /**
   * DEBUG: Tạo vùng che visual để quan sát mask đang hoạt động
   * Gọi hàm này để xem vùng nào được mask cover
   */
  showDebugMaskOverlay() {
    // Xóa overlay cũ nếu có
    if (this.debugMaskOverlay) {
      this.debugMaskOverlay.destroy()
    }

    // Tạo graphics mới với depth cao nhất
    const debugGraphics = this.scene.add.graphics().setDepth(999)
    
    // BƯỚC 1: Vẽ vùng ĐỎ = Vùng gem BỊ CHE (toàn bộ màn hình)
    debugGraphics.fillStyle(0xff0000, 0.3) // Đỏ, 30% opacity
    const { width, height } = this.scene.scale
    debugGraphics.fillRect(0, 0, width, height)
    
    // BƯỚC 2: Vẽ vùng XANH = Vùng gem HIỂN THỊ (CHỈ gridLayout !== null)
    debugGraphics.fillStyle(0x00ff00, 0.3) // Xanh lá, 30% opacity
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // Chỉ vẽ các ô không null trong gridLayout
        if (this.levelData.gridLayout[row][col] !== null) {
          const x = this.offsetX + col * this.cellSize
          const y = this.offsetY + row * this.cellSize
          debugGraphics.fillRect(x, y, this.cellSize, this.cellSize)
        }
      }
    }
    
    this.debugMaskOverlay = debugGraphics
    
    console.log('🎭 DEBUG MASK OVERLAY:')
    console.log('   🟢 XANH = Vùng gem HIỂN THỊ (bên trong mask - CHỈ gridLayout hợp lệ)')
    console.log('   🔴 ĐỎ = Vùng gem BỊ CHE (ngoài mask - bao gồm cả vùng phía trên board)')
  }

  /**
   * DEBUG: Xóa overlay debug
   */
  hideDebugMaskOverlay() {
    if (this.debugMaskOverlay) {
      this.debugMaskOverlay.destroy()
      this.debugMaskOverlay = null
      console.log('🎭 Debug mask overlay đã tắt')
    }
  }

  /**
   * Tạo hiệu ứng rơi "giả" mô phỏng code cũ trong khi logic thực chạy code mới
   * Tạo mask riêng để che các phần ngoài board và ô null
   * @param {function} onComplete - Callback khi animation kết thúc
   */
  playFakeGravityEffect(onComplete) {
    // Đánh dấu đang chạy gravity effect (chặn auto match)
    this.isGravityEffectRunning = true
    
    const speed = 0.5
    let totalTweens = 0
    let tweensCompleted = 0

    const onTweenComplete = () => {
      tweensCompleted++
      if (tweensCompleted === totalTweens) {
        // Delay nhỏ trước khi hiển thị gem thật (tránh chớp)
        this.scene.time.delayedCall(50, () => {
          // Destroy tất cả clone sprite
          fakeGems.forEach(clone => {
            if (clone && clone.active) {
              clone.destroy()
            }
          })
          
          // Destroy mask graphics
          if (fakeMaskGraphics) {
            fakeMaskGraphics.destroy()
          }
          
          // Hiển thị lại các gem thật ở vị trí mới
          this.revealRealGems()
          
          // Delay trước khi auto match (như shuffle)
          this.scene.time.delayedCall(200, () => {
            // Mở khóa gravity effect
            this.isGravityEffectRunning = false
            
            // Callback để tiếp tục auto match
            if (onComplete) onComplete()
          })
        })
      }
    }

    const fakeGems = []
    
    // Tạo mask riêng cho fake layer
    const maskData = this.createFakeGravityMask()
    const fakeMask = maskData.mask
    const fakeMaskGraphics = maskData.graphics

    // BƯỚC 1: Clone tất cả gem, áp dụng mask riêng, và ẩn gem thật (CHỈ 1 LẦN)
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // KIỂM TRA: Chỉ xử lý gem ở ô HỢP LỆ (không null trong gridLayout)
        if (this.levelData.gridLayout[row][col] === null) continue
        
        const gem = this.grid[row][col]
        if (gem && gem.sprite && gem.sprite.active) {
          const targetY = gem.sprite.getData('targetY')
          
          // Chỉ tạo clone cho gem cần rơi (vị trí hiện tại khác vị trí đích)
          if (targetY !== undefined && Math.abs(gem.sprite.y - targetY) > 1) {
            // Tạo clone sprite với depth cao và ÁP DỤNG MASK RIÊNG
            const clone = this.scene.add.sprite(
              gem.sprite.x,
              gem.sprite.y,
              gem.sprite.texture.key
            )
              .setScale(gem.sprite.scale)
              .setDepth(21) // Depth rất cao để hiển thị trên cả
              .setMask(fakeMask) // ÁP DỤNG MASK RIÊNG CHO FAKE LAYER
            
            clone.setData('startY', gem.sprite.y)
            clone.setData('endY', targetY)
            clone.setData('col', col)
            clone.setData('row', row) // Lưu thêm row để check sau
            fakeGems.push(clone)

            // Ẩn gem thật CHỈ 1 LẦN
            gem.sprite.setVisible(false)
          }
        }
      }
    }

    // BƯỚC 2: Tạo animation cho từng cột với duration đồng bộ
    for (let col = 0; col < GRID_SIZE; col++) {
      const fakeGemsInCol = fakeGems.filter(fg => fg.getData('col') === col)
      
      if (fakeGemsInCol.length > 0) {
        let maxDuration = 0

          // Tính duration lớn nhất cho cả cột
        fakeGemsInCol.forEach(fakeGem => {
          const distance = Math.abs(fakeGem.getData('endY') - fakeGem.getData('startY'))
          const duration = distance / speed
              if (duration > maxDuration) {
            maxDuration = duration
          }
        })

        totalTweens += fakeGemsInCol.length

        // Tạo animation cho tất cả gem trong cột với cùng duration
        fakeGemsInCol.forEach(fakeGem => {
          this.scene.tweens.add({
            targets: fakeGem,
            y: fakeGem.getData('endY'),
                  duration: maxDuration,
                  ease: 'Cubic.easeIn',
            onComplete: () => {
              // KHÔNG destroy ở đây vì container sẽ destroy tất cả sau
              onTweenComplete()
            }
          })
        })
      }
    }

    // Nếu không có animation nào, vẫn cần delay để tránh auto match quá nhanh
  if (totalTweens === 0) {
      this.scene.time.delayedCall(50, () => {
        // Destroy tất cả clone sprite (nếu có)
        fakeGems.forEach(clone => {
          if (clone && clone.active) {
            clone.destroy()
          }
        })
        
        // Destroy mask graphics
        if (fakeMaskGraphics) {
          fakeMaskGraphics.destroy()
        }
        
        this.revealRealGems()
        
        // Delay trước khi auto match (như shuffle)
        this.scene.time.delayedCall(200, () => {
          // Mở khóa gravity effect
          this.isGravityEffectRunning = false
          
          // Callback để tiếp tục auto match
          if (onComplete) onComplete()
        })
      })
    }
  }

  checkForNewMatches() {
    // Chặn auto match nếu gravity effect đang chạy
    if (this.isGravityEffectRunning) {
      console.log('Gravity effect is running, skipping auto match')
      return
    }
    
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
    // Sau khi hiệu ứng và refill hoàn tất, kiểm tra và emit thắng nếu đủ điều kiện
    this.maybeEmitLevelCompleted()
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
        case GEM_TYPES.STRIPE: {
          // Stripe xóa toàn bộ hàng hoặc cột
          const stripeRow = powerupGem.sprite.getData('row')
          const stripeCol = powerupGem.sprite.getData('col')
          
          // Xác định hướng stripe dựa trên vị trí của otherGem (nếu có)
          let isHorizontal = true
          if (otherGem) {
            const otherRow = otherGem.sprite.getData('row')
            const otherCol = otherGem.sprite.getData('col')
            isHorizontal = (otherRow === stripeRow)
          }
          
          if (isHorizontal) {
            // Xóa toàn bộ hàng
            for (let c = 0; c < GRID_SIZE; c++) {
              const gem = this.grid[stripeRow][c]
              if (gem && gem.type === 'gem') { resultSet.add(gem) }
            }
          } else {
            // Xóa toàn bộ cột
            for (let r = 0; r < GRID_SIZE; r++) {
              const gem = this.grid[r][stripeCol]
              if (gem && gem.type === 'gem') { resultSet.add(gem) }
            }
          }
          break
        }
      }
    }
    return resultSet
  }

  // Chỉ emit levelCompleted sau khi lượt đã kết thúc và chưa emit trước đó
  maybeEmitLevelCompleted() {
    if (this.levelWon) return;
    if (this.isGravityEffectRunning) return;
    if (this.areAllObjectivesCompleted()) {
      this.levelWon = true;
      if (this.scene && this.scene.game && this.scene.game.events) {
        this.scene.game.events.emit('levelCompleted');
      }
    }
  }
}

