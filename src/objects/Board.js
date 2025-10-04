// src/objects/Board.js
import { GEM_TYPES, BLOCKER_TYPES, GRID_SIZE } from '../utils/constants'

export class Board {
  constructor(scene, offsetX, offsetY, cellSize) {
    this.scene = scene
    this.offsetX = offsetX
    this.offsetY = offsetY
    this.cellSize = cellSize
    this.grid = []
    this.gems = []
    this.blockers = []
    this.levelData = null
    this.selectedGem = null
    this.selectionFrame = this.createSelectionFrame()
    this.initGrid()
  }

  initGrid() {
    this.grid = []
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row] = []
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grid[row][col] = null
      }
    }
  }

  createSelectionFrame() {
    // Tạo một đối tượng Graphics để vẽ
    const frame = this.scene.add.graphics()
    
    // Đặt màu và độ dày cho đường viền
    frame.lineStyle(4, 0xFFD700, 1) // Dày 4px, màu VÀNG (Gold), độ trong suốt 100%

    // Vẽ một hình chữ nhật với kích thước bằng một cell
    // Tọa độ (0, 0) lúc này là tương đối với đối tượng graphics
    frame.strokeRect(0, 0, this.cellSize, this.cellSize)
    
    // Đặt độ sâu để nó luôn nằm trên các viên gem
    frame.setDepth(5)
    
    // Ẩn nó đi lúc đầu
    frame.setVisible(false)

    return frame
  }

  createAllCells() {
    // Tạo tất cả cell background trước (lớp dưới cùng)
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = this.offsetX + col * this.cellSize + this.cellSize / 2
        const y = this.offsetY + row * this.cellSize + this.cellSize / 2

        // Tạo cell background
        const cell = this.scene.add.image(x, y, 'cell')
          .setDisplaySize(this.cellSize * 0.95, this.cellSize * 0.95)
          .setDepth(1)

        // Lưu thông tin cell
        cell.setData('row', row)
        cell.setData('col', col)
        cell.setData('isCell', true)
      }
    }
    console.log('Created all cell backgrounds with depth 1')
  }

  loadLevel(levelData) {
    this.levelData = levelData
    console.log('Loading level data:', levelData)
    
    if (!levelData.gridLayout) {
      console.error('Level data missing gridLayout!')
      return
    }

    // Xóa tất cả gem và blocker cũ
    this.clearBoard()

    console.log('Board offset:', this.offsetX, this.offsetY, 'Cell size:', this.cellSize)

    // BƯỚC 1: Tạo tất cả cell background trước
    this.createAllCells()

    // BƯỚC 2: Load grid layout từ JSON và tạo gem/blocker
    for (let row = 0; row < levelData.gridLayout.length; row++) {
      for (let col = 0; col < levelData.gridLayout[row].length; col++) {
        const cellValue = levelData.gridLayout[row][col]
        
        if (cellValue === null) {
          // Ô trống (lỗ hổng) - không tạo gì
          this.grid[row][col] = null
        } else if (cellValue === 0) {
          // Ô sẽ được điền gem ngẫu nhiên
          this.grid[row][col] = { type: 'empty', value: 0 }
        } else if (cellValue >= 1 && cellValue <= 6) {
          // Gem có sẵn (1-6 tương ứng với các loại gem)
          const gemType = this.getGemTypeByNumber(cellValue)
          this.createGem(row, col, gemType)
        } else if (cellValue >= 7) {
          // Blocker (7+ tương ứng với các loại blocker)
          const blockerType = this.getBlockerTypeByNumber(cellValue)
          this.createBlocker(row, col, blockerType)
        }
      }
    }

    // BƯỚC 3: Điền gem ngẫu nhiên vào các ô trống
    this.fillEmptyCells()
    
    console.log('Board loaded successfully, total gems:', this.gems.length)
  }

  getGemTypeByNumber(number) {
    const gemTypes = Object.values(GEM_TYPES)
    return gemTypes[(number - 1) % gemTypes.length]
  }

  getBlockerTypeByNumber(number) {
    const blockerTypes = Object.values(BLOCKER_TYPES)
    return blockerTypes[(number - 7) % blockerTypes.length]
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
    const gem = this.scene.add.image(x, y, gemTextureKey)
      .setDisplaySize(this.cellSize * 0.8, this.cellSize * 0.8)
      .setInteractive()
      .setDepth(2)

    gem.setData({ row, col, type: gemType, isGem: true })

    // --- SỬA LỖI CLOSURE Ở ĐÂY ---
    // Thay vì dùng biến `row`, `col` từ closure, chúng ta sẽ lấy dữ liệu
    // trực tiếp từ chính đối tượng `gem` khi nó được click.
    gem.on('pointerdown', () => {
      // Lấy row và col "sống" từ data của sprite tại thời điểm click
      const currentRow = gem.getData('row')
      const currentCol = gem.getData('col')
      
      // Gọi handleGemClick với vị trí chính xác
      this.handleGemClick(currentRow, currentCol)
    })

    this.gems.push(gem)
    return gem
  }

  createBlocker(row, col, blockerType) {
    const x = this.offsetX + col * this.cellSize + this.cellSize / 2
    const y = this.offsetY + row * this.cellSize + this.cellSize / 2

    // Tạo blocker sprite (tạm thời dùng hình chữ nhật)
    const blocker = this.scene.add.rectangle(x, y, this.cellSize * 0.8, this.cellSize * 0.8, this.getBlockerColor(blockerType))
      .setInteractive()
      .setStrokeStyle(2, 0x8B4513)
      .setDepth(2) // Nằm trên cell (depth 1), ngang hàng với gem

    // Lưu thông tin blocker
    blocker.setData('row', row)
    blocker.setData('col', col)
    blocker.setData('type', blockerType)
    blocker.setData('isBlocker', true)

    // Thêm sự kiện click
    blocker.on('pointerdown', () => {
      this.handleBlockerClick(row, col, blockerType)
    })

    this.grid[row][col] = { type: 'blocker', value: blockerType, sprite: blocker }
    this.blockers.push(blocker)

    return blocker
  }

  fillEmptyCells() {
    const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES)
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.grid[row][col] && this.grid[row][col].type === 'empty') {
          // Chọn gem ngẫu nhiên từ danh sách available
          const randomGemType = availableGems[Math.floor(Math.random() * availableGems.length)]
          this.createGem(row, col, randomGemType)
        }
      }
    }
  }

  getGemColor(gemType) {
    const colors = {
      [GEM_TYPES.RED]: 0xff0000,
      [GEM_TYPES.GREEN]: 0x00ff00,
      [GEM_TYPES.BLUE]: 0x0000ff,
      [GEM_TYPES.PURPLE]: 0x800080,
      [GEM_TYPES.YELLOW]: 0xffff00,
      [GEM_TYPES.ORANGE]: 0xffa500
    }
    return colors[gemType] || 0xcccccc
  }

  getBlockerColor(blockerType) {
    const colors = {
      [BLOCKER_TYPES.STONE]: 0x696969,
      [BLOCKER_TYPES.VINE]: 0x228B22
    }
    return colors[blockerType] || 0x8B4513
  }

  // --- LOGIC GAMEPLAY CHÍNH ---

  // THÊM HÀM isPowerup CHO TIỆN LỢI
  isPowerup(gemObject) {
    if (!gemObject) return false
    const value = gemObject.value
    return value === GEM_TYPES.BOMB || value === GEM_TYPES.COLOR_BOMB
  }

  handleGemClick(row, col) {
    // Không cho phép click khi bàn cờ đang xử lý
    if (!this.scene.input.enabled) return

    const clickedGemObject = this.grid[row][col]

    if (!clickedGemObject || clickedGemObject.type !== 'gem') {
      if (this.selectedGem) {
        this.selectionFrame.setVisible(false)
        this.selectedGem = null
      }
      return
    }

    // --- THAY ĐỔI SỐ 1: LOGIC BỎ CHỌN ---
    if (this.selectedGem === clickedGemObject) {
      // Nếu click lại vào chính gem đang được chọn -> Bỏ chọn
      this.selectionFrame.setVisible(false)
      this.selectedGem = null
      console.log('Deselected gem.')
      return // Dừng lại, không làm gì thêm
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
        console.log('Gems are neighbors, swapping...')
        this.swapGems(this.selectedGem, clickedGemObject, false) // false = not a swap back
      } else {
        console.log('Gems are not neighbors, selecting new gem')
        this.selectedGem = clickedGemObject
        const gemSprite = clickedGemObject.sprite
        this.selectionFrame.setPosition(
          gemSprite.x - this.cellSize / 2, 
          gemSprite.y - this.cellSize / 2
        )
        this.selectionFrame.setVisible(true)
      }
    }

    // Phát sự kiện gem được chọn
    this.scene.events.emit('gemSelected', {
      row, col, type: clickedGemObject.value
    })
  }

  areNeighbors(gem1, gem2) {
    const row1 = gem1.sprite.getData('row')
    const col1 = gem1.sprite.getData('col')
    const row2 = gem2.sprite.getData('row')
    const col2 = gem2.sprite.getData('col')
    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1
  }

  swapGems(gem1, gem2) { // Bỏ tham số isSwapBack
    this.scene.input.enabled = false
    this.selectedGem = null
    this.selectionFrame.setVisible(false)

    const gem1Sprite = gem1.sprite
    const gem2Sprite = gem2.sprite
    
    const gem1InitialX = gem1Sprite.x
    const gem1InitialY = gem1Sprite.y
    
    // Luôn thực hiện hiệu ứng swap
    this.scene.tweens.add({ targets: gem1Sprite, x: gem2Sprite.x, y: gem2Sprite.y, duration: 300, ease: 'Power2' })
    this.scene.tweens.add({
      targets: gem2Sprite,
      x: gem1InitialX,
      y: gem1InitialY,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        // Sau khi hiệu ứng hoàn tất, cập nhật logic và quyết định
        this.updateGridAfterSwap(gem1, gem2)
        this.decideActionAfterSwap(gem1, gem2)
      }
    })
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

  decideActionAfterSwap(gem1, gem2) {
    let powerupToActivate = null
    let otherGem = null

    if (this.isPowerup(gem1)) {
      powerupToActivate = gem1
      otherGem = gem2
    } else if (this.isPowerup(gem2)) {
      powerupToActivate = gem2
      otherGem = gem1
    } else {
      // Cả 2 đều là gem thường, otherGem là gem được swap vào (gem2)
      otherGem = gem2
    }

    const matchGroups = this.findAllMatches()

    // NẾU KHÔNG CÓ BẤT CỨ ĐIỀU GÌ XẢY RA
    if (matchGroups.length === 0 && !powerupToActivate) {
      this.swapBack(gem1, gem2)
      return
    }

    // TỪ ĐÂY, CHẮC CHẮN SẼ CÓ HÀNH ĐỘNG XẢY RA
    // Bắt đầu một chuỗi xử lý
    this.startActionChain(matchGroups, powerupToActivate, otherGem)
  }

  // THÊM HÀM MỚI NÀY VÀO TRƯỚC HÀM processMatchGroups
  startActionChain(initialMatchGroups, powerupToActivate, otherGem) {
    let allGemsToRemove = new Set()
    let powerupsToCreate = [] // Đổi tên từ createdPowerups để dễ hiểu

    // --- BƯỚC 1: XỬ LÝ MATCH BAN ĐẦU (NẾU CÓ) ---
    if (initialMatchGroups.length > 0) {
      // Xác định vị trí swap để ưu tiên tạo power-up tại đó
      // Luôn ưu tiên tạo power-up tại vị trí otherGem (gem được swap vào)
      let swapPosition = null
      if (otherGem) {
        swapPosition = { 
          row: otherGem.sprite.getData('row'), 
          col: otherGem.sprite.getData('col') 
        }
      }
      
      const { gemsRemoved, powerupsCreated } = this.processMatchGroups(initialMatchGroups, swapPosition)
      
      gemsRemoved.forEach(gem => allGemsToRemove.add(gem))
      powerupsToCreate = powerupsCreated; // Lưu lại thông tin các power-up sẽ được tạo
    }
    
    // --- BƯỚC 2: KÍCH HOẠT POWER-UP ĐÃ SWAP (NẾU CÓ) ---
    if (powerupToActivate) {
      const explosionSet = this.getPowerupActivationSet(powerupToActivate, otherGem)
      explosionSet.forEach(gem => allGemsToRemove.add(gem))
    }

    // --- BƯỚC 3: THỰC HIỆN XÓA VÀ REFILL THEO TRÌNH TỰ ĐÚNG ---
    if (allGemsToRemove.size > 0) {
      // Cho tất cả các gem trong danh sách xóa lắc lư
      this.addWiggleEffect(Array.from(allGemsToRemove), () => {
        // SAU KHI LẮC XONG:
        
        // 1. BIẾN HÌNH: Biến những viên gem cần thiết thành Power-up.
        //    Những viên gem này sẽ không bị xóa.
        this.createPowerupsAfterWiggle(powerupsToCreate);

        // 2. BIẾN MẤT: Lọc ra danh sách những gem thực sự cần xóa
        //    (loại trừ những viên vừa biến thành power-up).
        const powerupPositions = new Set(powerupsToCreate.map(p => `${p.row},${p.col}`));
        const finalGemsToRemove = new Set();
        allGemsToRemove.forEach(gem => {
            const gemPos = `${gem.sprite.getData('row')},${gem.sprite.getData('col')}`;
            // Chỉ thêm vào danh sách xóa nếu vị trí của nó KHÔNG phải là nơi tạo power-up
            if (!powerupPositions.has(gemPos)) {
                finalGemsToRemove.add(gem);
            }
        });
        
        // Xóa những viên gem đã được lọc
        this.removeGemSprites(finalGemsToRemove);
        
        // 3. REFILL: Chờ một chút rồi mới bắt đầu rơi và lấp đầy
        this.scene.time.delayedCall(300, () => {
          this.applyGravityAndRefill();
        });
      });
    } else if (powerupsToCreate.length > 0) {
        // Trường hợp đặc biệt: chỉ tạo power-up mà không xóa gì thêm (hiếm gặp)
        this.createPowerupsAfterWiggle(powerupsToCreate);
        this.applyGravityAndRefill();
    } else {
        // Không có gì xảy ra, mở lại input
        this.scene.input.enabled = true;
    }
  }

  swapBack(gem1, gem2) {
    // Đây là một phiên bản đơn giản của swapGems, không có logic phức tạp
    this.scene.input.enabled = false
    const gem1Sprite = gem1.sprite
    const gem2Sprite = gem2.sprite
    const gem1InitialX = gem1Sprite.x
    const gem1InitialY = gem1Sprite.y

    this.scene.tweens.add({ targets: gem1Sprite, x: gem2Sprite.x, y: gem2Sprite.y, duration: 300, ease: 'Power2' })
    this.scene.tweens.add({
      targets: gem2Sprite,
      x: gem1InitialX,
      y: gem1InitialY,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.updateGridAfterSwap(gem1, gem2) // Cập nhật logic lại lần nữa
        this.scene.input.enabled = true
      }
    })
  }

  findAllMatches() {
    let horizontalMatches = []
    let verticalMatches = []

    // --- BƯỚC 1: TÌM TẤT CẢ CÁC ĐƯỜNG MATCH RIÊNG LẺ ---

    // Quét ngang để tìm các đường thẳng
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; ) {
        const gem = this.grid[row][col]
        // --- THÊM ĐIỀU KIỆN KIỂM TRA POWER-UP Ở ĐÂY ---
        const isPowerUp = gem && (gem.value === GEM_TYPES.BOMB || gem.value === GEM_TYPES.COLOR_BOMB)
        if (gem && gem.type === 'gem' && !isPowerUp) {
          let match = [gem]
          for (let i = col + 1; i < GRID_SIZE; i++) {
            const nextGem = this.grid[row][i]
            if (nextGem && nextGem.type === 'gem' && nextGem.value === gem.value) {
              match.push(nextGem)
            } else {
              break
            }
          }
          if (match.length >= 3) {
            horizontalMatches.push(match)
          }
          col += match.length
        } else {
          col++
        }
      }
    }

    // Quét dọc để tìm các đường thẳng
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; ) {
        const gem = this.grid[row][col]
        // --- THÊM ĐIỀU KIỆN KIỂM TRA POWER-UP Ở ĐÂY ---
        const isPowerUp = gem && (gem.value === GEM_TYPES.BOMB || gem.value === GEM_TYPES.COLOR_BOMB)
        if (gem && gem.type === 'gem' && !isPowerUp) {
          let match = [gem]
          for (let i = row + 1; i < GRID_SIZE; i++) {
            const nextGem = this.grid[i][col]
            if (nextGem && nextGem.type === 'gem' && nextGem.value === gem.value) {
              match.push(nextGem)
            } else {
              break
            }
          }
          if (match.length >= 3) {
            verticalMatches.push(match)
          }
          row += match.length
        } else {
          row++
        }
      }
    }

    // --- BƯỚC 2: HỢP NHẤT CÁC ĐƯỜNG GIAO NHAU THÀNH CỤM ---

    const allMatches = horizontalMatches.concat(verticalMatches)
    const mergedMatches = []
    
    while (allMatches.length > 0) {
      // Lấy ra match đầu tiên làm "hạt nhân"
      let currentGroup = new Set(allMatches.shift())
      let merged = true
      
      while (merged) {
        merged = false
        for (let i = allMatches.length - 1; i >= 0; i--) {
          const otherMatch = allMatches[i]
          // Kiểm tra xem otherMatch có chung gem nào với currentGroup không
          const hasIntersection = otherMatch.some(gem => currentGroup.has(gem))
          
          if (hasIntersection) {
            // Nếu có, hợp nhất otherMatch vào currentGroup
            otherMatch.forEach(gem => currentGroup.add(gem))
            // Xóa otherMatch khỏi danh sách cần kiểm tra
            allMatches.splice(i, 1)
            merged = true
          }
        }
      }
      // Chuyển Set về lại Array và thêm vào kết quả cuối cùng
      mergedMatches.push(Array.from(currentGroup))
    }
    
    console.log(`Found ${mergedMatches.length} match groups:`, mergedMatches.map(match => match.length))
    
    // `mergedMatches` bây giờ là một mảng các "cụm" match.
    // Ví dụ: [[gem1, gem2, gem3], [gemA, gemB, gemC, gemD, gemE]]
    // trong đó cụm thứ 2 có thể là một hình chữ T 5 viên.
    return mergedMatches
  }
  
  processMatchGroups(matchGroups, swapPosition = null) {
    const gemsToRemove = new Set()
    const powerupsToCreate = []

    // XỬ LÝ TỪNG CỤM MATCH MỘT
    matchGroups.forEach(group => {
      let powerupCreationPos = null

      // Ưu tiên vị trí swap nếu có
      if (swapPosition) {
        const posInGroup = group.some(gem => 
          gem.sprite.getData('row') === swapPosition.row && 
          gem.sprite.getData('col') === swapPosition.col
        )
        if (posInGroup) {
          powerupCreationPos = swapPosition
        }
      }
      
      // Nếu không có vị trí swap (trường hợp combo), chọn vị trí giữa
      if (!powerupCreationPos && group.length >= 4) {
        const middleGem = group[Math.floor(group.length / 2)]
        powerupCreationPos = {
          row: middleGem.sprite.getData('row'),
          col: middleGem.sprite.getData('col')
        }
      }

      // Quyết định loại power-up cho cụm này
      if (powerupCreationPos) {
        if (group.length === 4) {
          powerupsToCreate.push({ type: GEM_TYPES.BOMB, ...powerupCreationPos })
        } else if (group.length >= 5) {
          // Logic phức tạp hơn: đường thẳng 5 hay chữ T/L 5?
          // Tạm thời vẫn coi tất cả match 5+ là Color Bomb
          powerupsToCreate.push({ type: GEM_TYPES.COLOR_BOMB, ...powerupCreationPos })
        }
      }

      // Thêm tất cả gem trong cụm này vào danh sách xóa
      group.forEach(gem => gemsToRemove.add(gem))
    })

    console.log(`Processing ${matchGroups.length} match groups, creating ${powerupsToCreate.length} power-ups`)

    // KHÔNG tạo power-up ngay ở đây, chỉ trả về thông tin
    return { gemsRemoved: gemsToRemove, powerupsCreated: powerupsToCreate }
  }


  // HÀM MỚI: Biến đổi một gem thường thành Power-up
  transformIntoPowerup(gemObject, powerupType) {
    gemObject.type = 'gem'
    gemObject.value = powerupType
    gemObject.sprite.setTexture(`gem_${powerupType}`)
    gemObject.sprite.setData('type', powerupType); // Cập nhật cả data type của sprite
    console.log(`Transformed gem into ${powerupType} power-up`)
  }

  // HÀM MỚI: Tách logic xóa sprite ra riêng
  removeGemSprites(gemsToRemove) {
    gemsToRemove.forEach(gemObject => {
      if (gemObject && gemObject.sprite) {
        const row = gemObject.sprite.getData('row')
        const col = gemObject.sprite.getData('col')
        
        // Chỉ xóa nếu gem trên grid đúng là gem này
        // (để tránh lỗi xóa nhầm gem mới rơi vào)
        if(this.grid[row][col] === gemObject) {
            this.grid[row][col] = null;
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

  // --- THÊM CÁC HÀM KÍCH HOẠT POWER-UP MỚI ---
  getGemsInArea(centerRow, centerCol, radius) {
    const gemsInArea = []
    for (let r = centerRow - radius; r <= centerRow + radius; r++) {
      for (let c = centerCol - radius; c <= centerCol + radius; c++) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          const gem = this.grid[r][c]
          if (gem) {
            gemsInArea.push(gem)
          }
        }
      }
    }
    return gemsInArea
  }

  activatePowerupCombo(powerup1, powerup2) {
    const type1 = powerup1.value
    const type2 = powerup2.value
    const allGemsToExplode = new Set([powerup1, powerup2])

    // COMBO: BOMB + BOMB
    if (type1 === GEM_TYPES.BOMB && type2 === GEM_TYPES.BOMB) {
      console.log("COMBO: Bomb + Bomb! Activating a larger explosion.")
      // Kích hoạt một vụ nổ lớn hơn (ví dụ 5x5) tại vị trí của quả bom 1
      const explosion1 = this.getGemsInArea(powerup1.sprite.getData('row'), powerup1.sprite.getData('col'), 2)
      explosion1.forEach(gem => allGemsToExplode.add(gem))
    }
    // COMBO: COLOR BOMB + COLOR BOMB
    else if (type1 === GEM_TYPES.COLOR_BOMB && type2 === GEM_TYPES.COLOR_BOMB) {
      console.log("COMBO: Color Bomb + Color Bomb! Clearing the board.")
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.grid[r][c] && this.grid[r][c].type === 'gem') {
            allGemsToExplode.add(this.grid[r][c])
          }
        }
      }
    }
    // COMBO: BOMB + COLOR BOMB
    else {
      console.log("COMBO: Color Bomb + Bomb! Activating multiple bombs.")
      const colorBomb = (type1 === GEM_TYPES.COLOR_BOMB) ? powerup1 : powerup2
      const bomb = (colorBomb === powerup1) ? powerup2 : powerup1
      
      // Chọn màu của quả bom (nếu có) hoặc một màu ngẫu nhiên
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
    this.scene.input.enabled = false
    const powerupType = powerupGem.value
    const otherType = otherGem.value

    // --- LOGIC MỚI BẮT ĐẦU TỪ ĐÂY ---

    // Xử lý các combo liên quan đến Color Bomb trước
    if (powerupType === GEM_TYPES.COLOR_BOMB || otherType === GEM_TYPES.COLOR_BOMB) {
      const colorBomb = (powerupType === GEM_TYPES.COLOR_BOMB) ? powerupGem : otherGem
      const other = (colorBomb === powerupGem) ? otherGem : powerupGem
      this.activateColorBomb(colorBomb, other)
      return
    }
    
    // Xử lý combo BOMB + BOMB
    if (powerupType === GEM_TYPES.BOMB && otherType === GEM_TYPES.BOMB) {
      const allGemsToExplode = new Set()
      
      console.log("COMBO: Bomb + Bomb! Activating both.")
      
      this.activateBomb(powerupGem, allGemsToExplode)
      this.activateBomb(otherGem, allGemsToExplode)
      
      this.removeGemSprites(allGemsToExplode)
      this.scene.time.delayedCall(300, () => this.applyGravityAndRefill())
    }
    // Xử lý BOMB + GEM THƯỜNG
    else if (powerupType === GEM_TYPES.BOMB) {
      const allGemsToExplode = new Set()
      this.activateBomb(powerupGem, allGemsToExplode)
      
      this.removeGemSprites(allGemsToExplode)
      this.scene.time.delayedCall(300, () => this.applyGravityAndRefill())
    }
  }

  activateBomb(bombObject, alreadyExploded = new Set()) {
    // Ngăn việc một quả bom bị kích hoạt nhiều lần trong cùng một chuỗi
    if (alreadyExploded.has(bombObject)) {
      return
    }
    alreadyExploded.add(bombObject)
    
    const bombRow = bombObject.sprite.getData('row')
    const bombCol = bombObject.sprite.getData('col')
    
    // Lấy các gem trong vùng 3x3
    const gemsInExplosion = this.getGemsInArea(bombRow, bombCol, 1)
    
    // Tìm các quả bom khác trong vùng nổ để kích hoạt dây chuyền
    const chainReactionBombs = gemsInExplosion.filter(gem => 
      gem.value === GEM_TYPES.BOMB && !alreadyExploded.has(gem)
    )

    // Kích hoạt đệ quy các quả bom khác trước
    chainReactionBombs.forEach(nextBomb => {
      // Truyền `alreadyExploded` vào để tránh vòng lặp vô tận
      this.activateBomb(nextBomb, alreadyExploded)
    })

    // Thêm TẤT CẢ các gem trong vụ nổ này vào Set
    gemsInExplosion.forEach(gem => alreadyExploded.add(gem))
  }

  activateColorBomb(colorBombObject, swappedObject) {
    this.scene.input.enabled = false
    const gemsToRemove = new Set()
    const swappedObjectType = swappedObject.value // Loại của đối tượng được swap

    // --- LOGIC MỚI BẮT ĐẦU TỪ ĐÂY ---

    // TRƯỜNG HỢP 1: COLOR BOMB + COLOR BOMB
    if (swappedObjectType === GEM_TYPES.COLOR_BOMB) {
      console.log("COMBO: Color Bomb + Color Bomb! Clearing the board.")

      // Thêm tất cả gem trên bàn cờ vào danh sách xóa
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.grid[r][c] && this.grid[r][c].type === 'gem') {
            gemsToRemove.add(this.grid[r][c])
          }
        }
      }
      
      // TODO: Thêm hiệu ứng nổ toàn màn hình
    } 
    
    // TRƯỜNG HỢP 2: COLOR BOMB + BOMB
    else if (swappedObjectType === GEM_TYPES.BOMB) {
      console.log("COMBO: Color Bomb + Bomb! Activating multiple bombs.")
      
      const allGemsToExplode = new Set()
      
      // Thêm color bomb và quả bom ban đầu vào danh sách xóa
      allGemsToExplode.add(colorBombObject)
      allGemsToExplode.add(swappedObject)

      const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES).filter(t => ![GEM_TYPES.BOMB, GEM_TYPES.COLOR_BOMB].includes(t))
      const targetColor = Phaser.Math.RND.pick(availableGems)
      console.log(`...targeting color: ${targetColor}`)
      
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
      
      // Kích hoạt tất cả các quả bom mới, gom tất cả vào một Set
      bombsToActivate.forEach(bomb => {
        this.activateBomb(bomb, allGemsToExplode)
      })

      // --- THÊM HIỆU ỨNG LÚC LẮC CHO TRƯỜNG HỢP 2 ---
      this.addWiggleEffect(Array.from(allGemsToExplode), () => {
        this.removeGemSprites(allGemsToExplode)
        this.scene.time.delayedCall(300, () => {
          this.applyGravityAndRefill()
        })
      })
      return // Dừng lại, không chạy code dưới
    } 
    
    // TRƯỜNG HỢP 3: COLOR BOMB + GEM THƯỜNG (Logic cũ)
    else {
      console.log(`Color Bomb activated, removing all ${swappedObjectType} gems`)
      const targetColor = swappedObjectType

      gemsToRemove.add(colorBombObject)
      // gemsToRemove.add(swappedObject) // Gem được swap cũng bị xóa

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const gem = this.grid[r][c]
          // Xóa cả gem được swap
          if (gem && gem.type === 'gem' && (gem.value === targetColor || gem === swappedObject)) {
            gemsToRemove.add(gem)
          }
        }
      }

      // TODO: Thêm hiệu ứng sét lan tỏa
    }
    
    // --- THÊM HIỆU ỨNG LÚC LẮC Ở ĐÂY ---
    // (Áp dụng cho cả 3 trường hợp)
    this.addWiggleEffect(Array.from(gemsToRemove), () => {
      // Xóa các gem và bắt đầu chu trình refill
      this.removeGemSprites(gemsToRemove)
      this.scene.time.delayedCall(300, () => {
        this.applyGravityAndRefill()
      })
    })
  }

  // HÀM TẠO POWER-UP SAU KHI LẮC XONG
  // Hàm này sẽ biến đổi gem có sẵn thành power-up
  createPowerupsAfterWiggle(powerupsToCreate) {
    powerupsToCreate.forEach(powerup => {
      const gemAtPowerupPos = this.grid[powerup.row][powerup.col];
      if (gemAtPowerupPos && gemAtPowerupPos.type === 'gem') {
        this.transformIntoPowerup(gemAtPowerupPos, powerup.type);
        console.log(`Created ${powerup.type} power-up at ${powerup.row},${powerup.col}`);
      }
    });
  }

  // THÊM HÀM MỚI NÀY
  getPowerupActivationSet(powerupGem, otherGem) {
    const resultSet = new Set()

    // Xử lý combo 2 power-up
    if (this.isPowerup(otherGem)) {
      resultSet.add(powerupGem)
      resultSet.add(otherGem)
      
      const type1 = powerupGem.value
      const type2 = otherGem.value
      
      if (type1 === GEM_TYPES.COLOR_BOMB && type2 === GEM_TYPES.COLOR_BOMB) {
        // Clear board
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (this.grid[r][c]) resultSet.add(this.grid[r][c])
          }
        }
      } else if (type1 === GEM_TYPES.BOMB && type2 === GEM_TYPES.BOMB) {
        // Bomb + Bomb: Vụ nổ lớn hơn
        const explosion1 = this.getGemsInArea(powerupGem.sprite.getData('row'), powerupGem.sprite.getData('col'), 2)
        explosion1.forEach(gem => resultSet.add(gem))
      } else {
        // Bomb + Color Bomb hoặc Color Bomb + Bomb
        const colorBomb = (type1 === GEM_TYPES.COLOR_BOMB) ? powerupGem : otherGem
        const bomb = (colorBomb === powerupGem) ? otherGem : powerupGem
        
        // Tạo vụ nổ hình chữ thập 3x3 lấy tâm là Color Bomb
        const colorBombRow = colorBomb.sprite.getData('row')
        const colorBombCol = colorBomb.sprite.getData('col')
        
        // Thêm 3 hàng ngang (tâm và 2 bên)
        for (let c = Math.max(0, colorBombCol - 1); c <= Math.min(GRID_SIZE - 1, colorBombCol + 1); c++) {
          for (let r = 0; r < GRID_SIZE; r++) {
            const gem = this.grid[r][c]
            if (gem && gem.type === 'gem') {
              resultSet.add(gem)
            }
          }
        }
        
        // Thêm 3 hàng dọc (tâm và 2 bên)
        for (let r = Math.max(0, colorBombRow - 1); r <= Math.min(GRID_SIZE - 1, colorBombRow + 1); r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const gem = this.grid[r][c]
            if (gem && gem.type === 'gem') {
              resultSet.add(gem)
            }
          }
        }
        
        // Thêm chính 2 power-up
        resultSet.add(colorBomb)
        resultSet.add(bomb)
      }
    }
    // Xử lý power-up đơn lẻ
    else {
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
                if (gem && gem.type === 'gem' && gem.value === targetColor) {
                  resultSet.add(gem)
                }
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

  // --- HÀM HỖ TRỢ: HIỆU ỨNG LÚC LẮC ---
  
  addWiggleEffect(gemsToRemoveArray, onComplete) {
    const regularGems = gemsToRemoveArray.filter(gemObject => {
      if (!gemObject || !gemObject.value) return false
      return true; // Lắc cả power-up nếu nó bị nổ
    });

    if (regularGems.length === 0) {
        onComplete();
        return;
    }

    let completedTweens = 0;
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
            completedTweens++;
            if(completedTweens === regularGems.length) {
                // Đặt lại góc của tất cả gem về 0
                regularGems.forEach(g => g.sprite.setAngle(0));
                onComplete();
            }
          }
        })
      } else {
          completedTweens++;
      }
    })
    
    // Fallback in case no tweens run
    if (regularGems.length > 0 && completedTweens === regularGems.length) {
       onComplete();
    }
  }

  // --- BỘ NÃO MỚI: GRAVITY & REFILL ---

  applyGravityAndRefill() {
    let fallingGemsCount = 0
    let longestDropDuration = 0

    // 1. GRAVITY: Cho gem rơi xuống
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
          const duration = 200 + emptySlots * 50;
          if (duration > longestDropDuration) longestDropDuration = duration;
          this.scene.tweens.add({
            targets: gemObject.sprite,
            y: this.offsetY + newRow * this.cellSize + this.cellSize / 2,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
              fallingGemsCount--
            }
          })
        }
      }
    }

    // 2. REFILL: Tạo gem mới ở các ô trống trên cùng
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyCount = 0;
      for (let row = 0; row < GRID_SIZE; row++) {
        if (this.grid[row][col] === null) {
          emptyCount++;
          const availableGems = this.levelData.availableGems || Object.values(GEM_TYPES)
          const randomGemType = Phaser.Math.RND.pick(availableGems)
          
          const startY = this.offsetY - emptyCount * this.cellSize;
          const endY = this.offsetY + row * this.cellSize + this.cellSize / 2

          const newGem = this.createGemAt(row, col, randomGemType, startY)
          
          this.grid[row][col] = { type: 'gem', value: randomGemType, sprite: newGem }

          fallingGemsCount++
          const duration = 300 + row * 60;
          if (duration > longestDropDuration) longestDropDuration = duration;

          this.scene.tweens.add({
            targets: newGem,
            y: endY,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
              fallingGemsCount--
            }
          })
        }
      }
    }
    
    if (fallingGemsCount === 0) {
      this.checkForNewMatches()
    } else {
        this.scene.time.delayedCall(longestDropDuration, () => {
            this.checkForNewMatches();
        });
    }
  }

  checkForNewMatches() {
    const newMatchGroups = this.findAllMatches() // Hàm này trả về các cụm đã hợp nhất
    
    if (newMatchGroups.length > 0) {
      // Có match mới! Sử dụng logic mới với startActionChain
      console.log("Found new matches after refill, processing...")
      this.startActionChain(newMatchGroups, null, null)
    } else {
      // Không có match mới, kết thúc lượt, mở lại input
      this.scene.input.enabled = true
    }
  }

  handleBlockerClick(row, col, blockerType) {
    console.log(`Blocker clicked: ${blockerType} at ${row},${col}`)
    
    // Phát sự kiện blocker được chọn
    this.scene.events.emit('blockerSelected', {
      row, col, type: blockerType
    })

    // TODO: Thêm logic phá blocker
  }

  clearBoard() {
    // Xóa tất cả gem
    this.gems.forEach(gem => {
      if (gem && gem.destroy) {
        gem.destroy()
      }
    })
    this.gems = []

    // Xóa tất cả blocker
    this.blockers.forEach(blocker => {
      if (blocker && blocker.destroy) {
        blocker.destroy()
      }
    })
    this.blockers = []

    // Xóa tất cả cell backgrounds
    this.scene.children.list.forEach(child => {
      if (child.getData && child.getData('isCell')) {
        child.destroy()
      }
    })

    // Ẩn khung chọn và reset selection
    this.selectionFrame.setVisible(false)
    this.selectedGem = null

    // Reset grid
    this.initGrid()
  }

  // Hàm xử lý input từ GameScene
  handleInput(inputData) {
    console.log('Board received input:', inputData)
    
    switch (inputData.type) {
      case 'gem_click':
        this.handleGemClick(inputData.row, inputData.col)
        break
      case 'blocker_click':
        this.handleBlockerClick(inputData.row, inputData.col, inputData.blockerType)
        break
      default:
        console.warn('Unknown input type:', inputData.type)
    }
  }
}