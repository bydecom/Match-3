import Phaser from 'phaser'

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' })
  }

  create() {
    const { width, height } = this.scale

    // Tạo background đơn giản
    this.add.rectangle(width / 2, height / 2, width, height, 0x2c3e50)

    // Tạo text tiêu đề
    this.add.text(width / 2, height / 2 - 200, 'Chọn Map', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // Tạo button Map 1
    const map1Button = this.add.rectangle(width / 2, height / 2, 200, 80, 0x3498db)
      .setInteractive()
      .setStrokeStyle(2, 0x2980b9)

    // Thêm text cho button
    const buttonText = this.add.text(width / 2, height / 2, 'Map 1', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // Hiệu ứng hover
    map1Button.on('pointerover', () => {
      map1Button.setFillStyle(0x5dade2)
    })

    map1Button.on('pointerout', () => {
      map1Button.setFillStyle(0x3498db)
    })

    // Sự kiện click
    map1Button.on('pointerdown', () => {
      console.log('Chọn Map 1 - Chuyển đến GameScene')
      this.scene.start('GameScene')
    })
  }
}
