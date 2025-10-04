import Phaser from 'phaser'
import { Board } from '../objects/Board'
import { SCENE_KEYS } from '../utils/constants'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.board = null
    this.levelData = null
  }

  create() {
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
    const playgroundY = height / 2 + height / 8  // Di chuyển xuống 1/4 chiều dài map

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
    // Tính toán kích thước cell
    const cellSize = playgroundSize * 0.93 / 9
    const boardOffsetX = centerX - (cellSize * 9) / 2
    const boardOffsetY = centerY - (cellSize * 9) / 2
    
    // Tạo Board
    this.board = new Board(this, boardOffsetX, boardOffsetY, cellSize)
    
    // Load level data
    this.loadLevelData()
    
    // Lắng nghe sự kiện từ Board
    this.setupBoardEvents()
  }

  loadLevelData() {
    // Load level data từ cache (đã load trong PreloaderScene)
    this.levelData = this.cache.json.get('level_1')
    
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
