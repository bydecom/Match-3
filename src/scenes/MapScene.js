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

    // Tạo 5 nút map
    const levels = [
      { id: 1, label: 'Màn 1: Chào sân' },
      { id: 2, label: 'Màn 2: Đá' },
      { id: 3, label: 'Màn 3: Dây leo' },
      { id: 4, label: 'Màn 4: Lỗ hổng + Đá' },
      { id: 5, label: 'Màn 5: Dây leo lây lan' }
    ]
    const startY = height / 2 - 120
    levels.forEach((lv, idx) => {
      const y = startY + idx * 90
      const btn = this.add.rectangle(width / 2, y, 320, 64, 0x3498db)
        .setInteractive()
        .setStrokeStyle(2, 0x2980b9)
      const txt = this.add.text(width / 2, y, `${lv.label}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '22px',
        color: '#ffffff'
      }).setOrigin(0.5)
      btn.on('pointerover', () => btn.setFillStyle(0x5dade2))
      btn.on('pointerout', () => btn.setFillStyle(0x3498db))
      btn.on('pointerdown', () => {
        console.log(`Chọn Map ${lv.id} - Chuyển đến LevelLoaderScene`)
        this.scene.start('LevelLoaderScene', { levelId: lv.id })
      })
    })
  }
}
