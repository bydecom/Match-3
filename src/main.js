import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'

const config = {
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
  
  const handleTouch = async (e) => {
    console.log('👆 Touch event detected:', e.type, 'Target:', e.target)
    
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
  
  // Thêm event listeners với nhiều cách khác nhau
  const addTouchListeners = () => {
    // Document level
    document.addEventListener('touchstart', handleTouch, { passive: true, capture: true })
    document.addEventListener('touchend', handleTouch, { passive: true, capture: true })
    document.addEventListener('click', handleTouch, { capture: true })
    
    // Body level
    document.body.addEventListener('touchstart', handleTouch, { passive: true })
    document.body.addEventListener('touchend', handleTouch, { passive: true })
    document.body.addEventListener('click', handleTouch)
    
    // App container
    const appDiv = document.getElementById('app')
    if (appDiv) {
      appDiv.addEventListener('touchstart', handleTouch, { passive: true })
      appDiv.addEventListener('touchend', handleTouch, { passive: true })
      appDiv.addEventListener('click', handleTouch)
    }
    
    // Canvas game (khi có)
    const gameCanvas = document.querySelector('canvas')
    if (gameCanvas) {
      gameCanvas.addEventListener('touchstart', handleTouch, { passive: true })
      gameCanvas.addEventListener('touchend', handleTouch, { passive: true })
      gameCanvas.addEventListener('click', handleTouch)
    }
  }
  
  // Thêm listeners ngay lập tức
  addTouchListeners()
  
  // Thêm lại khi DOM thay đổi
  setTimeout(addTouchListeners, 100)
  setTimeout(addTouchListeners, 500)
  setTimeout(addTouchListeners, 1000)
}

// Tối ưu cho iOS
function optimizeForIOS() {
  console.log('🍎 Tối ưu hóa cho iOS...')
  
  // 1. Thiết lập viewport height để ẩn thanh địa chỉ
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }
  
  setViewportHeight()
  window.addEventListener('resize', setViewportHeight)
  window.addEventListener('orientationchange', setViewportHeight)
  
  // 2. Ẩn thanh địa chỉ Safari ngay lập tức
  window.scrollTo(0, 1)
  setTimeout(() => window.scrollTo(0, 0), 100)
  
  // 3. Ngăn zoom và scroll
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, { passive: false })
  
  document.addEventListener('touchmove', (e) => {
    e.preventDefault()
  }, { passive: false })
  
  // 4. Kỹ thuật ẩn thanh địa chỉ mạnh mẽ hơn
  let ticking = false
  let lastScrollTop = 0
  
  const hideAddressBar = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    
    if (scrollTop > lastScrollTop && scrollTop > 10) {
      // Scrolling down - ẩn thanh địa chỉ
      document.body.style.position = 'fixed'
      document.body.style.top = '0'
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.bottom = '0'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
      document.body.style.overflow = 'hidden'
    } else if (scrollTop < lastScrollTop) {
      // Scrolling up - có thể hiện lại thanh địa chỉ
      document.body.style.position = 'static'
      document.body.style.top = 'auto'
      document.body.style.left = 'auto'
      document.body.style.right = 'auto'
      document.body.style.bottom = 'auto'
      document.body.style.width = 'auto'
      document.body.style.height = 'auto'
      document.body.style.overflow = 'auto'
    }
    
    lastScrollTop = scrollTop
    ticking = false
  }
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(hideAddressBar)
      ticking = true
    }
  })
  
  // 5. Thêm CSS động để tối ưu (không chặn touch events)
  const style = document.createElement('style')
  style.textContent = `
    body {
      height: 100vh;
      height: calc(var(--vh, 1vh) * 100);
      overflow: hidden;
      width: 100%;
      -webkit-overflow-scrolling: touch;
      touch-action: manipulation;
      pointer-events: auto;
    }
    #app {
      height: 100vh;
      height: calc(var(--vh, 1vh) * 100);
      width: 100%;
      touch-action: manipulation;
      pointer-events: auto;
    }
  `
  document.head.appendChild(style)
  
  // 6. Thông báo cho user (không dùng alert để tránh chặn)
  setTimeout(() => {
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        max-width: 90%;
      ">
        <div style="font-size: 24px; margin-bottom: 10px;">🍎</div>
        <div style="margin-bottom: 15px;">Vuốt lên từ dưới màn hình để ẩn thanh địa chỉ Safari</div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #007AFF;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
        ">Đóng</button>
      </div>
    `
    document.body.appendChild(notification)
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove()
      }
    }, 5000)
  }, 1000)
}

// Request fullscreen cho Android
async function requestFullscreenAndroid() {
  console.log('🤖 Đang cố gắng chuyển sang fullscreen trên Android...')
  
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen()
      console.log('✅ Fullscreen thành công!')
    } else if ((document.documentElement).webkitRequestFullscreen) {
      await (document.documentElement).webkitRequestFullscreen()
      console.log('✅ Fullscreen thành công (webkit)!')
    } else if ((document.documentElement).msRequestFullscreen) {
      await (document.documentElement).msRequestFullscreen()
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

