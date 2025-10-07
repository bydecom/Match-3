import Phaser from 'phaser'
import { Board } from '../objects/Board'
import { SCENE_KEYS, BOOSTER_TYPES } from '../utils/constants'
import { BoosterVFXManager } from '../objects/vfx/BoosterVFXManager'
import { PowerupVFXManager } from '../objects/vfx/PowerupVFXManager'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.board = null
    this.levelData = null
    this.activeBooster = null
    this.firstSwapGem = null
    this.boosterVFXManager = null
    this.isPointerDown = false
    this.lastHoveredCell = { row: -1, col: -1 }
  }

  create(data) {
    const { width, height } = this.scale

    // Debug: Kiểm tra xem ảnh có được load không
    console.log('GameScene create - Kiểm tra cache:')
    console.log('map1_background:', this.textures.exists('map1_background'))
    console.log('playground1_background:', this.textures.exists('playground1_background'))
    console.log('playground1_border:', this.textures.exists('playground1_border'))
    console.log('cell:', this.textures.exists('cell'))
    console.log('gem_red:', this.textures.exists('gem_red'))
    console.log('gem_green:', this.textures.exists('gem_green'))
    console.log('gem_blue:', this.textures.exists('gem_blue'))
    console.log('gem_purple:', this.textures.exists('gem_purple'))
    console.log('gem_yellow:', this.textures.exists('gem_yellow'))
    console.log('gem_orange:', this.textures.exists('gem_orange'))

    // Hiển thị background map1
    this.add.image(width / 2, height / 2, 'map1_background')
      .setDisplaySize(width, height)
      .setDepth(0) // Lớp nền xa nhất

    // Tạo khung chơi ở giữa màn hình
    const playgroundSize = Math.min(width, height) * 0.9 // 90% kích thước màn hình
    const playgroundX = width / 2
    const playgroundY = height / 2 + height / 8 - height/48  // Di chuyển xuống 1/4 chiều dài map

    // Hiển thị nền khung chơi (playground1_background)
    if (this.textures.exists('playground1_background')) {
      const playgroundBackground = this.add.image(playgroundX, playgroundY, 'playground1_background')
        .setDisplaySize(playgroundSize, playgroundSize)
        .setDepth(0); // << GÁN DEPTH = 0
      console.log('Đã tạo playgroundBackground thành công')
    } else {
      console.error('Không tìm thấy playground1_background texture!')
    }

    // Hiển thị viền khung chơi (playground1_border)
    if (this.textures.exists('playground1_border')) {
      const playgroundBorder = this.add.image(playgroundX, playgroundY, 'playground1_border')
        .setDisplaySize(playgroundSize, playgroundSize)
        .setDepth(3); // << GÁN DEPTH = 3 (Nằm trên gem và cell)
      console.log('Đã tạo playgroundBorder thành công')
    } else {
      console.error('Không tìm thấy playground1_border texture!')
    }

    // Tạo Board và load level (Board sẽ tự tạo cell backgrounds)
    this.createBoard(playgroundX, playgroundY, playgroundSize)
    // Khởi tạo VFX manager cho booster
    this.boosterVFXManager = new BoosterVFXManager(this, this.board)
    // Khởi chạy UIScene overlay
    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene')

    // Sự kiện booster từ UIScene
    this.game.events.on('boosterSelected', this.onBoosterSelected, this)
    this.game.events.on('boosterActivated', this.onBoosterActivated, this)
    // Bật hệ thống pointer để hỗ trợ VFX và booster
    this.input.off('gameobjectdown', this.onBoardClick, this)
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    // Lưới an toàn khi board bận: xóa preview ngay
    this.game.events.on('boardBusy', (isBusy) => {
      if (isBusy && this.boosterVFXManager) {
        this.boosterVFXManager.clearPreview()
      }
    }, this)

    // Lắng nghe sự kiện hủy chọn từ UIScene
    this.game.events.on('boosterSelectionCleared', () => {
      // Khi UI báo hủy, GameScene cũng phải hủy theo
      this.clearActiveBooster()
    }, this)

    // Thêm nút quay lại MapScene (tạm thời)
    const backButton = this.add.rectangle(100, 50, 120, 40, 0xe74c3c)
      .setInteractive()
      .setStrokeStyle(2, 0xc0392b)
      .setDepth(10) // Đảm bảo nút bấm luôn ở trên cùng

    this.add.text(100, 50, 'Quay lại', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5)
      .setDepth(11) // Text nằm trên nút bấm

    backButton.on('pointerdown', () => {
      if (this.scene.isActive('UIScene')) this.scene.stop('UIScene')
      this.scene.start('MapScene')
    })

    // Hiệu ứng hover cho nút quay lại
    backButton.on('pointerover', () => {
      backButton.setFillStyle(0xec7063)
    })

    backButton.on('pointerout', () => {
      backButton.setFillStyle(0xe74c3c)
    })
  }

  createGameGrid(centerX, centerY, playgroundSize) {
    const gridSize = 9 // 9x9 grid
    const cellSize = playgroundSize * 0.93 / gridSize // 80% của khung chơi chia cho 9
    const gridOffsetX = centerX - (cellSize * gridSize) / 2
    const gridOffsetY = centerY - (cellSize * gridSize) / 2

    // Tạo lưới 9x9
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cellX = gridOffsetX + col * cellSize + cellSize / 2
        const cellY = gridOffsetY + row * cellSize + cellSize / 2

        // Tạo cell background bằng ảnh cell.png
        const cell = this.add.image(cellX, cellY, 'cell')
          .setDisplaySize(cellSize*0.95, cellSize*0.95)

        // Thêm số thứ tự cell (để debug)
        this.add.text(cellX, cellY, `${row},${col}`, {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#666666'
        }).setOrigin(0.5)

        // Lưu thông tin cell để sử dụng sau này
        cell.setData('row', row)
        cell.setData('col', col)
        cell.setData('cellX', cellX)
        cell.setData('cellY', cellY)
        cell.setData('cellSize', cellSize)
      }
    }

    console.log(`Đã tạo lưới 9x9 với ${gridSize * gridSize} cells`)
  }

  createBoard(centerX, centerY, playgroundSize) {
    const gridSize = 9
    const cellSize = playgroundSize * 0.93 / gridSize
    const boardOffsetX = centerX - (cellSize * gridSize) / 2
    const boardOffsetY = centerY - (cellSize * gridSize) / 2
    
    // === PHẦN SỬA LỖI BẮT ĐẦU TỪ ĐÂY ===

    // 1. TẠO MỘT LAYER ĐỂ CHỨA TẤT CẢ CÁC GEM
    // Layer này sẽ hoạt động như một container riêng
    this.gemLayer = this.add.layer()

    // === PHẦN SỬA LỖI NẰM Ở ĐÂY ===
    // 2. GÁN DEPTH CHO LAYER ĐỂ KIỂM SOÁT THỨ TỰ RENDER
    // Layer này sẽ nằm trên các cell (depth 1) và dưới border (depth 3)
    this.gemLayer.setDepth(2)
    // ===============================

    // 3. TÍNH TOÁN KÍCH THƯỚC VÀ TẠO MẶT NẠ (giống như trước)
    const boardWidth = gridSize * cellSize
    const boardHeight = gridSize * cellSize
    const maskShape = this.make.graphics()
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(boardOffsetX, boardOffsetY, boardWidth, boardHeight)
    const mask = maskShape.createGeometryMask()

    // 3. ÁP DỤNG MẶT NẠ CHỈ CHO LAYER GEM
    this.gemLayer.setMask(mask)
    
    // 4. XÓA BỎ LỆNH GỌI setMask CHO CAMERA
    // this.cameras.main.setMask(mask) // << XÓA HOẶC CHÚ THÍCH DÒNG NÀY

    // === KẾT THÚC PHẦN SỬA LỖI ===

    // Tạo PowerupVFXManager và Board
    this.powerupVFXManager = new PowerupVFXManager(this)
    // Truyền layer vào cho Board để nó biết nơi cần thêm gem vào
    this.board = new Board(this, boardOffsetX, boardOffsetY, cellSize, this.powerupVFXManager, this.gemLayer)
    
    // Load level data
    this.loadLevelData()
    
    // Lắng nghe sự kiện từ Board
    this.setupBoardEvents()
  }

  loadLevelData() {
    // Load level data từ cache (đã load trong PreloaderScene)
    const selectedLevelId = this.scene.settings?.data?.levelId || 1
    this.levelData = this.cache.json.get(`level_${selectedLevelId}`)
    
    if (!this.levelData) {
      console.error('Level data not found in cache!')
      return
    }
    
    console.log('Loaded level data from cache:', this.levelData)
    
    // Load level vào Board
    this.board.loadLevel(this.levelData)
  }

  setupBoardEvents() {
    // Lắng nghe sự kiện từ Board
    this.events.on('gemSelected', this.onGemSelected, this)
    this.events.on('blockerSelected', this.onBlockerSelected, this)
  }

  onBoosterSelected(boosterType) {
    // === PHẦN SỬA LỖI BẮT ĐẦU TỪ ĐÂY ===

    // 1. RA LỆNH CHO BOARD HỦY LỰA CHỌN GEM HIỆN TẠI (NẾU CÓ)
    this.board?.clearSelection(); // Dùng optional chaining `?.` để an toàn

    // === KẾT THÚC PHẦN SỬA LỖI ===

    // 2. Dọn dẹp hiệu ứng của booster cũ (nếu có)
    this.boosterVFXManager?.clearCurrentVFX()

    // 3. Cập nhật trạng thái cho booster mới
    this.activeBooster = boosterType
    this.firstSwapGem = null

    // 4. Hiển thị hiệu ứng ban đầu cho booster mới (nếu cần)
    if (boosterType === BOOSTER_TYPES.SHUFFLE && this.boosterVFXManager) {
      this.boosterVFXManager.showShuffleConfirmation()
    }
  }

  // === THÊM HÀM DỌN DẸP BOOSTER TRUNG TÂM ===
  clearActiveBooster() {
    if (this.activeBooster) {
      console.log(`Clearing active booster: ${this.activeBooster}`)
      this.activeBooster = null
      this.firstSwapGem = null
      // Gọi hàm dọn dẹp VFX chuyên dụng để tránh vòng lặp sự kiện
      this.boosterVFXManager?.clearCurrentVFX()
    }
  }

  onBoosterActivated(boosterType) {
    if (!this.board || this.board.boardBusy) return
    // Logic Shuffle đã chuyển sang onPointerUp
  }

  onBoardClick(pointer, gameObject) {
    if (!this.activeBooster || !this.board || this.board.boardBusy) return
    const row = gameObject?.getData('row')
    const col = gameObject?.getData('col')
    if (row === undefined || col === undefined) return
    switch (this.activeBooster) {
      case BOOSTER_TYPES.HAMMER:
        this.board.useHammer(row, col)
        this.activeBooster = null
        break
      case BOOSTER_TYPES.ROCKET:
        this.board.useRocket(row, col)
        this.activeBooster = null
        break
      case BOOSTER_TYPES.SWAP: {
        const clickedGem = this.board.grid[row][col]
        if (!clickedGem) return
        if (!this.firstSwapGem) {
          this.firstSwapGem = clickedGem
        } else {
          this.board.useSwap(this.firstSwapGem, clickedGem)
          this.firstSwapGem = null
          this.activeBooster = null
        }
        break
      }
    }
  }

  // === Pointer-based input for boosters with VFX ===
  getObjectUnderPointer(pointer) {
    const objects = this.input.hitTestPointer(pointer)
    // Ưu tiên đối tượng có data row/col
    return objects.find(o => typeof o.getData === 'function' && (o.getData('row') !== undefined && o.getData('col') !== undefined))
  }

  onPointerDown(pointer) {
    this.isPointerDown = true
    if (!this.activeBooster || !this.board || this.board.boardBusy) return
    if (this.activeBooster === BOOSTER_TYPES.ROCKET) {
      this.onPointerMove(pointer)
    }
  }

  onPointerMove(pointer) {
    if (!this.isPointerDown) return
    if (this.activeBooster !== BOOSTER_TYPES.ROCKET) return
    if (!this.board || this.board.boardBusy) return
    const gameObjects = this.input.manager.hitTest(pointer, this.children.list, this.cameras.main)
    const targetObject = gameObjects.find(obj => typeof obj.getData === 'function' && (obj.getData('isGem') || obj.getData('isCell')))
    if (targetObject) {
      const row = targetObject.getData('row')
      const col = targetObject.getData('col')
      if (this.lastHoveredCell.row !== row || this.lastHoveredCell.col !== col) {
        this.lastHoveredCell = { row, col }
        this.boosterVFXManager?.showRocketPreview(row, col)
      }
    } else {
      this.boosterVFXManager?.clearPreview()
      this.lastHoveredCell = { row: -1, col: -1 }
    }
  }

  onPointerUp(pointer) {
    this.isPointerDown = false
    if (!this.board || this.board.boardBusy) return
    const gameObjects = this.input.manager.hitTest(pointer, this.children.list, this.cameras.main)
    const clickedObject = gameObjects.find(obj => typeof obj.getData === 'function' && (obj.getData('isGem') || obj.getData('isCell')))
    const row = clickedObject?.getData('row')
    const col = clickedObject?.getData('col')
    if (this.activeBooster === BOOSTER_TYPES.ROCKET && this.boosterVFXManager) {
      this.boosterVFXManager.clearPreview()
    }
    if (!this.activeBooster) return
    if (this.activeBooster === BOOSTER_TYPES.HAMMER) {
      if (row !== undefined && col !== undefined) {
        const current = this.activeBooster
        this.activeBooster = null
        this.boosterVFXManager?.playHammerEffect(row, col, () => {
          this.board.useHammer(row, col)
          this.clearActiveBooster()
        })
      }
      return
    }
    if (this.activeBooster === BOOSTER_TYPES.SWAP) {
      if (row === undefined || col === undefined) return
      const clickedGem = this.board.grid[row][col]
      if (!clickedGem || clickedGem.type !== 'gem') return
      if (!this.firstSwapGem) {
        this.firstSwapGem = clickedGem
        this.boosterVFXManager?.showSwapPreview(row, col)
      } else {
        if (this.firstSwapGem !== clickedGem) {
          this.board.useSwap(this.firstSwapGem, clickedGem)
          this.clearActiveBooster()
        }
      }
      return
    }
    if (this.activeBooster === BOOSTER_TYPES.ROCKET) {
      if (row !== undefined && col !== undefined) {
        this.board.useRocket(row, col)
        this.clearActiveBooster()
      }
      return
    }
    if (this.activeBooster === BOOSTER_TYPES.SHUFFLE) {
      // Chỉ kích hoạt nếu click vào trong board
      if (clickedObject) {
        this.board.useShuffle()
        this.clearActiveBooster()
      }
      // Nếu click ra ngoài, không làm gì để cho phép thử lại
      return
    }
  }

  onGemSelected(data) {
    console.log(`Gem selected: ${data.type} at ${data.row},${data.col}`)
    // TODO: Hiệu ứng chọn gem, logic match-3
  }

  onBlockerSelected(data) {
    console.log(`Blocker selected: ${data.type} at ${data.row},${data.col}`)
    // TODO: Logic phá blocker
  }

  // Hàm xử lý input chính
  handleInput(inputData) {
    console.log('GameScene received input:', inputData)
    
    if (this.board) {
      this.board.handleInput(inputData)
    }
  }

  // Hàm load level từ JSON file
  async loadLevelFromJSON(levelId) {
    try {
      const response = await fetch(`assets/levels/level_${levelId}.json`)
      if (!response.ok) {
        throw new Error(`Failed to load level ${levelId}`)
      }
      
      const levelData = await response.json()
      this.levelData = levelData
      
      if (this.board) {
        this.board.loadLevel(levelData)
      }
      
      console.log(`Loaded level ${levelId} from JSON:`, levelData)
      return levelData
    } catch (error) {
      console.error('Error loading level:', error)
      return null
    }
  }
}
