import Phaser from 'phaser'
import { Board } from '../objects/Board'
import { SCENE_KEYS, BOOSTER_TYPES } from '../utils/constants'
import { GRID_SIZE } from '../utils/constants'
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
    this.timer = null
    this.currentTime = 0
  }

  create(data) { // Cần nhận data từ LevelLoaderScene
    const { width, height } = this.scale

    // 1. THÊM BƯỚC NÀY ĐỂ LOAD LEVEL DATA TRƯỚC TIÊN
    this.loadLevelData(data) 
    
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

    // Hiển thị background map1 (giữ nguyên)
    this.add.image(width / 2, height / 2, 'map1_background')
      .setDisplaySize(width, height)
      .setDepth(0) 

    // Tạo khung chơi ở giữa màn hình
    const playgroundSize = Math.min(width, height) * 0.9
    const playgroundX = width / 2
    const playgroundY = height / 2 + height / 8 - height/48

    // 2. SỬ DỤNG THEME TỪ LEVEL DATA
    const theme = this.levelData?.playgroundTheme || '1' // Mặc định là '1'
    const backgroundKey = `playground${theme}_background`
    const borderKey = `playground${theme}_border`

    // Hiển thị nền khung chơi (Background)
    if (this.textures.exists(backgroundKey)) {
      const playgroundBackground = this.add.image(playgroundX, playgroundY, backgroundKey)
        .setDisplaySize(playgroundSize, playgroundSize)
        .setDepth(0); 
      console.log(`Đã tạo ${backgroundKey} thành công`)
    } else {
      console.error(`Không tìm thấy ${backgroundKey} texture!`)
    }

    // Hiển thị viền khung chơi (Border)
    if (this.textures.exists(borderKey)) {
      const playgroundBorder = this.add.image(playgroundX, playgroundY, borderKey)
        .setDisplaySize(playgroundSize, playgroundSize)
        .setDepth(3); 
      console.log(`Đã tạo ${borderKey} thành công`)
    } else {
      console.error(`Không tìm thấy ${borderKey} texture!`)
    }

    // Tạo Board
    this.createBoard(playgroundX, playgroundY, playgroundSize) 
    // Khởi tạo VFX manager cho booster (giữ nguyên)
    this.boosterVFXManager = new BoosterVFXManager(this, this.board)
    // Khởi chạy UIScene overlay (giữ nguyên)
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

    // << THÊM LISTENER MỚI NÀY VÀO >>
    this.game.events.on('screenShake', (shakeData) => {
      this.cameras.main.shake(shakeData.duration, shakeData.intensity)
    }, this)
    // << KẾT THÚC THÊM MỚI >>

    // Nút cài đặt
    const settingsButton = this.add.image(40, 40, 'setting_button')
      .setInteractive({ useHandCursor: true })
      .setDepth(10)
      .setScale(1.0)

    settingsButton.on('pointerdown', () => {
      const currentLevelId = this.scene.settings?.data?.levelId || 1
      this.scene.launch('PausePopup', { levelId: currentLevelId })
    })

    settingsButton.on('pointerover', () => {
      this.tweens.add({ targets: settingsButton, scale: 1.1, duration: 100 })
    })
    settingsButton.on('pointerout', () => {
      this.tweens.add({ targets: settingsButton, scale: 1.0, duration: 100 })
    })
    // Khởi động timer UI nếu có cấu hình
    this.startTimer()
  }

  // XÓA HÀM createGameGrid() nếu còn (vì không dùng)

  // SỬA HÀM createBoard: Gọi board.loadLevel sau khi board được tạo
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

    // 3. TÍNH TOÁN KÍCH THƯỚC VÀ TẠO MẶT NẠ DỰA TRÊN gridLayout
    const maskShape = this.make.graphics()
    maskShape.fillStyle(0xffffff)

    // === LOGIC MASK: CHỈ VẼ CHO KHU VỰC BOARD THẬT ===
    const gridLayout = this.levelData.gridLayout

    // Chỉ vẽ mask cho các ô không null trong gridLayout
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (gridLayout[row][col] !== null) {
          const cellX = boardOffsetX + col * cellSize
          const cellY = boardOffsetY + row * cellSize
          maskShape.fillRect(cellX, cellY, cellSize, cellSize)
        }
      }
    }
    const mask = maskShape.createGeometryMask()

    // 3. ÁP DỤNG MẶT NẠ CHỈ CHO LAYER GEM
    this.gemLayer.setMask(mask)
    
    // 4. XÓA BỎ LỆNH GỌI setMask CHO CAMERA
    // this.cameras.main.setMask(mask) // << XÓA HOẶC CHÚ THÍCH DÒNG NÀY

    // === KẾT THÚC PHẦN SỬA LỖI ===

    // Tạo PowerupVFXManager và Board
    this.powerupVFXManager = new PowerupVFXManager(this)
    // Truyền layer vào cho Board (Board sẽ tự tạo mask riêng cho fake gem)
    this.board = new Board(this, boardOffsetX, boardOffsetY, cellSize, this.powerupVFXManager, this.gemLayer)
    
    // Load level vào Board (Dùng this.levelData đã load ở create)
    if (this.levelData) {
        this.board.loadLevel(this.levelData)
        // << GỌI HÀM KHỞI TẠO NHIỆM VỤ CỦA BOARD >>
        this.board.initializeObjectives(this.levelData.objectives);
    }
    
    // Lắng nghe sự kiện từ Board
    this.setupBoardEvents()
  }

  // SỬA HÀM loadLevelData: chỉ load data vào this.levelData.
  loadLevelData(data) {
    // Load level data từ cache (đã load trong PreloaderScene)
    const selectedLevelId = data?.levelId || 1 // Dùng data từ create()
    this.levelData = this.cache.json.get(`level_${selectedLevelId}`)
    
    if (!this.levelData) {
      console.error('Level data not found in cache!')
      return
    }
    
    console.log('Loaded level data from cache:', this.levelData)
    
    // << GỌI HÀM KHỞI TẠO NHIỆM VỤ CỦA BOARD >>
    if (this.board) {
      this.board.initializeObjectives(this.levelData.objectives);
    }
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

  startTimer() {
    if (!this.levelData || !this.levelData.starTimes) return
    this.currentTime = this.levelData.starTimes.startTime
    this.timer = this.time.addEvent({ delay: 1000, callback: this.updateTimer, callbackScope: this, loop: true })
    // Chỉ emit nếu có UIScene quan tâm (tránh emit thừa cho level không có starTimes)
    this.game.events.emit('updateTimer', this.currentTime)
  }

  updateTimer() {
    this.currentTime = Math.max(0, this.currentTime - 1)
    this.game.events.emit('updateTimer', this.currentTime)
    if (this.currentTime <= 0) {
      this.timer.remove()
      console.log('Hết giờ!')
      // TODO: xử lý thua game
    }
  }

  shutdown() {
    if (this.timer) this.timer.remove()
    this.game.events.off('updateTimer')
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

    // === BẮT ĐẦU SỬA LỖI ===
    // Danh sách các đối tượng cần kiểm tra: bao gồm con của Scene và con của gemLayer
    const listToCheck = this.children.list.concat(this.gemLayer.list)

    const gameObjects = this.input.manager.hitTest(pointer, listToCheck, this.cameras.main)
    // === KẾT THÚC SỬA LỖI ===

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

    if (this.board.boardBusy) return

    const listToCheck = this.children.list.concat(this.gemLayer.list)
    const gameObjects = this.input.manager.hitTest(pointer, listToCheck, this.cameras.main)
    const clickedObject = gameObjects.find(obj => obj.getData('isGem') || obj.getData('isCell'))

    // Nếu không có booster nào đang được chọn, không làm gì cả
    if (!this.activeBooster) return

    // --- LOGIC CHO SWAP BOOSTER ---
    if (this.activeBooster === BOOSTER_TYPES.SWAP) {
      if (!clickedObject) return
      const row = clickedObject.getData('row')
      const col = clickedObject.getData('col')
      const clickedGem = this.board.grid[row]?.[col]
      if (!clickedGem || clickedGem.type !== 'gem') return

      if (!this.firstSwapGem) {
        this.firstSwapGem = clickedGem
        this.boosterVFXManager?.showSwapPreview(row, col)
      } else {
        if (this.firstSwapGem !== clickedGem) {
          this.game.events.emit('boardBusy', true)
          this.board.useSwap(this.firstSwapGem, clickedGem)
        }
        this.clearActiveBooster()
      }
      return
    }
    
    // --- LOGIC CHO CÁC BOOSTER CÒN LẠI ---
    const boosterToUse = this.activeBooster
    this.clearActiveBooster()

    const row = clickedObject?.getData('row')
    const col = clickedObject?.getData('col')

    switch (boosterToUse) {
      case BOOSTER_TYPES.HAMMER:
        if (row !== undefined) {
          this.game.events.emit('boardBusy', true)
          this.boosterVFXManager.playHammerEffect(row, col, () => {
            this.board.useHammer(row, col)
          })
        }
        break

      case BOOSTER_TYPES.ROCKET:
        if (row !== undefined) {
          this.game.events.emit('boardBusy', true)
          this.boosterVFXManager.playRocketEffect(col, () => {
            this.board.useRocket(row, col)
          })
        }
        break

      // << PHIÊN BẢN ĐÚNG ĐỂ CLONE CẢ BLOCKER >>
      case BOOSTER_TYPES.SHUFFLE:
        if (clickedObject) {
            this.game.events.emit('boardBusy', true);

            // 1. Thu thập sprite của cả Gem và Blocker
            const allGemSprites = [];
            const allBlockerSprites = [];
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const gem = this.board.grid[r]?.[c];
                    if (gem && gem.sprite) {
                        allGemSprites.push(gem.sprite);
                    }
                    const blocker = this.board.blockerGrid[r]?.[c];
                    if (blocker) {
                        allBlockerSprites.push(blocker);
                    }
                }
            }
            
            // 2. Chạy logic thật (nhưng bị ẩn)
            this.board.useShuffle();

            // 3. Chạy hiệu ứng giả, truyền vào cả danh sách blocker
            this.boosterVFXManager.playFakeShuffleEffect(allGemSprites, allBlockerSprites, () => {
                // 4. Khi hiệu ứng kết thúc, hiển thị lại mọi thứ
                allGemSprites.forEach(gem => {
                    if (gem && gem.active) gem.setVisible(true);
                });
                allBlockerSprites.forEach(blocker => {
                    if (blocker && blocker.active) blocker.setVisible(true);
                });

                // 5. Tiếp tục game
                this.board.checkForNewMatches();
            });
        }
        break;
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
