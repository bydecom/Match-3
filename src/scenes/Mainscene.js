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

    // Thêm text hiển thị khi click/touch
    this.clickText = this.add.text(width / 2, height / 2 + 80, '', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      color: '#00ff00'
    }).setOrigin(0.5)

    // Thêm sự kiện click/touch
    this.input.on('pointerdown', () => {
      this.clickText.setText('Bạn đã click!')
      this.clickText.setColor('#00ff00')
      
      // Ẩn text sau 2 giây
      this.time.delayedCall(2000, () => {
        this.clickText.setText('')
      })
    })

    // Thêm sự kiện touch cho mobile
    this.input.on('touchstart', () => {
      this.clickText.setText('Bạn đã touch!')
      this.clickText.setColor('#ff6600')
      
      // Ẩn text sau 2 giây
      this.time.delayedCall(2000, () => {
        this.clickText.setText('')
      })
    })
  }
}
