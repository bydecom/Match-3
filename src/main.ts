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

// Kiểm tra mobile và thêm debug
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
console.log('🔍 Device Info:')
console.log('- User Agent:', navigator.userAgent)
console.log('- Is Mobile:', isMobile)
console.log('- Screen size:', window.screen.width + 'x' + window.screen.height)
console.log('- Viewport size:', window.innerWidth + 'x' + window.innerHeight)

// Tự động chuyển sang fullscreen khi chạm vào màn hình
function enableFullscreenOnTouch() {
  console.log('🎮 Khởi tạo fullscreen listener...')
  
  let hasRequestedFullscreen = false
  
  const handleTouch = async (e: Event) => {
    console.log('👆 Touch event detected:', e.type)
    
    if (hasRequestedFullscreen) {
      console.log('⚠️ Đã request fullscreen rồi, bỏ qua')
      return
    }
    
    hasRequestedFullscreen = true
    console.log('🚀 Đang cố gắng chuyển sang fullscreen...')
    
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        console.log('✅ Fullscreen thành công!')
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen()
        console.log('✅ Fullscreen thành công (webkit)!')
      } else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen()
        console.log('✅ Fullscreen thành công (ms)!')
      } else {
        console.log('❌ Fullscreen API không được hỗ trợ')
      }
    } catch (error) {
      console.log('❌ Lỗi fullscreen:', error)
      hasRequestedFullscreen = false // Cho phép thử lại
    }
  }
  
  // Thêm nhiều loại event để đảm bảo hoạt động
  document.addEventListener('touchstart', handleTouch, { passive: true })
  document.addEventListener('touchend', handleTouch, { passive: true })
  document.addEventListener('click', handleTouch)
  
  // Thêm event cho canvas game
  const gameCanvas = document.querySelector('canvas')
  if (gameCanvas) {
    gameCanvas.addEventListener('touchstart', handleTouch, { passive: true })
    gameCanvas.addEventListener('click', handleTouch)
    console.log('🎯 Đã thêm event listener cho canvas')
  }
  
  // Thêm event cho container
  const appDiv = document.getElementById('app')
  if (appDiv) {
    appDiv.addEventListener('touchstart', handleTouch, { passive: true })
    appDiv.addEventListener('click', handleTouch)
    console.log('🎯 Đã thêm event listener cho app container')
  }
}

// Khởi tạo ngay lập tức
enableFullscreenOnTouch()

// Cũng khởi tạo khi game sẵn sàng (backup)
game.events.once('ready', () => {
  console.log('🎮 Game đã sẵn sàng')
  enableFullscreenOnTouch()
})

// Xử lý khi thoát fullscreen
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    console.log('📱 Đã thoát fullscreen')
  } else {
    console.log('📱 Đã vào fullscreen')
  }
})

// Thêm listener cho orientation change
window.addEventListener('orientationchange', () => {
  console.log('🔄 Orientation changed')
  setTimeout(() => {
    game.scale.refresh()
  }, 100)
})

