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

// Kiểm tra device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isAndroid = /Android/.test(navigator.userAgent)

console.log('🔍 Device Info:')
console.log('- User Agent:', navigator.userAgent)
console.log('- Is Mobile:', isMobile)
console.log('- Is iOS:', isIOS)
console.log('- Is Android:', isAndroid)

// Xử lý fullscreen cho iOS và Android
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
    
    if (isIOS) {
      // iOS không hỗ trợ requestFullscreen, sử dụng các kỹ thuật khác
      console.log('🍎 iOS detected - sử dụng kỹ thuật tối ưu cho iOS')
      optimizeForIOS()
    } else if (isAndroid) {
      // Android sử dụng requestFullscreen
      console.log('🤖 Android detected - sử dụng requestFullscreen')
      await requestFullscreenAndroid()
    }
  }
  
  // Thêm event listeners
  document.addEventListener('touchstart', handleTouch, { passive: true })
  document.addEventListener('touchend', handleTouch, { passive: true })
  document.addEventListener('click', handleTouch)
  
  // Thêm event cho canvas game
  const gameCanvas = document.querySelector('canvas')
  if (gameCanvas) {
    gameCanvas.addEventListener('touchstart', handleTouch, { passive: true })
    gameCanvas.addEventListener('click', handleTouch)
  }
  
  // Thêm event cho container
  const appDiv = document.getElementById('app')
  if (appDiv) {
    appDiv.addEventListener('touchstart', handleTouch, { passive: true })
    appDiv.addEventListener('click', handleTouch)
  }
}

// Tối ưu cho iOS
function optimizeForIOS() {
  console.log('🍎 Tối ưu hóa cho iOS...')
  
  // 1. Ẩn thanh địa chỉ Safari
  window.scrollTo(0, 1)
  
  // 2. Ngăn zoom
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, { passive: false })
  
  // 3. Ngăn scroll
  document.addEventListener('touchmove', (e) => {
    e.preventDefault()
  }, { passive: false })
  
  // 4. Ẩn thanh địa chỉ khi scroll
  let lastScrollTop = 0
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    if (scrollTop > lastScrollTop) {
      // Scrolling down - ẩn thanh địa chỉ
      document.body.style.position = 'fixed'
      document.body.style.top = '0'
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.bottom = '0'
    }
    lastScrollTop = scrollTop
  })
  
  // 5. Thông báo cho user
  setTimeout(() => {
    alert('🍎 Trên iOS: Vuốt lên từ dưới màn hình để ẩn thanh địa chỉ Safari và có trải nghiệm tốt nhất!')
  }, 1000)
}

// Request fullscreen cho Android
async function requestFullscreenAndroid() {
  console.log('🤖 Đang cố gắng chuyển sang fullscreen trên Android...')
  
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
  }
}

// Khởi tạo ngay lập tức
enableFullscreenOnTouch()

// Cũng khởi tạo khi game sẵn sàng (backup)
game.events.once('ready', () => {
  console.log('🎮 Game đã sẵn sàng')
  enableFullscreenOnTouch()
})

// Xử lý khi thoát fullscreen (chỉ cho Android)
if (isAndroid) {
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      console.log('📱 Đã thoát fullscreen')
    } else {
      console.log('📱 Đã vào fullscreen')
    }
  })
}

// Thêm listener cho orientation change
window.addEventListener('orientationchange', () => {
  console.log('🔄 Orientation changed')
  setTimeout(() => {
    game.scale.refresh()
  }, 100)
})

