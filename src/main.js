// src/main.js
import Phaser from 'phaser';
// Sửa lại tên file cho đúng chuẩn: MainScene.js    
import { MainScene } from './scenes/Mainscene'; 

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1b1e27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 800,
  },
  scene: [MainScene]
};

const game = new Phaser.Game(config);

// --- LOGIC FULLSCREEN MỚI VÀ ĐÁNG TIN CẬY ---

function enterFullscreen() {
  const element = document.documentElement;
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  }
}

// Hàm khởi tạo chính
function initializeApp() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const fullscreenButton = document.getElementById('fullscreen-button');

  if (!fullscreenButton) return;

  if (isIOS) {
    // Trên iOS, nút này chỉ để ẩn chính nó đi và tối ưu giao diện
    fullscreenButton.textContent = "Bắt đầu"; // Có thể đổi text
    fullscreenButton.addEventListener('click', () => {
      console.log('🍎 iOS: Ẩn nút và tối ưu UI...');
      window.scrollTo(0, 1); // Cố gắng ẩn thanh địa chỉ
      fullscreenButton.style.display = 'none'; // Ẩn nút đi
    }, { once: true });
  } else {
    // Trên Android và Desktop, nút này sẽ kích hoạt fullscreen
    fullscreenButton.addEventListener('click', () => {
      console.log('🤖 Android/Desktop: Yêu cầu fullscreen...');
      enterFullscreen();
      fullscreenButton.style.display = 'none'; // Ẩn nút sau khi click
    }, { once: true });
  }
}

// Chạy hàm khởi tạo khi DOM đã sẵn sàng
// Không cần chờ game ready, vì nút bấm là HTML độc lập
initializeApp();