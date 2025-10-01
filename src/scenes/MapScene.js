import Phaser from 'phaser'
import { LevelNode } from '../ui/LevelNode'
import { PlayerDataManager } from '../managers/PlayerDataManager'

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' })
    this.playerDataManager = null
    this.levelNodes = []
  }

  create() {
    // Khởi tạo PlayerDataManager
    this.playerDataManager = new PlayerDataManager()

    // Tạo background
    this.add.image(400, 400, 'map-bg')

    // Tạo các level nodes
    this.createLevelNodes()

    // Tạo UI buttons
    this.createUI()
  }

  createLevelNodes() {
    const levels = this.playerDataManager.getUnlockedLevels()
    
    levels.forEach((levelData, index) => {
      const x = 100 + (index % 4) * 150
      const y = 200 + Math.floor(index / 4) * 150
      
      const levelNode = new LevelNode(this, x, y, levelData)
      this.levelNodes.push(levelNode)
      
      // Thêm sự kiện click
      levelNode.on('pointerdown', () => {
        this.startLevel(levelData.id)
      })
    })
  }

  createUI() {
    // Nút Settings
    const settingsButton = this.add.image(50, 50, 'button-bg')
      .setInteractive()
      .setScale(0.5)
    
    settingsButton.on('pointerdown', () => {
      this.scene.start('SettingsPopup')
    })

    // Nút Leaderboard
    const leaderboardButton = this.add.image(750, 50, 'button-bg')
      .setInteractive()
      .setScale(0.5)
    
    leaderboardButton.on('pointerdown', () => {
      this.scene.start('LeaderboardScene')
    })
  }

  startLevel(levelId) {
    // Tải dữ liệu level
    const levelData = this.cache.json.get(`level-${levelId}`)
    
    // Khởi động GameScene và UIScene
    this.scene.start('GameScene', { levelData })
    this.scene.launch('UIScene', { levelData })
  }
}
