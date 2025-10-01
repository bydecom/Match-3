import Phaser from 'phaser'

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene')
  }

  preload() {
    // preload assets here if needed
  }

  create() {
    const { width, height } = this.scale

    this.add.text(width / 2, height / 2, 'Phaser 3 + Vite', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 + 40, 'Project đã sẵn sàng!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#a0a0a0'
    }).setOrigin(0.5)
  }
}
