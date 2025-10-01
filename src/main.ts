import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1b1e27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 800,
    fullscreenTarget: 'app'
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [MainScene]
}

const game = new Phaser.Game(config)

// Tự động chuyển sang fullscreen khi chạm vào màn hình (chỉ trên mobile)
function enableFullscreenOnTouch() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  if (isMobile) {
    // Chạm vào màn hình để vào fullscreen
    document.addEventListener('touchstart', async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen()
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen()
        }
      } catch (error) {
        console.log('Fullscreen không được hỗ trợ hoặc bị từ chối:', error)
      }
    }, { once: true })
  }
}

// Khởi tạo fullscreen khi game sẵn sàng
game.events.once('ready', () => {
  enableFullscreenOnTouch()
})

// Xử lý khi thoát fullscreen
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    // Có thể thêm logic khi thoát fullscreen ở đây
    console.log('Đã thoát fullscreen')
  }
})

